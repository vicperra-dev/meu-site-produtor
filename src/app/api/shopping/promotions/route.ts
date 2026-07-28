import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { getShoppingPromotionsForUser } from "@/app/lib/plan-promotion-access";

/**
 * GO-H10B — Promoções exclusivas do Shopping.
 * Sem plano Prata/Ouro ativo → lista vazia (nunca vaza conteúdo exclusivo).
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    const result = await getShoppingPromotionsForUser(user?.id ?? null);
    return NextResponse.json({
      hasPromotionAccess: result.hasPromotionAccess,
      promotions: result.promotions,
    });
  } catch (e) {
    console.error("[shopping/promotions]", e);
    return NextResponse.json(
      { hasPromotionAccess: false, promotions: [], error: "Falha ao carregar promoções." },
      { status: 500 }
    );
  }
}
