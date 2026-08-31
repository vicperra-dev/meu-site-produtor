/**
 * GO-H8 — Categorias oficiais de cupom (persistidas, não inferidas na UI).
 * Pedido Raiz → Ordem → Cupom (crédito rastreável).
 */
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";
import {
  resolveCanonicalCouponType,
  type CanonicalCouponType,
  type CouponTypeInput,
} from "@/app/lib/domain/coupon-types";

export const COUPON_CATEGORIES = [
  "servico",
  "producao",
  "reembolso",
  "plano",
  "desconto",
] as const;

export type CouponCategory = (typeof COUPON_CATEGORIES)[number];

const SERVICE_TYPES = new Set(["sessao", "captacao"]);
const PRODUCTION_TYPES = new Set([
  "mix",
  "master",
  "sonoplastia",
  "beat1",
  "beat2",
  "beat3",
  "beat4",
  "beat_mix_master",
  "mix_master",
  "producao_completa",
]);

export function couponCategoryLabel(category: CouponCategory | string | null | undefined): string {
  switch (String(category || "")) {
    case "servico":
      return "Serviço";
    case "producao":
      return "Produção";
    case "reembolso":
      return "Reembolso";
    case "plano":
      return "Plano";
    case "desconto":
      return "Desconto";
    default:
      return "Cupom";
  }
}

export function categoryFromServiceType(serviceType?: string | null): CouponCategory | null {
  if (!serviceType) return null;
  const st = normalizeServiceTypeId(serviceType);
  if (SERVICE_TYPES.has(st)) return "servico";
  if (PRODUCTION_TYPES.has(st) || st.startsWith("beat")) return "producao";
  return null;
}

/**
 * Determina a categoria na criação. Nunca alterar manualmente depois.
 */
export function resolveCouponCategory(params: {
  canonicalType: CanonicalCouponType;
  serviceType?: string | null;
  discountType?: string | null;
}): CouponCategory {
  const { canonicalType, serviceType, discountType } = params;

  if (canonicalType === "REBOOK" || canonicalType === "REFUND") return "reembolso";
  if (canonicalType === "DISCOUNT") return "desconto";
  if (canonicalType === "PLAN") {
    if (discountType === "percent" || discountType === "fixed") return "desconto";
    if (discountType === "service" && serviceType) {
      return categoryFromServiceType(serviceType) || "plano";
    }
    return "plano";
  }

  if (
    canonicalType === "SERVICE" ||
    canonicalType === "TEST" ||
    canonicalType === "BONUS"
  ) {
    const fromSvc = categoryFromServiceType(serviceType);
    if (fromSvc) return fromSvc;
    if (discountType === "percent" || discountType === "fixed") return "desconto";
    return "servico";
  }

  return "servico";
}

export function resolveCouponCategoryFromRow(coupon: CouponTypeInput & {
  couponCategory?: string | null;
}): CouponCategory {
  const persisted = String(coupon.couponCategory || "").toLowerCase();
  if ((COUPON_CATEGORIES as readonly string[]).includes(persisted)) {
    return persisted as CouponCategory;
  }
  return resolveCouponCategory({
    canonicalType: resolveCanonicalCouponType(coupon),
    serviceType: coupon.serviceType,
    discountType: coupon.discountType,
  });
}
