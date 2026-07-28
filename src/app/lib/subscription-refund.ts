/**
 * GO-H10C — Cálculo de reembolso com valores internos (PLAN_DEFINITIONS).
 * refund = max(0, valorPago − Σ benefícios utilizados).
 */
import { prisma } from "@/app/lib/prisma";
import {
  getInternalRefundUnit,
  getPlanDefinition,
  PLAN_CYCLE_SUBSTITUTED_REASON,
} from "@/app/lib/plan-definitions";

export type RefundBenefitLine = {
  couponId: string;
  code: string;
  serviceType: string;
  label: string;
  used: boolean;
  internalValue: number;
};

export type SubscriptionRefundPreview = {
  userPlanId: string;
  planId: string;
  planName: string;
  modo: string;
  amountPaid: number;
  used: RefundBenefitLine[];
  unused: RefundBenefitLine[];
  usedInternalTotal: number;
  unusedInternalTotal: number;
  refundAmount: number;
  refundAvailable: boolean;
  message: string;
};

function couponServiceKey(c: {
  serviceType?: string | null;
  discountType?: string | null;
}): string {
  return String(c.serviceType || c.discountType || "unknown");
}

function couponLabel(serviceType: string): string {
  const map: Record<string, string> = {
    sessao: "Sessão",
    captacao: "Captação",
    mix: "Mix",
    master: "Master",
    beat1: "Beat",
    percent_servicos: "10% Serviços",
    percent_beats: "10% Beats",
  };
  return map[serviceType] || serviceType;
}

export async function buildSubscriptionRefundPreview(
  userPlanId: string
): Promise<SubscriptionRefundPreview | null> {
  const userPlan = await prisma.userPlan.findUnique({
    where: { id: userPlanId },
    include: {
      coupons: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!userPlan) return null;

  const def = getPlanDefinition(userPlan.planId);
  const amountPaid = Number(userPlan.amount) || 0;

  const used: RefundBenefitLine[] = [];
  const unused: RefundBenefitLine[] = [];

  for (const c of userPlan.coupons) {
    // Cupons já substituídos por ciclo não entram no cálculo comercial atual
    if (c.cancelReason === PLAN_CYCLE_SUBSTITUTED_REASON) continue;
    const serviceType = couponServiceKey(c);
    const internalValue = getInternalRefundUnit(userPlan.planId, serviceType);
    const line: RefundBenefitLine = {
      couponId: c.id,
      code: c.code,
      serviceType,
      label: couponLabel(serviceType),
      used: Boolean(c.used),
      internalValue,
    };
    if (c.used) used.push(line);
    else unused.push(line);
  }

  const usedInternalTotal = used.reduce((s, l) => s + l.internalValue, 0);
  const unusedInternalTotal = unused.reduce((s, l) => s + l.internalValue, 0);
  const raw = amountPaid - usedInternalTotal;
  const refundAmount = Math.max(0, Math.round(raw * 100) / 100);
  const refundAvailable = refundAmount > 0;

  return {
    userPlanId: userPlan.id,
    planId: userPlan.planId,
    planName: userPlan.planName || def?.nome || userPlan.planId,
    modo: userPlan.modo,
    amountPaid,
    used,
    unused,
    usedInternalTotal: Math.round(usedInternalTotal * 100) / 100,
    unusedInternalTotal: Math.round(unusedInternalTotal * 100) / 100,
    refundAmount,
    refundAvailable,
    message: refundAvailable
      ? "O valor do reembolso será calculado descontando apenas os benefícios efetivamente utilizados."
      : "Não há reembolso disponível: o valor dos benefícios utilizados é igual ou superior ao valor pago.",
  };
}
