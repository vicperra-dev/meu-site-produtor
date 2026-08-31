/**
 * Portal do Cliente (GO-03D / GO-H8) — helpers de apresentação.
 * Classificação oficial via couponCategory persistida.
 */

import { resolveCanonicalCouponType } from "@/app/lib/domain/coupon-types";
import {
  couponCategoryLabel,
  resolveCouponCategoryFromRow,
  type CouponCategory,
} from "@/app/lib/domain/coupon-category";
import type { Cupom } from "./types";
import {
  applicableServiceLabels,
  isPromotionalPartnershipCoupon,
  remainingUseCount,
} from "@/app/lib/promotional-coupon";

export function couponCategoryOf(c: Cupom): CouponCategory {
  return resolveCouponCategoryFromRow({
    couponCategory: c.couponCategory,
    couponType: c.couponType,
    discountType: c.discountType,
    serviceType: c.serviceType,
    paymentId: c.paymentId,
    userPlanId: c.userPlanId,
    appointmentId: c.appointmentId,
  });
}

export function isPlanFamilyCoupon(c: Cupom): boolean {
  return couponCategoryOf(c) === "plano";
}

export function isRefundFamilyCoupon(c: Cupom): boolean {
  return couponCategoryOf(c) === "reembolso";
}

export function isServiceFamilyCoupon(c: Cupom): boolean {
  return couponCategoryOf(c) === "servico";
}

export function isProductionFamilyCoupon(c: Cupom): boolean {
  return couponCategoryOf(c) === "producao";
}

export function isDiscountFamilyCoupon(c: Cupom): boolean {
  return couponCategoryOf(c) === "desconto";
}

export function partnershipDiscountCopy(c: Cupom): {
  discount: string;
  services: string[];
  uses: string | null;
} | null {
  if (!isPromotionalPartnershipCoupon(c)) return null;
  const discount =
    c.discountType === "percent"
      ? `${c.discountValue}% de desconto`
      : `R$ ${Number(c.discountValue).toFixed(2)} de desconto`;
  const remaining = remainingUseCount(c);
  const uses =
    c.maxUses == null
      ? "Uso ilimitado até a validade"
      : remaining == null
        ? null
        : `${remaining} de ${c.maxUses} usos restantes`;
  return {
    discount,
    services: applicableServiceLabels(c.applicableServiceTypes),
    uses,
  };
}

export function couponCategoryDisplay(c: Cupom): string {
  return couponCategoryLabel(couponCategoryOf(c));
}

/** Rota de resgate do cupom — mesma regra da página original. */
export function couponScheduleHref(c: Cupom): string {
  const cat = couponCategoryOf(c);
  if (cat === "servico" || cat === "producao" || cat === "reembolso") {
    const t = c.canonicalCouponType || resolveCanonicalCouponType(c);
    if (t === "SERVICE" || t === "REBOOK" || t === "TEST" || t === "BONUS" || t === "PLAN") {
      if (c.discountType === "service" && c.serviceType) {
        return `/agendamento/cupom/${encodeURIComponent(c.code)}`;
      }
    }
  }
  return `/agendamento?cupom=${encodeURIComponent(c.code)}`;
}

export function getServiceName(
  serviceType: string,
  cupons: Cupom[],
  couponCode?: string
): string {
  const coupon = cupons.find((c) => c.code === couponCode);
  const isTeste = coupon ? resolveCanonicalCouponType(coupon) === "TEST" : false;
  const names: Record<string, string> = {
    sessao: isTeste ? "Sessão Teste" : "Sessão",
    captacao: isTeste ? "Captação Teste" : "Captação",
    sonoplastia: isTeste ? "Sonoplastia Teste" : "Sonoplastia",
    mix: isTeste ? "Mixagem Teste" : "Mixagem",
    master: isTeste ? "Masterização Teste" : "Masterização",
    mix_master: isTeste ? "Mix + Master Teste" : "Mix + Master",
    beat1: isTeste ? "1 Beat Teste" : "1 Beat",
    beat2: isTeste ? "2 Beats Teste" : "2 Beats",
    beat3: isTeste ? "3 Beats Teste" : "3 Beats",
    beat4: isTeste ? "4 Beats Teste" : "4 Beats",
    beat_mix_master: isTeste ? "Beat + Mix + Master Teste" : "Beat + Mix + Master",
    producao_completa: isTeste ? "Produção Completa Teste" : "Produção Completa",
    percent_servicos: "10% em serviços avulsos",
    percent_beats: "10% em beats",
  };
  return names[serviceType] || (isTeste ? `${serviceType} (Teste)` : serviceType);
}

/** Copia texto com fallback para navegadores antigos (mesmo comportamento anterior). */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
}

/** Bytes de uma entrega não estão disponíveis no payload; retorna extensão amigável. */
export function deliveryTypeLabel(format: string | null, url: string): string {
  const fmt = (format || "").toLowerCase();
  if (fmt === "wav") return "WAV";
  if (fmt === "mp3") return "MP3";
  if (fmt === "zip" || /\.zip(\?|$)/i.test(url)) return "ZIP";
  const m = url.match(/\.(\w{2,4})(\?|$)/);
  return m ? m[1].toUpperCase() : "Arquivo";
}

export function isAudioDelivery(format: string | null, url: string): boolean {
  const fmt = (format || "").toLowerCase();
  return (fmt === "wav" || fmt === "mp3") && !/\.zip(\?|$)/i.test(url);
}
