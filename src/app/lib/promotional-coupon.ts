/**
 * Cupons promocionais de parceria — isolados de plano / H12A / remarcação / reembolso.
 * Tipo canônico DISCOUNT; nunca userPlanId, parentCouponId ou originAppointmentId.
 */

import type { Coupon, Prisma } from "@prisma/client";
import {
  allocateDomainCouponCode,
  createDomainCoupon,
  type CouponDbClient,
} from "@/app/lib/domain/coupon-domain";
import { resolveCanonicalCouponType } from "@/app/lib/domain/coupon-types";
import {
  CHECKOUT_CATALOG,
  isCanonicalServiceId,
  resolveCanonicalServiceId,
  type CanonicalServiceId,
} from "@/app/lib/service-catalog";
import {
  isValidIsoDate,
  minScheduleDateIsoStudio,
  parseIsoDateParts,
  todayIsoStudio,
} from "@/app/lib/calendar-time";

export const PARTNERSHIP_MIN_YEAR = 2026;

/** Sentinel persistido: cupom válido para todo o catálogo de estúdio. */
export const PARTNERSHIP_ALL_SERVICES = "*";

export const PARTNERSHIP_APPLICABLE_DOMAINS = [
  "STUDIO",
  "SHOPPING",
  "EVENT",
  "ALL",
] as const;
export type PartnershipApplicableDomain =
  (typeof PARTNERSHIP_APPLICABLE_DOMAINS)[number];

export type CouponUseFields = {
  used?: boolean | null;
  useCount?: number | null;
  maxUses?: number | null;
  isActive?: boolean | null;
  expiresAt?: Date | string | null;
  assignedUserId?: string | null;
  userPlanId?: string | null;
  parentCouponId?: string | null;
  originAppointmentId?: number | null;
  couponType?: string | null;
  discountType?: string | null;
  applicableDomain?: string | null;
  applicableServiceTypes?: string | null;
};

export type CartLine = {
  id?: string;
  preco?: number;
  quantidade?: number;
};

export function couponHasRemainingUses(coupon: CouponUseFields): boolean {
  if (coupon.isActive === false) return false;
  if (coupon.used) return false;
  if (coupon.maxUses == null) return true;
  const uses = Number(coupon.useCount || 0);
  return uses < coupon.maxUses;
}

export function remainingUseCount(coupon: CouponUseFields): number | null {
  if (coupon.maxUses == null) return null;
  return Math.max(0, coupon.maxUses - Number(coupon.useCount || 0));
}

/**
 * Parceria: desconto DISCOUNT atribuído a um usuário, sem vínculo de plano/cadeia H12A.
 */
export function isPromotionalPartnershipCoupon(coupon: CouponUseFields): boolean {
  if (!coupon.assignedUserId) return false;
  if (coupon.userPlanId) return false;
  if (coupon.parentCouponId) return false;
  if (coupon.originAppointmentId != null) return false;
  const canonical = resolveCanonicalCouponType({
    couponType: coupon.couponType,
    discountType: coupon.discountType,
    serviceType: null,
    userPlanId: coupon.userPlanId,
  });
  if (canonical !== "DISCOUNT") return false;
  const dt = String(coupon.discountType || "");
  return dt === "percent" || dt === "fixed";
}

export function partnershipAppliesToAllStudioServices(
  raw: string | null | undefined
): boolean {
  return parseApplicableServiceTypes(raw) === null;
}

export function parseApplicableServiceTypes(
  raw: string | null | undefined
): CanonicalServiceId[] | null {
  if (raw == null || String(raw).trim() === "") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (parsed.some((item) => String(item).trim() === PARTNERSHIP_ALL_SERVICES)) {
      return null;
    }
    const ids: CanonicalServiceId[] = [];
    for (const item of parsed) {
      const id = resolveCanonicalServiceId(String(item));
      if (!id || !isCanonicalServiceId(id)) continue;
      if (!ids.includes(id)) ids.push(id);
    }
    return ids.length ? ids : null;
  } catch {
    return null;
  }
}

export function serializeApplicableServiceTypes(
  ids: string[] | null | undefined
): string | null {
  if (ids == null) return JSON.stringify([PARTNERSHIP_ALL_SERVICES]);
  if (ids.length === 0) return null;
  if (ids.some((item) => String(item).trim() === PARTNERSHIP_ALL_SERVICES)) {
    return JSON.stringify([PARTNERSHIP_ALL_SERVICES]);
  }
  const unique: CanonicalServiceId[] = [];
  for (const raw of ids) {
    const id = resolveCanonicalServiceId(raw);
    if (!id) continue;
    if (!unique.includes(id)) unique.push(id);
  }
  return unique.length ? JSON.stringify(unique) : null;
}

export function applicableServiceLabels(raw: string | null | undefined): string[] {
  const ids = parseApplicableServiceTypes(raw);
  if (!ids) return ["Todos os serviços"];
  return ids.map((id) => CHECKOUT_CATALOG[id]?.nome || id);
}

export function lineId(item: CartLine): CanonicalServiceId | null {
  return resolveCanonicalServiceId(item.id);
}

export function sumCartLines(items: CartLine[]): number {
  return items.reduce(
    (acc, s) => acc + (Number(s.preco) || 0) * (Number(s.quantidade) || 0),
    0
  );
}

/** Subtotal sobre o qual o cupom de parceria pode incidir. */
export function applicableSubtotal(
  coupon: CouponUseFields,
  services: CartLine[],
  beats: CartLine[]
): number {
  const allowed = parseApplicableServiceTypes(coupon.applicableServiceTypes);
  const all = [...services, ...beats];
  if (!allowed) {
    return sumCartLines(all);
  }
  const set = new Set(allowed);
  return sumCartLines(all.filter((item) => {
    const id = lineId(item);
    return id != null && set.has(id);
  }));
}

export function computePartnershipDiscount(params: {
  coupon: CouponUseFields & { discountType: string; discountValue: number; maxDiscount?: number | null };
  services: CartLine[];
  beats: CartLine[];
  cartTotal: number;
}): { discount: number; finalTotal: number; base: number } {
  const base = applicableSubtotal(params.coupon, params.services, params.beats);
  let discount = 0;
  if (params.coupon.discountType === "percent") {
    discount = (base * Number(params.coupon.discountValue || 0)) / 100;
    if (params.coupon.maxDiscount && discount > params.coupon.maxDiscount) {
      discount = params.coupon.maxDiscount;
    }
  } else {
    discount = Number(params.coupon.discountValue || 0);
    if (discount > base) discount = base;
  }
  if (discount > params.cartTotal) discount = params.cartTotal;
  if (discount < 0) discount = 0;
  const finalTotal = Math.round((params.cartTotal - discount) * 100) / 100;
  return {
    discount: Math.round(discount * 100) / 100,
    finalTotal: finalTotal < 0 ? 0 : finalTotal,
    base: Math.round(base * 100) / 100,
  };
}

export function partnershipCheckoutError(
  coupon: CouponUseFields,
  userId: string | undefined,
  services: CartLine[],
  beats: CartLine[]
): string | null {
  if (!isPromotionalPartnershipCoupon(coupon)) return null;
  if (!userId) {
    return "Este cupom de parceria exige login na conta do artista beneficiado.";
  }
  if (coupon.assignedUserId !== userId) {
    return "Este cupom pertence a outro usuário.";
  }
  if (coupon.isActive === false) {
    return "Este cupom está inativo.";
  }
  const domain = String(coupon.applicableDomain || "STUDIO").toUpperCase();
  if (domain !== "STUDIO" && domain !== "ALL") {
    return "Este cupom não é válido para serviços de estúdio.";
  }
  if (!couponHasRemainingUses(coupon)) {
    return "Este cupom já atingiu o limite de usos.";
  }
  const base = applicableSubtotal(coupon, services, beats);
  if (base <= 0) {
    return "Este cupom não se aplica aos serviços selecionados.";
  }
  return null;
}

export type PartnershipUserSearchHit = {
  id: string;
  nomeArtistico: string;
  nomeCompleto?: string | null;
  email: string;
};

export function userMatchesPartnershipQuery(
  user: PartnershipUserSearchHit,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const fields = [user.nomeArtistico, user.nomeCompleto || "", user.email];
  return fields.some((f) => String(f).toLowerCase().includes(q));
}

/** Valor fixo em reais: > 0, no máximo 2 casas decimais. */
export function parsePartnershipFixedAmount(
  raw: unknown
): { ok: true; value: number } | { ok: false; error: string } {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) {
    return { ok: false, error: "Informe o valor do desconto em reais." };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return {
      ok: false,
      error: "Valor inválido. Use um número positivo com até 2 casas decimais.",
    };
  }
  if (text.startsWith("-")) {
    return { ok: false, error: "O valor do desconto não pode ser negativo." };
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: "O valor do desconto deve ser maior que zero." };
  }
  return { ok: true, value };
}

/**
 * Validade civil (YYYY-MM-DD): dia real, ano >= 2026, estritamente depois de hoje (SP).
 */
export function partnershipExpiryError(
  raw: unknown,
  now: Date = new Date()
): string | null {
  const iso = String(raw ?? "").trim().slice(0, 10);
  if (!iso) return "A validade é obrigatória.";
  if (!isValidIsoDate(iso)) {
    return "Data inválida. Use um dia existente (ex.: 31/02 não é aceito).";
  }
  const parts = parseIsoDateParts(iso);
  if (!parts) return "Data inválida.";
  if (parts.year < PARTNERSHIP_MIN_YEAR) {
    return `O ano da validade deve ser ${PARTNERSHIP_MIN_YEAR} ou posterior.`;
  }
  const today = todayIsoStudio(now);
  if (iso <= today) {
    return "A validade deve ser uma data futura (não aceite hoje nem datas passadas).";
  }
  return null;
}

export function partnershipExpiryEndOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59-03:00`);
}

export function tomorrowIsoStudio(now: Date = new Date()): string {
  return minScheduleDateIsoStudio(1, now);
}

export function canReactivatePartnershipCoupon(
  coupon: CouponUseFields,
  now = new Date()
): boolean {
  if (coupon.expiresAt) {
    const exp = new Date(coupon.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() <= now.getTime()) return false;
  }
  return couponHasRemainingUses({ ...coupon, isActive: true });
}

export type CreatePartnershipCouponInput = {
  assignedUserId: string;
  createdByAdminId: string;
  discountValue: number;
  code?: string | null;
  expiresAt: Date;
  maxUses: number | null;
  applicableServiceTypes: string[] | null;
  applicableDomain?: PartnershipApplicableDomain;
  adminNote?: string | null;
};

export async function createPartnershipCoupon(
  db: CouponDbClient,
  input: CreatePartnershipCouponInput
): Promise<Coupon> {
  if (!input.assignedUserId) {
    throw new Error("Usuário beneficiado é obrigatório.");
  }
  const amount = parsePartnershipFixedAmount(input.discountValue);
  if (!amount.ok) {
    throw new Error(amount.error);
  }

  let code = (input.code || "").trim().toUpperCase();
  if (code) {
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      throw new Error("Código inválido. Use 3–24 caracteres (A–Z, 0–9, _ ou -).");
    }
    const existing = await db.coupon.findUnique({ where: { code } });
    if (existing) throw new Error("Já existe um cupom com este código.");
  } else {
    code = await allocateDomainCouponCode(db, { prefix: "" });
  }

  const coupon = await createDomainCoupon(db, {
    code,
    canonicalType: "DISCOUNT",
    discountType: "fixed",
    discountValue: amount.value,
    serviceType: null,
    assignedUserId: input.assignedUserId,
    expiresAt: input.expiresAt,
    couponCategory: "desconto",
    userPlanId: null,
    parentCouponId: null,
    originAppointmentId: null,
    paymentId: null,
    rootPaymentId: null,
  });

  return db.coupon.update({
    where: { id: coupon.id },
    data: {
      maxUses: input.maxUses,
      useCount: 0,
      applicableServiceTypes: serializeApplicableServiceTypes(
        input.applicableServiceTypes
      ),
      applicableDomain: input.applicableDomain || "STUDIO",
      createdByAdminId: input.createdByAdminId,
      adminNote: input.adminNote?.trim() || null,
      isActive: true,
      userPlanId: null,
      parentCouponId: null,
      originAppointmentId: null,
      appointmentId: null,
      paymentId: null,
      rootPaymentId: null,
    },
  });
}

export async function recordApprovedPaymentCouponUse(
  db: CouponDbClient,
  params: {
    couponId: string;
    userId: string;
    appointmentId?: number | null;
    serviceId?: string | null;
  }
): Promise<{ ok: boolean; exhausted: boolean }> {
  const coupon = await db.coupon.findUnique({ where: { id: params.couponId } });
  if (!coupon) return { ok: false, exhausted: false };

  if (isPromotionalPartnershipCoupon(coupon)) {
    if (coupon.assignedUserId !== params.userId) return { ok: false, exhausted: false };
    const maxUses = coupon.maxUses;
    const claimed = await db.coupon.updateMany({
      where: {
        id: coupon.id,
        isActive: true,
        used: false,
        assignedUserId: params.userId,
        ...(maxUses == null ? {} : { useCount: { lt: maxUses } }),
      },
      data: {
        useCount: { increment: 1 },
        usedAt: new Date(),
        usedBy: params.userId,
        ...(params.appointmentId != null ? { appointmentId: params.appointmentId } : {}),
        ...(params.serviceId ? { serviceId: params.serviceId } : {}),
      },
    });
    if (claimed.count === 1) {
      const updated = await db.coupon.findUnique({ where: { id: coupon.id } });
      const next = Number(updated?.useCount || 0);
      const exhausted = maxUses != null && next >= maxUses;
      if (exhausted && updated && !updated.used) {
        await db.coupon.update({
          where: { id: coupon.id },
          data: { used: true },
        });
      }
      return { ok: true, exhausted };
    }

    return bindConsumedCouponFulfillment(db, params);
  }

  const claimed = await db.coupon.updateMany({
    where: {
      id: coupon.id,
      used: false,
      appointmentId: null,
      OR: [{ assignedUserId: null }, { assignedUserId: params.userId }],
    },
    data: {
      used: true,
      usedAt: new Date(),
      usedBy: params.userId,
      useCount: { increment: 1 },
      ...(params.appointmentId != null ? { appointmentId: params.appointmentId } : {}),
      ...(params.serviceId ? { serviceId: params.serviceId } : {}),
    },
  });
  if (claimed.count === 1) return { ok: true, exhausted: true };
  return bindConsumedCouponFulfillment(db, params);
}

/** Liga FKs de um cupom já consumido, sem incrementar useCount. */
async function bindConsumedCouponFulfillment(
  db: CouponDbClient,
  params: {
    couponId: string;
    userId: string;
    appointmentId?: number | null;
    serviceId?: string | null;
  }
): Promise<{ ok: boolean; exhausted: boolean }> {
  const current = await db.coupon.findUnique({ where: { id: params.couponId } });
  if (!current) return { ok: false, exhausted: false };
  const consumed = Boolean(current.used) || Number(current.useCount || 0) > 0;
  if (!consumed) return { ok: false, exhausted: false };
  if (current.usedBy && current.usedBy !== params.userId) {
    return { ok: false, exhausted: true };
  }
  if (
    current.assignedUserId &&
    current.assignedUserId !== params.userId &&
    current.usedBy !== params.userId
  ) {
    return { ok: false, exhausted: true };
  }
  if (
    params.appointmentId != null &&
    current.appointmentId != null &&
    current.appointmentId !== params.appointmentId
  ) {
    return { ok: true, exhausted: true };
  }

  const bindData: { appointmentId?: number; serviceId?: string } = {};
  if (params.appointmentId != null && current.appointmentId == null) {
    bindData.appointmentId = params.appointmentId;
  }
  if (params.serviceId && current.serviceId == null) {
    bindData.serviceId = params.serviceId;
  }
  if (Object.keys(bindData).length > 0) {
    await db.coupon.updateMany({
      where: {
        id: current.id,
        ...(bindData.appointmentId != null ? { appointmentId: null } : {}),
        ...(bindData.serviceId ? { serviceId: null } : {}),
      },
      data: bindData,
    });
  }
  return { ok: true, exhausted: true };
}

export type PartnershipCouponDb = Prisma.CouponGetPayload<{
  include: { assignedUser: { select: { id: true; nomeArtistico: true; email: true } } };
}>;
