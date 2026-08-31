/**
 * GO-H10C — Gate de plano/assinatura ativa.
 * Assinatura é a fonte comercial; UserPlan.active permanece compatível.
 */
import { prisma } from "@/app/lib/prisma";
import { findActiveSubscriptionForUser } from "@/app/lib/subscription-lifecycle";

export const ACTIVE_PLAN_BLOCK_MESSAGE =
  "Você já possui um plano ativo. Cancele o plano atual em Minha Conta antes de assinar outro.";

export async function findActiveUserPlan(userId: string) {
  const sub = await findActiveSubscriptionForUser(userId);
  if (sub?.userPlan) return sub.userPlan;

  return prisma.userPlan.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
}
