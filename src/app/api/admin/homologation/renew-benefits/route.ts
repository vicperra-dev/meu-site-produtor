import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { renewDuePlanBenefits } from "@/app/lib/plan-benefit-renewal";
import { prisma } from "@/app/lib/prisma";
import { countPlanCycleCoupons, PLAN_CYCLE_SUBSTITUTED_REASON } from "@/app/lib/plan-definitions";

/**
 * POST /api/admin/homologation/renew-benefits
 * Força renovação do ciclo mensal (QA GO-H10B).
 * Body: { userPlanId } OU { paymentDbId }
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    let userPlanId = String(body.userPlanId || "");
    const paymentDbId = String(body.paymentDbId || "");

    if (!userPlanId && paymentDbId) {
      const coupon = await prisma.coupon.findFirst({
        where: { paymentId: paymentDbId, userPlanId: { not: null } },
        select: { userPlanId: true },
        orderBy: { createdAt: "desc" },
      });
      userPlanId = coupon?.userPlanId || "";
    }

    if (!userPlanId) {
      return NextResponse.json(
        { error: "Informe userPlanId ou paymentDbId com plano vinculado." },
        { status: 400 }
      );
    }

    const plan = await prisma.userPlan.findUnique({ where: { id: userPlanId } });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    }

    const beforeUnused = await prisma.coupon.count({
      where: {
        userPlanId,
        used: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const result = await renewDuePlanBenefits({ forceUserPlanId: userPlanId });

    const activeCoupons = await prisma.coupon.findMany({
      where: {
        userPlanId,
        used: false,
        expiresAt: { gt: new Date() },
        NOT: { cancelReason: PLAN_CYCLE_SUBSTITUTED_REASON },
      },
      select: {
        id: true,
        serviceType: true,
        discountType: true,
        discountValue: true,
        couponCategory: true,
      },
    });

    const substituted = await prisma.coupon.count({
      where: { userPlanId, cancelReason: PLAN_CYCLE_SUBSTITUTED_REASON },
    });

    return NextResponse.json({
      ok: true,
      userPlanId,
      beforeUnused,
      expectedCycleCoupons: countPlanCycleCoupons(plan.planId),
      activeCoupons,
      substitutedTotal: substituted,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[homologation/renew-benefits]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
