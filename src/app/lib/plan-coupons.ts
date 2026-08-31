/**
 * GO-H10B — Geração de cupons de plano a partir de PLAN_DEFINITIONS.
 * Um ciclo mensal = um conjunto de benefícios; sem acúmulo entre ciclos.
 */
import { prisma } from "@/app/lib/prisma";
import { createDomainCoupon } from "@/app/lib/domain/coupon-domain";
import { createServiceOrdersWithCoupons } from "@/app/lib/service-orders/persist";
import {
  computeBenefitCycleEnd,
  getPlanDefinition,
  type PlanId,
} from "@/app/lib/plan-definitions";

export async function generatePlanServiceCoupons(params: {
  userId: string;
  userPlanId: string;
  planId: string;
  planName: string;
  modo: string;
  paymentId?: string | null;
  isTestPayment?: boolean;
  /** Início do ciclo mensal (default: agora). */
  cycleStart?: Date;
}) {
  const {
    userId,
    userPlanId,
    planId,
    paymentId,
    isTestPayment = false,
    cycleStart = new Date(),
  } = params;

  const def = getPlanDefinition(planId);
  if (!def) {
    console.warn(`[Plan Coupons] Plano desconhecido: ${planId}`);
    return [];
  }

  const userPlan = await prisma.userPlan.findUnique({
    where: { id: userPlanId },
  });
  if (!userPlan) {
    console.warn(`[Plan Coupons] Plano não encontrado: ${userPlanId}`);
    return [];
  }

  return prisma.$transaction(async (tx) => {
    if (paymentId) {
      const byPayment = await tx.coupon.findMany({
        where: { paymentId },
        orderBy: { createdAt: "asc" },
      });
      if (byPayment.length > 0) return byPayment;
    }

    const expiresAt = computeBenefitCycleEnd(cycleStart);
    // Nunca ultrapassar a vigência do plano + margem zero: ciclo cabe na assinatura.
    if (userPlan.endDate && expiresAt > userPlan.endDate) {
      // Ainda gera com validade até o fim do ciclo; plano anual cobre 12 ciclos.
    }

    const coupons = [];
    const serviceLines: { id: string; quantidade: number }[] = [];

    for (const grant of def.cycleBenefits) {
      if (grant.kind === "discount") {
        const serviceType =
          grant.target === "beats" ? "percent_beats" : "percent_servicos";
        for (let i = 0; i < grant.quantity; i++) {
          const coupon = await createDomainCoupon(tx, {
            canonicalType: isTestPayment ? "TEST" : "PLAN",
            discountType: "percent",
            discountValue: grant.percent,
            serviceType,
            userPlanId: userPlan.id,
            paymentId: paymentId ?? null,
            assignedUserId: userId,
            expiresAt,
            couponCategory: "desconto",
          });
          coupons.push(coupon);
        }
        continue;
      }

      // Serviços/produções atômicos — sem expandir mix_master (GO-H10B).
      serviceLines.push({
        id: grant.serviceType,
        quantidade: grant.quantity,
      });
      for (let i = 0; i < grant.quantity; i++) {
        const coupon = await createDomainCoupon(tx, {
          canonicalType: isTestPayment ? "TEST" : "PLAN",
          discountType: "service",
          discountValue: 0,
          serviceType: grant.serviceType,
          userPlanId: userPlan.id,
          paymentId: paymentId ?? null,
          assignedUserId: userId,
          expiresAt,
        });
        coupons.push(coupon);
      }
    }

    if (paymentId && serviceLines.length > 0) {
      await createServiceOrdersWithCoupons({
        db: tx,
        userId,
        paymentId,
        services: serviceLines,
        beats: [],
        coupons: coupons.filter((c) => c.discountType === "service"),
      });
    }

    await tx.userPlan.update({
      where: { id: userPlan.id },
      data: { lastBenefitCycleAt: cycleStart },
    });

    return coupons;
  });
}

export function expectedCouponCountForPlan(planId: PlanId | string): number {
  const def = getPlanDefinition(planId);
  if (!def) return 0;
  return def.cycleBenefits.reduce((n, g) => n + g.quantity, 0);
}
