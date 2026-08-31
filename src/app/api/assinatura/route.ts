import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { SUBSCRIPTION_STATUS_LABELS } from "@/app/lib/subscription-states";
import { buildSubscriptionRefundPreview } from "@/app/lib/subscription-refund";
import { PLAN_CYCLE_SUBSTITUTED_REASON } from "@/app/lib/plan-definitions";

/**
 * GET /api/assinatura — Minha Assinatura (fonte: Subscription).
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        userPlan: {
          include: {
            coupons: {
              where: {
                OR: [
                  { cancelReason: null },
                  { cancelReason: { not: PLAN_CYCLE_SUBSTITUTED_REASON } },
                ],
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = await Promise.all(
      subscriptions.map(async (s) => {
        const preview = await buildSubscriptionRefundPreview(s.userPlanId);
        const monthBenefits = (s.userPlan.coupons || []).filter((c) => {
          if (c.used) return false;
          if (c.expiresAt && c.expiresAt < new Date()) return false;
          if (c.cancelReason === PLAN_CYCLE_SUBSTITUTED_REASON) return false;
          return true;
        });
        return {
          id: s.id,
          status: s.status,
          statusLabel:
            SUBSCRIPTION_STATUS_LABELS[
              s.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
            ] || s.status,
          paymentMethod: s.paymentMethod,
          billingDay: s.billingDay,
          nextBillingDate: s.nextBillingDate.toISOString(),
          lastBillingDate: s.lastBillingDate?.toISOString() || null,
          cyclesRemaining: s.cyclesRemaining,
          failureCount: s.failureCount,
          gracePeriodEndsAt: s.gracePeriodEndsAt?.toISOString() || null,
          asaasSubscriptionId: s.asaasSubscriptionId,
          userPlan: {
            id: s.userPlan.id,
            planId: s.userPlan.planId,
            planName: s.userPlan.planName,
            modo: s.userPlan.modo,
            amount: s.userPlan.amount,
            status: s.userPlan.status,
            startDate: s.userPlan.startDate.toISOString(),
            endDate: s.userPlan.endDate?.toISOString() || null,
            refundProcessedAt: s.userPlan.refundProcessedAt?.toISOString() || null,
            refundAmount: s.userPlan.refundAmount,
          },
          benefitsThisMonth: monthBenefits.map((c) => ({
            id: c.id,
            code: c.code,
            serviceType: c.serviceType,
            discountType: c.discountType,
            used: c.used,
            expiresAt: c.expiresAt?.toISOString() || null,
          })),
          cancelPreview: preview,
        };
      })
    );

    return NextResponse.json({ subscriptions: items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[api/assinatura]", err);
    return NextResponse.json({ error: "Erro ao carregar assinatura." }, { status: 500 });
  }
}
