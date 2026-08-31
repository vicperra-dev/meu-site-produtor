/**
 * GO-H10B — Renovação mensal dos benefícios (sem cobrança / sem reembolso).
 * Cupons não usados → marcados substituídos (histórico preservado).
 * Cupons usados → intactos.
 * Novos cupons do ciclo seguinte gerados via PLAN_DEFINITIONS.
 */
import { prisma } from "@/app/lib/prisma";
import {
  PLAN_CYCLE_SUBSTITUTED_REASON,
  computeBenefitCycleEnd,
} from "@/app/lib/plan-definitions";
import { generatePlanServiceCoupons } from "@/app/lib/plan-coupons";
import { subscriptionAllowsBenefitRenewal } from "@/app/lib/subscription-states";

export type RenewPlanBenefitsResult = {
  processed: number;
  renewed: string[];
  expiredPlans: string[];
  substitutedCoupons: number;
  generatedCoupons: number;
  skipped: Array<{ userPlanId: string; reason: string }>;
};

async function substituteUnusedPlanCoupons(userPlanId: string, now: Date) {
  const unused = await prisma.coupon.findMany({
    where: {
      userPlanId,
      used: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  if (unused.length === 0) return 0;

  const ids = unused.map((c) => c.id);
  await prisma.coupon.updateMany({
    where: { id: { in: ids } },
    data: {
      expiresAt: now,
      cancelReason: PLAN_CYCLE_SUBSTITUTED_REASON,
    },
  });

  await prisma.serviceOrder.updateMany({
    where: {
      couponId: { in: ids },
      phase: { in: ["awaiting_schedule", "solicitation"] },
    },
    data: { phase: "cancelled" },
  });

  return unused.length;
}

/**
 * Processa planos ativos cuja janela de ciclo mensal venceu.
 * `forceUserPlanId` — Homologação / QA: renova imediatamente um plano.
 */
export async function renewDuePlanBenefits(opts?: {
  now?: Date;
  forceUserPlanId?: string;
}): Promise<RenewPlanBenefitsResult> {
  const now = opts?.now ?? new Date();
  const renewed: string[] = [];
  const expiredPlans: string[] = [];
  const skipped: RenewPlanBenefitsResult["skipped"] = [];
  let substitutedCoupons = 0;
  let generatedCoupons = 0;

  const plans = await prisma.userPlan.findMany({
    where: opts?.forceUserPlanId
      ? { id: opts.forceUserPlanId }
      : { status: "active" },
    include: { subscription: true },
  });

  for (const plan of plans) {
    // GO-H10C: sem renovação de benefícios durante inadimplência/suspensão
    if (
      !opts?.forceUserPlanId &&
      plan.subscription &&
      !subscriptionAllowsBenefitRenewal(plan.subscription.status)
    ) {
      skipped.push({ userPlanId: plan.id, reason: "assinatura_inadimplente_ou_suspensa" });
      continue;
    }

    if (plan.endDate && plan.endDate <= now) {
      if (plan.status === "active") {
        await prisma.userPlan.update({
          where: { id: plan.id },
          data: { status: "inactive" },
        });
      }
      substitutedCoupons += await substituteUnusedPlanCoupons(plan.id, now);
      expiredPlans.push(plan.id);
      continue;
    }

    const cycleStart = plan.lastBenefitCycleAt || plan.startDate;
    const cycleEnd = computeBenefitCycleEnd(cycleStart);
    const forced = Boolean(opts?.forceUserPlanId);
    const due = forced || now >= cycleEnd;

    if (!due) {
      skipped.push({ userPlanId: plan.id, reason: "ciclo_ainda_vigente" });
      continue;
    }

    const nextCycleStart = forced ? now : cycleEnd;
    if (!forced && plan.endDate && nextCycleStart >= plan.endDate) {
      skipped.push({ userPlanId: plan.id, reason: "sem_proximo_ciclo_na_vigencia" });
      continue;
    }

    substitutedCoupons += await substituteUnusedPlanCoupons(plan.id, now);

    const coupons = await generatePlanServiceCoupons({
      userId: plan.userId,
      userPlanId: plan.id,
      planId: plan.planId,
      planName: plan.planName,
      modo: plan.modo,
      paymentId: null,
      isTestPayment: plan.planId === "teste",
      cycleStart: nextCycleStart,
    });

    generatedCoupons += coupons.length;
    renewed.push(plan.id);
  }

  return {
    processed: plans.length,
    renewed,
    expiredPlans,
    substitutedCoupons,
    generatedCoupons,
    skipped,
  };
}
