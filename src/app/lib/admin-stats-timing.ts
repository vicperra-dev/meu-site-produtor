/**
 * Leitura/apresentação das estatísticas de cronômetro.
 * Não altera persistência, overtime nem a state machine.
 */

import {
  isoDateFromParts,
  parseIsoDateParts,
  parseStudioDateTime,
  todayIsoStudio,
} from "@/app/lib/calendar-time";
import { excessSecondsOf } from "@/app/lib/service-timing";
import { OPERATIONAL_CONTRACTED_DURATION_SECONDS } from "@/app/lib/service-types";
import { resolveCanonicalServiceId } from "@/app/lib/service-catalog";

export type TimingTipoFilter = "todos" | "sessao" | "captacao";
export type TimingPeriodFilter = "todos" | "hoje" | "7d" | "mes";
export type TimingSort = "recent" | "oldest" | "duration" | "excess";

export type TimingHistoryItem = {
  serviceId: string;
  appointmentId: number | null;
  tipo: string;
  tipoLabel: string;
  status: string;
  clientName: string;
  clientEmail: string;
  appointmentDataIso: string | null;
  dateLabel: string;
  timeLabel: string;
  contractedSeconds: number;
  actualDurationSeconds: number;
  excessSeconds: number;
  suggestedOvertimeAmountCents: number;
};

export type TimingClientSummary = {
  sessaoCount: number;
  captacaoCount: number;
  avgSessaoSeconds: number | null;
  avgCaptacaoSeconds: number | null;
  withTiming: number;
  exceededCount: number;
  totalExcessSeconds: number;
  suggestedOvertimeTotalCents: number;
};

export function parseTimingTipo(raw: string | null): TimingTipoFilter {
  if (raw === "sessao" || raw === "captacao") return raw;
  return "todos";
}

export function parseTimingPeriod(raw: string | null): TimingPeriodFilter {
  if (raw === "hoje" || raw === "7d" || raw === "mes") return raw;
  return "todos";
}

export function parseTimingSort(raw: string | null): TimingSort {
  if (raw === "oldest" || raw === "duration" || raw === "excess") return raw;
  return "recent";
}

export function timerTipoLabel(tipo: string): string {
  const id = resolveCanonicalServiceId(tipo);
  if (id === "captacao") return "Captação";
  if (id === "sessao") return "Sessão";
  return tipo || "Serviço";
}

/** Intervalo [start, end) em instantes, ou null = sem filtro. Appointment.data. */
export function timingPeriodRange(
  period: TimingPeriodFilter,
  now: Date = new Date()
): { start: Date; end: Date } | null {
  if (period === "todos") return null;
  const today = todayIsoStudio(now);
  if (period === "hoje") {
    const next = addDaysToIso(today, 1);
    return {
      start: parseStudioDateTime(today, "00:00"),
      end: parseStudioDateTime(next, "00:00"),
    };
  }
  if (period === "7d") {
    const from = addDaysToIso(today, -6);
    const next = addDaysToIso(today, 1);
    return {
      start: parseStudioDateTime(from, "00:00"),
      end: parseStudioDateTime(next, "00:00"),
    };
  }
  const p = parseIsoDateParts(today);
  if (!p) return null;
  const startIso = isoDateFromParts(p.year, p.month, 1);
  const nextMonth = p.month === 12
    ? isoDateFromParts(p.year + 1, 1, 1)
    : isoDateFromParts(p.year, p.month + 1, 1);
  return {
    start: parseStudioDateTime(startIso, "00:00"),
    end: parseStudioDateTime(nextMonth, "00:00"),
  };
}

function addDaysToIso(iso: string, delta: number): string {
  const p = parseIsoDateParts(iso);
  if (!p) return iso;
  const t = Date.UTC(p.year, p.month - 1, p.day) + delta * 86_400_000;
  const d = new Date(t);
  return isoDateFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function contractedSecondsOf(row: {
  contractedDurationSeconds?: number | null;
}): number {
  const n = row.contractedDurationSeconds;
  if (typeof n === "number" && n > 0) return n;
  return OPERATIONAL_CONTRACTED_DURATION_SECONDS;
}

export function mapTimingHistoryItem(row: {
  id: string;
  tipo: string;
  status: string;
  actualDurationSeconds: number | null;
  contractedDurationSeconds?: number | null;
  suggestedOvertimeAmountCents?: number | null;
  user?: { nomeArtistico?: string | null; email?: string | null } | null;
  appointment?: { id: number; data: Date | string } | null;
}): TimingHistoryItem | null {
  if (typeof row.actualDurationSeconds !== "number" || row.actualDurationSeconds < 0) {
    return null;
  }
  const contracted = contractedSecondsOf(row);
  const aptData = row.appointment?.data ?? null;
  return {
    serviceId: row.id,
    appointmentId: row.appointment?.id ?? null,
    tipo: row.tipo,
    tipoLabel: timerTipoLabel(row.tipo),
    status: row.status,
    clientName: row.user?.nomeArtistico || "Cliente",
    clientEmail: row.user?.email || "",
    appointmentDataIso: aptData ? new Date(aptData).toISOString() : null,
    dateLabel: "",
    timeLabel: "",
    contractedSeconds: contracted,
    actualDurationSeconds: row.actualDurationSeconds,
    excessSeconds: excessSecondsOf(row.actualDurationSeconds, contracted),
    suggestedOvertimeAmountCents: row.suggestedOvertimeAmountCents || 0,
  };
}

/** Preenche data/hora civis a partir de Appointment.data (não createdAt). */
export function attachAppointmentCivilLabels(
  item: TimingHistoryItem,
  formatDate: (v: string | Date | null | undefined) => string,
  formatTime: (v: string | Date | null | undefined) => string
): TimingHistoryItem {
  if (!item.appointmentDataIso) {
    return { ...item, dateLabel: "—", timeLabel: "—" };
  }
  return {
    ...item,
    dateLabel: formatDate(item.appointmentDataIso),
    timeLabel: formatTime(item.appointmentDataIso),
  };
}

export function sortTimingHistory(
  items: TimingHistoryItem[],
  sort: TimingSort
): TimingHistoryItem[] {
  const arr = [...items];
  const t = (iso: string | null) => (iso ? Date.parse(iso) : 0);
  switch (sort) {
    case "oldest":
      return arr.sort((a, b) => t(a.appointmentDataIso) - t(b.appointmentDataIso));
    case "duration":
      return arr.sort((a, b) => b.actualDurationSeconds - a.actualDurationSeconds);
    case "excess":
      return arr.sort((a, b) => b.excessSeconds - a.excessSeconds);
    case "recent":
    default:
      return arr.sort((a, b) => t(b.appointmentDataIso) - t(a.appointmentDataIso));
  }
}

export function summarizeTimingHistory(items: TimingHistoryItem[]): TimingClientSummary {
  const sessao = items.filter((i) => resolveCanonicalServiceId(i.tipo) === "sessao");
  const captacao = items.filter((i) => resolveCanonicalServiceId(i.tipo) === "captacao");
  const avg = (list: TimingHistoryItem[]) =>
    list.length === 0
      ? null
      : list.reduce((s, i) => s + i.actualDurationSeconds, 0) / list.length;
  const exceeded = items.filter((i) => i.excessSeconds > 0);
  return {
    sessaoCount: sessao.length,
    captacaoCount: captacao.length,
    avgSessaoSeconds: avg(sessao),
    avgCaptacaoSeconds: avg(captacao),
    withTiming: items.length,
    exceededCount: exceeded.length,
    totalExcessSeconds: items.reduce((s, i) => s + i.excessSeconds, 0),
    suggestedOvertimeTotalCents: items.reduce((s, i) => s + i.suggestedOvertimeAmountCents, 0),
  };
}

export function matchesTimingTipo(tipo: string, filter: TimingTipoFilter): boolean {
  const id = resolveCanonicalServiceId(tipo);
  if (!id) return false;
  if (filter === "todos") return id === "sessao" || id === "captacao";
  return id === filter;
}
