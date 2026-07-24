/**
 * HS-03A/B — Workflow de domínio (API de alto nível).
 * Toda mutação de status passa pela State Machine: transition().
 */

import { prisma } from "@/app/lib/prisma";
import { canCancelAppointment } from "@/app/lib/domain/domain-service";
import { transition } from "@/app/lib/domain/state-machine/transition";
import type { TransitionActor } from "@/app/lib/domain/state-machine/types";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { isSchedulableServiceType } from "@/app/lib/service-catalog";

export type WorkflowOk<T> = { ok: true; alreadyProcessed?: boolean; data: T };
export type WorkflowFail = { ok: false; error: string; httpStatus: number; code?: string };
export type WorkflowResult<T> = WorkflowOk<T> | WorkflowFail;

function fail(error: string, httpStatus: number, code?: string): WorkflowFail {
  return { ok: false, error, httpStatus, code };
}

function ok<T>(data: T, alreadyProcessed?: boolean): WorkflowOk<T> {
  return { ok: true, data, alreadyProcessed };
}

const aptUserInclude = {
  user: { select: { nomeArtistico: true, email: true } },
} as const;

const serviceInclude = {
  user: { select: { nomeArtistico: true, email: true } },
  appointment: { select: { id: true, data: true, status: true, tipo: true } },
} as const;

async function loadAppointment(id: number) {
  return prisma.appointment.findUnique({ where: { id }, include: aptUserInclude });
}

async function loadService(id: string) {
  return prisma.service.findUnique({ where: { id }, include: serviceInclude });
}

export async function approveAppointment(
  appointmentId: number,
  statusLabel: "aceito" | "confirmado" = "aceito",
  actor?: TransitionActor
): Promise<
  WorkflowResult<{
    agendamento: NonNullable<Awaited<ReturnType<typeof loadAppointment>>>;
  }>
> {
  const before = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, data: true, duracaoMinutos: true, tipo: true, status: true },
  });
  if (!before) return fail("Agendamento não encontrado", 404, "NOT_FOUND");

  // GO-H4.3: reserva operacional só no Aceitar — conflita com slots já reservados.
  if (
    before.status === "pendente" &&
    isSchedulableServiceType(before.tipo)
  ) {
    const duracao = before.duracaoMinutos || 60;
    const dataHoraISO = new Date(before.data);
    const conflito = await prisma.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        ...appointmentCalendarOccupancyFilter,
        AND: [
          { data: { lt: new Date(dataHoraISO.getTime() + duracao * 60000) } },
          { data: { gte: new Date(dataHoraISO.getTime() - duracao * 60000) } },
        ],
      },
      select: { id: true },
    });
    if (conflito) {
      return fail(
        "Este horário já está reservado por outro agendamento aceito. Remarque ou recuse esta solicitação.",
        409,
        "CONFLICT"
      );
    }
  }

  const result = await transition({
    entity: "appointment",
    id: appointmentId,
    to: statusLabel === "confirmado" ? "confirmado" : "aceito",
    actor: actor || { type: "admin" },
    reason: "approveAppointment",
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  try {
    const { syncServiceOrderPhaseFromAppointment } = await import(
      "@/app/lib/service-orders/persist"
    );
    await syncServiceOrderPhaseFromAppointment({
      appointmentId,
      appointmentStatus: statusLabel === "confirmado" ? "confirmado" : "aceito",
    });
  } catch (e) {
    console.error("[workflow] sync ServiceOrder phase on approve (non-fatal):", e);
  }
  const agendamento = await loadAppointment(appointmentId);
  if (!agendamento) return fail("Agendamento não encontrado após aceite", 500);
  return ok({ agendamento }, result.alreadyProcessed);
}

export async function rejectAppointment(
  appointmentId: number,
  reason: string,
  actor?: TransitionActor
): Promise<
  WorkflowResult<{
    agendamento: NonNullable<Awaited<ReturnType<typeof loadAppointment>>>;
  }>
> {
  const result = await transition({
    entity: "appointment",
    id: appointmentId,
    to: "recusado",
    reason,
    actor: actor || { type: "admin" },
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  try {
    const { syncServiceOrderPhaseFromAppointment } = await import(
      "@/app/lib/service-orders/persist"
    );
    await syncServiceOrderPhaseFromAppointment({
      appointmentId,
      appointmentStatus: "recusado",
    });
  } catch (e) {
    console.error("[workflow] sync ServiceOrder phase on reject (non-fatal):", e);
  }
  const agendamento = await loadAppointment(appointmentId);
  if (!agendamento) return fail("Agendamento não encontrado após recusa", 500);
  return ok({ agendamento }, result.alreadyProcessed);
}

export async function startServiceWork(
  appointmentId: number,
  actor?: TransitionActor
): Promise<
  WorkflowResult<{
    agendamento: NonNullable<Awaited<ReturnType<typeof loadAppointment>>>;
  }>
> {
  const result = await transition({
    entity: "appointment",
    id: appointmentId,
    to: "em_andamento",
    actor: actor || { type: "admin" },
    reason: "startServiceWork",
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  const agendamento = await loadAppointment(appointmentId);
  if (!agendamento) return fail("Agendamento não encontrado após início", 500);
  return ok({ agendamento }, result.alreadyProcessed);
}

export async function cancelAppointment(params: {
  appointmentId: number;
  actor: "admin" | "user";
  userId?: string;
  reason?: string;
}): Promise<
  WorkflowResult<{
    agendamento: { id: number; status: string };
    releasedCoupons: number;
  }>
> {
  const { appointmentId, actor, userId, reason } = params;
  const before = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!before) return fail("Agendamento não encontrado", 404, "NOT_FOUND");

  if (actor === "user" && userId && before.userId !== userId) {
    return fail("Acesso negado", 403, "FORBIDDEN");
  }

  if (before.status === "cancelado") {
    return ok({ agendamento: { id: before.id, status: "cancelado" }, releasedCoupons: 0 }, true);
  }

  if (before.status === "recusado" && actor === "admin") {
    return fail(
      "Agendamento já foi recusado; não é possível cancelar novamente por este fluxo.",
      400,
      "INVALID_TRANSITION"
    );
  }

  if (!canCancelAppointment(before.status, actor)) {
    return fail(
      actor === "user"
        ? "Apenas agendamentos aceitos ou em andamento podem ser cancelados por aqui"
        : "Não é possível cancelar no estado atual.",
      400,
      "INVALID_TRANSITION"
    );
  }

  if (actor === "admin" && (!reason || reason.trim().length < 3)) {
    return fail("Justificativa do cancelamento é obrigatória (mínimo 3 caracteres).", 400);
  }

  const result = await transition({
    entity: "appointment",
    id: appointmentId,
    to: "cancelado",
    reason: reason?.trim(),
    actor: { type: actor, id: userId },
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);

  // GO-H8B: manter ServiceOrder alinhada ao Appointment
  const { syncServiceOrderPhaseFromAppointment } = await import(
    "@/app/lib/service-orders/persist"
  );
  await syncServiceOrderPhaseFromAppointment({
    appointmentId,
    appointmentStatus: "cancelado",
  });

  return ok(
    { agendamento: { id: appointmentId, status: "cancelado" }, releasedCoupons: 0 },
    result.alreadyProcessed
  );
}

export async function revertAppointmentCancellation(
  appointmentId: number,
  actor?: TransitionActor
): Promise<WorkflowResult<{ agendamento: { id: number; status: string } }>> {
  const before = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!before) return fail("Agendamento não encontrado", 404, "NOT_FOUND");
  if (before.status !== "cancelado" && before.status !== "remarcado") {
    return fail("Apenas agendamentos cancelados podem ter o cancelamento revertido", 400);
  }

  // GO-H8: bloquear se já existem cupons/remarcações vinculados
  if (before.refundCouponId) {
    return fail(
      "Não é possível reverter este cancelamento porque já existem remarcações ou cupons vinculados ao pedido.",
      409,
      "REBOOK_CHAIN"
    );
  }
  if (before.cancelRefundOption) {
    return fail(
      "Não é possível reverter este cancelamento porque já existem remarcações ou cupons vinculados ao pedido.",
      409,
      "REBOOK_CHAIN"
    );
  }
  const childCoupons = await prisma.coupon.count({
    where: {
      OR: [{ originAppointmentId: appointmentId }, { appointmentId }],
      couponCategory: "reembolso",
    },
  });
  if (childCoupons > 0) {
    return fail(
      "Não é possível reverter este cancelamento porque já existem remarcações ou cupons vinculados ao pedido.",
      409,
      "REBOOK_CHAIN"
    );
  }

  const dataHoraISO = new Date(before.data);
  const duracao = before.duracaoMinutos || 60;
  const conflito = await prisma.appointment.findFirst({
    where: {
      id: { not: appointmentId },
      ...appointmentCalendarOccupancyFilter,
      AND: [
        { data: { lt: new Date(dataHoraISO.getTime() + duracao * 60000) } },
        { data: { gte: new Date(dataHoraISO.getTime() - duracao * 60000) } },
      ],
    },
  });
  if (conflito) {
    return fail(
      "Este horário não está mais disponível. Já existe outro agendamento aceito neste período.",
      409,
      "CONFLICT"
    );
  }

  const result = await transition({
    entity: "appointment",
    id: appointmentId,
    to: "aceito",
    actor: actor || { type: "admin" },
    reason: "revertAppointmentCancellation",
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);

  return ok({ agendamento: { id: appointmentId, status: "aceito" } }, result.alreadyProcessed);
}

export async function rebookAppointment(
  appointmentId: number,
  reason?: string,
  actor?: TransitionActor
): Promise<WorkflowResult<{ agendamento: { id: number; status: string } }>> {
  const result = await transition({
    entity: "appointment",
    id: appointmentId,
    to: "remarcado",
    reason: reason || "rebookAppointment",
    actor: actor || { type: "system" },
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  return ok({ agendamento: { id: appointmentId, status: "remarcado" } }, result.alreadyProcessed);
}

export async function startService(
  serviceId: string,
  actor?: TransitionActor
): Promise<
  WorkflowResult<{
    servico: NonNullable<Awaited<ReturnType<typeof loadService>>>;
  }>
> {
  const result = await transition({
    entity: "service",
    id: serviceId,
    to: "em_andamento",
    actor: actor || { type: "admin" },
    reason: "startService",
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  const servico = await loadService(serviceId);
  if (!servico) return fail("Serviço não encontrado após atualização", 500);
  return ok({ servico }, result.alreadyProcessed);
}

export async function completeService(params: {
  serviceId: string;
  deliveryAudioUrl: string;
  deliveryAudioFormat: "wav" | "mp3" | "zip";
  probe?: boolean;
  actor?: TransitionActor;
}): Promise<
  WorkflowResult<{
    servico: NonNullable<Awaited<ReturnType<typeof loadService>>>;
  }>
> {
  const actor = params.actor || { type: "admin" as const };
  const current = await prisma.service.findUnique({
    where: { id: params.serviceId },
    select: { status: true },
  });
  if (!current) return fail("Serviço não encontrado", 404);

  // OP-01: conclusão só a partir de EM_ANDAMENTO — promove automaticamente se necessário
  if (current.status === "pendente") {
    const accept = await transition({
      entity: "service",
      id: params.serviceId,
      to: "aceito",
      actor,
      reason: "completeService:promoteAccept",
    });
    if (!accept.ok) return fail(accept.error, accept.httpStatus, accept.code);
  }
  const mid = await prisma.service.findUnique({
    where: { id: params.serviceId },
    select: { status: true },
  });
  if (mid?.status === "aceito") {
    const start = await transition({
      entity: "service",
      id: params.serviceId,
      to: "em_andamento",
      actor,
      reason: "completeService:promoteStart",
    });
    if (!start.ok) return fail(start.error, start.httpStatus, start.code);
  }

  const result = await transition({
    entity: "service",
    id: params.serviceId,
    to: "concluido",
    actor,
    reason: "completeService",
    metadata: {
      deliveryAudioUrl: params.deliveryAudioUrl,
      deliveryAudioFormat: params.deliveryAudioFormat,
      probe: params.probe,
    },
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  const servico = await loadService(params.serviceId);
  if (!servico) return fail("Serviço não encontrado após conclusão", 500);
  return ok({ servico }, result.alreadyProcessed);
}

export const deliverService = completeService;

export async function updateServiceFields(params: {
  serviceId: string;
  status?: string;
  deliveryAudioUrl?: string | null;
  deliveryAudioFormat?: "wav" | "mp3" | "zip" | null;
}): Promise<
  WorkflowResult<{
    servico: NonNullable<Awaited<ReturnType<typeof loadService>>>;
  }>
> {
  const { serviceId, status, deliveryAudioUrl, deliveryAudioFormat } = params;

  if (status === "em_andamento") return startService(serviceId);
  if (status === "concluido" || status === "entrega") {
    return completeService({
      serviceId,
      deliveryAudioUrl: deliveryAudioUrl || "",
      deliveryAudioFormat: (deliveryAudioFormat as "wav" | "mp3" | "zip") || "wav",
      probe:
        process.env.DELIVERY_AUDIO_URL_PROBE === "1" ||
        process.env.DELIVERY_AUDIO_URL_PROBE === "true",
    });
  }

  if (status) {
    const result = await transition({
      entity: "service",
      id: serviceId,
      to: status,
      actor: { type: "admin" },
      reason: "updateServiceFields",
      metadata: {
        deliveryAudioUrl: deliveryAudioUrl ?? undefined,
        deliveryAudioFormat: deliveryAudioFormat ?? undefined,
      },
    });
    if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  } else if (deliveryAudioUrl !== undefined || deliveryAudioFormat !== undefined) {
    // Ajuste de delivery sem mudança de status — ainda sem atravessar SM de status
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(deliveryAudioUrl !== undefined ? { deliveryAudioUrl: deliveryAudioUrl || null } : {}),
        ...(deliveryAudioFormat !== undefined
          ? { deliveryAudioFormat: deliveryAudioFormat || null }
          : {}),
      },
    });
  }

  const servico = await loadService(serviceId);
  if (!servico) return fail("Serviço não encontrado", 404, "NOT_FOUND");
  return ok({ servico });
}

/** Confirma pagamento via SM (compatível com webhook / simbólico). */
export async function confirmPayment(
  paymentId: string,
  actor?: TransitionActor
): Promise<WorkflowResult<{ paymentId: string; status: string }>> {
  const result = await transition({
    entity: "payment",
    id: paymentId,
    to: "confirmado",
    actor: actor || { type: "webhook" },
    reason: "confirmPayment",
    skipEffects: true,
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  return ok({ paymentId, status: "approved" }, result.alreadyProcessed);
}

export async function refundPaymentStatus(
  paymentId: string,
  actor?: TransitionActor
): Promise<WorkflowResult<{ paymentId: string; status: string }>> {
  const result = await transition({
    entity: "payment",
    id: paymentId,
    to: "reembolsado",
    actor: actor || { type: "system" },
    reason: "refundPaymentStatus",
    skipEffects: true,
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  return ok({ paymentId, status: "refunded" }, result.alreadyProcessed);
}

export async function consumeCoupon(
  couponId: string,
  usedBy?: string,
  actor?: TransitionActor
): Promise<WorkflowResult<{ couponId: string }>> {
  const result = await transition({
    entity: "coupon",
    id: couponId,
    to: "utilizado",
    actor: actor || { type: "system" },
    reason: "consumeCoupon",
    metadata: { usedBy },
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  return ok({ couponId }, result.alreadyProcessed);
}
