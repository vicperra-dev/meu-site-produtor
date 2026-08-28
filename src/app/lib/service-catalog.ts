import {
  getCommercialProductComposition,
  isCommercialCompositeProductId,
  COMMERCIAL_PRODUCT_COMPOSITION,
  COMMERCIAL_PRODUCT_LABELS,
} from "@/app/lib/service-orders/composition";

/** IDs que exigem data/hora de estúdio (agenda presencial). */
export const SCHEDULABLE_SERVICE_IDS = new Set<string>(["sessao", "captacao"]);

export const CANONICAL_SERVICE_IDS = [
  "sessao",
  "captacao",
  "sonoplastia",
  "mix",
  "master",
  "mix_master",
  "beat1",
  "beat2",
  "beat3",
  "beat4",
  "beat_mix_master",
  "producao_completa",
] as const;

export type CanonicalServiceId = (typeof CANONICAL_SERVICE_IDS)[number];

export function isCanonicalServiceId(value: string): value is CanonicalServiceId {
  return (CANONICAL_SERVICE_IDS as readonly string[]).includes(value);
}

export type CheckoutCatalogItem = {
  id: CanonicalServiceId;
  nome: string;
  preco: number;
  category: "service" | "beat";
};

/** Fonte financeira oficial para checkouts. O browser nunca define preços. */
export const CHECKOUT_CATALOG: Record<CanonicalServiceId, CheckoutCatalogItem> = {
  sessao: { id: "sessao", nome: "Sessão", preco: 40, category: "service" },
  captacao: { id: "captacao", nome: "Captação", preco: 55, category: "service" },
  sonoplastia: { id: "sonoplastia", nome: "Sonoplastia", preco: 350, category: "service" },
  mix: { id: "mix", nome: "Mixagem", preco: 110, category: "service" },
  master: { id: "master", nome: "Masterização", preco: 80, category: "service" },
  mix_master: {
    id: "mix_master",
    nome: COMMERCIAL_PRODUCT_LABELS.mix_master ?? "Mix + Master",
    preco: 170,
    category: "service",
  },
  beat1: { id: "beat1", nome: "1 Beat", preco: 150, category: "beat" },
  beat2: {
    id: "beat2",
    nome: COMMERCIAL_PRODUCT_LABELS.beat2 ?? "2 Beats",
    preco: 250,
    category: "beat",
  },
  beat3: {
    id: "beat3",
    nome: COMMERCIAL_PRODUCT_LABELS.beat3 ?? "3 Beats",
    preco: 350,
    category: "beat",
  },
  beat4: {
    id: "beat4",
    nome: COMMERCIAL_PRODUCT_LABELS.beat4 ?? "4 Beats",
    preco: 400,
    category: "beat",
  },
  beat_mix_master: {
    id: "beat_mix_master",
    nome: COMMERCIAL_PRODUCT_LABELS.beat_mix_master ?? "Beat + Mix + Master",
    preco: 320,
    category: "beat",
  },
  producao_completa: {
    id: "producao_completa",
    nome:
      COMMERCIAL_PRODUCT_LABELS.producao_completa ??
      "Produção Completa (2h Sessão + 2h Captação + Beat + Mix + Master)",
    preco: 450,
    category: "beat",
  },
};

export type CheckoutItemRequest = { id: string; quantidade?: number };
export type PricedCheckoutItem = CheckoutCatalogItem & { quantidade: number };

export function priceCheckoutItems(
  items: CheckoutItemRequest[] | undefined,
  expectedCategory?: "service" | "beat"
): PricedCheckoutItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const id = resolveCanonicalServiceId(item.id);
    const catalogItem = id ? CHECKOUT_CATALOG[id] : undefined;
    if (!catalogItem || (expectedCategory && catalogItem.category !== expectedCategory)) {
      throw new Error(`ITEM_CATALOGO_INVALIDO:${item.id}`);
    }
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 20) {
      throw new Error(`QUANTIDADE_INVALIDA:${item.id}`);
    }
    return { ...catalogItem, quantidade };
  });
}

export function totalPricedCheckoutItems(items: PricedCheckoutItem[]): number {
  return Math.round(
    items.reduce((sum, item) => sum + item.preco * item.quantidade, 0) * 100
  ) / 100;
}

/**
 * Normaliza o tipo gravado no cupom/serviço para o id estável do catálogo.
 */
export function normalizeServiceTypeId(raw: string): string {
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
    sessao: "sessao",
    captacao: "captacao",
    captação: "captacao",
  };
  return aliases[s] || s;
}

/**
 * Identidade canônica de SKU do catálogo.
 * Não usa rótulo visual; vazio não cai em "sessao".
 */
export function resolveCanonicalServiceId(raw: string | null | undefined): CanonicalServiceId | null {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const normalized = normalizeServiceTypeId(trimmed);
  return isCanonicalServiceId(normalized) ? normalized : null;
}

export function isSchedulableServiceType(rawId?: string | null, rawName?: string | null): boolean {
  const id = normalizeServiceTypeId(String(rawId || rawName || ""));
  return SCHEDULABLE_SERVICE_IDS.has(id);
}

/** GO-H12 — Sessão/Captação: conclusão operacional sem arquivo de entrega. */
export function isOperationalNoFileService(rawId?: string | null, rawName?: string | null): boolean {
  const id = normalizeServiceTypeId(String(rawId || rawName || ""));
  return id === "sessao" || id === "captacao";
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

/**
 * Expande uma linha do agendamento nos tipos atômicos (Ordens de Serviço / cupons).
 * GO-H5: produtos compostos usam COMMERCIAL_PRODUCT_COMPOSITION.
 */
export function resolveAgendamentoItemCatalogId(
  rawId?: string | null,
  rawName?: string | null
): string {
  const candidates = [String(rawId || "").trim(), String(rawName || "").trim()].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeServiceTypeId(candidate);
    if (isCommercialCompositeProductId(normalized)) return normalized;
    if ((CANONICAL_SERVICE_IDS as readonly string[]).includes(normalized)) return normalized;
    const fromLabel = PRODUCT_LABEL_ALIASES[normalized];
    if (fromLabel) return fromLabel;
  }
  return normalizeServiceTypeId(String(rawId || rawName || "sessao"));
}

/** @deprecated GO-H5: use isCommercialCompositeProductId / countServiceOrders. */
export function isMultiCouponAgendamentoPackageId(
  rawId?: string | null,
  rawName?: string | null
): boolean {
  const id = resolveAgendamentoItemCatalogId(rawId, rawName);
  return isCommercialCompositeProductId(id);
}

export function expandAgendamentoItemToCouponTypes(
  rawId: string,
  quantidade = 1,
  rawName?: string | null
): string[] {
  const id = resolveAgendamentoItemCatalogId(rawId, rawName);
  const qty = Math.max(1, Number(quantidade) || 1);
  const perUnit = getCommercialProductComposition(id) ?? [normalizeServiceTypeId(id)];
  const out: string[] = [];
  for (let u = 0; u < qty; u++) {
    for (const serviceType of perUnit) {
      out.push(normalizeServiceTypeId(serviceType));
    }
  }
  return out;
}

/** Reexport composição comercial (compat + GO-H5). */
export { COMMERCIAL_PRODUCT_COMPOSITION, COMMERCIAL_PRODUCT_COMPOSITION as OFFICIAL_PACKAGE_COMPOSITION };
