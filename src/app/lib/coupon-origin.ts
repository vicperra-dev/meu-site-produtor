/**
 * HS-03A — Origin de cupom via enum canônico (sem includes/startsWith).
 */
import {
  resolveCanonicalCouponType,
  canonicalToOrigin,
  type CouponOrigin,
  type CouponTypeInput,
} from "@/app/lib/domain/coupon-types";

export type { CouponOrigin };

export function resolveCouponOrigin(coupon: CouponTypeInput): CouponOrigin {
  return canonicalToOrigin(resolveCanonicalCouponType(coupon), coupon);
}

export function couponOriginLabel(origin: CouponOrigin): string {
  if (origin === "agendamento") return "Agendamento";
  if (origin === "reembolso") return "Reembolso";
  return "Plano";
}

export function resolveAppointmentOrigin(params: {
  pagamento: { type?: string | null } | null;
  foiComCupomPlano?: boolean;
  cupons?: CouponTypeInput[];
}): CouponOrigin {
  const cupons = params.cupons ?? [];
  const temCupomReembolso = cupons.some((cupom) => resolveCouponOrigin(cupom) === "reembolso");
  const temCupomPlano = cupons.some(
    (cupom) => resolveCouponOrigin(cupom) === "plano" && cupom.userPlanId
  );
  const temCupomAgendamento = cupons.some((cupom) => resolveCouponOrigin(cupom) === "agendamento");

  if (temCupomReembolso) return "reembolso";
  if (temCupomPlano || params.foiComCupomPlano) return "plano";
  if (params.pagamento?.type === "agendamento" || temCupomAgendamento || params.pagamento) {
    return "agendamento";
  }
  return "agendamento";
}
