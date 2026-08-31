import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { buildSubscriptionRefundPreview } from "@/app/lib/subscription-refund";

/**
 * GET /api/assinatura/cancel-preview?userPlanId=
 * Resumo antes de cancelar (benefícios usados/não usados + reembolso estimado).
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const userPlanId = new URL(req.url).searchParams.get("userPlanId");
    if (!userPlanId) {
      return NextResponse.json({ error: "userPlanId obrigatório" }, { status: 400 });
    }

    const plan = await prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: { subscription: true },
    });
    if (!plan || plan.userId !== user.id) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    const preview = await buildSubscriptionRefundPreview(userPlanId);
    return NextResponse.json({
      preview,
      subscriptionStatus: plan.subscription?.status || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
