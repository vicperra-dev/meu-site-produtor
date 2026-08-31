/**
 * GO-03C — Filtro global de período (persistido na URL).
 * Somente apresentação; não altera domínio.
 */

export type PeriodKey = "hoje" | "7d" | "mes" | "ano" | "custom" | "todos";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
  { value: "todos", label: "Todos" },
];

export interface PeriodRange {
  key: PeriodKey;
  from: Date | null;
  to: Date | null;
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolvePeriod(
  key: PeriodKey,
  customFrom?: string | null,
  customTo?: string | null
): PeriodRange {
  const now = new Date();
  const label = PERIOD_OPTIONS.find((p) => p.value === key)?.label || key;

  if (key === "todos") {
    return { key, from: null, to: null, label };
  }

  if (key === "custom") {
    const from = customFrom ? startOfDay(new Date(customFrom + "T00:00:00")) : null;
    const to = customTo ? endOfDay(new Date(customTo + "T00:00:00")) : null;
    if (from && Number.isNaN(from.getTime())) return { key, from: null, to: null, label };
    if (to && Number.isNaN(to.getTime())) return { key, from: null, to: null, label };
    return { key, from, to, label };
  }

  if (key === "hoje") {
    return { key, from: startOfDay(now), to: endOfDay(now), label };
  }

  if (key === "7d") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { key, from, to: endOfDay(now), label };
  }

  if (key === "mes") {
    return {
      key,
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to: endOfDay(now),
      label,
    };
  }

  // ano
  return {
    key,
    from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
    to: endOfDay(now),
    label,
  };
}

/** Comparação temporal do período anterior equivalente (quando possível). */
export function previousPeriodRange(range: PeriodRange): PeriodRange | null {
  if (!range.from || !range.to) return null;
  const ms = range.to.getTime() - range.from.getTime();
  if (ms <= 0) return null;
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  return { key: range.key, from, to, label: "período anterior" };
}

export function inRange(iso: string | Date | null | undefined, range: PeriodRange): boolean {
  if (!range.from && !range.to) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (range.from && t < range.from.getTime()) return false;
  if (range.to && t > range.to.getTime()) return false;
  return true;
}

/** Mapeia o filtro do dashboard para o `periodo` da API de gráficos existente. */
export function toGraficosPeriodo(key: PeriodKey): "diario" | "semanal" | "mensal" | "anual" {
  if (key === "hoje") return "diario";
  if (key === "7d") return "semanal";
  if (key === "ano") return "anual";
  return "mensal";
}
