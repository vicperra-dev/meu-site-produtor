/**
 * Efeitos pós-pagamento confirmado para agendamento único (metadata tipo agendamento).
 * Única implementação usada pelo webhook Asaas e por rotas admin (ex.: simular / reprocessar).
 */
import { prisma } from "@/app/lib/prisma";
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";
import {
  createCouponsForAgendamentoItems,
  isSymbolicAgendamentoCouponStyle,
} from "@/app/lib/agendamento-payment-coupons";
import {
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
  exigeAgendamentoHora,
  isCouponsOnlyAgendamentoPayment,
  isSingleScheduledAgendamentoPayment,
} from "@/app/lib/agendamento-payment-rules";
import { sendPaymentConfirmationEmailToUser, sendPaymentNotificationToTHouse } from "@/app/lib/sendEmail";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import {
  parseStudioDateTime,
  resolveNextProductionHourForDay,
} from "@/app/lib/calendar-day-state";

export type AgendamentoItemLine = { id?: string; nome?: string; quantidade?: number };

type ItemLine = AgendamentoItemLine;

export function parseAgendamentoMetadataItems(metadata: Record<string, unknown>): {
  services: ItemLine[];
  beats: ItemLine[];
} {
  let services: ItemLine[] = [];
  let beats: ItemLine[] = [];
  try {
    const rawS = metadata.servicos;
    services =
      typeof rawS === "string" ? JSON.parse(rawS) : Array.isArray(rawS) ? rawS : [];
  } catch {
    services = [];
  }
  try {
    const rawB = metadata.beats;
    beats = typeof rawB === "string" ? JSON.parse(rawB) : Array.isArray(rawB) ? rawB : [];
  } catch {
    beats = [];
  }
  return { services, beats };
}

export function expectedServiceLines(services: ItemLine[], beats: ItemLine[]): number {
  const arrS = Array.isArray(services) ? services : [];
  const arrB = Array.isArray(beats) ? beats : [];
  return (
    arrS.reduce((acc, s) => acc + Math.max(1, Number(s.quantidade) || 1), 0) +
    arrB.reduce((acc, b) => acc + Math.max(1, Number(b.quantidade) || 1), 0)
  );
}

async function countServicesByTipo(appointmentId: number): Promise<Map<string, number>> {
  const rows = await prisma.service.findMany({
    where: { appointmentId },
    select: { tipo: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.tipo, (counts.get(row.tipo) || 0) + 1);
  }
  return counts;
}

/** Cria Services pendentes para um agendamento quando ainda não existem (idempotente). */
export async function createServicesForAppointmentIfMissing(params: {
  appointmentId: number;
  userId: string;
  services: ItemLine[];
  beats: ItemLine[];
  logPrefix?: string;
}): Promise<number> {
  const { appointmentId, userId, services, beats } = params;
  const logPrefix = params.logPrefix || "[AgendamentoEffects]";
  const expected = expectedServiceLines(services, beats);
  if (expected === 0) return 0;

  const svcCount = await prisma.service.count({
    where: { appointmentId },
  });

  if (svcCount > 0 && svcCount < expected) {
    console.warn(
      `${logPrefix} Serviços incompletos (${svcCount}/${expected}) — reparando linhas faltantes`
    );
    // Continua para criar serviços faltantes abaixo
  } else if (svcCount >= expected) {
    console.log(`${logPrefix} Serviços já presentes na quantidade esperada; não duplicando`, {
      appointmentId,
      svcCount,
      expected,
    });
    return 0;
  }

  let servicesCreatedThisRun = 0;
  const byTipo = svcCount > 0 ? await countServicesByTipo(appointmentId) : new Map<string, number>();

  if (Array.isArray(services) && services.length > 0) {
    for (const svc of services) {
      const tipoSvc = normalizeServiceTypeId(String(svc.id || svc.nome || "sessao"));
      const desc =
        [svc.nome, svc.quantidade && svc.quantidade > 1 ? `Qtd: ${svc.quantidade}` : null]
          .filter(Boolean)
          .join(" — ") || tipoSvc;
      const needed = Math.max(1, Number(svc.quantidade) || 1);
      const have = byTipo.get(tipoSvc) || 0;
      const toCreate = Math.max(0, needed - have);
      for (let q = 0; q < toCreate; q++) {
        try {
          await prisma.service.create({
            data: {
              userId,
              appointmentId,
              tipo: tipoSvc,
              description: desc,
              status: "pendente",
            },
          });
          servicesCreatedThisRun++;
        } catch (serviceErr: unknown) {
          console.error(`${logPrefix} Erro ao criar Service (não crítico):`, serviceErr);
        }
      }
      byTipo.set(tipoSvc, have + toCreate);
    }
  }
  if (Array.isArray(beats) && beats.length > 0) {
    for (const b of beats) {
      const tipoBeat = normalizeServiceTypeId(String(b.id || b.nome || "beat1"));
      const descBeat =
        [b.nome, b.quantidade && b.quantidade > 1 ? `Qtd: ${b.quantidade}` : null]
          .filter(Boolean)
          .join(" — ") || tipoBeat;
      const needed = Math.max(1, Number(b.quantidade) || 1);
      const have = byTipo.get(tipoBeat) || 0;
      const toCreate = Math.max(0, needed - have);
      for (let q = 0; q < toCreate; q++) {
        try {
          await prisma.service.create({
            data: {
              userId,
              appointmentId,
              tipo: tipoBeat,
              description: descBeat,
              status: "pendente",
            },
          });
          servicesCreatedThisRun++;
        } catch (serviceErr: unknown) {
          console.error(`${logPrefix} Erro ao criar Service beat (não crítico):`, serviceErr);
        }
      }
      byTipo.set(tipoBeat, have + toCreate);
    }
  }

  return servicesCreatedThisRun;
}

export type ProcessAgendamentoPaymentEffectsResult = {
  agendamentoFinalId: number | null;
  paymentLinked: boolean;
  couponsCount: number;
  servicesCreatedThisRun: number;
  emailsSent: boolean;
  /** Quando não há slot ou metadata insuficiente (mesmas regras do webhook). */
  skippedReason?: string;
};

export async function processAgendamentoPaymentEffects(params: {
  paymentDbId: string;
  value: number;
  metadata: Record<string, unknown>;
  options?: { sendEmails?: boolean; source?: "webhook" | "admin_reprocess" };
}): Promise<ProcessAgendamentoPaymentEffectsResult> {
  const { paymentDbId, value, metadata } = params;
  const sendEmails = params.options?.sendEmails !== false;
  const log = (msg: string, extra?: unknown) => {
    const tag = params.options?.source === "admin_reprocess" ? "[AgendamentoEffects:admin]" : "[AgendamentoEffects:webhook]";
    if (extra !== undefined) console.log(tag, msg, extra);
    else console.log(tag, msg);
  };

  const pay = await prisma.payment.findUnique({
    where: { id: paymentDbId },
    select: { id: true, userId: true, appointmentId: true },
  });
  if (!pay) {
    return {
      agendamentoFinalId: null,
      paymentLinked: false,
      couponsCount: 0,
      servicesCreatedThisRun: 0,
      emailsSent: false,
      skippedReason: "Pagamento não encontrado",
    };
  }

  const userId = pay.userId;
  const { services, beats } = parseAgendamentoMetadataItems(metadata);
  const tipoAgendamento = (metadata.tipoAgendamento || metadata.tipo || "sessao") as string;
  const observacoes = (metadata.observacoes as string | null) || null;
  const duracaoMinutos = parseInt(String(metadata.duracaoMinutos || "60"), 10);
  const couponsOnly = isCouponsOnlyAgendamentoPayment(metadata, services, beats);

  if (couponsOnly) {
    let couponsCount = 0;
    try {
      const coupons = await createCouponsForAgendamentoItems({
        userId,
        paymentId: paymentDbId,
        services: Array.isArray(services) ? services : [],
        beats: Array.isArray(beats) ? beats : [],
        isTestPayment: isSymbolicAgendamentoCouponStyle(metadata),
      });
      couponsCount = coupons.length;
      log("Cupons emitidos sem criar agendamento", { paymentDbId, couponsCount });
    } catch (couponErr: unknown) {
      console.error("[AgendamentoEffects] Erro ao criar cupons:", couponErr);
      return {
        agendamentoFinalId: null,
        paymentLinked: false,
        couponsCount: 0,
        servicesCreatedThisRun: 0,
        emailsSent: false,
        skippedReason: "Falha ao gerar cupons para o pagamento",
      };
    }

    if (couponsCount === 0) {
      return {
        agendamentoFinalId: null,
        paymentLinked: false,
        couponsCount: 0,
        servicesCreatedThisRun: 0,
        emailsSent: false,
        skippedReason: "Nenhum cupom foi gerado para este pagamento",
      };
    }

    await prisma.payment.update({
      where: { id: paymentDbId },
      data: { type: "agendamento", appointmentId: null },
    });

    let emailsSent = false;
    if (sendEmails) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, nomeArtistico: true, telefone: true },
        });
        if (user) {
          await sendPaymentConfirmationEmailToUser(
            user.email,
            user.nomeArtistico,
            new Date(),
            value
          );
          await sendPaymentNotificationToTHouse(
            user.email,
            user.nomeArtistico,
            user.telefone,
            new Date(),
            tipoAgendamento,
            duracaoMinutos,
            observacoes,
            value,
            (metadata.paymentMethod as string | null) || null,
            services,
            beats
          );
          emailsSent = true;
        }
      } catch (emailError: unknown) {
        console.error("[AgendamentoEffects] Erro ao enviar emails (não crítico):", emailError);
      }
    }

    return {
      agendamentoFinalId: null,
      paymentLinked: true,
      couponsCount,
      servicesCreatedThisRun: 0,
      emailsSent,
    };
  }

  let agendamentoFinalId: number | null = null;

  if (pay.appointmentId) {
    const linked = await prisma.appointment.findFirst({
      where: { id: pay.appointmentId, userId },
      select: { id: true },
    });
    if (linked) {
      agendamentoFinalId = linked.id;
      log("Usando agendamento já vinculado ao pagamento (idempotência)", agendamentoFinalId);
    }
  }

  const appointmentIdMeta = metadata.appointmentId;
  const data = metadata.data as string | undefined;
  const horaRaw = metadata.hora as string | undefined;
  const needsHour = exigeAgendamentoHora(services, beats);
  let hora =
    horaRaw?.trim() ||
    (data && !needsHour ? PRODUCTION_SCHEDULE_DEFAULT_HOUR : undefined);

  // BUG-001: produção ocupa o último horário livre do dia (não um fixo cego).
  if (data && !needsHour) {
    try {
      const dayStart = parseStudioDateTime(data, "00:00");
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const existing = await prisma.appointment.findMany({
        where: {
          ...appointmentCalendarOccupancyFilter,
          data: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true, data: true, duracaoMinutos: true, tipo: true, status: true },
      });
      const blocked = await prisma.blockedTimeSlot.findMany({
        where: { data, ativo: true },
        select: { data: true, hora: true },
      });
      const next = resolveNextProductionHourForDay({
        isoDate: data,
        appointments: existing,
        blockedSlots: blocked,
      });
      if (next) hora = next;
    } catch (e) {
      console.warn("[AgendamentoEffects] resolve produção hour falhou; usando default", e);
    }
  }

  if (!agendamentoFinalId && appointmentIdMeta) {
    const agendamento = await prisma.appointment.findUnique({
      where: { id: parseInt(String(appointmentIdMeta), 10) },
      select: { id: true, userId: true },
    });
    if (agendamento && agendamento.userId === userId) {
      agendamentoFinalId = agendamento.id;
      log("Agendamento confirmado (metadata.appointmentId)", agendamentoFinalId);
    } else if (agendamento) {
      log("Agendamento em metadata não pertence ao usuário do pagamento; ignorando appointmentId", appointmentIdMeta);
    } else {
      console.warn("[AgendamentoEffects] Agendamento não encontrado:", appointmentIdMeta);
    }
  }

  if (
    !agendamentoFinalId &&
    data &&
    hora &&
    isSingleScheduledAgendamentoPayment(metadata, services, beats)
  ) {
    const dataHoraISO = parseStudioDateTime(data, hora);
    // Conflito de estúdio só para presencial (Sessão/Captação).
    if (needsHour) {
      const conflito = await prisma.appointment.findFirst({
        where: {
          ...appointmentCalendarOccupancyFilter,
          AND: [
            { data: { lt: new Date(dataHoraISO.getTime() + duracaoMinutos * 60000) } },
            { data: { gte: new Date(dataHoraISO.getTime() - duracaoMinutos * 60000) } },
          ],
        },
        select: { id: true },
      });
      if (conflito) {
        const msg = "Conflito de horário: agendamento não criado";
        console.warn("[AgendamentoEffects]", msg);
        return {
          agendamentoFinalId: null,
          paymentLinked: false,
          couponsCount: 0,
          servicesCreatedThisRun: 0,
          emailsSent: false,
          skippedReason: msg,
        };
      }
    }
    {
      const novoAgendamento = await prisma.appointment.create({
        data: {
          userId,
          data: dataHoraISO,
          duracaoMinutos,
          tipo: tipoAgendamento,
          observacoes,
          status: "pendente",
        },
      });
      agendamentoFinalId = novoAgendamento.id;
      log("Agendamento criado", agendamentoFinalId);
      try {
        const { createServiceOrderForImmediateAppointment } = await import(
          "@/app/lib/service-orders/persist"
        );
        const { expandPurchaseToServiceOrders } = await import("@/app/lib/service-orders");
        const primary = expandPurchaseToServiceOrders(services, beats)[0];
        await createServiceOrderForImmediateAppointment({
          userId,
          paymentId: paymentDbId,
          appointmentId: novoAgendamento.id,
          serviceType: primary?.serviceType || String(tipoAgendamento),
          commercialSource: primary?.commercialSource || String(tipoAgendamento),
          appointmentStatus: "pendente",
        });
      } catch (e) {
        console.error("[AgendamentoEffects] ServiceOrder imediata falhou (non-fatal):", e);
      }
      try {
        const { emitAppointmentReserved } = await import("@/app/lib/synchronization/lifecycle");
        await emitAppointmentReserved({
          appointmentId: novoAgendamento.id,
          userId,
          dataIso: dataHoraISO.toISOString(),
          duracaoMinutos,
        });
      } catch (e) {
        console.error("[AgendamentoEffects] sync AppointmentReserved falhou (non-fatal):", e);
      }
    }
  }

  if (!agendamentoFinalId) {
    return {
      agendamentoFinalId: null,
      paymentLinked: false,
      couponsCount: 0,
      servicesCreatedThisRun: 0,
      emailsSent: false,
      skippedReason:
        "Pagamento sem agendamento unitário com data. Compras múltiplas usam cupons em Minha Conta.",
    };
  }

  const cupomCode = metadata.cupomCode as string | undefined;
  if (cupomCode) {
    try {
      const cupom = await prisma.coupon.findUnique({
        where: { code: cupomCode.toUpperCase() },
      });
      if (cupom && !cupom.used) {
        await prisma.coupon.updateMany({
          where: { id: cupom.id, used: false },
          data: {
            used: true,
            usedAt: new Date(),
            usedBy: userId,
            appointmentId: agendamentoFinalId,
          },
        });
        log(`Cupom de checkout vinculado ao agendamento ${agendamentoFinalId}`, cupomCode);
      }
    } catch (cupomError: unknown) {
      console.error("[AgendamentoEffects] Erro ao processar cupom (não crítico):", cupomError);
    }
  }

  await prisma.payment.update({
    where: { id: paymentDbId },
    data: { appointmentId: agendamentoFinalId, type: "agendamento" },
  });
  log("Pagamento associado ao agendamento", agendamentoFinalId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: agendamentoFinalId },
    select: {
      id: true,
      userId: true,
      data: true,
      duracaoMinutos: true,
      tipo: true,
      observacoes: true,
      status: true,
      createdAt: true,
      user: true,
    },
  });

  let servicesCreatedThisRun = 0;
  let emailsSent = false;

  if (appointment) {
    servicesCreatedThisRun = await createServicesForAppointmentIfMissing({
      appointmentId: agendamentoFinalId,
      userId: appointment.userId,
      services: Array.isArray(services) ? services : [],
      beats: Array.isArray(beats) ? beats : [],
      logPrefix: "[AgendamentoEffects]",
    });

    if (sendEmails) {
      try {
        await sendPaymentConfirmationEmailToUser(
          appointment.user.email,
          appointment.user.nomeArtistico,
          appointment.data,
          value
        );
        await sendPaymentNotificationToTHouse(
          appointment.user.email,
          appointment.user.nomeArtistico,
          appointment.user.telefone,
          appointment.data,
          appointment.tipo,
          appointment.duracaoMinutos,
          appointment.observacoes,
          value,
          (metadata.paymentMethod as string | null) || null,
          services,
          beats
        );
        emailsSent = true;
        log("Emails de confirmação enviados");
      } catch (emailError: unknown) {
        console.error("[AgendamentoEffects] Erro ao enviar emails (não crítico):", emailError);
      }
    }
  }

  return {
    agendamentoFinalId,
    paymentLinked: true,
    couponsCount: 0,
    servicesCreatedThisRun,
    emailsSent,
  };
}
