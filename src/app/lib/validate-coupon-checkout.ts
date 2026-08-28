/**
 * Validação centralizada de cupom no checkout (read-only).
 * Gates: existência, tipo permitido, usado, refund lock, plano (C5), agendamento pendente, expiração, valor mínimo, mix serviço/beat.
 */
import type { Coupon } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import {
  COUPON_REFUND_USAGE_ERROR,
  getPlanCouponUsageBlockMessage,
  isCouponRefundLocked,
  isCupomPermitidoNoAgendamentoComum,
  resolveCouponCheckoutMode,
} from "@/app/lib/checkout-coupon-gates";
import {
  resolveCanonicalCouponType,
  type CanonicalCouponType,
} from "@/app/lib/domain/coupon-types";
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";
import { agendamentoBloqueiaReusoCupom } from "@/app/lib/coupon-booking-rules";
import {
  computePartnershipDiscount,
  couponHasRemainingUses,
  isPromotionalPartnershipCoupon,
  partnershipCheckoutError,
} from "@/app/lib/promotional-coupon";

type ServicoItem = { id?: string; preco?: number; quantidade?: number };
type BeatItem = { id?: string; preco?: number; quantidade?: number };

type CartTotals = {
  total: number;
  totalServicos: number;
  totalBeats: number;
};

export type CouponCheckoutMode = "discount" | "service-redemption";

export type CouponCheckoutOptions = {
  userId?: string;
  mode?: CouponCheckoutMode;
  selectedServiceIds?: string[];
  allowTest?: boolean;
};

function computeCartTotals(servicos: ServicoItem[], beats: BeatItem[]): CartTotals {
  const totalServicos = Array.isArray(servicos)
    ? servicos.reduce((acc, s) => acc + (s.preco || 0) * (s.quantidade || 0), 0)
    : 0;
  const totalBeats = Array.isArray(beats)
    ? beats.reduce((acc, b) => acc + (b.preco || 0) * (b.quantidade || 0), 0)
    : 0;
  return { total: totalServicos + totalBeats, totalServicos, totalBeats };
}

async function loadCoupon(code: string): Promise<Coupon | null> {
  return prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });
}

async function validateOwnership(
  coupon: Coupon,
  userId?: string
): Promise<{ ok: false; error: string } | null> {
  if (isPromotionalPartnershipCoupon(coupon) && !userId) {
    return {
      ok: false,
      error: "Este cupom de parceria exige login na conta do artista beneficiado.",
    };
  }
  if (!userId) return null;
  if (coupon.assignedUserId && coupon.assignedUserId !== userId) {
    return { ok: false, error: "Este cupom pertence a outro usuário." };
  }

  const [plan, payment, appointment] = await Promise.all([
    coupon.userPlanId
      ? prisma.userPlan.findUnique({
          where: { id: coupon.userPlanId },
          select: { userId: true },
        })
      : null,
    coupon.paymentId
      ? prisma.payment.findUnique({
          where: { id: coupon.paymentId },
          select: { userId: true, status: true },
        })
      : null,
    coupon.appointmentId
      ? prisma.appointment.findUnique({
          where: { id: coupon.appointmentId },
          select: { userId: true },
        })
      : null,
  ]);

  if (plan && plan.userId !== userId) {
    return { ok: false, error: "Este cupom pertence ao plano de outro usuário." };
  }
  if (payment && payment.userId !== userId) {
    return { ok: false, error: "Este cupom pertence ao pagamento de outro usuário." };
  }
  if (payment && payment.status !== "approved") {
    return { ok: false, error: "O pagamento associado a este cupom não está aprovado." };
  }
  if (appointment && appointment.userId !== userId) {
    return { ok: false, error: "Este cupom pertence ao agendamento de outro usuário." };
  }
  return null;
}

function validateCanonicalUsage(
  coupon: Coupon,
  options: CouponCheckoutOptions
): { ok: false; error: string } | null {
  const type = resolveCanonicalCouponType(coupon);
  const mode = options.mode ?? resolveCouponCheckoutMode(coupon);

  if (type === "TEST" && !options.allowTest) {
    return { ok: false, error: "Cupom de teste indisponível neste ambiente." };
  }

  if (isPromotionalPartnershipCoupon(coupon)) {
    return null;
  }

  const serviceLike =
    type === "SERVICE" ||
    type === "REBOOK" ||
    (type === "REFUND" && coupon.discountType === "service") ||
    (type === "TEST" && coupon.discountType === "service") ||
    (type === "PLAN" && coupon.discountType === "service") ||
    (type === "BONUS" && coupon.discountType === "service");

  if (mode === "discount" && serviceLike) {
    return {
      ok: false,
      error: "Use este cupom pela página exclusiva em Minha Conta (Agendar com este cupom).",
    };
  }
  if (mode === "service-redemption" && !serviceLike) {
    return { ok: false, error: "Este cupom não é válido para resgate de serviço." };
  }
  if (mode === "service-redemption") {
    const selected = (options.selectedServiceIds || []).map(normalizeServiceTypeId);
    const expected = coupon.serviceType
      ? normalizeServiceTypeId(coupon.serviceType)
      : null;
    if (!expected || selected.length !== 1 || selected[0] !== expected) {
      return {
        ok: false,
        error: `Este cupom agenda exclusivamente o serviço ${expected || "definido no cupom"}.`,
      };
    }
  }

  return null;
}

function validateCouponExists(coupon: Coupon | null): { ok: false; error: string } | null {
  if (!coupon) {
    return { ok: false, error: "Cupom inexistente. Verifique o código e tente novamente." };
  }
  return null;
}

function validateSchedulingType(coupon: Coupon): { ok: false; error: string } | null {
  if (!isCupomPermitidoNoAgendamentoComum(coupon)) {
    return {
      ok: false,
      error:
        "Este cupom é de serviço ou foi gerado após um pagamento. Use o botão Agendar com este cupom em Minha Conta.",
    };
  }
  return null;
}

function validateUsed(coupon: Coupon): { ok: false; error: string } | null {
  if (!couponHasRemainingUses(coupon)) {
    return { ok: false, error: "Este cupom já foi utilizado e não pode ser usado novamente." };
  }
  return null;
}

function validatePartnershipActive(coupon: Coupon): { ok: false; error: string } | null {
  if (isPromotionalPartnershipCoupon(coupon) && coupon.isActive === false) {
    return { ok: false, error: "Este cupom está inativo." };
  }
  return null;
}

function validateRefundLock(coupon: Coupon): { ok: false; error: string } | null {
  if (isCouponRefundLocked(coupon)) {
    return { ok: false, error: COUPON_REFUND_USAGE_ERROR };
  }
  return null;
}

async function validatePlanBlock(coupon: Coupon): Promise<{ ok: false; error: string } | null> {
  const planBlockMessage = await getPlanCouponUsageBlockMessage(coupon);
  if (planBlockMessage) {
    return { ok: false, error: planBlockMessage };
  }
  return null;
}

async function validateAppointmentBlock(
  coupon: Coupon
): Promise<{ ok: false; error: string } | null> {
  if (isPromotionalPartnershipCoupon(coupon)) return null;
  if (!coupon.appointmentId) return null;

  const agendamentoAssociado = await prisma.appointment.findUnique({
    where: { id: coupon.appointmentId },
    select: { status: true },
  });
  if (
    agendamentoAssociado &&
    agendamentoBloqueiaReusoCupom(agendamentoAssociado.status)
  ) {
    return {
      ok: false,
      error:
        "Este cupom já está sendo usado em um agendamento pendente. Aguarde a confirmação ou cancele o agendamento anterior.",
    };
  }
  return null;
}

function validateExpiresAt(coupon: Coupon): { ok: false; error: string } | null {
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { ok: false, error: "Este cupom expirou" };
  }
  return null;
}

async function validatePlanCouponWindow(
  coupon: Coupon
): Promise<{ ok: false; error: string } | null> {
  if (
    !coupon.userPlanId ||
    (coupon.discountType !== "service" && coupon.discountType !== "percent")
  ) {
    return null;
  }

  const userPlan = await prisma.userPlan.findUnique({
    where: { id: coupon.userPlanId },
    select: { endDate: true },
  });
  if (!userPlan?.endDate) return null;

  const umMesAposPlano = new Date(userPlan.endDate);
  umMesAposPlano.setMonth(umMesAposPlano.getMonth() + 1);
  if (new Date() > umMesAposPlano) {
    return {
      ok: false,
      error:
        "Este cupom expirou. Cupons de plano são válidos até 1 mês após a expiração do plano.",
    };
  }
  return null;
}

function validateMinValue(
  coupon: Coupon,
  total: number
): { ok: false; error: string } | null {
  if (coupon.minValue && total < coupon.minValue) {
    return {
      ok: false,
      error: `Valor mínimo para usar este cupom é R$ ${coupon.minValue.toFixed(2).replace(".", ",")}`,
    };
  }
  return null;
}

function validateServiceBeatMix(
  coupon: Coupon,
  totalServicos: number,
  totalBeats: number
): { ok: false; error: string } | null {
  if (coupon.serviceType === "percent_servicos" && totalBeats > 0) {
    return {
      ok: false,
      error:
        "Este cupom de 10% é válido apenas para serviços avulsos (captação, mix, master, etc.). Não pode ser usado em beats. Para beats, use o cupom de desconto específico para beats.",
    };
  }
  if (coupon.serviceType === "percent_beats" && totalServicos > 0) {
    return {
      ok: false,
      error:
        "Este cupom de 10% é válido apenas para beats. Não pode ser usado em serviços avulsos (captação, mix, master, etc.). Para serviços, use o cupom de desconto específico para serviços.",
    };
  }
  return null;
}

function computeDiscountedTotal(
  coupon: Coupon,
  totals: CartTotals,
  servicos: ServicoItem[],
  beats: BeatItem[]
): number {
  const { total, totalServicos, totalBeats } = totals;
  let discount = 0;
  let finalTotal = total;
  let isServiceCoupon = false;
  const isRefundCoupon = resolveCanonicalCouponType(coupon) === "REFUND";

  if (isPromotionalPartnershipCoupon(coupon)) {
    return computePartnershipDiscount({
      coupon,
      services: servicos,
      beats,
      cartTotal: total,
    }).finalTotal;
  }

  if (coupon.discountType === "service") {
    isServiceCoupon = true;
    discount = total;
    finalTotal = 0;
  } else if (coupon.discountType === "percent") {
    const baseParaDesconto =
      coupon.serviceType === "percent_servicos"
        ? totalServicos
        : coupon.serviceType === "percent_beats"
          ? totalBeats
          : total;
    discount = (baseParaDesconto * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
    finalTotal = total - discount;
  } else if (isRefundCoupon) {
    if (coupon.discountValue >= total) {
      discount = total;
      finalTotal = 0;
    } else {
      discount = coupon.discountValue;
      finalTotal = total - discount;
    }
  } else {
    discount = coupon.discountValue;
    finalTotal = total - discount;
  }

  if (!isServiceCoupon && discount > total) {
    finalTotal = 0;
  }

  return Math.round(finalTotal * 100) / 100;
}

/**
 * Valida cupom e retorna o total final a ser cobrado.
 * Usado pelos checkouts para garantir que o valor está correto antes da cobrança.
 */
export async function validateCouponAndGetTotal(
  code: string,
  _totalRaw: number,
  servicos: ServicoItem[] = [],
  beats: BeatItem[] = [],
  options: CouponCheckoutOptions = {}
): Promise<
  | { ok: true; finalTotal: number; couponId: string; couponType: CanonicalCouponType; subtotal: number; discount: number }
  | { ok: false; error: string }
> {
  const totals = computeCartTotals(servicos, beats);
  const coupon = await loadCoupon(code);

  if (coupon) {
    const canonicalError = validateCanonicalUsage(coupon, options);
    if (canonicalError) return canonicalError;
    const ownershipError = await validateOwnership(coupon, options.userId);
    if (ownershipError) return ownershipError;
  }

  const gates: Array<
    | { ok: false; error: string }
    | null
    | Promise<{ ok: false; error: string } | null>
  > = [
    validateCouponExists(coupon),
    coupon && (options.mode ?? "discount") === "discount"
      ? validateSchedulingType(coupon)
      : null,
    coupon ? validatePartnershipActive(coupon) : null,
    coupon ? validateUsed(coupon) : null,
    coupon ? validateRefundLock(coupon) : null,
    coupon ? validatePlanBlock(coupon) : null,
    coupon ? validateAppointmentBlock(coupon) : null,
    coupon ? validateExpiresAt(coupon) : null,
    coupon ? validatePlanCouponWindow(coupon) : null,
    coupon ? validateMinValue(coupon, totals.total) : null,
    coupon
      ? validateServiceBeatMix(coupon, totals.totalServicos, totals.totalBeats)
      : null,
  ];

  for (const gate of gates) {
    const result = gate instanceof Promise ? await gate : gate;
    if (result) return result;
  }

  if (!coupon) {
    return { ok: false, error: "Cupom inexistente. Verifique o código e tente novamente." };
  }

  const partnershipError = partnershipCheckoutError(
    coupon,
    options.userId,
    servicos,
    beats
  );
  if (partnershipError) {
    return { ok: false, error: partnershipError };
  }

  const finalTotal = computeDiscountedTotal(coupon, totals, servicos, beats);
  return {
    ok: true,
    finalTotal,
    couponId: coupon.id,
    couponType: resolveCanonicalCouponType(coupon),
    subtotal: Math.round(totals.total * 100) / 100,
    discount: Math.round((totals.total - finalTotal) * 100) / 100,
  };
}
