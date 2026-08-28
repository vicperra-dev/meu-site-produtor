/**
 * Checkout interno quando totalFinal === 0 (sem Asaas).
 * Reusa o fluxo de /api/agendamentos/com-cupom: transação serializável,
 * consumo do cupom só após criar o agendamento no mesmo tx.
 */
import type { Coupon } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { reconcileAppointmentWithServices } from "@/app/lib/appointment-service-sync";
import { parseStudioDateTime } from "@/app/lib/calendar-day-state";
import { agendamentoBloqueiaReusoCupom } from "@/app/lib/coupon-booking-rules";
import {
  isPromotionalPartnershipCoupon,
  recordApprovedPaymentCouponUse,
} from "@/app/lib/promotional-coupon";
import {
  normalizeServiceTypeId,
  type PricedCheckoutItem,
} from "@/app/lib/service-catalog";

export type ZeroCheckoutUser = {
  id: string;
  email: string;
  nomeArtistico: string;
  telefone?: string | null;
};

export type ZeroCheckoutResult =
  | {
      ok: true;
      appointment: {
        id: number;
        data: Date;
        tipo: string;
        duracaoMinutos: number;
        observacoes: string | null;
        status: string;
      };
    }
  | { ok: false; status: number; error: string };

export async function fulfillZeroTotalCouponAppointment(params: {
  user: ZeroCheckoutUser;
  data: string;
  hora: string;
  duracaoMinutos?: number;
  tipo?: string;
  observacoes?: string | null;
  services: PricedCheckoutItem[];
  beats: PricedCheckoutItem[];
  coupon: Coupon;
}): Promise<ZeroCheckoutResult> {
  const { user, coupon } = params;
  const partnership = isPromotionalPartnershipCoupon(coupon);

  if (!partnership) {
    if (coupon.used) {
      return { ok: false, status: 400, error: "Este cupom já foi utilizado e não pode ser usado novamente." };
    }
    if (coupon.appointmentId) {
      const agendamentoAssociado = await prisma.appointment.findUnique({
        where: { id: coupon.appointmentId },
        select: { id: true, status: true },
      });
      if (agendamentoAssociado && agendamentoBloqueiaReusoCupom(agendamentoAssociado.status)) {
        return {
          ok: false,
          status: 400,
          error:
            "Este cupom já está vinculado a um agendamento em andamento. Aguarde o desfecho ou use outro cupom.",
        };
      }
      return {
        ok: false,
        status: 409,
        error:
          "Este cupom ainda está reservado a outro agendamento. Atualize a página ou contate o suporte.",
      };
    }
  }

  const dataHoraISO = parseStudioDateTime(params.data, params.hora);
  const duracao = params.duracaoMinutos || 60;
  const servicos = params.services;
  const beats = params.beats;

  let appointment!: {
    id: number;
    data: Date;
    tipo: string;
    duracaoMinutos: number;
    observacoes: string | null;
    status: string;
  };
  let boundServiceId: string | null = null;

  try {
    await prisma.$transaction(
      async (tx) => {
        const conflito = await tx.appointment.findFirst({
          where: {
            ...appointmentCalendarOccupancyFilter,
            AND: [
              { data: { lt: new Date(dataHoraISO.getTime() + duracao * 60000) } },
              { data: { gte: new Date(dataHoraISO.getTime() - duracao * 60000) } },
            ],
          },
          select: { id: true },
        });
        const tipoNorm = normalizeServiceTypeId(
          String(params.tipo || coupon.serviceType || "sessao")
        );
        const isPresencial = tipoNorm === "sessao" || tipoNorm === "captacao";
        if (isPresencial && conflito) {
          const err = new Error("SLOT_CONFLICT");
          (err as { code?: string }).code = "SLOT_CONFLICT";
          throw err;
        }

        const apt = await tx.appointment.create({
          data: {
            userId: user.id,
            data: dataHoraISO,
            duracaoMinutos: duracao,
            tipo: params.tipo || "sessao",
            observacoes: params.observacoes || null,
            status: "pendente",
          },
        });

        if (!partnership) {
          const originId =
            coupon.originAppointmentId ??
            (coupon.appointmentId && coupon.appointmentId !== apt.id
              ? coupon.appointmentId
              : null);

          const claimed = await tx.coupon.updateMany({
            where: {
              id: coupon.id,
              used: false,
            },
            data: {
              appointmentId: apt.id,
              ...(originId ? { originAppointmentId: originId } : {}),
              used: true,
              usedAt: new Date(),
              usedBy: user.id,
            },
          });

          if (claimed.count !== 1) {
            const err = new Error("COUPON_CLAIM_CONFLICT");
            (err as { code?: string }).code = "COUPON_CLAIM_CONFLICT";
            throw err;
          }

          await tx.serviceOrder.updateMany({
            where: { couponId: coupon.id },
            data: { appointmentId: apt.id, phase: "solicitation" },
          });
        }

        appointment = {
          id: apt.id,
          data: apt.data,
          tipo: apt.tipo,
          duracaoMinutos: apt.duracaoMinutos,
          observacoes: apt.observacoes,
          status: apt.status,
        };

        for (const svc of servicos) {
          const tipoSvc = normalizeServiceTypeId(String(svc.id || svc.nome || "sessao"));
          const desc =
            [svc.nome, svc.quantidade > 1 ? `Qtd: ${svc.quantidade}` : null].filter(Boolean).join(" — ") ||
            tipoSvc;
          for (let q = 0; q < (svc.quantidade || 1); q++) {
            const created = await tx.service.create({
              data: {
                userId: user.id,
                appointmentId: apt.id,
                tipo: tipoSvc,
                description: desc,
                status: "pendente",
              },
            });
            if (!boundServiceId) boundServiceId = created.id;
          }
        }

        for (const b of beats) {
          const tipoB = normalizeServiceTypeId(String(b.id || b.nome || "beat1"));
          const descB =
            [b.nome, b.quantidade > 1 ? `Qtd: ${b.quantidade}` : null].filter(Boolean).join(" — ") || tipoB;
          for (let q = 0; q < (b.quantidade || 1); q++) {
            const created = await tx.service.create({
              data: {
                userId: user.id,
                appointmentId: apt.id,
                tipo: tipoB,
                description: descB,
                status: "pendente",
              },
            });
            if (!boundServiceId) boundServiceId = created.id;
          }
        }

        if (partnership) {
          const claimed = await recordApprovedPaymentCouponUse(tx, {
            couponId: coupon.id,
            userId: user.id,
            appointmentId: apt.id,
            serviceId: boundServiceId,
          });
          if (!claimed.ok) {
            const err = new Error("COUPON_CLAIM_CONFLICT");
            (err as { code?: string }).code = "COUPON_CLAIM_CONFLICT";
            throw err;
          }
        } else if (boundServiceId) {
          await tx.coupon.updateMany({
            where: { id: coupon.id, serviceId: null },
            data: { serviceId: boundServiceId },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 20000,
      }
    );
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = (e as Error)?.message;
    if (code === "SLOT_CONFLICT" || msg === "SLOT_CONFLICT") {
      return { ok: false, status: 409, error: "Já existe um agendamento neste horário." };
    }
    if (code === "COUPON_CLAIM_CONFLICT" || msg === "COUPON_CLAIM_CONFLICT") {
      return {
        ok: false,
        status: 409,
        error:
          "Não foi possível reservar este cupom (pode ter sido usado por outra requisição). Atualize e tente novamente.",
      };
    }
    if (code === "P2034") {
      return {
        ok: false,
        status: 409,
        error: "Concorrência ao gravar o agendamento. Tente novamente.",
      };
    }
    throw e;
  }

  await reconcileAppointmentWithServices(appointment.id);

  try {
    const { emitAppointmentReserved } = await import("@/app/lib/synchronization/lifecycle");
    const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
    await emitAppointmentReserved({
      appointmentId: appointment.id,
      userId: user.id,
      dataIso: new Date(appointment.data).toISOString(),
      duracaoMinutos: appointment.duracaoMinutos || 60,
    });
    await publishSyncEvent({
      name: "CouponConsumed",
      entity: "coupon",
      entityId: coupon.id,
      to: "utilizado",
      options: {
        source: "lifecycle",
        userId: user.id,
        metadata: { appointmentId: appointment.id, via: "com-cupom" },
      },
    });
  } catch (syncErr) {
    console.error("[ZeroTotalCoupon] sync falhou (non-fatal):", syncErr);
  }

  try {
    const { sendPaymentNotificationToTHouse } = await import("@/app/lib/sendEmail");
    await sendPaymentNotificationToTHouse(
      user.email,
      user.nomeArtistico,
      user.telefone || "",
      appointment.data,
      appointment.tipo,
      appointment.duracaoMinutos,
      appointment.observacoes || "",
      0,
      "cupom",
      servicos,
      beats
    );
  } catch (emailError) {
    console.error("[ZeroTotalCoupon] Erro ao enviar email (não crítico):", emailError);
  }

  if (!partnership) {
    try {
      const { linkServiceOrderCouponToAppointment } = await import(
        "@/app/lib/service-orders/persist"
      );
      await linkServiceOrderCouponToAppointment({
        couponId: coupon.id,
        appointmentId: appointment.id,
      });
    } catch (e) {
      console.error("[ZeroTotalCoupon] link ServiceOrder←cupom falhou (non-fatal):", e);
    }
  }

  return { ok: true, appointment };
}
