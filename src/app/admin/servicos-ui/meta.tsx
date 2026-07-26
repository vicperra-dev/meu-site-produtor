/**
 * GO-03A — Metadados visuais do painel de serviços.
 * Slugs de rota ↔ status canônicos, cores, ícones e labels.
 * Não altera domínio: apenas apresentação.
 */
import type { AdminService } from "./types";

/* ---------------------------------- Ícones --------------------------------- */

type IconProps = { className?: string };

const base = "inline-block shrink-0";

export const Icons = {
  inbox: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  clock: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  check: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  play: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  checkCircle: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  x: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  xCircle: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  slash: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  search: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  user: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  calendar: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  card: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  file: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  music: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  upload: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  download: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  trash: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  refresh: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  external: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  chevronLeft: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  filter: ({ className = "w-4 h-4" }: IconProps) => (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
} as const;

export type IconName = keyof typeof Icons;

/* ------------------------------ Status → visual ----------------------------- */

export type StatusKey =
  | "todos"
  | "pendente"
  | "aceito"
  | "em_andamento"
  | "concluido"
  | "cancelado"
  | "recusado";

export interface StatusMeta {
  key: StatusKey;
  slug: string;
  label: string;
  icon: IconName;
  /** Cor do ponto/badge sólido */
  dot: string;
  /** Texto do badge */
  text: string;
  /** Fundo/borda do badge */
  chip: string;
  /** Realce da aba ativa */
  activeTab: string;
}

export const STATUS_META: StatusMeta[] = [
  {
    key: "todos",
    slug: "todos",
    label: "Todos",
    icon: "inbox",
    dot: "bg-zinc-400",
    text: "text-zinc-200",
    chip: "bg-zinc-500/15 border-zinc-500/40",
    activeTab: "border-zinc-300 text-zinc-100",
  },
  {
    key: "pendente",
    slug: "pendentes",
    label: "Pendentes",
    icon: "clock",
    // GO-H9: cinza
    dot: "bg-zinc-400",
    text: "text-zinc-300",
    chip: "bg-zinc-500/15 border-zinc-500/50",
    activeTab: "border-zinc-400 text-zinc-200",
  },
  {
    key: "aceito",
    slug: "aceitos",
    label: "Aceitos",
    icon: "check",
    // GO-H9: verde
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    chip: "bg-emerald-500/10 border-emerald-500/40",
    activeTab: "border-emerald-400 text-emerald-300",
  },
  {
    key: "em_andamento",
    slug: "em-andamento",
    label: "Em andamento",
    icon: "play",
    // GO-H9: laranja
    dot: "bg-orange-400",
    text: "text-orange-300",
    chip: "bg-orange-500/10 border-orange-500/40",
    activeTab: "border-orange-400 text-orange-300",
  },
  {
    key: "concluido",
    slug: "concluidos",
    label: "Concluídos",
    icon: "checkCircle",
    // GO-H9: azul
    dot: "bg-sky-400",
    text: "text-sky-300",
    chip: "bg-sky-500/10 border-sky-500/40",
    activeTab: "border-sky-400 text-sky-300",
  },
  {
    key: "cancelado",
    slug: "cancelados",
    label: "Cancelados",
    icon: "slash",
    // GO-H9: cinza escuro
    dot: "bg-zinc-600",
    text: "text-zinc-400",
    chip: "bg-zinc-800/80 border-zinc-600",
    activeTab: "border-zinc-500 text-zinc-400",
  },
  {
    key: "recusado",
    slug: "recusados",
    label: "Recusados",
    icon: "xCircle",
    // GO-H9: vermelho
    dot: "bg-red-400",
    text: "text-red-300",
    chip: "bg-red-500/10 border-red-500/40",
    activeTab: "border-red-400 text-red-300",
  },
];

export const STATUS_BY_KEY = new Map(STATUS_META.map((m) => [m.key, m]));
export const STATUS_BY_SLUG = new Map(STATUS_META.map((m) => [m.slug, m]));

export function statusMetaFor(status: string): StatusMeta {
  // Appointment "confirmado" é exibido como Aceito (mesma semântica operacional).
  if (status === "confirmado") return STATUS_BY_KEY.get("aceito")!;
  return STATUS_BY_KEY.get(status as StatusKey) ?? STATUS_META[0];
}

/* --------------------------------- Pagamento -------------------------------- */

export function paymentMeta(status: string | undefined | null): {
  label: string;
  chip: string;
  text: string;
} {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "received" || s === "confirmed") {
    return { label: "Aprovado", chip: "bg-emerald-500/10 border-emerald-500/40", text: "text-emerald-300" };
  }
  if (s === "pending") {
    return { label: "Pendente", chip: "bg-amber-500/10 border-amber-500/40", text: "text-amber-300" };
  }
  if (s === "refunded" || s === "refund") {
    return { label: "Reembolsado", chip: "bg-sky-500/10 border-sky-500/40", text: "text-sky-300" };
  }
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    return { label: "Rejeitado", chip: "bg-red-500/10 border-red-500/40", text: "text-red-300" };
  }
  if (!s) return { label: "—", chip: "bg-zinc-500/10 border-zinc-600", text: "text-zinc-500" };
  return { label: status as string, chip: "bg-zinc-500/10 border-zinc-600", text: "text-zinc-300" };
}

/* ---------------------------- Tipo de serviço ------------------------------- */

const TYPE_LABELS: Record<string, string> = {
  sessao: "Sessão",
  captacao: "Captação",
  sonoplastia: "Sonoplastia",
  mix: "Mixagem",
  master: "Masterização",
  mix_master: "Mix + Master",
  beat1: "1 Beat",
  beat2: "2 Beats",
  beat3: "3 Beats",
  beat4: "4 Beats",
  beat: "Beat",
  beat_mix_master: "Beat + Mix + Master",
  producao_completa: "Produção Completa",
};

export function serviceTypeLabel(tipo: string): string {
  const norm = String(tipo || "").trim().toLowerCase().replace(/\s+/g, "_");
  return TYPE_LABELS[norm] || tipo;
}

/** Grupos do filtro rápido de tipo (PARTE 4). */
export const TYPE_FILTERS: { value: string; label: string; match: (tipo: string) => boolean }[] = [
  { value: "sessao", label: "Sessão", match: (t) => norm(t) === "sessao" || norm(t) === "captacao" },
  { value: "beat", label: "Beat", match: (t) => norm(t).startsWith("beat") && norm(t) !== "beat_mix_master" },
  { value: "mix", label: "Mixagem", match: (t) => norm(t) === "mix" || norm(t) === "mixagem" },
  { value: "master", label: "Master", match: (t) => norm(t) === "master" || norm(t) === "masterizacao" },
  { value: "mix_master", label: "Mix + Master", match: (t) => norm(t) === "mix_master" },
  { value: "producao_completa", label: "Produção Completa", match: (t) => norm(t) === "producao_completa" },
  { value: "sonoplastia", label: "Sonoplastia", match: (t) => norm(t) === "sonoplastia" },
  {
    value: "pacotes",
    label: "Pacotes",
    match: (t) => ["beat_mix_master", "producao_completa", "mix_master", "beat2", "beat3", "beat4"].includes(norm(t)),
  },
];

function norm(t: string): string {
  return String(t || "").trim().toLowerCase().replace(/\s+/g, "_");
}

/* --------------------------------- Períodos --------------------------------- */

export const PERIOD_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "mes", label: "Este mês" },
] as const;

export type PeriodValue = (typeof PERIOD_FILTERS)[number]["value"];

export function matchesPeriod(s: AdminService, period: string): boolean {
  return matchesPeriodDate(s.appointment?.data || s.createdAt, period);
}

/** Versão genérica (reuso GO-03B): compara uma data ISO com o período rápido. */
export function matchesPeriodDate(value: string, period: string): boolean {
  if (!period || period === "todos") return true;
  const ref = new Date(value);
  if (Number.isNaN(ref.getTime())) return true;
  const now = new Date();
  if (period === "hoje") {
    return ref.toDateString() === now.toDateString();
  }
  if (period === "7d") {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return ref >= cutoff;
  }
  if (period === "mes") {
    return ref.getFullYear() === now.getFullYear() && ref.getMonth() === now.getMonth();
  }
  return true;
}

/* ---------------------------------- Sort ------------------------------------ */

export const SORT_OPTIONS = [
  { value: "date_desc", label: "Mais recentes" },
  { value: "date_asc", label: "Mais antigos" },
  { value: "cliente_asc", label: "Cliente A→Z" },
  { value: "tipo_asc", label: "Tipo A→Z" },
] as const;

export function sortServices(list: AdminService[], sort: string): AdminService[] {
  const arr = [...list];
  const dateOf = (s: AdminService) => new Date(s.appointment?.data || s.createdAt).getTime() || 0;
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

/* --------------------------------- Formatos --------------------------------- */

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Tempo relativo amigável ("há 3 dias"). */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return "";
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}
