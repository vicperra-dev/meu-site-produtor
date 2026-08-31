/**
 * Resumo financeiro para apresentação administrativa.
 * Não altera checkout/Asaas: só classifica e formata dados já persistidos
 * + preço de catálogo (CHECKOUT_CATALOG) e desconto de domínio de cupom.
 */
import {
  CHECKOUT_CATALOG,
  resolveCanonicalServiceId,
} from "@/app/lib/service-catalog";
import {
  computePartnershipDiscount,
  isPromotionalPartnershipCoupon,
  parseApplicableServiceTypes,
  type CouponUseFields,
} from "@/app/lib/promotional-coupon";
import {
  couponTypeLabel,
  resolveCanonicalCouponType,
  type CouponTypeInput,
} from "@/app/lib/domain/coupon-types";
import { couponUsesExclusiveSchedulingPage } from "@/app/lib/domain/coupon-domain";
import { pickPrimaryCouponForDisplay } from "@/app/lib/coupon-selection";

export type AdminCouponKind =
  | "partnership"
  | "plan"
  | "refund"
  | "service"
  | "discount"
  | "rebook"
  | "test"
  | "bonus"
  | "none";

export type AdminPaymentChannel =
  | "asaas"
  | "coupon"
  | "simulation"
  | "mercadopago"
  | "unknown";

export type AdminFinancialCouponInput = CouponTypeInput &
  CouponUseFields & {
    id?: string;
    code?: string | null;
    discountValue?: number | null;
    maxDiscount?: number | null;
    couponCategory?: string | null;
    createdAt?: Date | string;
  };

export type AdminFinancialPaymentInput = {
  amount?: number | null;
  status?: string | null;
  paymentMethod?: string | null;
  provider?: string | null;
  asaasId?: string | null;
  mercadopagoId?: string | null;
};

export type AdminFinancialSummary = {
  originalAmount: number | null;
  discountAmount: number;
  finalAmount: number | null;
  amountsKnown: boolean;
  paymentChannel: AdminPaymentChannel;
  paymentLabel: string;
  couponCode: string | null;
  couponKind: AdminCouponKind;
  couponKindLabel: string;
  hasCoupon: boolean;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function catalogUnitPrice(tipo: string | null | undefined): number | null {
  const id = resolveCanonicalServiceId(tipo);
  if (!id) return null;
  const item = CHECKOUT_CATALOG[id];
  return item ? item.preco : null;
}

export function resolveAdminCouponKind(coupon: AdminFinancialCouponInput | null | undefined): AdminCouponKind {
  if (!coupon) return "none";
  if (isPromotionalPartnershipCoupon(coupon)) return "partnership";
  const canonical = resolveCanonicalCouponType(coupon);
  if (canonical === "REFUND") return "refund";
  if (canonical === "REBOOK") return "rebook";
  if (canonical === "TEST") return "test";
  if (canonical === "BONUS") return "bonus";
  if (canonical === "PLAN" || Boolean(coupon.userPlanId)) return "plan";
  if (couponUsesExclusiveSchedulingPage(coupon) || canonical === "SERVICE") return "service";
  if (canonical === "DISCOUNT") return "discount";
  return "discount";
}

export function adminCouponKindLabel(kind: AdminCouponKind): string {
  switch (kind) {
    case "partnership":
      return "Parceria";
    case "plan":
      return "Plano";
    case "refund":
      return "Reembolso";
    case "service":
      return "Serviço";
    case "discount":
      return "Desconto";
    case "rebook":
      return "Remarcação";
    case "test":
      return "Teste";
    case "bonus":
      return "Bônus";
    default:
      return "Nenhum";
  }
}

function couponAppliesToTipo(coupon: AdminFinancialCouponInput, tipo: string): boolean {
  const sku = resolveCanonicalServiceId(tipo);
  if (!sku) return false;
  if (couponUsesExclusiveSchedulingPage(coupon) || coupon.discountType === "service") {
    const expected = resolveCanonicalServiceId(coupon.serviceType);
    return expected != null && expected === sku;
  }
  if (isPromotionalPartnershipCoupon(coupon)) {
    const allowed = parseApplicableServiceTypes(coupon.applicableServiceTypes);
    if (!allowed) return true;
    return allowed.includes(sku);
  }
  return true;
}

function lineDiscount(params: {
  coupon: AdminFinancialCouponInput | null;
  tipo: string;
  original: number;
  siblingLines: Array<{ tipo: string; original: number }>;
}): number {
  const { coupon, tipo, original, siblingLines } = params;
  if (!coupon || original <= 0) return 0;
  const kind = resolveAdminCouponKind(coupon);

  if (kind === "service" || coupon.discountType === "service") {
    return couponAppliesToTipo(coupon, tipo) ? original : 0;
  }

  if (isPromotionalPartnershipCoupon(coupon)) {
    const services = siblingLines.map((line) => ({
      id: resolveCanonicalServiceId(line.tipo) || line.tipo,
      preco: line.original,
      quantidade: 1,
    }));
    const cartTotal = siblingLines.reduce((acc, line) => acc + line.original, 0);
    const { discount: totalDiscount, base } = computePartnershipDiscount({
      coupon: {
        ...coupon,
        discountType: String(coupon.discountType || "fixed"),
        discountValue: Number(coupon.discountValue || 0),
      },
      services,
      beats: [],
      cartTotal,
    });
    if (!couponAppliesToTipo(coupon, tipo) || base <= 0) return 0;
    return round2((original / base) * totalDiscount);
  }

  const dt = String(coupon.discountType || "");
  const value = Number(coupon.discountValue || 0);
  if (dt === "percent") {
    let d = (original * value) / 100;
    if (coupon.maxDiscount && d > coupon.maxDiscount) d = coupon.maxDiscount;
    return round2(Math.min(d, original));
  }
  if (dt === "fixed") {
    const eligible = siblingLines
      .filter((line) => couponAppliesToTipo(coupon, line.tipo))
      .reduce((acc, line) => acc + line.original, 0);
    if (eligible <= 0 || !couponAppliesToTipo(coupon, tipo)) return 0;
    const capped = Math.min(value, eligible);
    return round2((original / eligible) * capped);
  }
  return 0;
}

export function resolvePaymentChannel(
  payment: AdminFinancialPaymentInput | null | undefined,
  couponKind: AdminCouponKind,
  finalAmount: number | null
): AdminPaymentChannel {
  const provider = String(payment?.provider || "").toUpperCase();
  if (provider === "SIMULATION" || provider === "TEST") return "simulation";
  if (provider === "MERCADOPAGO" || payment?.mercadopagoId) return "mercadopago";
  if (provider === "ASAAS" || payment?.asaasId) return "asaas";
  if (payment && Number(payment.amount) > 0) return "asaas";
  if (couponKind !== "none" && (finalAmount === 0 || !payment)) return "coupon";
  if (payment) return "asaas";
  return "unknown";
}

export function adminPaymentLabel(channel: AdminPaymentChannel, couponKind: AdminCouponKind): string {
  if (channel === "asaas") return "Asaas";
  if (channel === "simulation") return "Simulação";
  if (channel === "mercadopago") return "Mercado Pago";
  if (channel === "coupon") {
    if (couponKind === "partnership") return "Cupom promocional";
    if (couponKind === "plan") return "Benefício de plano";
    if (couponKind === "refund") return "Cupom de reembolso";
    if (couponKind === "service") return "Cupom de serviço";
    return "Cupom";
  }
  return "Não informado";
}

export function resolveServiceFinancialSummary(params: {
  tipo: string;
  payment?: AdminFinancialPaymentInput | null;
  coupons?: AdminFinancialCouponInput[] | null;
  siblingTipos?: string[] | null;
}): AdminFinancialSummary {
  const coupons = params.coupons || [];
  const primary = pickPrimaryCouponForDisplay(
    coupons
      .filter((c) => c.id)
      .map((c) => ({
        ...c,
        id: String(c.id),
        paymentId: c.paymentId ?? null,
        userPlanId: c.userPlanId ?? null,
        couponType: String(c.couponType || ""),
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(0),
      }))
  );
  const coupon = (primary as AdminFinancialCouponInput | undefined) || coupons[0] || null;
  const kind = resolveAdminCouponKind(coupon);
  const original = catalogUnitPrice(params.tipo);
  const siblings = (params.siblingTipos && params.siblingTipos.length
    ? params.siblingTipos
    : [params.tipo]
  ).map((tipo) => ({
    tipo,
    original: catalogUnitPrice(tipo) ?? 0,
  }));
  const discount =
    original == null
      ? 0
      : lineDiscount({
          coupon,
          tipo: params.tipo,
          original,
          siblingLines: siblings,
        });
  const computedFinal = original == null ? null : round2(Math.max(0, original - discount));
  const paid = params.payment?.amount;
  const siblingsCount = siblings.length;
  let finalAmount = computedFinal;
  if (typeof paid === "number" && Number.isFinite(paid) && siblingsCount <= 1) {
    finalAmount = round2(Math.max(0, paid));
  }
  const discountAmount =
    original != null && finalAmount != null
      ? round2(Math.max(0, original - finalAmount))
      : round2(discount);

  const channel = resolvePaymentChannel(params.payment, kind, finalAmount);
  const hasCoupon = Boolean(coupon?.code);
  return {
    originalAmount: original,
    discountAmount,
    finalAmount,
    amountsKnown: original != null,
    paymentChannel: channel,
    paymentLabel: adminPaymentLabel(channel, kind),
    couponCode: coupon?.code ? String(coupon.code) : null,
    couponKind: kind,
    couponKindLabel: hasCoupon ? adminCouponKindLabel(kind) : "Nenhum",
    hasCoupon,
  };
}

export function resolveAppointmentFinancialSummary(params: {
  tipo: string;
  serviceTipos?: string[] | null;
  payment?: AdminFinancialPaymentInput | null;
  coupons?: AdminFinancialCouponInput[] | null;
}): AdminFinancialSummary {
  const tipos =
    params.serviceTipos && params.serviceTipos.length > 0 ? params.serviceTipos : [params.tipo];
  const lines = tipos.map((tipo) =>
    resolveServiceFinancialSummary({
      tipo,
      payment: params.payment,
      coupons: params.coupons,
      siblingTipos: tipos,
    })
  );
  const originals = lines.map((l) => l.originalAmount);
  const originalKnown = originals.every((n) => n != null);
  const originalAmount = originalKnown
    ? round2(originals.reduce((acc, n) => acc + (n || 0), 0))
    : null;
  const discountAmount = round2(lines.reduce((acc, l) => acc + l.discountAmount, 0));
  const paid = params.payment?.amount;
  let finalAmount =
    originalAmount == null ? null : round2(Math.max(0, originalAmount - discountAmount));
  if (typeof paid === "number" && Number.isFinite(paid)) {
    finalAmount = round2(Math.max(0, paid));
  }
  const coupon = lines.find((l) => l.hasCoupon) || lines[0];
  const kind = coupon?.couponKind || "none";
  const channel = resolvePaymentChannel(params.payment, kind, finalAmount);
  const hasCoupon = Boolean(coupon?.hasCoupon);
  return {
    originalAmount,
    discountAmount:
      originalAmount != null && finalAmount != null
        ? round2(Math.max(0, originalAmount - finalAmount))
        : discountAmount,
    finalAmount,
    amountsKnown: originalAmount != null,
    paymentChannel: channel,
    paymentLabel: adminPaymentLabel(channel, kind),
    couponCode: coupon?.couponCode || null,
    couponKind: kind,
    couponKindLabel: hasCoupon ? adminCouponKindLabel(kind) : "Nenhum",
    hasCoupon,
  };
}

/** Compat: rótulo canônico de tipo persistido, se a UI precisar. */
export function adminCanonicalCouponTypeLabel(coupon: CouponTypeInput | null | undefined): string {
  if (!coupon) return "Nenhum";
  return couponTypeLabel(resolveCanonicalCouponType(coupon));
}
