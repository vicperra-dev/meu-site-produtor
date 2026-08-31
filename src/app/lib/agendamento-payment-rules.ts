import {
  isSchedulableServiceType,
} from "@/app/lib/service-catalog";
import { PRODUCTION_DELIVERY_HOUR } from "@/app/lib/calendar-day-state";
import {
  countServiceOrders,
  expandPurchaseToServiceOrders,
  purchaseEmitsServiceOrderCoupons,
  purchaseOpensImmediateSchedule,
} from "@/app/lib/service-orders";

type ItemLine = { id?: string; nome?: string; quantidade?: number };

export function isPlanoPaymentDescription(description?: string | null): boolean {
  if (!description) return false;
  return /plano/i.test(description);
}

export function isAgendamentoPaymentDescription(description?: string | null): boolean {
  if (!description) return false;
  return /agendamento/i.test(description);
}

/** Roteamento de tipo para o orquestrador de webhook (sem efeitos colaterais). */
export function resolvePaymentTipo(params: {
  metadata: Record<string, unknown>;
  paymentType?: string | null;
  description?: string | null;
}): string {
  const { metadata, paymentType, description } = params;
  if (metadata.tipo != null && String(metadata.tipo).trim() !== "") {
    return String(metadata.tipo);
  }
  if (paymentType && paymentType !== "outro") return paymentType;
  if (isPlanoPaymentDescription(description)) return "plano";
  if (isAgendamentoPaymentDescription(description)) return "agendamento";
  return "outro";
}

function getActiveAgendamentoLines(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): ItemLine[] {
  const arrS = Array.isArray(services) ? services : [];
  const arrB = Array.isArray(beats) ? beats : [];
  return [...arrS, ...arrB].filter((line) => Math.max(0, Number(line.quantidade) || 0) > 0);
}

/** @deprecated GO-H5: use countServiceOrders (conta Ordens, não linhas comerciais). */
export function countAgendamentoItemLines(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): number {
  return countServiceOrders(services, beats);
}

/**
 * @deprecated GO-H5: prefer purchaseOpensImmediateSchedule / countServiceOrders === 1.
 * Mantido: true quando há exatamente 1 linha comercial qty 1 (não equivale a 1 Ordem).
 */
export function isSingleUnitAgendamentoPurchase(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  const active = getActiveAgendamentoLines(services, beats);
  if (active.length !== 1) return false;
  return Math.max(1, Number(active[0].quantidade) || 1) === 1;
}

/** @deprecated GO-H5: pacote deixou de ser ramificação — use purchaseEmitsServiceOrderCoupons. */
export function isSingleMultiCouponPackageSelection(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  return purchaseEmitsServiceOrderCoupons(services, beats) && isSingleUnitAgendamentoPurchase(services, beats);
}

/**
 * GO-H5 regra universal: exatamente 1 Ordem de Serviço → calendário no checkout.
 */
export function exigeAgendamentoNoCheckout(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  return purchaseOpensImmediateSchedule(services, beats);
}

/** Horário de estúdio só quando a única Ordem é Sessão/Captação. */
export function exigeAgendamentoHora(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  if (!exigeAgendamentoNoCheckout(services, beats)) return false;
  const [order] = expandPurchaseToServiceOrders(services, beats);
  return isSchedulableServiceType(order?.serviceType);
}

/** Produção atômica única — só data de entrega. */
export function exigeAgendamentoSomenteData(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  return (
    exigeAgendamentoNoCheckout(services, beats) &&
    !exigeAgendamentoHora(services, beats)
  );
}

export function exigeAgendamentoDataHora(
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  return exigeAgendamentoHora(services, beats);
}

/**
 * GO-H5: cupons quando 2+ Ordens de Serviço.
 * 1 Ordem nunca emite cupom — agenda no calendário comum.
 */
export function isCouponsOnlyAgendamentoPayment(
  _metadata: Record<string, unknown>,
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  return purchaseEmitsServiceOrderCoupons(services, beats);
}

export function isSingleScheduledAgendamentoPayment(
  metadata: Record<string, unknown>,
  services: ItemLine[] = [],
  beats: ItemLine[] = []
): boolean {
  if (isCouponsOnlyAgendamentoPayment(metadata, services, beats)) return false;
  if (!exigeAgendamentoNoCheckout(services, beats)) return false;
  if (!metadata.data) return false;
  if (exigeAgendamentoHora(services, beats) && !metadata.hora) return false;
  return true;
}

export const PRODUCTION_SCHEDULE_DEFAULT_HOUR = PRODUCTION_DELIVERY_HOUR;
