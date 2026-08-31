/**
 * Design System — tokens visuais (GO-03D).
 * Mapas de classes Tailwind reutilizáveis por toda a plataforma.
 * Nenhuma lógica de negócio: apenas padronização visual.
 */

/** Intenções semânticas usadas por Button, Badge, Tag, Alert etc. */
export type Intent =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "pending"
  | "cancelled"
  | "neutral";

/** Superfícies padrão (cards, painéis, modais). */
export const surface = {
  base: "bg-zinc-900/60 border border-zinc-800",
  raised: "bg-zinc-900 border border-zinc-800",
  overlay: "bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/50",
  subtle: "bg-zinc-800/40 border border-zinc-700/60",
} as const;

/** Raio padrão por tamanho de componente. */
export const radius = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
} as const;

/** Escala tipográfica padronizada. */
export const typography = {
  pageTitle: "text-xl sm:text-2xl font-bold tracking-tight text-zinc-100",
  sectionTitle: "text-base sm:text-lg font-semibold text-zinc-100",
  cardTitle: "text-sm font-semibold text-zinc-100",
  body: "text-sm text-zinc-300",
  muted: "text-xs text-zinc-500",
  label: "text-xs font-medium uppercase tracking-wide text-zinc-500",
  mono: "font-mono tracking-wider",
} as const;

/** Espaçamentos padronizados de layout. */
export const spacing = {
  page: "p-3 sm:p-4 md:p-6",
  card: "p-4",
  cardLg: "p-4 sm:p-5",
  sectionGap: "space-y-4 sm:space-y-6",
  stackGap: "space-y-3",
} as const;

/** Paleta semântica: texto/borda/fundo por intenção. */
export const intentClasses: Record<
  Intent,
  { text: string; bg: string; border: string; solid: string; dot: string }
> = {
  success: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    solid: "bg-emerald-600",
    dot: "bg-emerald-400",
  },
  error: {
    text: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    solid: "bg-red-600",
    dot: "bg-red-400",
  },
  warning: {
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    solid: "bg-amber-600",
    dot: "bg-amber-400",
  },
  info: {
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/40",
    solid: "bg-sky-600",
    dot: "bg-sky-400",
  },
  pending: {
    // GO-H9: Pendente = cinza
    text: "text-zinc-300",
    bg: "bg-zinc-500/15",
    border: "border-zinc-500/50",
    solid: "bg-zinc-600",
    dot: "bg-zinc-400",
  },
  cancelled: {
    // GO-H9: Cancelado = cinza escuro
    text: "text-zinc-400",
    bg: "bg-zinc-800/80",
    border: "border-zinc-600",
    solid: "bg-zinc-800",
    dot: "bg-zinc-500",
  },
  neutral: {
    text: "text-zinc-300",
    bg: "bg-zinc-500/10",
    border: "border-zinc-600",
    solid: "bg-zinc-700",
    dot: "bg-zinc-400",
  },
};

/** Junta classes ignorando valores falsy. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Formata valores monetários em BRL. */
export function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

/** Data curta pt-BR (ex.: 19/07/2026). */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

/** Data + hora pt-BR. */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hora pt-BR (ex.: 14:30). */
export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
