/**
 * GO-H10C — Estados oficiais da Assinatura (fonte de verdade comercial).
 * Nunca usar Payment como indicador de assinatura ativa.
 */
export const SUBSCRIPTION_STATUSES = [
  "active",
  "pending",
  "cancelled",
  "expired",
  "delinquent",
  "suspended",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Ativa",
  pending: "Pendente",
  cancelled: "Cancelada",
  expired: "Expirada",
  delinquent: "Inadimplente",
  suspended: "Suspensa",
};

export function isSubscriptionCommerciallyActive(
  status: string | null | undefined
): boolean {
  return status === "active";
}

/** Benefícios (H10B) só renovam se a assinatura estiver ativa. */
export function subscriptionAllowsBenefitRenewal(
  status: string | null | undefined
): boolean {
  return status === "active";
}

/** Dias de tolerância após falha de cobrança antes da suspensão. */
export const SUBSCRIPTION_GRACE_DAYS = 5;
/** Tentativas máximas antes de cancelar por inadimplência. */
export const SUBSCRIPTION_MAX_FAILURES = 3;
