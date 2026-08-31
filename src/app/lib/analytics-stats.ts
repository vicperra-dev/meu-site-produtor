import { toIsoDateStudio } from "@/app/lib/calendar-time";

const STUDIO_OFFSET = "-03:00";

export function studioDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00${STUDIO_OFFSET}`);
}

export function addIsoDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = Date.UTC(y, (m || 1) - 1, (d || 1) + days);
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function studioTodayIso(now = new Date()): string {
  return toIsoDateStudio(now);
}

export function lastNStudioDays(n: number, now = new Date()): string[] {
  const today = studioTodayIso(now);
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(addIsoDays(today, -i));
  }
  return days;
}

export function studioRangeForIsoDay(isoDate: string): { gte: Date; lt: Date } {
  return {
    gte: studioDayStart(isoDate),
    lt: studioDayStart(addIsoDays(isoDate, 1)),
  };
}
