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
import { hasOperationalTimer } from "@/app/lib/service-timing";

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

/** Idempotente: preenche Service.startedAt se o status já é em_andamento. */
async function persistOperationalStartedAtIfMissing(serviceId: string): Promise<void> {
  const { resolveOperationalStartWrite } = await import("@/app/lib/service-timing");
  const row = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { tipo: true, status: true, startedAt: true },
  });
  if (!row || row.status !== "em_andamento") return;
  const startAt = resolveOperationalStartWrite({
    tipo: row.tipo,
    existingStartedAt: row.startedAt,
    now: new Date(),
  });
  if (!startAt) return;
  try {
    await prisma.service.updateMany({
      where: { id: serviceId, startedAt: null },
      data: { startedAt: startAt },
    });
  } catch (e) {
    console.error("[workflow] persist startedAt operacional falhou:", e);
  }
}

/**
 * Garante que Sessão/Captação ligadas ao Appointment usem o mesmo startService
 * do painel Serviços Gerais (idempotente). Cobre retry quando o Appointment
 * já está em_andamento mas a cascata anterior não atualizou o Service.
 */
export async function ensureOperationalTimerServicesStartedForAppointment(
  appointmentId: number,
  actor?: TransitionActor
): Promise<void> {
  const services = await prisma.service.findMany({
    where: { appointmentId },
    select: { id: true, tipo: true, status: true },
  });
  const actorFinal = actor || { type: "admin" as const };
  for (const s of services) {
    if (!hasOperationalTimer(s.tipo)) continue;
    if (s.status === "concluido" || s.status === "cancelado" || s.status === "recusado") {
      continue;
    }
    if (s.status === "pendente") {
      const accept = await transition({
        entity: "service",
        id: s.id,
        to: "aceito",
        actor: actorFinal,
        reason: "ensureOperationalTimer:accept",
        skipEffects: true,
      });
      if (!accept.ok) {
        console.warn(
          `[workflow] ensureOperationalTimer accept falhou ${s.id}: ${accept.error}`
        );
        continue;
      }
    }
    const started = await startService(s.id, actorFinal);
    if (!started.ok) {
      console.warn(
        `[workflow] ensureOperationalTimer start falhou ${s.id}: ${started.error}`
      );
    }
    await persistOperationalStartedAtIfMissing(s.id);
  }
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
  try {
    const { notifyAppointmentStatusChange } = await import(
      "@/app/lib/account-notifications"
    );
    await notifyAppointmentStatusChange({
      appointmentId,
      toStatus: statusLabel === "confirmado" ? "confirmado" : "aceito",
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (e) {
    console.error("[workflow] notify approve (non-fatal):", e);
  }
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
  try {
    const { notifyAppointmentStatusChange } = await import(
      "@/app/lib/account-notifications"
    );
    await notifyAppointmentStatusChange({
      appointmentId,
      toStatus: "recusado",
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (e) {
    console.error("[workflow] notify reject (non-fatal):", e);
  }
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
  await ensureOperationalTimerServicesStartedForAppointment(
    appointmentId,
    actor || { type: "admin" }
  );
  const agendamento = await loadAppointment(appointmentId);
  if (!agendamento) return fail("Agendamento não encontrado após início", 500);
  try {
    const { notifyAppointmentStatusChange } = await import(
      "@/app/lib/account-notifications"
    );
    await notifyAppointmentStatusChange({
      appointmentId,
      toStatus: "em_andamento",
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (e) {
    console.error("[workflow] notify start (non-fatal):", e);
  }
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

  try {
    const { notifyAppointmentStatusChange } = await import(
      "@/app/lib/account-notifications"
    );
    await notifyAppointmentStatusChange({
      appointmentId,
      toStatus: "cancelado",
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (e) {
    console.error("[workflow] notify cancel (non-fatal):", e);
  }

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
  await persistOperationalStartedAtIfMissing(serviceId);
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
  try {
    const { notifyServiceCompleted } = await import("@/app/lib/account-notifications");
    await notifyServiceCompleted({
      serviceId: params.serviceId,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (e) {
    console.error("[workflow] notify completeService (non-fatal):", e);
  }
  return ok({ servico }, result.alreadyProcessed);
}

export const deliverService = completeService;

/**
 * GO-H12 — Conclusão operacional de Sessão/Captação sem upload de arquivos.
 */
export async function completeOperationalService(params: {
  serviceId: string;
  actor?: TransitionActor;
}): Promise<
  WorkflowResult<{
    servico: NonNullable<Awaited<ReturnType<typeof loadService>>>;
  }>
> {
  const { isOperationalNoFileService } = await import("@/app/lib/service-catalog");
  const current = await prisma.service.findUnique({
    where: { id: params.serviceId },
    select: { id: true, tipo: true, status: true },
  });
  if (!current) return fail("Serviço não encontrado", 404);
  if (!isOperationalNoFileService(current.tipo)) {
    return fail(
      "Conclusão sem arquivo é permitida apenas para Sessão e Captação. Use o fluxo de Entrega para serviços de produção.",
      400,
      "VALIDATION"
    );
  }

  const actor = params.actor || { type: "admin" as const };
  if (current.status === "pendente") {
    const accept = await transition({
      entity: "service",
      id: params.serviceId,
      to: "aceito",
      actor,
      reason: "completeOperationalService:promoteAccept",
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
      reason: "completeOperationalService:promoteStart",
    });
    if (!start.ok) return fail(start.error, start.httpStatus, start.code);
  }

  const result = await transition({
    entity: "service",
    id: params.serviceId,
    to: "concluido",
    actor,
    reason: "completeOperationalService",
    metadata: {
      completeWithoutDelivery: true,
      actorId: actor.id || null,
      completedAt: new Date().toISOString(),
    },
  });
  if (!result.ok) return fail(result.error, result.httpStatus, result.code);
  const servico = await loadService(params.serviceId);
  if (!servico) return fail("Serviço não encontrado após conclusão", 500);
  try {
    const { notifyServiceCompleted } = await import("@/app/lib/account-notifications");
    await notifyServiceCompleted({
      serviceId: params.serviceId,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (e) {
    console.error("[workflow] notify completeOperationalService (non-fatal):", e);
  }
  return ok({ servico }, result.alreadyProcessed);
}

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
    const { isOperationalNoFileService } = await import("@/app/lib/service-catalog");
    const current = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { tipo: true },
    });
    const url = String(deliveryAudioUrl || "").trim();
    if (current && isOperationalNoFileService(current.tipo) && !url) {
      return completeOperationalService({ serviceId });
    }
    return completeService({
      serviceId,
      deliveryAudioUrl: url,
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
    if (deliveryAudioUrl) {
      try {
        const { notifyFilesAvailable } = await import("@/app/lib/account-notifications");
        await notifyFilesAvailable({ serviceId });
      } catch (e) {
        console.error("[workflow] notify filesAvailable (non-fatal):", e);
      }
    }
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
