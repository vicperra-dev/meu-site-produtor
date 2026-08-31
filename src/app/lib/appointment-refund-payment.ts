/**
 * Resolvedor read-only do Payment correto para reembolso de agendamento (F6 / ADR-008).
 * Não escreve no banco nem chama Asaas — apenas localiza o Payment para downstream (coupon-refund, escolher-reembolso).
 */
import type { Payment } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import {
  isSymbolicApprovedPayment,
  parsePaymentAppointmentIds,
} from "@/app/lib/symbolic-payment";
import { toPersistedCouponType } from "@/app/lib/domain/coupon-types";

const REFUND_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function paymentBelongsToAppointment(payment: Payment, appointmentId: number): boolean {
  return parsePaymentAppointmentIds(payment).includes(appointmentId);
}

/** Agendamento criado com cupom (sem cobrança própria vinculada a este id). */
export async function appointmentBookedWithCouponOnly(
  appointmentId: number,
  payment: Payment | null
): Promise<boolean> {
  const used = await prisma.coupon.findFirst({
    where: { appointmentId, used: true },
    select: { id: true },
  });
  if (!used) return false;
  if (!payment) return true;
  return !paymentBelongsToAppointment(payment, appointmentId);
}

export async function appointmentHasUsedCoupon(appointmentId: number): Promise<boolean> {
  const used = await prisma.coupon.findFirst({
    where: { appointmentId, used: true },
    select: { id: true },
  });
  return !!used;
}

function paymentNearAppointment(payment: Payment, appointmentCreatedAt: Date): boolean {
  return (
    Math.abs(payment.createdAt.getTime() - appointmentCreatedAt.getTime()) <=
    REFUND_MATCH_WINDOW_MS
  );
}

function pickClosestPaymentToAppointment(
  payments: Payment[],
  appointmentCreatedAt: Date
): Payment | null {
  if (payments.length === 0) return null;
  return payments.reduce((best, current) => {
    const bestDelta = Math.abs(best.createdAt.getTime() - appointmentCreatedAt.getTime());
    const currentDelta = Math.abs(current.createdAt.getTime() - appointmentCreatedAt.getTime());
    return currentDelta < bestDelta ? current : best;
  });
}

async function loadPaymentMetadataByAsaasId(
  userId: string,
  asaasId: string | null
): Promise<Record<string, unknown> | null> {
  if (!asaasId) return null;
  const row = await prisma.paymentMetadata.findFirst({
    where: { userId, asaasId },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveViaPaymentMetadata(
  metas: Array<{ metadata: string; asaasId: string | null }>,
  pagamentos: Payment[],
  appointmentId: number,
  appointmentCreatedAt: Date
): Payment | null {
  for (const meta of metas) {
    try {
      const parsed = JSON.parse(meta.metadata || "{}") as Record<string, unknown>;
      const metaAppId =
        parsed.appointmentId != null ? parseInt(String(parsed.appointmentId), 10) : null;
      if (metaAppId !== appointmentId) continue;

      if (meta.asaasId) {
        const found = pagamentos.find((p) => p.asaasId === meta.asaasId);
        if (found) return found;
      }

      const charged = parsed.chargedAmount != null ? Number(parsed.chargedAmount) : NaN;
      const tipo = String(parsed.tipo || "");
      if (tipo === "agendamento" && Number.isFinite(charged)) {
        const symbolic = pagamentos.find(
          (p) =>
            p.type === "agendamento" &&
            isSymbolicApprovedPayment(p, parsed) &&
            paymentNearAppointment(p, appointmentCreatedAt)
        );
        if (symbolic) return symbolic;
      }
    } catch {
      // metadata malformado — ignorar
    }
  }
  return null;
}

/**
 * Localiza o Payment aprovado associado ao agendamento para reembolso outbound.
 * Ordem: appointmentId direto → appointmentIds → remarcação encadeada → cupom → PaymentMetadata → simbólico → proximidade via cupons.
 */
export async function resolveAppointmentRefundPayment(
  appointmentId: number,
  userId: string,
  appointmentCreatedAt: Date
): Promise<Payment | null> {
  const direct = await prisma.payment.findFirst({
    where: { userId, status: "approved", appointmentId },
  });
  if (direct) return direct;

  const pagamentos = await prisma.payment.findMany({
    where: { userId, status: "approved" },
    orderBy: { createdAt: "desc" },
  });

  const byAppointmentIds = pagamentos.find((p) => paymentBelongsToAppointment(p, appointmentId));
  if (byAppointmentIds) return byAppointmentIds;

  const cupomRemarcacaoUsado = await prisma.coupon.findFirst({
    where: { appointmentId, couponType: toPersistedCouponType("REFUND"), used: true },
    select: { id: true },
  });
  if (cupomRemarcacaoUsado) {
    const agendamentoOrigem = await prisma.appointment.findFirst({
      where: { refundCouponId: cupomRemarcacaoUsado.id },
      select: { id: true, createdAt: true },
    });
    if (agendamentoOrigem) {
      const encadeado = await resolveAppointmentRefundPayment(
        agendamentoOrigem.id,
        userId,
        agendamentoOrigem.createdAt
      );
      if (encadeado) return encadeado;
    }
  }

  const cupomNoAgendamento = await prisma.coupon.findFirst({
    where: {
      appointmentId,
      couponType: { not: toPersistedCouponType("REFUND") },
    },
    orderBy: { createdAt: "desc" },
    select: { paymentId: true },
  });
  if (cupomNoAgendamento?.paymentId) {
    const viaCupom = pagamentos.find((p) => p.id === cupomNoAgendamento.paymentId);
    if (viaCupom) return viaCupom;
  }

  const metas = await prisma.paymentMetadata.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { metadata: true, asaasId: true },
  });
  const viaMeta = resolveViaPaymentMetadata(metas, pagamentos, appointmentId, appointmentCreatedAt);
  if (viaMeta) return viaMeta;

  for (const payment of pagamentos) {
    if (payment.type !== "agendamento") continue;
    const metadata = await loadPaymentMetadataByAsaasId(userId, payment.asaasId);
    if (isSymbolicApprovedPayment(payment, metadata) && paymentNearAppointment(payment, appointmentCreatedAt)) {
      return payment;
    }
    if (
      isSymbolicApprovedPayment(payment) &&
      paymentNearAppointment(payment, appointmentCreatedAt)
    ) {
      return payment;
    }
  }

  const cuponsUsuario = await prisma.coupon.findMany({
    where: {
      paymentId: { in: pagamentos.map((p) => p.id) },
      couponType: { not: "reembolso" },
    },
    orderBy: { createdAt: "desc" },
    select: { paymentId: true, createdAt: true },
  });
  const viaCupomPagamento: Payment[] = [];
  for (const cupom of cuponsUsuario) {
    if (!cupom.paymentId) continue;
    const payment = pagamentos.find((p) => p.id === cupom.paymentId);
    if (!payment) continue;
    if (cupom.createdAt <= appointmentCreatedAt && paymentNearAppointment(payment, appointmentCreatedAt)) {
      viaCupomPagamento.push(payment);
    }
  }
  const closestViaCupom = pickClosestPaymentToAppointment(viaCupomPagamento, appointmentCreatedAt);
  if (closestViaCupom) return closestViaCupom;

  return null;
}

export async function resolveAppointmentBookingCoupon(
  appointmentId: number,
  userId: string,
  appointmentCreatedAt: Date
): Promise<{
  id: string;
  code: string;
  couponType: string | null;
  paymentId: string | null;
  userPlanId: string | null;
} | null> {
  const direto = await prisma.coupon.findFirst({
    where: {
      appointmentId,
      couponType: { not: "reembolso" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      couponType: true,
      paymentId: true,
      userPlanId: true,
    },
  });
  if (direto) return direto;

  const payment = await resolveAppointmentRefundPayment(
    appointmentId,
    userId,
    appointmentCreatedAt
  );
  if (!payment) return null;

  return prisma.coupon.findFirst({
    where: {
      paymentId: payment.id,
      couponType: { not: "reembolso" },
      createdAt: { lte: appointmentCreatedAt },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      couponType: true,
      paymentId: true,
      userPlanId: true,
    },
  });
}
