/**
 * GO-H10B — Acesso oficial a promoções exclusivas do Shopping.
 * Derivado do plano ativo via PLAN_DEFINITIONS.hasPromotionAccess.
 */
import { prisma } from "@/app/lib/prisma";
import { planHasPromotionAccess } from "@/app/lib/plan-definitions";

export async function userHasPromotionAccess(userId: string): Promise<boolean> {
  if (!userId) return false;
  const active = await prisma.userPlan.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: { planId: true },
  });
  if (!active) return false;
  return planHasPromotionAccess(active.planId);
}

/** Catálogo interno de promoções exclusivas (Shopping). */
export type ShoppingPromotion = {
  id: string;
  title: string;
  description: string;
  exclusive: true;
};

const EXCLUSIVE_PROMOTIONS: ShoppingPromotion[] = [
  {
    id: "promo-beats-sazonais",
    title: "Beats sazonais",
    description: "Packs promocionais e lançamentos exclusivos para assinantes Prata e Ouro.",
    exclusive: true,
  },
  {
    id: "promo-merch",
    title: "Merch do estúdio",
    description: "Itens e drops exclusivos do Shopping THouse Rec.",
    exclusive: true,
  },
];

export function listExclusivePromotions(): ShoppingPromotion[] {
  return EXCLUSIVE_PROMOTIONS.map((p) => ({ ...p }));
}

export async function getShoppingPromotionsForUser(userId: string | null): Promise<{
  hasPromotionAccess: boolean;
  promotions: ShoppingPromotion[];
}> {
  const hasPromotionAccess = userId ? await userHasPromotionAccess(userId) : false;
  return {
    hasPromotionAccess,
    promotions: hasPromotionAccess ? listExclusivePromotions() : [],
  };
}
