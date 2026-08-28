/**
 * BUG-001 — Estado operacional do calendário (fonte única de verdade).
 *
 * Admin e Usuário consomem a mesma ocupação (`computeCalendarDayStates`).
 * A paleta Admin continua em `resolveCalendarDayVisual` / `toUserDayVisual`.
 * O calendário público NÃO projeta a paleta Admin: usa
 * `resolvePublicHourKind` / `resolvePublicDayVisual` (contagem de slots elegíveis).
 */
import { isSchedulableServiceType } from "@/app/lib/service-catalog";
import { appointmentReservesCalendar } from "@/app/lib/domain/statuses";
import {
  getHourStudio,
  normalizeHourLabel,
  toIsoDateStudio,
} from "@/app/lib/calendar-time";

export {
  PLATFORM_TIMEZONE,
  PLATFORM_UTC_OFFSET,
  toIsoDateStudio,
  getHourStudio,
  parseStudioDateTime,
  todayIsoStudio,
  isIsoDatePastStudio,
  isStudioDateTimePast,
  formatStudioDateLong,
  formatStudioMonthYear,
  isoDateFromParts,
  daysInMonth,
  isLeapYear,
  isValidIsoDate,
  weekdaySun0,
  minScheduleDateIsoStudio,
  normalizeHourLabel,
} from "@/app/lib/calendar-time";

/** @deprecated use toIsoDateStudio */
export const toIsoDateLocal = toIsoDateStudio;

export const OPERATIONAL_HOURS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
] as const;

export type OperationalHour = (typeof OPERATIONAL_HOURS)[number];

export const PRODUCTION_DELIVERY_HOUR: OperationalHour = "22:00";

export type PresencialDayStatus = "livre" | "parcial" | "ocupado";

/** Visual canônico (Admin). */
export type CalendarDayVisual =
  | "livre"
  | "parcial"
  | "ocupado"
  | "entrega"
  | "parcial_entrega"
  | "concluido";

/** Visual simplificado (Usuário). */
export type UserCalendarDayVisual = "livre" | "parcial" | "ocupado";

export type CalendarDayState = {
  date: string;
  /** Visual Admin (fonte). */
  visual: CalendarDayVisual;
  presencialStatus: PresencialDayStatus;
  hasProductionDelivery: boolean;
  /** Todos os eventos do dia estão concluídos (sem reserva ativa). */
  allCompleted: boolean;
  /** Horas que bloqueiam nova reserva (ativo + concluído + bloqueio). */
  occupiedHours: string[];
  /** Sessão/Captação ainda ativos. */
  presencialHours: string[];
  blockedHours: string[];
  /** Produções ativas (não concluídas). */
  productionHours: string[];
  /** Produções concluídas (parte de completedHours). */
  completedProductionHours: string[];
  /** Horas de eventos concluídos (histórico azul no Admin). */
  completedHours: string[];
};

export type CalendarAppointmentInput = {
  data: string | Date;
  duracaoMinutos?: number | null;
  tipo?: string | null;
  status?: string | null;
  id?: string | number | null;
};

export type CalendarBlockedSlotInput = {
  data: string;
  hora: string;
};

export function isProductionDeliveryAppointment(
  tipo?: string | null
): boolean {
  if (!tipo) return false;
  return !isSchedulableServiceType(tipo);
}

export function isCompletedCalendarStatus(status?: string | null): boolean {
  return String(status || "") === "concluido";
}

/** Reserva ativa (ainda não concluída) — amarelo/roxo. */
export function isActiveCalendarStatus(status?: string | null): boolean {
  const s = String(status || "");
  return (
    appointmentReservesCalendar(s) && !isCompletedCalendarStatus(s)
  );
}

export function hoursCoveredByPresencial(
  start: Date,
  duracaoMinutos: number
): string[] {
  const horaInicio = parseInt(getHourStudio(start).slice(0, 2), 10);
  const horasOcupadas = Math.max(1, Math.ceil(duracaoMinutos / 60));
  const out: string[] = [];
  for (let i = 0; i < horasOcupadas; i++) {
    const h = horaInicio + i;
    if (h > 23) break;
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out;
}

export function findLastFreeOperationalHour(
  occupied: Set<string>
): OperationalHour | null {
  for (let i = OPERATIONAL_HOURS.length - 1; i >= 0; i--) {
    const h = OPERATIONAL_HOURS[i];
    if (!occupied.has(h)) return h;
  }
  return null;
}

export function allocateProductionHours(
  baseOccupied: Set<string>,
  productionCount: number
): string[] {
  const occupied = new Set(baseOccupied);
  const assigned: string[] = [];
  for (let n = 0; n < productionCount; n++) {
    const slot = findLastFreeOperationalHour(occupied);
    if (!slot) break;
    occupied.add(slot);
    assigned.push(slot);
  }
  return assigned;
}

export function resolvePresencialStatus(
  occupiedPresencialOrBlocked: Set<string>
): PresencialDayStatus {
  const count = OPERATIONAL_HOURS.filter((h) =>
    occupiedPresencialOrBlocked.has(h)
  ).length;
  if (count <= 0) return "livre";
  if (count >= OPERATIONAL_HOURS.length) return "ocupado";
  return "parcial";
}

/**
 * Visual Admin do dia (fonte canônica da paleta Controle de Agendamento).
 *
 * Prioridade de estados finais (inalterada):
 * - Sem horários livres + reserva ativa ou bloqueio → ocupado (vermelho)
 * - Sem horários livres + só histórico concluído → concluido (azul)
 *
 * Com horários livres restantes, a cor descreve o TIPO de atividade:
 * - Amarelo (`parcial`) = Sessão/Captação e/ou bloqueio administrativo
 *   (indisponibilidade de estúdio conta como categoria "Serviço" na paleta)
 * - Roxo (`entrega`) = só Produção
 * - Amarelo+Roxo (`parcial_entrega`) = Produção + categoria amarela
 * - Verde (`livre`) = nenhuma atividade/bloqueio
 */
export function resolveCalendarDayVisual(params: {
  activePresencialHours: string[];
  activeProductionHours: string[];
  completedHours: string[];
  blockedHours: string[];
}): CalendarDayVisual {
  const blocking = new Set<string>([
    ...params.activePresencialHours,
    ...params.activeProductionHours,
    ...params.completedHours,
    ...params.blockedHours,
  ]);
  const freeCount = OPERATIONAL_HOURS.filter((h) => !blocking.has(h)).length;
  const hasActivePresencial = params.activePresencialHours.length > 0;
  const hasActiveProduction = params.activeProductionHours.length > 0;
  const hasBlocked = params.blockedHours.length > 0;
  const hasCompleted = params.completedHours.length > 0;
  const hasActive = hasActivePresencial || hasActiveProduction;
  const hasYellowCategory = hasActivePresencial || hasBlocked;

  if (freeCount <= 0) {
    if (hasActive || hasBlocked) return "ocupado";
    if (hasCompleted) return "concluido";
    return "ocupado";
  }

  if (hasYellowCategory && hasActiveProduction) return "parcial_entrega";
  if (hasYellowCategory) return "parcial";
  if (hasActiveProduction) return "entrega";
  // Só concluídos com livres restantes → dia ainda reservável (verde)
  return "livre";
}

/** Projeção Usuário a partir da paleta Admin (legado / homologação). */
export function toUserDayVisual(
  visual: CalendarDayVisual,
  opts?: { past?: boolean }
): UserCalendarDayVisual {
  if (opts?.past) {
    return "ocupado";
  }
  switch (visual) {
    case "livre":
      return "livre";
    case "ocupado":
      return "ocupado";
    case "concluido":
      return "parcial"; // amarelo até a data passar
    default:
      return "parcial";
  }
}

/** Horário no calendário público: disponível / ocupado por reserva / bloqueado pelo estúdio. */
export type PublicHourKind = "available" | "occupied" | "blocked";

export function eligibleHoursForPublicCalendar(
  hours?: readonly string[] | null
): string[] {
  const src = hours && hours.length > 0 ? hours : OPERATIONAL_HOURS;
  return [...new Set(src.map((h) => normalizeHourLabel(h)))];
}

/**
 * Fonte canônica do horário público.
 * Bloqueio administrativo tem prioridade sobre reserva (nunca amarelo).
 */
export function resolvePublicHourKind(
  hour: string,
  state: Pick<CalendarDayState, "occupiedHours" | "blockedHours">
): PublicHourKind {
  const h = normalizeHourLabel(hour);
  const blocked = new Set((state.blockedHours || []).map(normalizeHourLabel));
  if (blocked.has(h)) return "blocked";
  const occupied = new Set((state.occupiedHours || []).map(normalizeHourLabel));
  if (occupied.has(h)) return "occupied";
  return "available";
}

export function countPublicDaySlots(
  state: Pick<CalendarDayState, "occupiedHours" | "blockedHours">,
  eligibleHours?: readonly string[] | null
): {
  availableCount: number;
  occupiedCount: number;
  blockedCount: number;
  totalEligibleSlots: number;
} {
  const hours = eligibleHoursForPublicCalendar(eligibleHours);
  let availableCount = 0;
  let occupiedCount = 0;
  let blockedCount = 0;
  for (const h of hours) {
    const kind = resolvePublicHourKind(h, state);
    if (kind === "available") availableCount += 1;
    else if (kind === "occupied") occupiedCount += 1;
    else blockedCount += 1;
  }
  return {
    availableCount,
    occupiedCount,
    blockedCount,
    totalEligibleSlots: hours.length,
  };
}

/**
 * Fonte canônica do dia no calendário público (verde / amarelo / vermelho).
 * Depende dos horários elegíveis do serviço, não da paleta Admin.
 */
export function resolvePublicDayVisual(
  state: Pick<CalendarDayState, "occupiedHours" | "blockedHours">,
  opts?: { past?: boolean; eligibleHours?: readonly string[] | null }
): UserCalendarDayVisual {
  if (opts?.past) return "ocupado";
  const { availableCount, totalEligibleSlots } = countPublicDaySlots(
    state,
    opts?.eligibleHours
  );
  if (totalEligibleSlots <= 0) return "ocupado";
  if (availableCount === totalEligibleSlots) return "livre";
  if (availableCount > 0) return "parcial";
  return "ocupado";
}

export function isPublicDaySelectable(
  visual: UserCalendarDayVisual,
  past?: boolean
): boolean {
  if (past) return false;
  return visual !== "ocupado";
}

export function isPublicHourSelectable(
  kind: PublicHourKind,
  past?: boolean
): boolean {
  if (past) return false;
  return kind === "available";
}

/** Estilo/interação do horário público a partir do kind de domínio. */
export function publicHourSlotPresentation(
  kind: PublicHourKind,
  opts?: { past?: boolean; selected?: boolean }
): { className: string; disabled: boolean } {
  return userHourSlotClass({
    past: Boolean(opts?.past),
    unavailable: Boolean(opts?.past) || kind === "blocked",
    occupied: kind === "occupied" && !opts?.past,
    selected: opts?.selected,
  });
}

export function computeCalendarDayStates(params: {
  appointments: CalendarAppointmentInput[];
  blockedSlots?: CalendarBlockedSlotInput[];
}): Record<string, CalendarDayState> {
  type AptBucket = {
    activePresencial: Set<string>;
    completedPresencial: Set<string>;
    activeProds: CalendarAppointmentInput[];
    completedProds: CalendarAppointmentInput[];
  };

  const byDay = new Map<string, AptBucket>();
  const blockedByDay = new Map<string, Set<string>>();

  const ensureDay = (date: string): AptBucket => {
    let b = byDay.get(date);
    if (!b) {
      b = {
        activePresencial: new Set(),
        completedPresencial: new Set(),
        activeProds: [],
        completedProds: [],
      };
      byDay.set(date, b);
    }
    return b;
  };

  for (const slot of params.blockedSlots || []) {
    const date = String(slot.data || "").slice(0, 10);
    if (!date) continue;
    let set = blockedByDay.get(date);
    if (!set) {
      set = new Set();
      blockedByDay.set(date, set);
    }
    set.add(normalizeHourLabel(slot.hora));
  }

  for (const apt of params.appointments || []) {
    const status = apt.status ?? null;
    // cancelado/recusado/pendente não ocupam
    if (status != null && !appointmentReservesCalendar(status)) continue;

    const date = toIsoDateStudio(apt.data);
    if (!date) continue;
    const bucket = ensureDay(date);
    const completed = isCompletedCalendarStatus(status);

    if (isProductionDeliveryAppointment(apt.tipo)) {
      if (completed) bucket.completedProds.push(apt);
      else bucket.activeProds.push(apt);
      continue;
    }

    const start =
      typeof apt.data === "string" ? new Date(apt.data) : new Date(apt.data);
    const hours = hoursCoveredByPresencial(start, apt.duracaoMinutos || 60);
    const target = completed ? bucket.completedPresencial : bucket.activePresencial;
    for (const h of hours) target.add(h);
  }

  const allDates = new Set<string>([...byDay.keys(), ...blockedByDay.keys()]);
  const result: Record<string, CalendarDayState> = {};

  for (const date of allDates) {
    const bucket = byDay.get(date) || {
      activePresencial: new Set<string>(),
      completedPresencial: new Set<string>(),
      activeProds: [] as CalendarAppointmentInput[],
      completedProds: [] as CalendarAppointmentInput[],
    };
    const blockedHours = Array.from(blockedByDay.get(date) || []).sort();

    const sortProds = (list: CalendarAppointmentInput[]) => {
      list.sort((a, b) => {
        const ha = getHourStudio(a.data);
        const hb = getHourStudio(b.data);
        if (ha !== hb) return ha.localeCompare(hb);
        return String(a.id ?? "").localeCompare(String(b.id ?? ""));
      });
    };
    sortProds(bucket.activeProds);
    sortProds(bucket.completedProds);

    // Base: presencial ativo + bloqueios + presencial concluído
    const occupied = new Set<string>([
      ...bucket.activePresencial,
      ...bucket.completedPresencial,
      ...blockedHours,
    ]);

    const assignProds = (list: CalendarAppointmentInput[]) => {
      const hours: string[] = [];
      for (const prod of list) {
        const stored = getHourStudio(prod.data);
        const storedOk =
          (OPERATIONAL_HOURS as readonly string[]).includes(stored) &&
          !occupied.has(stored);
        const hour = storedOk
          ? stored
          : findLastFreeOperationalHour(occupied);
        if (!hour) break;
        occupied.add(hour);
        hours.push(hour);
      }
      return hours.sort();
    };

    // Concluídas primeiro (histórico estável), depois ativas
    const completedProductionHours = assignProds(bucket.completedProds);
    const activeProductionHours = assignProds(bucket.activeProds);

    const activePresencialHours = Array.from(bucket.activePresencial).sort();
    const completedHours = Array.from(
      new Set([
        ...bucket.completedPresencial,
        ...completedProductionHours,
      ])
    ).sort();

    const hasActive =
      activePresencialHours.length > 0 || activeProductionHours.length > 0;
    const allCompleted =
      !hasActive &&
      completedHours.length > 0 &&
      blockedHours.length === 0;

    const visual = resolveCalendarDayVisual({
      activePresencialHours,
      activeProductionHours,
      completedHours,
      blockedHours,
    });

    const presencialOrBlocked = new Set([
      ...activePresencialHours,
      ...blockedHours,
    ]);

    result[date] = {
      date,
      visual,
      presencialStatus: resolvePresencialStatus(presencialOrBlocked),
      hasProductionDelivery:
        activeProductionHours.length + completedProductionHours.length > 0,
      allCompleted,
      occupiedHours: Array.from(occupied).sort(),
      presencialHours: activePresencialHours,
      blockedHours,
      productionHours: activeProductionHours,
      completedProductionHours,
      completedHours,
    };
  }

  return result;
}

export function getCalendarDayState(
  states: Record<string, CalendarDayState>,
  date: string
): CalendarDayState {
  return (
    states[date] || {
      date,
      visual: "livre",
      presencialStatus: "livre",
      hasProductionDelivery: false,
      allCompleted: false,
      occupiedHours: [],
      presencialHours: [],
      blockedHours: [],
      productionHours: [],
      completedProductionHours: [],
      completedHours: [],
    }
  );
}

export function resolveNextProductionHourForDay(params: {
  isoDate: string;
  appointments: CalendarAppointmentInput[];
  blockedSlots?: CalendarBlockedSlotInput[];
}): OperationalHour | null {
  const states = computeCalendarDayStates(params);
  const state = getCalendarDayState(states, params.isoDate);
  return findLastFreeOperationalHour(new Set(state.occupiedHours));
}

/** Legenda Admin — dias. */
export const ADMIN_DAY_LEGEND = [
  { visual: "livre" as const, label: "Livre", color: "Verde", swatch: "bg-green-600" },
  {
    visual: "parcial" as const,
    label: "Serviço",
    color: "Amarelo",
    swatch: "bg-yellow-500",
  }, // Sessão, Captação e/ou bloqueio administrativo
  { visual: "entrega" as const, label: "Produção", color: "Roxo", swatch: "bg-purple-600" },
  {
    visual: "parcial_entrega" as const,
    label: "Serviço + Produção",
    color: "Amarelo/Roxo",
    swatch: "bg-gradient-to-br from-yellow-500 to-purple-600",
  },
  { visual: "ocupado" as const, label: "Ocupado", color: "Vermelho", swatch: "bg-red-600" },
  { visual: "concluido" as const, label: "Concluído", color: "Azul", swatch: "bg-blue-600" },
] as const;

/** Legenda Usuário — dias. */
export const USER_DAY_LEGEND = [
  { visual: "livre" as const, label: "Livre", color: "Verde", swatch: "bg-green-600" },
  { visual: "parcial" as const, label: "Ocupado", color: "Amarelo", swatch: "bg-yellow-500" },
  { visual: "ocupado" as const, label: "Indisponível", color: "Vermelho", swatch: "bg-red-600" },
] as const;

/** @deprecated use ADMIN_DAY_LEGEND */
export const CALENDAR_LEGEND = ADMIN_DAY_LEGEND.map((l) => ({
  visual: l.visual,
  label: l.label,
  color: l.color,
}));

export function calendarDayCellStyle(
  visual: CalendarDayVisual,
  opts?: {
    past?: boolean;
    selected?: boolean;
    audience?: "admin" | "user";
    dayState?: CalendarDayState;
    eligibleHours?: readonly string[];
  }
): { className: string; style?: Record<string, string> } {
  const audience = opts?.audience || "admin";
  if (opts?.past && audience === "user") {
    return {
      className:
        "border-red-600 bg-red-600/40 text-red-200 opacity-80 cursor-not-allowed",
    };
  }
  const shown: CalendarDayVisual | UserCalendarDayVisual =
    audience === "user"
      ? opts?.dayState
        ? resolvePublicDayVisual(opts.dayState, {
            past: opts?.past,
            eligibleHours: opts?.eligibleHours,
          })
        : toUserDayVisual(visual, { past: opts?.past })
      : opts?.past && visual !== "livre" && visual !== "concluido"
        ? "ocupado"
        : visual;

  if (opts?.past && audience === "admin" && visual === "livre") {
    return {
      className: "border-zinc-700 bg-zinc-900/40 text-zinc-500 opacity-60",
    };
  }
  if (opts?.past && audience === "user" && shown === "ocupado") {
    return {
      className:
        "border-red-600 bg-red-600/40 text-red-200 opacity-80 cursor-not-allowed",
    };
  }
  if (opts?.selected) {
    return { className: "border-white bg-white/10 text-white" };
  }

  switch (shown) {
    case "ocupado":
      return {
        className:
          "border-red-600 bg-red-600/30 text-red-300 hover:bg-red-600/40",
      };
    case "concluido":
      return {
        className:
          "border-blue-500 bg-blue-600/30 text-blue-200 hover:bg-blue-600/40",
      };
    case "parcial":
      return {
        className:
          "border-yellow-500 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
      };
    case "entrega":
      return {
        className:
          "border-purple-500 bg-purple-600/30 text-purple-200 hover:bg-purple-600/40",
      };
    case "parcial_entrega":
      return {
        className: "border-yellow-500 text-white hover:opacity-90",
        style: {
          background:
            "linear-gradient(135deg, rgba(234,179,8,0.35) 50%, rgba(147,51,234,0.4) 50%)",
        },
      };
    default:
      return {
        className:
          "border-green-600 bg-green-600/20 text-green-300 hover:bg-green-600/30",
      };
  }
}

/** Classe de slot horário — Admin. */
export function adminHourSlotClass(kind: {
  past?: boolean;
  blocked?: boolean;
  completed?: boolean;
  presencial?: boolean;
  production?: boolean;
}): string {
  if (kind.past || kind.blocked) {
    return "bg-red-600 text-white border-red-500";
  }
  if (kind.completed) {
    return "bg-blue-600/40 text-blue-100 border-blue-500";
  }
  if (kind.presencial) {
    return "bg-yellow-500/25 text-yellow-200 border-yellow-500";
  }
  if (kind.production) {
    return "bg-purple-600/35 text-purple-100 border-purple-500";
  }
  return "bg-green-600/20 text-green-300 border-green-600 hover:bg-green-600/30";
}

/** Classe de slot horário — Usuário. */
export function userHourSlotClass(kind: {
  past?: boolean;
  unavailable?: boolean;
  occupied?: boolean;
  selected?: boolean;
}): { className: string; disabled: boolean } {
  if (kind.past || kind.unavailable) {
    return {
      className:
        "cursor-not-allowed border-red-700 bg-red-900/50 text-red-300 opacity-70",
      disabled: true,
    };
  }
  if (kind.occupied) {
    return {
      className:
        "cursor-not-allowed border-yellow-700 bg-yellow-900/40 text-yellow-300/80",
      disabled: true,
    };
  }
  if (kind.selected) {
    return {
      className: "border-red-500 bg-red-600/30 text-white",
      disabled: false,
    };
  }
  return {
    className:
      "border-green-700 bg-green-900/30 text-green-200 hover:border-green-500",
    disabled: false,
  };
}
