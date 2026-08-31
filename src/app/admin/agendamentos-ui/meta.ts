/**
 * GO-03B — Helpers de apresentação do painel de agendamentos.
 * Reutiliza os metadados visuais do GO-03A (servicos-ui/meta) e adiciona
 * somente filtros/pesquisa/ordenação específicos de Appointment.
 * Nenhuma regra de negócio aqui.
 */
import {
  matchesPeriodDate,
  serviceTypeLabel,
  formatDate,
  type StatusKey,
} from "@/app/admin/servicos-ui/meta";
import type { AdminAgendamento } from "./types";

const PAID = new Set(["approved", "received", "confirmed"]);

function norm(t: string): string {
  return String(t || "").trim().toLowerCase().replace(/\s+/g, "_");
}

/** Status canônico da UI: "confirmado" é exibido/agrupado como "aceito". */
export function aptStatusKey(status: string): string {
  return status === "confirmado" ? "aceito" : status;
}

/* ------------------------------- Filtro: tipo ------------------------------- */

export const APT_TYPE_FILTERS: { value: string; label: string; match: (a: AdminAgendamento) => boolean }[] = [
  { value: "sessao", label: "Sessão", match: (a) => norm(a.tipo) === "sessao" },
  { value: "captacao", label: "Captação", match: (a) => norm(a.tipo) === "captacao" },
  { value: "beat", label: "Beat", match: (a) => norm(a.tipo).startsWith("beat") && !norm(a.tipo).includes("mix") },
  { value: "mix", label: "Mixagem", match: (a) => norm(a.tipo) === "mix" || norm(a.tipo) === "mixagem" },
  { value: "master", label: "Masterização", match: (a) => norm(a.tipo) === "master" || norm(a.tipo) === "masterizacao" },
  {
    value: "producao",
    label: "Produção",
    match: (a) =>
      ["sonoplastia", "mix_master", "beat_mix_master", "producao_completa"].includes(norm(a.tipo)),
  },
  {
    value: "plano",
    label: "Plano",
    match: (a) =>
      norm(a.tipo).includes("plano") ||
      (a.cuponsAssociados || []).some((c) => norm(c.couponType || "").includes("plano")),
  },
];

/* ---------------------------- Filtro: pagamento ----------------------------- */

export const APT_PAYMENT_OPTIONS = [
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "estornado", label: "Estornado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export function matchesAptPayment(a: AdminAgendamento, filter: string): boolean {
  if (!filter) return true;
  const st = String(a.pagamentoConfirmado?.status || "").toLowerCase();
  const temCupom = Boolean(a.cupomAssociado || (a.cuponsAssociados && a.cuponsAssociados.length > 0));
  switch (filter) {
    case "pago":
      return PAID.has(st) || temCupom;
    case "pendente":
      return !a.pagamentoConfirmado && !temCupom;
    case "estornado":
      return Boolean(a.refundProcessedAt) || st === "refunded";
    case "cancelado":
      return st === "cancelled" || st === "canceled" || st === "rejected";
    default:
      return true;
  }
}

/** Resumo do pagamento para badge (aprovado / cupom / refund / pendente). */
export function aptPaymentSummary(a: AdminAgendamento): { status: string | null; amount?: number; viaCupom: boolean } {
  const temCupom = Boolean(a.cupomAssociado || (a.cuponsAssociados && a.cuponsAssociados.length > 0));
  if (a.refundProcessedAt) {
    return { status: "refunded", amount: a.pagamentoConfirmado?.amount, viaCupom: false };
  }
  if (a.pagamentoConfirmado) {
    return { status: a.pagamentoConfirmado.status, amount: a.pagamentoConfirmado.amount, viaCupom: false };
  }
  if (temCupom) return { status: "approved", viaCupom: true };
  return { status: null, viaCupom: false };
}

/* -------------------------------- Pesquisa ---------------------------------- */

export function matchesAptSearch(a: AdminAgendamento, q: string): boolean {
  if (!q) return true;
  const cupons = a.cuponsAssociados && a.cuponsAssociados.length > 0
    ? a.cuponsAssociados
    : a.cupomAssociado
      ? [a.cupomAssociado]
      : [];
  const hay = [
    a.user.nomeArtistico,
    a.user.email,
    a.user.telefone || "",
    String(a.id),
    a.pagamentoConfirmado?.id || "",
    a.pagamentoConfirmado?.asaasId || "",
    a.pagamentoConfirmado?.paymentMethod || "",
    a.pagamentoConfirmado ? a.pagamentoConfirmado.amount.toFixed(2) : "",
    a.tipo,
    serviceTypeLabel(a.tipo),
    a.status,
    aptStatusKey(a.status),
    formatDate(a.data),
    a.observacoes || "",
    a.financial?.couponCode || "",
    a.financial?.paymentLabel || "",
    a.financial?.couponKindLabel || "",
    cupons.map((c) => `${c.code} ${c.couponType || ""} ${c.serviceType || ""}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => hay.includes(term));
}

/* -------------------------------- Ordenação --------------------------------- */

export function sortAgendamentos(list: AdminAgendamento[], sort: string): AdminAgendamento[] {
  const arr = [...list];
  const dateOf = (a: AdminAgendamento) => new Date(a.data).getTime() || 0;
  switch (sort) {
    case "date_asc":
      return arr.sort((a, b) => dateOf(a) - dateOf(b));
    case "cliente_asc":
      return arr.sort((a, b) => a.user.nomeArtistico.localeCompare(b.user.nomeArtistico, "pt-BR"));
    case "tipo_asc":
      return arr.sort((a, b) => serviceTypeLabel(a.tipo).localeCompare(serviceTypeLabel(b.tipo), "pt-BR"));
    case "date_desc":
    default:
      return arr.sort((a, b) => dateOf(b) - dateOf(a));
  }
}

/* --------------------------------- Período ---------------------------------- */

export function matchesAptPeriod(a: AdminAgendamento, period: string): boolean {
  return matchesPeriodDate(a.data, period);
}

/* --------------------------------- Duração ---------------------------------- */

export function formatDuracao(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export type { StatusKey };
