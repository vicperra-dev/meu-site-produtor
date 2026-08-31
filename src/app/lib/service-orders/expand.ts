/**
 * GO-H5 — Decomposição de compra → Ordens de Serviço.
 * Regra universal: 1 ordem → calendário; 2+ → um cupom por ordem.
 */

import {
  getCommercialProductComposition,
  isCommercialCompositeProductId,
} from "@/app/lib/service-orders/composition";
import { suggestedPipelineRank } from "@/app/lib/service-orders/dependencies";
import type { ServiceOrderPhase } from "@/app/lib/service-orders/phases";

export type PurchaseLine = { id?: string; nome?: string; quantidade?: number };

export type ServiceOrderSpec = {
  /** Tipo atômico (sessao, mix, beat1…). */
  serviceType: string;
  /** Produto comercial de origem (pode ser o próprio atômico ou composto). */
  commercialSource: string;
  sequenceIndex: number;
  suggestedRank: number;
};

function normalizeTypeId(raw: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!s) return "sessao";
  const aliases: Record<string, string> = {
    mixagem: "mix",
    masterizacao: "master",
    masterização: "master",
    mix_e_master: "mix_master",
    "mix+master": "mix_master",
    sessão: "sessao",
    captacao: "captacao",
    captação: "captacao",
  };
  return aliases[s] || s;
}

const PRODUCT_LABEL_ALIASES: Record<string, string> = {
  "1_beat": "beat1",
  "2_beats": "beat2",
  "3_beats": "beat3",
  "4_beats": "beat4",
  beat_mix_master: "beat_mix_master",
  "beat_+_mix_+_master": "beat_mix_master",
  producao_completa: "producao_completa",
  "producao_completa_(4h_+_beat_+_mix_+_master)": "producao_completa",
  "producao_completa_(2h_sessao_+_2h_captacao_+_beat_+_mix_+_master)":
    "producao_completa",
};

export function resolveCommercialProductId(
  rawId?: string | null,
  rawName?: string | null
): string {
  const candidates = [String(rawId || "").trim(), String(rawName || "").trim()].filter(
    Boolean
  );
  for (const candidate of candidates) {
    const normalized = normalizeTypeId(candidate);
    if (isCommercialCompositeProductId(normalized)) return normalized;
    const fromLabel = PRODUCT_LABEL_ALIASES[normalized];
    if (fromLabel) return fromLabel;
    if (normalized) return normalized;
  }
  return normalizeTypeId(String(rawId || rawName || "sessao"));
}

/** Expande uma linha comercial em tipos atômicos (qty × composição). */
export function expandLineToAtomicServiceTypes(
  rawId: string,
  quantidade = 1,
  rawName?: string | null
): string[] {
  const productId = resolveCommercialProductId(rawId, rawName);
  const qty = Math.max(1, Number(quantidade) || 1);
  const perUnit = getCommercialProductComposition(productId) ?? [
    normalizeTypeId(productId),
  ];
  const out: string[] = [];
  for (let u = 0; u < qty; u++) {
    for (const serviceType of perUnit) {
      out.push(normalizeTypeId(serviceType));
    }
  }
  return out;
}

/** Decomposição completa da compra em Ordens de Serviço. */
export function expandPurchaseToServiceOrders(
  services: PurchaseLine[] = [],
  beats: PurchaseLine[] = []
): ServiceOrderSpec[] {
  const lines = [
    ...(Array.isArray(services) ? services : []),
    ...(Array.isArray(beats) ? beats : []),
  ].filter((line) => Math.max(0, Number(line.quantidade) || 0) > 0);

  const orders: ServiceOrderSpec[] = [];
  let sequenceIndex = 0;
  for (const line of lines) {
    const commercialSource = resolveCommercialProductId(line.id, line.nome);
    const atomics = expandLineToAtomicServiceTypes(
      String(line.id || line.nome || "sessao"),
      line.quantidade,
      line.nome
    );
    for (const serviceType of atomics) {
      orders.push({
        serviceType,
        commercialSource,
        sequenceIndex: sequenceIndex++,
        suggestedRank: suggestedPipelineRank(serviceType),
      });
    }
  }
  return orders;
}

export function countServiceOrders(
  services: PurchaseLine[] = [],
  beats: PurchaseLine[] = []
): number {
  return expandPurchaseToServiceOrders(services, beats).length;
}

/**
 * Regra universal GO-H5:
 * exatamente 1 Ordem → calendário imediato;
 * 2+ Ordens → cupons (nunca calendário no checkout).
 */
export function purchaseOpensImmediateSchedule(
  services: PurchaseLine[] = [],
  beats: PurchaseLine[] = []
): boolean {
  return countServiceOrders(services, beats) === 1;
}

export function purchaseEmitsServiceOrderCoupons(
  services: PurchaseLine[] = [],
  beats: PurchaseLine[] = []
): boolean {
  return countServiceOrders(services, beats) >= 2;
}

export type PersistedServiceOrderShape = {
  id: string;
  serviceType: string;
  commercialSource: string | null;
  phase: ServiceOrderPhase;
  couponId: string | null;
  appointmentId: number | null;
  paymentId: string | null;
  sequenceIndex: number;
};
