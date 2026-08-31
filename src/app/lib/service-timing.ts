/**
 * Cronômetro operacional de Sessão/Captação.
 * Fonte de verdade: timestamps e snapshots no Service.
 * Overtime NÃO é cobrança, Payment nem Asaas.
 *
 * Gate e constantes vêm de service-types (módulo folha, client-safe).
 * Preços de catálogo ficam em service-catalog — sem ciclo com este arquivo.
 */

import {
  CHECKOUT_CATALOG,
  resolveCanonicalServiceId,
  type CanonicalServiceId,
} from "@/app/lib/service-catalog";
import {
  OPERATIONAL_CONTRACTED_DURATION_SECONDS,
  isOperationalTimerServiceId,
} from "@/app/lib/service-types";

export {
  OPERATIONAL_CONTRACTED_DURATION_SECONDS,
  OPERATIONAL_TIMER_SERVICE_IDS,
} from "@/app/lib/service-types";

export function hasOperationalTimer(tipo?: string | null): boolean {
  if (tipo == null || String(tipo).trim() === "") return false;
  const id = resolveCanonicalServiceId(tipo);
  if (id == null) return false;
  return isOperationalTimerServiceId(id);
}

export function catalogHourlyPriceCents(tipo?: string | null): number | null {
  const id = resolveCanonicalServiceId(tipo);
  if (!id || !isOperationalTimerServiceId(id)) return null;
  const preco = CHECKOUT_CATALOG[id as CanonicalServiceId]?.preco;
  if (typeof preco !== "number" || !Number.isFinite(preco) || preco < 0) return null;
  return Math.round(preco * 100);
}

export function elapsedSecondsBetween(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
}

export function excessSecondsOf(actualDurationSeconds: number, contractedSeconds: number): number {
  return Math.max(0, actualDurationSeconds - contractedSeconds);
}

/**
 * ceil(basePriceCents * excessSeconds / contractedSeconds) em inteiros.
 * Qualquer fração de segundo conta; não arredonda minutos antes.
 */
export function calculateSuggestedOvertimeAmountCents(params: {
  basePriceCents: number;
  excessSeconds: number;
  contractedSeconds: number;
}): number {
  const { basePriceCents, excessSeconds, contractedSeconds } = params;
  if (excessSeconds <= 0 || contractedSeconds <= 0 || basePriceCents <= 0) return 0;
  const num = BigInt(basePriceCents) * BigInt(excessSeconds);
  const den = BigInt(contractedSeconds);
  return Number((num + den - BigInt(1)) / den);
}

export type OperationalCompletionSnapshot = {
  completedAt: Date;
  actualDurationSeconds: number;
  contractedDurationSeconds: number;
  overtimeBasePriceCents: number;
  suggestedOvertimeAmountCents: number;
};

/** Primeiro início válido: nunca sobrescreve startedAt existente. */
export function resolveOperationalStartWrite(params: {
  tipo: string;
  existingStartedAt: Date | null;
  now: Date;
}): Date | null {
  if (!hasOperationalTimer(params.tipo)) return null;
  if (params.existingStartedAt) return null;
  return params.now;
}

/** Primeira conclusão válida: não inventa duração sem startedAt; não sobrescreve completedAt. */
export function resolveOperationalCompletionWrite(params: {
  tipo: string;
  startedAt: Date | null;
  existingCompletedAt: Date | null;
  existingActualDurationSeconds?: number | null;
  now: Date;
  contractedSeconds?: number;
}): OperationalCompletionSnapshot | null {
  if (!hasOperationalTimer(params.tipo)) return null;
  if (!params.startedAt) return null;
  if (params.existingCompletedAt) return null;
  if (typeof params.existingActualDurationSeconds === "number") return null;
  const contracted =
    params.contractedSeconds ?? OPERATIONAL_CONTRACTED_DURATION_SECONDS;
  const basePriceCents = catalogHourlyPriceCents(params.tipo);
  if (basePriceCents == null) return null;
  const actualDurationSeconds = elapsedSecondsBetween(params.startedAt, params.now);
  const excess = excessSecondsOf(actualDurationSeconds, contracted);
  return {
    completedAt: params.now,
    actualDurationSeconds,
    contractedDurationSeconds: contracted,
    overtimeBasePriceCents: basePriceCents,
    suggestedOvertimeAmountCents: calculateSuggestedOvertimeAmountCents({
      basePriceCents,
      excessSeconds: excess,
      contractedSeconds: contracted,
    }),
  };
}

export type ServiceTimingFields = {
  tipo: string;
  status: string;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  actualDurationSeconds?: number | null;
  contractedDurationSeconds?: number | null;
  overtimeBasePriceCents?: number | null;
  suggestedOvertimeAmountCents?: number | null;
};

export type ResolvedServiceTiming = {
  applicable: boolean;
  running: boolean;
  frozen: boolean;
  missingHistorical: boolean;
  elapsedSeconds: number;
  contractedSeconds: number;
  excessSeconds: number;
  exceeded: boolean;
  suggestedOvertimeAmountCents: number;
  actualDurationSeconds: number | null;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveServiceTiming(
  fields: ServiceTimingFields,
  now: Date = new Date()
): ResolvedServiceTiming {
  const applicable = hasOperationalTimer(fields.tipo);
  const contractedLive = OPERATIONAL_CONTRACTED_DURATION_SECONDS;
  const empty: ResolvedServiceTiming = {
    applicable,
    running: false,
    frozen: false,
    missingHistorical: false,
    elapsedSeconds: 0,
    contractedSeconds: contractedLive,
    excessSeconds: 0,
    exceeded: false,
    suggestedOvertimeAmountCents: 0,
    actualDurationSeconds: null,
  };
  if (!applicable) return empty;

  const startedAt = toDate(fields.startedAt);
  const completedAt = toDate(fields.completedAt);
  const status = String(fields.status || "");

  if (status === "concluido") {
    const frozenDuration =
      typeof fields.actualDurationSeconds === "number" && fields.actualDurationSeconds >= 0
        ? fields.actualDurationSeconds
        : startedAt && completedAt
          ? elapsedSecondsBetween(startedAt, completedAt)
          : null;
    if (frozenDuration == null || !startedAt) {
      return { ...empty, missingHistorical: true };
    }
    const contracted =
      typeof fields.contractedDurationSeconds === "number" && fields.contractedDurationSeconds > 0
        ? fields.contractedDurationSeconds
        : contractedLive;
    const excess = excessSecondsOf(frozenDuration, contracted);
    const cents =
      typeof fields.suggestedOvertimeAmountCents === "number"
        ? fields.suggestedOvertimeAmountCents
        : calculateSuggestedOvertimeAmountCents({
            basePriceCents:
              typeof fields.overtimeBasePriceCents === "number"
                ? fields.overtimeBasePriceCents
                : catalogHourlyPriceCents(fields.tipo) || 0,
            excessSeconds: excess,
            contractedSeconds: contracted,
          });
    return {
      applicable: true,
      running: false,
      frozen: true,
      missingHistorical: false,
      elapsedSeconds: frozenDuration,
      contractedSeconds: contracted,
      excessSeconds: excess,
      exceeded: excess > 0,
      suggestedOvertimeAmountCents: cents,
      actualDurationSeconds: frozenDuration,
    };
  }

  if (!startedAt || status !== "em_andamento") {
    return empty;
  }

  const elapsed = elapsedSecondsBetween(startedAt, now);
  const excess = excessSecondsOf(elapsed, contractedLive);
  const basePriceCents = catalogHourlyPriceCents(fields.tipo) || 0;
  return {
    applicable: true,
    running: true,
    frozen: false,
    missingHistorical: false,
    elapsedSeconds: elapsed,
    contractedSeconds: contractedLive,
    excessSeconds: excess,
    exceeded: excess > 0,
    suggestedOvertimeAmountCents: calculateSuggestedOvertimeAmountCents({
      basePriceCents,
      excessSeconds: excess,
      contractedSeconds: contractedLive,
    }),
    actualDurationSeconds: elapsed,
  };
}

export function formatHhMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDurationPt(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (safe === 0) return "0s";
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  if (s > 0 && h === 0) parts.push(`${s}s`);
  if (parts.length === 0) return `${s}s`;
  return parts.join(" ");
}

export function formatExcessLive(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}min ${s}s`.replace(" 0min", "").replace(/ 0s$/, "");
  return `${m}min ${s}s`;
}

export type OperationalTimingStatRow = {
  tipo: string;
  actualDurationSeconds: number | null;
  suggestedOvertimeAmountCents: number | null;
};

export type OperationalTimingStats = {
  withTiming: number;
  exceededCount: number;
  exceededPercent: number;
  avgDurationSeconds: number | null;
  totalExcessSeconds: number;
  suggestedOvertimeTotalCents: number;
  suggestedOvertimeAvgCents: number | null;
};

function emptyStats(): OperationalTimingStats {
  return {
    withTiming: 0,
    exceededCount: 0,
    exceededPercent: 0,
    avgDurationSeconds: null,
    totalExcessSeconds: 0,
    suggestedOvertimeTotalCents: 0,
    suggestedOvertimeAvgCents: null,
  };
}

export function aggregateOperationalTimingStats(
  rows: OperationalTimingStatRow[],
  filter: "sessao" | "captacao" | "todos" = "todos"
): OperationalTimingStats {
  const scoped = rows.filter((row) => {
    const id = resolveCanonicalServiceId(row.tipo);
    if (!id || !isOperationalTimerServiceId(id)) return false;
    if (filter !== "todos" && id !== filter) return false;
    return typeof row.actualDurationSeconds === "number" && row.actualDurationSeconds >= 0;
  });
  if (scoped.length === 0) return emptyStats();
  const contracted = OPERATIONAL_CONTRACTED_DURATION_SECONDS;
  let durationSum = 0;
  let excessSum = 0;
  let exceededCount = 0;
  let overtimeSum = 0;
  for (const row of scoped) {
    const actual = row.actualDurationSeconds as number;
    durationSum += actual;
    const excess = excessSecondsOf(actual, contracted);
    excessSum += excess;
    if (excess > 0) exceededCount += 1;
    overtimeSum += row.suggestedOvertimeAmountCents || 0;
  }
  return {
    withTiming: scoped.length,
    exceededCount,
    exceededPercent: (exceededCount / scoped.length) * 100,
    avgDurationSeconds: durationSum / scoped.length,
    totalExcessSeconds: excessSum,
    suggestedOvertimeTotalCents: overtimeSum,
    suggestedOvertimeAvgCents: overtimeSum / scoped.length,
  };
}

export function timerLabel(tipo?: string | null, frozen?: boolean): string {
  const id = resolveCanonicalServiceId(tipo);
  if (frozen) return "Tempo do serviço";
  if (id === "captacao") return "Tempo da captação";
  return "Tempo da sessão";
}
