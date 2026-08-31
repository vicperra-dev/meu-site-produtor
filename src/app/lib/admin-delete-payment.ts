/**
 * Gate read-only para exclusão admin de Payment (F8 / X4).
 * Apenas decide allowed/denied — a mutação `prisma.payment.delete` fica na API admin.
 */
import { prisma } from "@/app/lib/prisma";
import { isSimulationCoupon } from "@/app/lib/payment-simulation-coupon-gate";
import {
  isSymbolicApprovedPayment,
  parsePaymentAppointmentIds,
} from "@/app/lib/symbolic-payment";

export type AdminDeletePaymentDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Avalia se um pagamento pode ser excluído pelo admin.
 * @returns `null` se o Payment não existir.
 */
export async function canAdminDeletePayment(
  paymentId: string
): Promise<AdminDeletePaymentDecision | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      type: true,
      amount: true,
      asaasId: true,
      appointmentId: true,
      appointmentIds: true,
      userId: true,
    },
  });

  if (!payment) {
    return null;
  }

  const status = String(payment.status || "").trim().toLowerCase();

  if (status === "pending" || status === "rejected") {
    return { allowed: true };
  }

  const linkedAppointmentIds = parsePaymentAppointmentIds(payment);
  const isSymbolic = isSymbolicApprovedPayment(payment);

  const coupons = await prisma.coupon.findMany({
    where: { paymentId: payment.id },
    select: {
      code: true,
      used: true,
      couponType: true,
      refundAsaasStatus: true,
      userPlanId: true,
      payment: { select: { amount: true, type: true, status: true } },
    },
  });

  const hasActiveRealCoupon = coupons.some((coupon) => {
    if (coupon.used) return false;
    return !isSimulationCoupon({
      code: coupon.code,
      couponType: coupon.couponType,
      refundAsaasStatus: coupon.refundAsaasStatus,
      payment: coupon.payment,
    });
  });

  if (hasActiveRealCoupon) {
    return { allowed: false, reason: "Pagamento possui cupons ativos." };
  }

  if (payment.type === "plano") {
    const activePlanCoupon = coupons.find((coupon) => coupon.userPlanId != null);
    if (activePlanCoupon?.userPlanId) {
      const userPlan = await prisma.userPlan.findUnique({
        where: { id: activePlanCoupon.userPlanId },
        select: { status: true },
      });
      if (userPlan?.status === "active") {
        return { allowed: false, reason: "Pagamento possui plano ativo vinculado." };
      }
    }
  }

  if (status === "approved" && linkedAppointmentIds.length > 0) {
    return {
      allowed: false,
      reason: "Pagamento aprovado vinculado a agendamento ativo.",
    };
  }

  if (payment.asaasId && !isSymbolic) {
    return { allowed: false, reason: "Pagamento possui integração financeira ativa." };
  }

  if (isSymbolic && linkedAppointmentIds.length === 0) {
    return { allowed: true };
  }

  if (status === "approved") {
    return {
      allowed: false,
      reason: "Pagamento aprovado não pode ser excluído.",
    };
  }

  return { allowed: true };
}
