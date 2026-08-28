/**
 * GL-01 — cálculo financeiro autoritativo no servidor.
 * Aceita somente IDs e quantidades; nomes, preços, subtotal e total do browser são ignorados.
 */
import {
  priceCheckoutItems,
  totalPricedCheckoutItems,
  type CheckoutItemRequest,
  type PricedCheckoutItem,
} from "@/app/lib/service-catalog";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";

export type ServerCheckoutCalculation = {
  services: PricedCheckoutItem[];
  beats: PricedCheckoutItem[];
  subtotal: number;
  discount: number;
  total: number;
  couponId?: string;
  couponType?: string;
};

export async function calculateServerCheckout(params: {
  userId: string;
  services?: CheckoutItemRequest[];
  beats?: CheckoutItemRequest[];
  couponCode?: string | null;
  allowTestCoupon?: boolean;
}): Promise<ServerCheckoutCalculation> {
  const services = priceCheckoutItems(params.services, "service");
  const beats = priceCheckoutItems(params.beats, "beat");
  if (services.length + beats.length === 0) {
    throw new Error("CARRINHO_VAZIO");
  }

  const subtotal = totalPricedCheckoutItems([...services, ...beats]);
  if (!params.couponCode?.trim()) {
    return { services, beats, subtotal, discount: 0, total: subtotal };
  }

  const coupon = await validateCouponAndGetTotal(
    params.couponCode.trim(),
    subtotal,
    services,
    beats,
    {
      userId: params.userId,
      mode: "discount",
      allowTest: params.allowTestCoupon,
      selectedServiceIds: [...services, ...beats].map((item) => item.id),
    }
  );
  if (!coupon.ok) throw new Error(`CUPOM_INVALIDO:${coupon.error}`);

  return {
    services,
    beats,
    subtotal,
    discount: Math.round((subtotal - coupon.finalTotal) * 100) / 100,
    total: coupon.finalTotal,
    couponId: coupon.couponId,
    couponType: coupon.couponType,
  };
}
