/**
 * Efeitos pós-pagamento confirmado para carrinho (metadata tipo carrinho).
 * Complementa processAgendamentoPaymentEffects (agendamento único) e reconcile (replay).
 */
import { prisma } from "@/app/lib/prisma";
import { sendPaymentConfirmationEmailToUser, sendPaymentNotificationToTHouse } from "@/app/lib/sendEmail";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import {
  createServicesForAppointmentIfMissing,
  type AgendamentoItemLine,
} from "@/app/lib/asaas-agendamento-payment-effects";

export type CarrinhoItemMeta = {
  data?: string;
  hora?: string;
  duracaoMinutos?: number;
  tipo?: string;
  observacoes?: string;
  servicos?: AgendamentoItemLine[];
  beats?: AgendamentoItemLine[];
  cupomCode?: string;
  couponId?: string;
};

export type ProcessCarrinhoPaymentEffectsResult = {
  appointmentIds: number[];
  paymentLinked: boolean;
  emailsSent: boolean;
  skippedReason?: string;
};

function parseCarrinhoItems(metadata: Record<string, unknown>): CarrinhoItemMeta[] {
  try {
    const raw = metadata.items;
    if (typeof raw === "string") return JSON.parse(raw);
    if (Array.isArray(raw)) return raw as CarrinhoItemMeta[];
  } catch {
    return [];
  }
  return [];
}

export async function processCarrinhoPaymentEffects(params: {
  paymentDbId: string;
  userId: string;
  value: number;
  metadata: Record<string, unknown>;
  options?: { sendEmails?: boolean; source?: "webhook" | "admin_reprocess" };
}): Promise<ProcessCarrinhoPaymentEffectsResult> {
  const { paymentDbId, userId, value, metadata } = params;
  const sendEmails = params.options?.sendEmails !== false;
  const logPrefix =
    params.options?.source === "admin_reprocess"
      ? "[CarrinhoEffects:admin]"
      : "[CarrinhoEffects:webhook]";

  const pay = await prisma.payment.findUnique({
    where: { id: paymentDbId },
    select: { id: true, appointmentId: true, appointmentIds: true },
  });
  if (!pay) {
    return {
      appointmentIds: [],
      paymentLinked: false,
      emailsSent: false,
      skippedReason: "Pagamento não encontrado",
    };
  }

  const items = parseCarrinhoItems(metadata);
  if (items.length === 0) {
    return {
      appointmentIds: [],
      paymentLinked: false,
      emailsSent: false,
      skippedReason: "Carrinho sem itens no metadata",
    };
  }

  const appointmentIds: number[] = [];
  let firstItemServices: AgendamentoItemLine[] = [];
  let firstItemBeats: AgendamentoItemLine[] = [];

  for (const item of items) {
    const data = item.data;
    const hora = item.hora;
    if (!data || !hora) continue;
    const duracaoMinutos = item.duracaoMinutos ?? 60;
    const tipoAgendamento = item.tipo || "sessao";
    const observacoes = item.observacoes || null;
    const dataHoraISO = new Date(`${data}T${hora}:00`);
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
    if (conflito) continue;

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
    if (item.couponId) {
      const { recordApprovedPaymentCouponUse } = await import(
        "@/app/lib/promotional-coupon"
      );
      const claimed = await recordApprovedPaymentCouponUse(prisma, {
        couponId: item.couponId,
        userId,
        appointmentId: novoAgendamento.id,
      });
      if (!claimed.ok) {
        await prisma.appointment.delete({ where: { id: novoAgendamento.id } });
        throw new Error(`COUPON_CLAIM_CONFLICT:${item.couponId}`);
      }
    }
    appointmentIds.push(novoAgendamento.id);
    console.log(`${logPrefix} agendamento criado:`, novoAgendamento.id);
    try {
      const { emitAppointmentReserved } = await import("@/app/lib/synchronization/lifecycle");
      await emitAppointmentReserved({
        appointmentId: novoAgendamento.id,
        userId,
        dataIso: dataHoraISO.toISOString(),
        duracaoMinutos,
      });
    } catch (e) {
      console.error(`${logPrefix} sync AppointmentReserved falhou (non-fatal):`, e);
    }

    const servicesCreated = await createServicesForAppointmentIfMissing({
      appointmentId: novoAgendamento.id,
      userId,
      services: Array.isArray(item.servicos) ? item.servicos : [],
      beats: Array.isArray(item.beats) ? item.beats : [],
      logPrefix: `${logPrefix}:svc`,
    });
    if (servicesCreated > 0) {
      console.log(`${logPrefix} serviços criados para agendamento`, novoAgendamento.id, servicesCreated);
    }

    if (appointmentIds.length === 1) {
      firstItemServices = Array.isArray(item.servicos) ? item.servicos : [];
      firstItemBeats = Array.isArray(item.beats) ? item.beats : [];
    }
  }

  const firstId = appointmentIds[0] ?? null;
  if (firstId === null) {
    return {
      appointmentIds: [],
      paymentLinked: false,
      emailsSent: false,
      skippedReason: "Nenhum agendamento criado (conflito de slot ou itens inválidos)",
    };
  }

  await prisma.payment.update({
    where: { id: paymentDbId },
    data: {
      type: "agendamento",
      appointmentId: firstId,
      appointmentIds: appointmentIds.length > 1 ? appointmentIds : undefined,
    },
  });
  console.log(`${logPrefix} pagamento associado a`, appointmentIds.length, "agendamento(s)");

  let emailsSent = false;
  if (sendEmails) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: firstId },
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
      if (appointment) {
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
          firstItemServices,
          firstItemBeats
        );
        emailsSent = true;
      }
    } catch (emailError: unknown) {
      console.error(`${logPrefix} erro ao enviar emails (não crítico):`, emailError);
    }
  }

  return {
    appointmentIds,
    paymentLinked: true,
    emailsSent,
  };
}
