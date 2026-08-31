/**
 * HS-03A — Tipos canônicos de Cupom.
 *
 * Persistência legado: "plano" | "agendamento" | "reembolso" (+ futuros literais canônicos).
 * Consumidores devem usar resolveCanonicalCouponType() — nunca includes/startsWith/endsWith
 * para identificar tipo.
 */

export const CANONICAL_COUPON_TYPES = [
  "SERVICE",
  "PLAN",
  "DISCOUNT",
  "REFUND",
  "REBOOK",
  "TEST",
  "BONUS",
] as const;

export type CanonicalCouponType = (typeof CANONICAL_COUPON_TYPES)[number];

/** Valores graváveis em Coupon.couponType (DB permanece string). */
export const PERSISTED_COUPON_TYPE = {
  PLAN: "plano",
  SERVICE: "agendamento",
  REFUND: "reembolso",
  DISCOUNT: "desconto",
  REBOOK: "remarcacao",
  TEST: "test",
  BONUS: "bonus",
} as const;

export type CouponTypeInput = {
  couponType?: string | null;
  discountType?: string | null;
  serviceType?: string | null;
  paymentId?: string | null;
  userPlanId?: string | null;
  appointmentId?: number | null;
  refundAsaasStatus?: string | null;
  code?: string | null;
};

const LEGACY_TO_CANONICAL: Record<string, CanonicalCouponType> = {
  plano: "PLAN",
  plan: "PLAN",
  agendamento: "SERVICE",
  service: "SERVICE",
  servico: "SERVICE",
  reembolso: "REFUND",
  refund: "REFUND",
  desconto: "DISCOUNT",
  discount: "DISCOUNT",
  remarcacao: "REBOOK",
  rebook: "REBOOK",
  test: "TEST",
  teste: "TEST",
  bonus: "BONUS",
  SERVICE: "SERVICE",
  PLAN: "PLAN",
  DISCOUNT: "DISCOUNT",
  REFUND: "REFUND",
  REBOOK: "REBOOK",
  TEST: "TEST",
  BONUS: "BONUS",
};

/**
 * Normaliza um cupom para o enum canônico.
 * Heurísticas de legado ficam aqui (único lugar) — não espalhar no produto.
 */
export function resolveCanonicalCouponType(coupon: CouponTypeInput): CanonicalCouponType {
  const raw = String(coupon.couponType || "").trim();
  const mapped = LEGACY_TO_CANONICAL[raw] || LEGACY_TO_CANONICAL[raw.toLowerCase()];
  if (mapped) {
    if (mapped === "PLAN" && coupon.discountType === "percent") return "DISCOUNT";
    if (mapped === "PLAN" && coupon.discountType === "fixed" && !coupon.serviceType) {
      return "DISCOUNT";
    }
    return mapped;
  }

  if (coupon.refundAsaasStatus === "simulated") return "TEST";
  if (coupon.userPlanId && coupon.discountType === "service") return "SERVICE";
  if (coupon.userPlanId) return "PLAN";
  if (coupon.paymentId && coupon.discountType === "service") return "SERVICE";
  if (coupon.appointmentId && coupon.discountType === "fixed") return "REFUND";

  return "PLAN";
}

/** Valor a persistir em Coupon.couponType a partir do canônico. */
export function toPersistedCouponType(type: CanonicalCouponType): string {
  return PERSISTED_COUPON_TYPE[type];
}

export function isRefundCoupon(coupon: CouponTypeInput): boolean {
  return resolveCanonicalCouponType(coupon) === "REFUND";
}

export function isPlanCoupon(coupon: CouponTypeInput): boolean {
  const t = resolveCanonicalCouponType(coupon);
  return t === "PLAN" || (t === "DISCOUNT" && Boolean(coupon.userPlanId));
}

export function isServiceCoupon(coupon: CouponTypeInput): boolean {
  const t = resolveCanonicalCouponType(coupon);
  if (t === "SERVICE" || t === "REBOOK") return true;
  const st = String(coupon.serviceType || "");
  if (st.startsWith("percent_")) return false;
  if (
    coupon.discountType === "service" &&
    st &&
    (t === "TEST" || t === "PLAN" || t === "BONUS" || t === "REFUND")
  ) {
    return true;
  }
  return false;
}

export function isDiscountCoupon(coupon: CouponTypeInput): boolean {
  return resolveCanonicalCouponType(coupon) === "DISCOUNT";
}

export function isTestCoupon(coupon: CouponTypeInput): boolean {
  return resolveCanonicalCouponType(coupon) === "TEST";
}

export function couponTypeLabel(type: CanonicalCouponType): string {
  switch (type) {
    case "SERVICE":
      return "Serviço";
    case "PLAN":
      return "Plano";
    case "DISCOUNT":
      return "Desconto";
    case "REFUND":
      return "Reembolso";
    case "REBOOK":
      return "Remarcação";
    case "TEST":
      return "Teste";
    case "BONUS":
      return "Bônus";
    default:
      return type;
  }
}

/** Origin legado usado em UIs (plano | agendamento | reembolso). */
export type CouponOrigin = "plano" | "agendamento" | "reembolso";

export function canonicalToOrigin(
  type: CanonicalCouponType,
  coupon?: CouponTypeInput
): CouponOrigin {
  if (type === "REFUND") return "reembolso";
  if (type === "SERVICE" || type === "REBOOK") return "agendamento";
  if (type === "TEST") {
    if (coupon?.userPlanId) return "plano";
    if (coupon?.paymentId) return "agendamento";
    return "plano";
  }
  return "plano";
}
