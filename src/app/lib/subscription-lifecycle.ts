/**
 * GO-H10C — Ciclo de vida da Assinatura (entidade comercial oficial).
 * Benefícios continuam exclusivamente via GO-H10B (plan-coupons / renewDuePlanBenefits).
 */
import { prisma } from "@/app/lib/prisma";
import { addCalendarMonths } from "@/app/lib/plan-definitions";
import {
  SUBSCRIPTION_GRACE_DAYS,
  SUBSCRIPTION_MAX_FAILURES,
  subscriptionAllowsBenefitRenewal,
  type SubscriptionStatus,
} from "@/app/lib/subscription-states";
import { renewDuePlanBenefits } from "@/app/lib/plan-benefit-renewal";
import { cancelAsaasSubscription, createAsaasSubscription } from "@/app/lib/asaas-subscriptions";
import { logFinancialInfo, logFinancialFailure } from "@/app/lib/financial-ops-log";

export type EnsureSubscriptionInput = {
  userId: string;
  userPlanId: string;
  modo: string;
  paymentMethod?: string | null;
  billingDay?: number;
  endDate: Date;
  startDate: Date;
  /** Vincular assinatura Asaas quando disponível (cartão). */
  asaasCustomerId?: string | null;
  asaasSubscriptionId?: string | null;
  rootPaymentId?: string | null;
  createRemote?: boolean;
  planValue?: number;
  planDescription?: string;
};

function normalizePaymentMethod(raw?: string | null): string {
  const m = String(raw || "pix").toLowerCase();
  if (m.includes("credito") || m === "credit_card" || m === "cartao") return "cartao_credito";
  if (m.includes("debito") || m === "debit_card") return "cartao_debito";
  if (m.includes("boleto")) return "boleto";
  return "pix";
}

export async function ensureLocalSubscription(input: EnsureSubscriptionInput) {
  const existing = await prisma.subscription.findUnique({
    where: { userPlanId: input.userPlanId },
  });
  if (existing) return existing;

  const billingDay = Math.min(28, Math.max(1, input.billingDay || input.startDate.getDate()));
  const modo = String(input.modo || "mensal").toLowerCase();
  const cyclesRemaining = modo === "anual" ? 11 : null; // 1º ciclo já concedido no pagamento

  let asaasSubscriptionId = input.asaasSubscriptionId || null;

  // Tentativa de cobrança recorrente no Asaas (desacoplada — falha não bloqueia assinatura local).
  if (
    input.createRemote &&
    input.asaasCustomerId &&
    !asaasSubscriptionId &&
    (normalizePaymentMethod(input.paymentMethod) === "cartao_credito" ||
      normalizePaymentMethod(input.paymentMethod) === "pix")
  ) {
    try {
      const billingType =
        normalizePaymentMethod(input.paymentMethod) === "cartao_credito"
          ? "CREDIT_CARD"
          : "PIX";
      const cycle = modo === "anual" ? "YEARLY" : "MONTHLY";
      const remote = await createAsaasSubscription({
        customerId: input.asaasCustomerId,
        billingType,
        value: Number(input.planValue || 0),
        cycle,
        billingDay,
        description: input.planDescription || "Assinatura THouse Rec",
        externalReference: input.userPlanId,
        metadata: { userPlanId: input.userPlanId, userId: input.userId },
      });
      asaasSubscriptionId = remote.id;
      logFinancialInfo({
        paymentId: input.rootPaymentId || null,
        provider: "asaas",
        providerPaymentId: remote.id,
        motivo: "Assinatura recorrente criada no Asaas",
        status: "ok",
        code: "SUBSCRIPTION_REMOTE_CREATED",
        extra: { userPlanId: input.userPlanId, billingType, cycle },
      });
    } catch (err) {
      logFinancialFailure({
        paymentId: input.rootPaymentId || null,
        provider: "asaas",
        motivo: err instanceof Error ? err.message : "Falha ao criar assinatura Asaas",
        status: "failed",
        code: "SUBSCRIPTION_REMOTE_CREATE_FAILED",
        extra: { userPlanId: input.userPlanId },
      });
    }
  }

  return prisma.subscription.create({
    data: {
      userId: input.userId,
      userPlanId: input.userPlanId,
      asaasSubscriptionId,
      paymentMethod: normalizePaymentMethod(input.paymentMethod),
      billingDay,
      status: "active" satisfies SubscriptionStatus,
      nextBillingDate: input.endDate,
      lastBillingDate: input.startDate,
      cyclesRemaining,
      failureCount: 0,
      rootPaymentId: input.rootPaymentId || null,
    },
  });
}

/**
 * Renovação comercial após cobrança Asaas aprovada.
 * Reutiliza H10B: substitui cupons não usados e gera novo ciclo.
 */
export async function renewSubscriptionAfterPaidCharge(params: {
  asaasSubscriptionId: string;
  paymentValue: number;
  asaasPaymentId?: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { asaasSubscriptionId: params.asaasSubscriptionId },
    include: { userPlan: true },
  });
  if (!subscription) {
    throw new Error(`Assinatura não encontrada: ${params.asaasSubscriptionId}`);
  }

  const modo = String(subscription.userPlan.modo || "mensal").toLowerCase();
  const now = new Date();
  const nextBillingDate =
    modo === "anual" ? addCalendarMonths(now, 12) : addCalendarMonths(now, 1);
  const newEndDate =
    modo === "anual"
      ? addCalendarMonths(subscription.userPlan.endDate || now, 12)
      : addCalendarMonths(subscription.userPlan.endDate || now, 1);

  await prisma.userPlan.update({
    where: { id: subscription.userPlanId },
    data: { endDate: newEndDate, status: "active" },
  });

  const cyclesRemaining =
    modo === "anual"
      ? 11
      : subscription.cyclesRemaining != null
        ? Math.max(0, subscription.cyclesRemaining)
        : null;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      lastBillingDate: now,
      nextBillingDate,
      failureCount: 0,
      lastFailureAt: null,
      gracePeriodEndsAt: null,
      cyclesRemaining,
    },
  });

  // GO-H10B — renovação de benefícios (sem fork)
  const renewal = await renewDuePlanBenefits({
    forceUserPlanId: subscription.userPlanId,
    now,
  });

  return { subscriptionId: subscription.id, renewal, newEndDate, nextBillingDate };
}

/** Falha de cobrança → inadimplência com tolerância (não cancela na hora). */
export async function markSubscriptionPaymentFailed(asaasSubscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { asaasSubscriptionId },
  });
  if (!subscription) return null;

  const failureCount = (subscription.failureCount || 0) + 1;
  const gracePeriodEndsAt = new Date();
  gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + SUBSCRIPTION_GRACE_DAYS);

  let status: SubscriptionStatus = "delinquent";
  if (failureCount >= SUBSCRIPTION_MAX_FAILURES) {
    status = "suspended";
  }

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      failureCount,
      lastFailureAt: new Date(),
      gracePeriodEndsAt: status === "delinquent" ? gracePeriodEndsAt : subscription.gracePeriodEndsAt,
    },
  });
}

/** Cron: suspensão → cancelamento após tolerância esgotada. */
export async function processSubscriptionDelinquency(now = new Date()) {
  const delinquent = await prisma.subscription.findMany({
    where: { status: { in: ["delinquent", "suspended"] } },
    include: { userPlan: true },
  });

  const results: Array<{ id: string; action: string }> = [];

  for (const sub of delinquent) {
    if (
      sub.status === "delinquent" &&
      sub.gracePeriodEndsAt &&
      sub.gracePeriodEndsAt <= now
    ) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "suspended" },
      });
      results.push({ id: sub.id, action: "suspended" });
      continue;
    }

    if (
      sub.status === "suspended" &&
      sub.lastFailureAt &&
      addCalendarMonths(sub.lastFailureAt, 0).getTime() +
        SUBSCRIPTION_GRACE_DAYS * 2 * 864e5 <=
        now.getTime()
    ) {
      await cancelLocalSubscription(sub.id, { cancelRemote: true });
      results.push({ id: sub.id, action: "cancelled_after_suspension" });
    }
  }

  return results;
}

export async function cancelLocalSubscription(
  subscriptionId: string,
  opts?: { cancelRemote?: boolean }
) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return null;

  if (opts?.cancelRemote && sub.asaasSubscriptionId) {
    try {
      await cancelAsaasSubscription(sub.asaasSubscriptionId);
    } catch (e) {
      console.error("[Subscription] cancel remote failed:", e);
    }
  }

  await prisma.userPlan.update({
    where: { id: sub.userPlanId },
    data: { status: "cancelled" },
  });

  return prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "cancelled" },
  });
}

export async function findActiveSubscriptionForUser(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: "active",
      userPlan: {
        status: "active",
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
    },
    include: { userPlan: true },
    orderBy: { createdAt: "desc" },
  });
}

export { subscriptionAllowsBenefitRenewal };
