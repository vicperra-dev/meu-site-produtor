import {
  isSymbolicApprovedPayment,
  REFUND_ASAAS_STATUS_SIMULATED,
  type SymbolicPaymentLike,
} from "@/app/lib/symbolic-payment";
import { resolveCanonicalCouponType } from "@/app/lib/domain/coupon-types";

/**
 * Gate de cupom de simulação (HS-03A).
 * Tipo canônico TEST ou marcas explícitas — sem startsWith para tipagem.
 */

type CouponLike = {
  code: string;
  couponType?: string | null;
  refundAsaasStatus?: string | null;
  payment?: SymbolicPaymentLike | null;
  appointmentPayment?: SymbolicPaymentLike | null;
};

/** Cupom gerado por simulação / checkout simbólico. */
export function isSimulationCoupon(coupon: CouponLike): boolean {
  if (resolveCanonicalCouponType(coupon) === "TEST") return true;
  if (coupon.refundAsaasStatus === REFUND_ASAAS_STATUS_SIMULATED) return true;
  if (coupon.payment && isSymbolicApprovedPayment(coupon.payment)) return true;
  if (coupon.appointmentPayment && isSymbolicApprovedPayment(coupon.appointmentPayment)) {
    return true;
  }
  return false;
}
