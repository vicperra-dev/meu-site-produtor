import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { SUBSCRIPTION_STATUS_LABELS } from "@/app/lib/subscription-states";
import { buildSubscriptionRefundPreview } from "@/app/lib/subscription-refund";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";

/**
 * GET /api/admin/assinaturas — gestão completa de assinaturas.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const status = new URL(req.url).searchParams.get("status");
    const subscriptions = await prisma.subscription.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nomeArtistico: true,
            nomeCompleto: true,
          },
        },
        userPlan: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const items = subscriptions.map((s) => ({
      id: s.id,
      status: s.status,
      statusLabel:
        SUBSCRIPTION_STATUS_LABELS[s.status as keyof typeof SUBSCRIPTION_STATUS_LABELS] ||
        s.status,
      paymentMethod: s.paymentMethod,
      billingDay: s.billingDay,
      nextBillingDate: s.nextBillingDate,
      lastBillingDate: s.lastBillingDate,
      cyclesRemaining: s.cyclesRemaining,
      failureCount: s.failureCount,
      gracePeriodEndsAt: s.gracePeriodEndsAt,
      asaasSubscriptionId: s.asaasSubscriptionId,
      rootPaymentId: s.rootPaymentId,
      user: s.user,
      userPlan: {
        id: s.userPlan.id,
        planId: s.userPlan.planId,
        planName: s.userPlan.planName,
        modo: s.userPlan.modo,
        amount: s.userPlan.amount,
        status: s.userPlan.status,
        startDate: s.userPlan.startDate,
        endDate: s.userPlan.endDate,
        refundAmount: s.userPlan.refundAmount,
        refundAsaasStatus: s.userPlan.refundAsaasStatus,
        refundProcessedAt: s.userPlan.refundProcessedAt,
      },
    }));

    return NextResponse.json({
      subscriptions: items,
      totals: {
        active: items.filter((i) => i.status === "active").length,
        delinquent: items.filter((i) => i.status === "delinquent").length,
        suspended: items.filter((i) => i.status === "suspended").length,
        cancelled: items.filter((i) => i.status === "cancelled").length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET detail with refund preview — /api/admin/assinaturas?userPlanId=
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const userPlanId = String(body.userPlanId || "");
    if (!userPlanId) {
      return NextResponse.json({ error: "userPlanId obrigatório" }, { status: 400 });
    }
    const preview = await buildSubscriptionRefundPreview(userPlanId);
    return NextResponse.json({ preview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
