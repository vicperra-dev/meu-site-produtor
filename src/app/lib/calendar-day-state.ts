/**
 * GO-H4 / GO-H4.3 — Estado operacional do calendário (fonte única).
 * Backend calcula; frontend apenas renderiza `visual` / horas ocupadas.
 * Pendente nunca ocupa: filtrar no caller ou passar `status` em cada appointment.
 */
import { isSchedulableServiceType } from "@/app/lib/service-catalog";
import { appointmentReservesCalendar } from "@/app/lib/domain/statuses";

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

/** Último horário = prazo final de entrega de produção (não é atendimento presencial). */
export const PRODUCTION_DELIVERY_HOUR: OperationalHour = "22:00";

export type PresencialDayStatus = "livre" | "parcial" | "ocupado";

/**
 * Estado visual composto do dia.
 * `parcial_entrega` = amarelo + roxo (presencial parcial + entrega).
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
  /** Horas que bloqueiam seleção presencial (presencial + bloqueios + entrega em 22:00). */
  occupiedHours: string[];
  /** Horas ocupadas só por Sessão/Captação (duração). */
  presencialHours: string[];
  /** Horas bloqueadas pelo admin. */
  blockedHours: string[];
};

export type CalendarAppointmentInput = {
  data: string | Date;
  duracaoMinutos?: number | null;
  tipo?: string | null;
  /** Se informado, só status que reservam calendário (GO-H4.3) entram na ocupação. */
  status?: string | null;
};

export type CalendarBlockedSlotInput = {
  data: string;
  hora: string;
};

export function normalizeHourLabel(hora: string): string {
  if (!hora) return "00:00";
  if (hora.includes(":")) {
    const [h] = hora.split(":");
    return `${String(parseInt(h || "0", 10)).padStart(2, "0")}:00`;
  }
  return `${String(parseInt(hora, 10) || 0).padStart(2, "0")}:00`;
}

export function toIsoDateLocal(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isProductionDeliveryAppointment(
  tipo?: string | null
): boolean {
  if (!tipo) return false;
  return !isSchedulableServiceType(tipo);
}

function hoursCoveredByPresencial(
  start: Date,
  duracaoMinutos: number
): string[] {
  const horaInicio = start.getHours();
  const horasOcupadas = Math.max(1, Math.ceil(duracaoMinutos / 60));
  const out: string[] = [];
  for (let i = 0; i < horasOcupadas; i++) {
    out.push(`${String(horaInicio + i).padStart(2, "0")}:00`);
  }
  return out;
}

export function resolvePresencialStatus(
  occupiedPresencialOrBlocked: Set<string>
): PresencialDayStatus {
  const count = OPERATIONAL_HOURS.filter((h) => occupiedPresencialOrBlocked.has(h)).length;
  if (count <= 0) return "livre";
  if (count >= OPERATIONAL_HOURS.length) return "ocupado";
  return "parcial";
}

export function resolveCalendarDayVisual(
  presencialStatus: PresencialDayStatus,
  hasProductionDelivery: boolean
): CalendarDayVisual {
  if (presencialStatus === "ocupado") return "ocupado";
  if (presencialStatus === "parcial" && hasProductionDelivery) return "parcial_entrega";
  if (presencialStatus === "parcial") return "parcial";
  if (hasProductionDelivery) return "entrega";
  return "livre";
}

/**
 * Calcula o mapa de estados por dia a partir de agendamentos + bloqueios.
 * Produção ocupa apenas PRODUCTION_DELIVERY_HOUR e nunca força vermelho sozinha.
 */
export function computeCalendarDayStates(params: {
  appointments: CalendarAppointmentInput[];
  blockedSlots?: CalendarBlockedSlotInput[];
}): Record<string, CalendarDayState> {
  const presencialByDay = new Map<string, Set<string>>();
  const blockedByDay = new Map<string, Set<string>>();
  const productionDays = new Set<string>();

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
    const date = toIsoDateLocal(apt.data);
    if (isProductionDeliveryAppointment(apt.tipo)) {
      productionDays.add(date);
      continue;
    }
    const start = typeof apt.data === "string" ? new Date(apt.data) : new Date(apt.data);
    const hours = hoursCoveredByPresencial(start, apt.duracaoMinutos || 60);
    const set = ensure(presencialByDay, date);
    for (const h of hours) set.add(h);
  }

  const allDates = new Set<string>([
    ...presencialByDay.keys(),
    ...blockedByDay.keys(),
    ...productionDays,
  ]);

  const result: Record<string, CalendarDayState> = {};
  for (const date of allDates) {
    const presencialHours = Array.from(presencialByDay.get(date) || []).sort();
    const blockedHours = Array.from(blockedByDay.get(date) || []).sort();
    const hasProductionDelivery = productionDays.has(date);

    const presencialOrBlocked = new Set<string>([...presencialHours, ...blockedHours]);
    const presencialStatus = resolvePresencialStatus(presencialOrBlocked);

    const occupied = new Set<string>(presencialOrBlocked);
    if (hasProductionDelivery) occupied.add(PRODUCTION_DELIVERY_HOUR);

    result[date] = {
      date,
      visual: resolveCalendarDayVisual(presencialStatus, hasProductionDelivery),
      presencialStatus,
      hasProductionDelivery,
      occupiedHours: Array.from(occupied).sort(),
      presencialHours,
      blockedHours,
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
    }
  );
}

export const CALENDAR_LEGEND = [
  { visual: "livre" as const, label: "Disponível", color: "Verde" },
  {
    visual: "parcial" as const,
    label: "Atendimento Presencial (parcial)",
    color: "Amarelo",
  },
  {
    visual: "ocupado" as const,
    label: "Atendimento Presencial (dia completo)",
    color: "Amarelo",
  },
  {
    visual: "entrega" as const,
    label: "Produção",
    color: "Roxo",
  },
  {
    visual: "parcial_entrega" as const,
    label: "Presencial + Produção",
    color: "Amarelo/Roxo",
  },
];
