/**
 * BUG-001 / GO-H4 — Estado operacional do calendário (fonte única de verdade).
 *
 * Todos os módulos (agendamento, cupom, admin, homologação, disponibilidade)
 * devem consumir este módulo + `calendar-time.ts`. Sem regras locais duplicadas.
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

/** @deprecated use toIsoDateStudio — alias de compatibilidade. */
export const toIsoDateLocal = toIsoDateStudio;

/** Horários operacionais presenciais do estúdio. */
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

/**
 * Preferência legada / fallback quando o dia ainda está livre:
 * último horário da grade (produções ocupam o último livre, tipicamente 22:00).
 */
export const PRODUCTION_DELIVERY_HOUR: OperationalHour = "22:00";

export type PresencialDayStatus = "livre" | "parcial" | "ocupado";

/**
 * Estado visual composto do dia.
 * `ocupado` = dia sem nenhum horário livre → vermelho (prioridade máxima).
 * `parcial_entrega` = amarelo/roxo com horários ainda livres.
 */
export type CalendarDayVisual =
  | "livre"
  | "parcial"
  | "ocupado"
  | "entrega"
  | "parcial_entrega";

export type CalendarDayState = {
  date: string;
  visual: CalendarDayVisual;
  presencialStatus: PresencialDayStatus;
  hasProductionDelivery: boolean;
  /** Horas que bloqueiam seleção (presencial + bloqueios + produções alocadas). */
  occupiedHours: string[];
  presencialHours: string[];
  blockedHours: string[];
  /** Horas atribuídas a produções (último livre sucessivo). */
  productionHours: string[];
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

/** Último horário operacional ainda livre (do fim para o início). */
export function findLastFreeOperationalHour(
  occupied: Set<string>
): OperationalHour | null {
  for (let i = OPERATIONAL_HOURS.length - 1; i >= 0; i--) {
    const h = OPERATIONAL_HOURS[i];
    if (!occupied.has(h)) return h;
  }
  return null;
}

/**
 * Aloca N produções nos últimos horários livres sucessivos (sem substituir ocupados).
 */
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
 * Regras de cor (BUG-001):
 * - Vermelho (`ocupado`): nenhum horário livre — prioridade máxima.
 * - Verde: nada ocupado.
 * - Amarelo: há Sessão/Captação (ou bloqueio parcial) e ainda há livres.
 * - Roxo: há produção e ainda há livres (sem presencial).
 * - Amarelo/Roxo: presencial + produção com livres restantes.
 */
export function resolveCalendarDayVisual(params: {
  presencialHours: string[];
  blockedHours: string[];
  productionHours: string[];
}): CalendarDayVisual {
  const allOccupied = new Set<string>([
    ...params.presencialHours,
    ...params.blockedHours,
    ...params.productionHours,
  ]);
  const freeCount = OPERATIONAL_HOURS.filter((h) => !allOccupied.has(h)).length;
  if (freeCount <= 0 && allOccupied.size > 0) return "ocupado";

  const hasPresencial = params.presencialHours.length > 0;
  const hasBlocked = params.blockedHours.length > 0;
  const hasProduction = params.productionHours.length > 0;
  const hasPresencialOrBlock = hasPresencial || hasBlocked;

  if (hasPresencialOrBlock && hasProduction) return "parcial_entrega";
  if (hasPresencialOrBlock) {
    const pb = new Set([...params.presencialHours, ...params.blockedHours]);
    return resolvePresencialStatus(pb) === "ocupado" ? "ocupado" : "parcial";
  }
  if (hasProduction) return "entrega";
  return "livre";
}

/**
 * Calcula o mapa de estados por dia.
 * Produções: cada uma ocupa o último horário livre restante (sucessivo).
 */
export function computeCalendarDayStates(params: {
  appointments: CalendarAppointmentInput[];
  blockedSlots?: CalendarBlockedSlotInput[];
}): Record<string, CalendarDayState> {
  const presencialByDay = new Map<string, Set<string>>();
  const blockedByDay = new Map<string, Set<string>>();
  const productionsByDay = new Map<string, CalendarAppointmentInput[]>();

  const ensure = (map: Map<string, Set<string>>, date: string) => {
    let set = map.get(date);
    if (!set) {
      set = new Set();
      map.set(date, set);
    }
    return set;
  };

  for (const slot of params.blockedSlots || []) {
    const date = String(slot.data || "").slice(0, 10);
    if (!date) continue;
    ensure(blockedByDay, date).add(normalizeHourLabel(slot.hora));
  }

  for (const apt of params.appointments || []) {
    if (apt.status != null && !appointmentReservesCalendar(apt.status)) {
      continue;
    }
    const date = toIsoDateStudio(apt.data);
    if (!date) continue;

    if (isProductionDeliveryAppointment(apt.tipo)) {
      const list = productionsByDay.get(date) || [];
      list.push(apt);
      productionsByDay.set(date, list);
      continue;
    }

    const start =
      typeof apt.data === "string" ? new Date(apt.data) : new Date(apt.data);
    const hours = hoursCoveredByPresencial(start, apt.duracaoMinutos || 60);
    const set = ensure(presencialByDay, date);
    for (const h of hours) set.add(h);
  }

  const allDates = new Set<string>([
    ...presencialByDay.keys(),
    ...blockedByDay.keys(),
    ...productionsByDay.keys(),
  ]);

  const result: Record<string, CalendarDayState> = {};
  for (const date of allDates) {
    const presencialHours = Array.from(presencialByDay.get(date) || []).sort();
    const blockedHours = Array.from(blockedByDay.get(date) || []).sort();

    const base = new Set<string>([...presencialHours, ...blockedHours]);
    const prods = productionsByDay.get(date) || [];
    // Ordem estável: horário já persistido (se houver) → id
    prods.sort((a, b) => {
      const ha = getHourStudio(a.data);
      const hb = getHourStudio(b.data);
      if (ha !== hb) return ha.localeCompare(hb);
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });

    // Preferir horário já gravado se ainda livre; senão alocar último livre.
    const productionHours: string[] = [];
    const occupied = new Set(base);
    for (const prod of prods) {
      const stored = getHourStudio(prod.data);
      const storedOk =
        (OPERATIONAL_HOURS as readonly string[]).includes(stored) &&
        !occupied.has(stored);
      const hour = storedOk
        ? stored
        : findLastFreeOperationalHour(occupied);
      if (!hour) break;
      occupied.add(hour);
      productionHours.push(hour);
    }
    productionHours.sort();

    const presencialStatus = resolvePresencialStatus(base);
    const visual = resolveCalendarDayVisual({
      presencialHours,
      blockedHours,
      productionHours,
    });

    result[date] = {
      date,
      visual,
      presencialStatus,
      hasProductionDelivery: productionHours.length > 0,
      occupiedHours: Array.from(occupied).sort(),
      presencialHours,
      blockedHours,
      productionHours,
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
      occupiedHours: [],
      presencialHours: [],
      blockedHours: [],
      productionHours: [],
    }
  );
}

/**
 * Resolve o próximo horário de produção para uma data (último livre).
 * Usar nas rotas de criação / checkout.
 */
export function resolveNextProductionHourForDay(params: {
  isoDate: string;
  appointments: CalendarAppointmentInput[];
  blockedSlots?: CalendarBlockedSlotInput[];
}): OperationalHour | null {
  const states = computeCalendarDayStates(params);
  const state = getCalendarDayState(states, params.isoDate);
  const occupied = new Set(state.occupiedHours);
  return findLastFreeOperationalHour(occupied);
}

export const CALENDAR_LEGEND = [
  { visual: "livre" as const, label: "Disponível", color: "Verde" },
  {
    visual: "parcial" as const,
    label: "Sessão/Captação (ainda há livres)",
    color: "Amarelo",
  },
  {
    visual: "entrega" as const,
    label: "Produção (ainda há livres)",
    color: "Roxo",
  },
  {
    visual: "parcial_entrega" as const,
    label: "Presencial + Produção (ainda há livres)",
    color: "Amarelo/Roxo",
  },
  {
    visual: "ocupado" as const,
    label: "Sem horários livres",
    color: "Vermelho",
  },
];

/** Estilos de célula compartilhados (admin + público). */
export function calendarDayCellStyle(
  visual: CalendarDayVisual,
  opts?: { past?: boolean; selected?: boolean }
): { className: string; style?: Record<string, string> } {
  if (opts?.past) {
    return {
      className: "border-red-600 bg-red-600/30 text-red-300 opacity-60",
    };
  }
  if (opts?.selected) {
    return { className: "border-white bg-white/10 text-white" };
  }
  switch (visual) {
    case "ocupado":
      return {
        className:
          "border-red-600 bg-red-600/30 text-red-300 hover:bg-red-600/40",
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
