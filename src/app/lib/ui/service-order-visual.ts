/**
 * GO-H9 / BUG-001 — Identidade visual das Ordens de Serviço no calendário/admin.
 * Fonte: serviceType da ServiceOrder (não inferir por Payment/Cupom).
 */

export type OperationalCategory = "presencial" | "producao";

const PRESENCIAL = new Set(["sessao", "captacao"]);

const LABELS: Record<string, string> = {
  sessao: "Sessão",
  captacao: "Captação",
  beat: "Beat",
  beat1: "Beat",
  beat2: "Beat",
  beat3: "Beat",
  beat4: "Beat",
  mix: "Mixagem",
  master: "Masterização",
  mix_master: "Mixagem",
  sonoplastia: "Sonoplastia",
  producao_completa: "Produção",
};

export function operationalCategoryFromServiceType(
  serviceType?: string | null
): OperationalCategory {
  const st = String(serviceType || "").toLowerCase();
  if (PRESENCIAL.has(st)) return "presencial";
  return "producao";
}

export function serviceOrderLabel(serviceType?: string | null): string {
  const st = String(serviceType || "").toLowerCase();
  if (!st) return "Ordem de Serviço";
  if (LABELS[st]) return LABELS[st];
  if (st.startsWith("beat")) return "Beat";
  return st.charAt(0).toUpperCase() + st.slice(1);
}

export function operationalCategoryLabel(cat: OperationalCategory): string {
  return cat === "presencial" ? "Serviço" : "Produção";
}

/** Classes Tailwind para slot ocupado por OS (amarelo / roxo / azul). */
export function serviceOrderSlotClasses(
  category: OperationalCategory,
  opts?: { completed?: boolean }
): string {
  if (opts?.completed) {
    return "bg-blue-600/40 text-blue-100 border-blue-500 cursor-not-allowed";
  }
  if (category === "presencial") {
    return "bg-yellow-500/25 text-yellow-200 border-yellow-500 hover:bg-yellow-500/35";
  }
  return "bg-purple-600/35 text-purple-100 border-purple-500 hover:bg-purple-600/45";
}

export type HourOccupancyDetail = {
  kind: "blocked" | "service_order";
  serviceOrderId?: string;
  serviceType?: string;
  label: string;
  category?: OperationalCategory;
  categoryLabel?: string;
  clientName?: string;
  rootPaymentId?: string | null;
  status?: string;
  statusLabel?: string;
  origin?: string;
  appointmentId?: number;
  /** true quando appointment/SO concluído — azul no Admin. */
  completed?: boolean;
};

export function formatOccupancyTooltip(detail: HourOccupancyDetail): string {
  if (detail.kind === "blocked") {
    return "Bloqueado pelo administrador";
  }
  return [
    `Ordem: ${detail.label}`,
    detail.categoryLabel ? `Categoria: ${detail.categoryLabel}` : null,
    detail.clientName ? `Cliente: ${detail.clientName}` : null,
    detail.rootPaymentId ? `Pedido Raiz: ${detail.rootPaymentId}` : null,
    detail.statusLabel ? `Status: ${detail.statusLabel}` : null,
    detail.origin ? `Origem: ${detail.origin}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Legenda de horários — Admin. */
export const CALENDAR_OS_LEGEND = [
  { key: "livre", label: "Livre", swatch: "bg-green-600 border-green-500" },
  {
    key: "servico",
    label: "Serviço",
    swatch: "bg-yellow-500 border-yellow-400",
  },
  {
    key: "producao",
    label: "Produção",
    swatch: "bg-purple-600 border-purple-500",
  },
  {
    key: "ocupado",
    label: "Ocupado",
    swatch: "bg-red-600 border-red-500",
  },
  {
    key: "concluido",
    label: "Concluído",
    swatch: "bg-blue-600 border-blue-500",
  },
] as const;

/** Legenda de horários — Usuário. */
export const USER_HOUR_LEGEND = [
  { key: "livre", label: "Livre", swatch: "bg-green-600 border-green-500" },
  { key: "ocupado", label: "Ocupado", swatch: "bg-yellow-500 border-yellow-400" },
  {
    key: "indisponivel",
    label: "Indisponível",
    swatch: "bg-red-600 border-red-500",
  },
] as const;
