/**
 * BUG-001 — Tempo civil do estúdio (fonte única).
 * Timezone oficial: America/Sao_Paulo (UTC−03, sem DST desde 2019).
 *
 * Armazenamento: instante ISO com offset −03:00 para a parede do estúdio.
 * Leitura de datas/horas de ocupação: sempre via America/Sao_Paulo.
 * Nunca usar `new Date("YYYY-MM-DD")` nem `toISOString().slice(0,10)` para UI civil.
 */
export const PLATFORM_TIMEZONE = "America/Sao_Paulo";
/** Offset fixo BRT (sem horário de verão). */
export const PLATFORM_UTC_OFFSET = "-03:00";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD a partir de partes civis (sem Date). */
export function isoDateFromParts(year: number, month1to12: number, day: number): string {
  return `${year}-${pad2(month1to12)}-${pad2(day)}`;
}

export function parseIsoDateParts(isoDate: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || "").slice(0, 10));
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month1to12: number): number {
  if (month1to12 === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month1to12)) return 30;
  return 31;
}

export function isValidIsoDate(isoDate: string): boolean {
  const p = parseIsoDateParts(isoDate);
  if (!p) return false;
  if (p.month < 1 || p.month > 12) return false;
  const dim = daysInMonth(p.year, p.month);
  return p.day >= 1 && p.day <= dim;
}

/** Dia da semana 0=Dom … 6=Sáb no calendário civil (algoritmo civil, sem TZ). */
export function weekdaySun0(isoDate: string): number {
  const p = parseIsoDateParts(isoDate);
  if (!p) return 0;
  const t = Date.UTC(p.year, p.month - 1, p.day);
  return new Date(t).getUTCDay();
}

export function normalizeHourLabel(hora: string): string {
  if (!hora) return "00:00";
  if (hora.includes(":")) {
    const [h] = hora.split(":");
    return `${pad2(parseInt(h || "0", 10))}:00`;
  }
  return `${pad2(parseInt(hora, 10) || 0)}:00`;
}

/**
 * Converte data+hora de parede do estúdio → Date (UTC instant correto).
 */
export function parseStudioDateTime(isoDate: string, hora: string): Date {
  const date = String(isoDate || "").slice(0, 10);
  const hour = normalizeHourLabel(hora);
  if (!isValidIsoDate(date)) {
    throw new Error(`Data civil inválida: ${isoDate}`);
  }
  return new Date(`${date}T${hour}:00${PLATFORM_UTC_OFFSET}`);
}

function formatInStudio(
  value: Date,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TIMEZONE,
    ...options,
  }).format(value);
}

/** YYYY-MM-DD no fuso do estúdio. */
export function toIsoDateStudio(value: string | Date): string {
  if (typeof value === "string") {
    const only = value.trim();
    // Já é data civil pura
    if (/^\d{4}-\d{2}-\d{2}$/.test(only)) return only;
    // Prefixo ISO date
    if (/^\d{4}-\d{2}-\d{2}/.test(only) && !only.includes("T") && !only.includes(" ")) {
      return only.slice(0, 10);
    }
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  // en-CA → YYYY-MM-DD
  return formatInStudio(d, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Hora HH:00 no fuso do estúdio. */
export function getHourStudio(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "00:00";
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: PLATFORM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  const [h] = hourStr.split(":");
  return `${pad2(parseInt(h || "0", 10))}:00`;
}

/** Hoje (civil) no estúdio. */
export function todayIsoStudio(now: Date = new Date()): string {
  return toIsoDateStudio(now);
}

export function isIsoDatePastStudio(isoDate: string, now: Date = new Date()): boolean {
  const today = todayIsoStudio(now);
  return String(isoDate).slice(0, 10) < today;
}

export function isStudioDateTimePast(
  isoDate: string,
  hora: string,
  now: Date = new Date()
): boolean {
  try {
    return parseStudioDateTime(isoDate, hora).getTime() < now.getTime();
  } catch {
    return true;
  }
}

/** Título longo sem deslocamento UTC (`new Date("YYYY-MM-DD")` é proibido). */
export function formatStudioDateLong(isoDate: string): string {
  const p = parseIsoDateParts(isoDate);
  if (!p) return isoDate;
  // Meio-dia BRT evita qualquer edge de DST histórico
  const d = new Date(`${isoDate}T12:00:00${PLATFORM_UTC_OFFSET}`);
  return d.toLocaleDateString("pt-BR", {
    timeZone: PLATFORM_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatStudioMonthYear(year: number, month1to12: number): string {
  const iso = isoDateFromParts(year, month1to12, 1);
  const d = new Date(`${iso}T12:00:00${PLATFORM_UTC_OFFSET}`);
  return d.toLocaleDateString("pt-BR", {
    timeZone: PLATFORM_TIMEZONE,
    month: "long",
    year: "numeric",
  });
}

/** min date ISO para agendamento (hoje + N dias) no fuso do estúdio. */
export function minScheduleDateIsoStudio(daysAhead = 0, now: Date = new Date()): string {
  const base = todayIsoStudio(now);
  const p = parseIsoDateParts(base);
  if (!p) return base;
  const utc = Date.UTC(p.year, p.month - 1, p.day + daysAhead);
  const y = new Date(utc).getUTCFullYear();
  const m = new Date(utc).getUTCMonth() + 1;
  const d = new Date(utc).getUTCDate();
  return isoDateFromParts(y, m, d);
}

/** Data civil pt-BR no fuso do estúdio (não usa TZ do browser/servidor). */
export function formatStudioDatePtBR(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const iso = toIsoDateStudio(value);
  const p = parseIsoDateParts(iso);
  if (!p) return "—";
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

/** Hora HH:mm no fuso do estúdio. */
export function formatStudioTimePtBR(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PLATFORM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
