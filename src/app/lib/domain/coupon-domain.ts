/**
 * OP-02A — Domínio único de Cupons.
 * Criação, classificação e integridade — reutilizado por pagamento real/simbólico,
 * planos, remarcação, reembolso e desconto. Sem forks por provedor.
 */

import type { Coupon, Prisma } from "@prisma/client";
import { generateCouponCode } from "@/app/lib/coupons";
import {
  resolveCanonicalCouponType,
  toPersistedCouponType,
  type CanonicalCouponType,
  type CouponTypeInput,
} from "@/app/lib/domain/coupon-types";
import {
  resolveCouponCategory,
  type CouponCategory,
} from "@/app/lib/domain/coupon-category";
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";

export type CouponDbClient = Prisma.TransactionClient | typeof import("@/app/lib/prisma").prisma;

export type CreateDomainCouponInput = {
  code?: string;
  canonicalType: CanonicalCouponType;
  discountType: "service" | "percent" | "fixed";
  discountValue: number;
  /** Tipo de serviço de negócio (sessao, beat1, mix…). Null só para desconto puro. */
  serviceType?: string | null;
  paymentId?: string | null;
  userPlanId?: string | null;
  /** Appointment que originou o cupom (remarcação/reembolso) — GO-H8 imutável. */
  originAppointmentId?: number | null;
  /** GO-H8: Pedido Raiz (Payment comercial original). */
  rootPaymentId?: string | null;
  /** GO-H8: cupom anterior na cadeia. */
  parentCouponId?: string | null;
  /** GO-H8: motivo do cancelamento. */
  cancelReason?: string | null;
  /** Override raro; por padrão resolveCouponCategory. */
  couponCategory?: CouponCategory | null;
  assignedUserId?: string | null;
  /** Service vinculado (preenchido no resgate ou quando já existe). */
  serviceId?: string | null;
  expiresAt?: Date | null;
  minValue?: number | null;
  maxDiscount?: number | null;
  codePrefix?: "TESTE_" | "";
};

/** Cupom que agenda serviço via página exclusiva (sem Asaas). */
export function couponUsesExclusiveSchedulingPage(coupon: CouponTypeInput): boolean {
  const st = String(coupon.serviceType || "");
  if (st.startsWith("percent_")) return false;
  if (coupon.discountType === "service" && st) return true;
  const t = resolveCanonicalCouponType(coupon);
  return t === "SERVICE" || t === "REBOOK";
}

/** Cupom de desconto no checkout comum (reduz valor; não trava serviço). */
export function couponUsesCheckoutDiscount(coupon: CouponTypeInput): boolean {
  return !couponUsesExclusiveSchedulingPage(coupon);
}

export function couponOriginLabel(coupon: CouponTypeInput): string {
  if (coupon.userPlanId) return "plano";
  if (coupon.paymentId) return "pagamento";
  if (coupon.appointmentId) return "agendamento";
  return "manual";
}

export function couponStatusLabel(coupon: {
  used?: boolean | null;
  expiresAt?: Date | string | null;
  refundRequestedAt?: Date | string | null;
  cancelReason?: string | null;
}): string {
  if (coupon.refundRequestedAt) return "bloqueado_reembolso";
  if (coupon.used) return "utilizado";
  const reason = String(coupon.cancelReason || "");
  if (reason === "ciclo_mensal_substituido" || reason === "substituido") {
    return "substituido";
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return "expirado";
  return "criado";
}

export async function allocateDomainCouponCode(
  db: CouponDbClient,
  opts?: { testStyle?: boolean; prefix?: string }
): Promise<string> {
  const prefix = opts?.prefix || (opts?.testStyle ? "TESTE_" : "");
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = `${prefix}${generateCouponCode()}`;
    const existing = await db.coupon.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `${prefix || "CUP_"}${Date.now()}_${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

/**
 * Factory única de persistência de cupom.
 * Não altera tipo/serviço/usuário depois — integridade na criação.
 */
export async function createDomainCoupon(
  db: CouponDbClient,
  input: CreateDomainCouponInput
): Promise<Coupon> {
  const serviceType = input.serviceType
    ? normalizeServiceTypeId(input.serviceType)
    : input.serviceType === null
      ? null
      : undefined;

  if (input.discountType === "service" && !serviceType) {
    throw new Error("Cupom de serviço exige serviceType");
  }
  if (couponUsesExclusiveSchedulingPage({
    couponType: toPersistedCouponType(input.canonicalType),
    discountType: input.discountType,
    serviceType: serviceType ?? null,
  }) && !serviceType) {
    throw new Error("Cupom de agenda exclusiva exige serviceType");
  }

  const code =
    input.code ||
    (await allocateDomainCouponCode(db, {
      testStyle: input.canonicalType === "TEST" || input.codePrefix === "TESTE_",
      prefix: input.codePrefix || (input.canonicalType === "TEST" ? "TESTE_" : ""),
    }));

  const category =
    input.couponCategory ||
    resolveCouponCategory({
      canonicalType: input.canonicalType,
      serviceType: serviceType ?? null,
      discountType: input.discountType,
    });

  const rootPaymentId = input.rootPaymentId ?? input.paymentId ?? null;
  const originAppointmentId = input.originAppointmentId ?? null;

  return db.coupon.create({
    data: {
      code,
      couponType: toPersistedCouponType(input.canonicalType),
      couponCategory: category,
      discountType: input.discountType,
      discountValue: input.discountValue,
      serviceType: serviceType ?? null,
      paymentId: input.paymentId ?? null,
      rootPaymentId,
      parentCouponId: input.parentCouponId ?? null,
      userPlanId: input.userPlanId ?? null,
      // Legado: appointmentId = origem até o resgate sobrescrever com o novo apt
      appointmentId: originAppointmentId,
      originAppointmentId,
      cancelReason: input.cancelReason ?? null,
      assignedUserId: input.assignedUserId ?? null,
      serviceId: input.serviceId ?? null,
      expiresAt: input.expiresAt ?? null,
      minValue: input.minValue ?? null,
      maxDiscount: input.maxDiscount ?? null,
    },
  });
}

/** Campos imutáveis após criação (OP-02A Fase 10 / GO-H8). */
export const IMMUTABLE_COUPON_FIELDS = [
  "couponType",
  "couponCategory",
  "discountType",
  "discountValue",
  "serviceType",
  "paymentId",
  "rootPaymentId",
  "parentCouponId",
  "originAppointmentId",
  "userPlanId",
] as const;

export function assertCouponOwnershipTransferAllowed(
  coupon: { assignedUserId?: string | null },
  nextUserId: string
): void {
  if (coupon.assignedUserId && coupon.assignedUserId !== nextUserId) {
    throw new Error("Não é permitido trocar o usuário dono de um cupom já associado.");
  }
}

export function assertCouponTypeImmutable(
  existing: { couponType?: string | null; serviceType?: string | null; discountType?: string | null },
  patch: { couponType?: string | null; serviceType?: string | null; discountType?: string | null }
): void {
  if (patch.couponType != null && patch.couponType !== existing.couponType) {
    throw new Error("Não é permitido alterar o tipo de um cupom.");
  }
  if (patch.serviceType != null && patch.serviceType !== existing.serviceType) {
    throw new Error("Não é permitido alterar o serviço de um cupom.");
  }
  if (patch.discountType != null && patch.discountType !== existing.discountType) {
    throw new Error("Não é permitido alterar a finalidade de desconto de um cupom.");
  }
}

/** Invalida cupons de serviço ainda não usados ligados a um agendamento (reembolso financeiro). */
export async function invalidateUnusedCouponsForAppointment(
  db: CouponDbClient,
  appointmentId: number
): Promise<number> {
  const result = await db.coupon.updateMany({
    where: {
      appointmentId,
      used: false,
      discountType: "service",
    },
    data: {
      used: true,
      usedAt: new Date(),
      refundRequestedAt: new Date(),
    },
  });
  return result.count;
}

/** Após resgate: amarra o Service criado ao cupom (vínculo Coupon → Service). */
export async function bindCouponToService(
  db: CouponDbClient,
  couponId: string,
  serviceId: string
): Promise<void> {
  await db.coupon.updateMany({
    where: { id: couponId, serviceId: null },
    data: { serviceId },
  });
}
