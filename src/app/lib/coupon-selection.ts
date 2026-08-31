/**
 * Seleção determinística de cupons quando há vários no mesmo contexto.
 * Prioridade: sem paymentId (uso/checkout no agendamento) → com userPlanId → mais recente.
 */

import { isRefundCoupon } from "@/app/lib/domain/coupon-types";

export type CouponComparable = {
  id: string;
  paymentId: string | null;
  userPlanId: string | null;
  couponType: string;
  createdAt: Date;
};

/** Menor = maior prioridade para “cupom principal” / primeiro a liberar. */
export function compareCouponsDeterministic(a: CouponComparable, b: CouponComparable): number {
  const pa = a.paymentId ? 1 : 0;
  const pb = b.paymentId ? 1 : 0;
  if (pa !== pb) return pa - pb;

  const ua = a.userPlanId ? 0 : 1;
  const ub = b.userPlanId ? 0 : 1;
  if (ua !== ub) return ua - ub;

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortCouponsDeterministic<T extends CouponComparable>(coupons: T[]): T[] {
  return [...coupons].sort(compareCouponsDeterministic);
}

/** Um único cupom representativo para UI / compat com campo único `cupomAssociado`. */
export function pickPrimaryCouponForDisplay<T extends CouponComparable>(coupons: T[]): T | null {
  if (coupons.length === 0) return null;
  return sortCouponsDeterministic(coupons)[0];
}

/** Cupons de “uso” no agendamento que podem ser desvinculados ao cancelar (nunca REBOOK/REFUND). */
export function filterBookingCouponsEligibleForRelease<
  T extends CouponComparable & { appointmentId: number | null; couponCategory?: string | null }
>(coupons: T[]): T[] {
  return coupons.filter((c) => {
    if (c.appointmentId == null) return false;
    if (isRefundCoupon(c)) return false;
    if (String(c.couponCategory || "") === "reembolso") return false;
    return true;
  });
}
