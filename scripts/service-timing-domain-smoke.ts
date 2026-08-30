/**
 * Smoke de domínio — cronômetro operacional Sessão/Captação.
 * Sem banco, sem Payment/Asaas.
 */
import {
  OPERATIONAL_TIMER_SERVICE_IDS,
  isOperationalTimerServiceId,
} from "../src/app/lib/service-types";
import {
  aggregateOperationalTimingStats,
  calculateSuggestedOvertimeAmountCents,
  catalogHourlyPriceCents,
  elapsedSecondsBetween,
  excessSecondsOf,
  formatHhMmSs,
  hasOperationalTimer,
  OPERATIONAL_CONTRACTED_DURATION_SECONDS,
  OPERATIONAL_TIMER_SERVICE_IDS as TIMING_REEXPORT_IDS,
  resolveOperationalCompletionWrite,
  resolveOperationalStartWrite,
  resolveServiceTiming,
} from "../src/app/lib/service-timing";

function must(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

must(OPERATIONAL_TIMER_SERVICE_IDS instanceof Set, "Set do gate definido em service-types");
must(typeof OPERATIONAL_TIMER_SERVICE_IDS.has === "function", "Set.has disponível");
must(TIMING_REEXPORT_IDS === OPERATIONAL_TIMER_SERVICE_IDS, "reexport timing = mesma instância");
must(isOperationalTimerServiceId("sessao") && isOperationalTimerServiceId("captacao"), "ids do timer");
must(!isOperationalTimerServiceId("mix"), "mix não é id de timer");

function centsFor(tipo: "sessao" | "captacao", excessMinutes: number): number {
  const base = catalogHourlyPriceCents(tipo)!;
  return calculateSuggestedOvertimeAmountCents({
    basePriceCents: base,
    excessSeconds: excessMinutes * 60,
    contractedSeconds: OPERATIONAL_CONTRACTED_DURATION_SECONDS,
  });
}

must(OPERATIONAL_CONTRACTED_DURATION_SECONDS === 3600, "contracted 60min");
must(hasOperationalTimer("sessao") && hasOperationalTimer("Sessão"), "sessao gate");
must(hasOperationalTimer("captacao") && hasOperationalTimer("Captação"), "captacao gate");
must(!hasOperationalTimer("mix"), "mix sem timer");
must(!hasOperationalTimer("master"), "master sem timer");
must(!hasOperationalTimer("beat1"), "beat sem timer");
must(!hasOperationalTimer("producao_completa"), "producao sem timer");
must(!hasOperationalTimer(undefined), "undefined sem timer");
must(!hasOperationalTimer(null), "null sem timer");
must(!hasOperationalTimer(""), "vazio sem timer");
must(!hasOperationalTimer("tipo_legado_desconhecido"), "legado desconhecido sem timer");
must(catalogHourlyPriceCents("sessao") === 4000, "sessao 40 reais");
must(catalogHourlyPriceCents("captacao") === 5500, "captacao 55 reais");

must(centsFor("sessao", 0) === 0, "sessao 0 min");
must(centsFor("sessao", 1) === 67, "sessao 1 min ceil");
must(centsFor("sessao", 7) === 467, "sessao 7 min");
must(centsFor("sessao", 20) === 1334, "sessao 20 min → R$13,34");
must(centsFor("sessao", 30) === 2000, "sessao 30 min → R$20");
must(centsFor("sessao", 60) === 4000, "sessao 60 min → R$40");
must(centsFor("sessao", 61) === 4067, "sessao 61 min");
must(centsFor("sessao", 95) === 6334, "sessao 95 min → R$63,34");
must(centsFor("sessao", 120) === 8000, "sessao 120 min → R$80");

must(centsFor("captacao", 0) === 0, "captacao 0");
must(centsFor("captacao", 7) === 642, "captacao 7 min → R$6,42");
must(centsFor("captacao", 20) === 1834, "captacao 20 min");
must(centsFor("captacao", 30) === 2750, "captacao 30 min → R$27,50");
must(centsFor("captacao", 60) === 5500, "captacao 60 min → R$55");
must(centsFor("captacao", 95) === 8709, "captacao 95 min");
must(centsFor("captacao", 120) === 11000, "captacao 120 min → R$110");

must(
  calculateSuggestedOvertimeAmountCents({
    basePriceCents: 5500,
    excessSeconds: 7 * 60 + 1,
    contractedSeconds: 3600,
  }) === 644,
  "segundos quebrados captacao 7m1s"
);

const t0 = new Date("2026-08-29T14:00:00.000Z");
const t80 = new Date("2026-08-29T15:20:00.000Z");
must(elapsedSecondsBetween(t0, t80) === 80 * 60, "80 min duration");
must(excessSecondsOf(80 * 60, 3600) === 20 * 60, "20 min excess");

const now = new Date("2026-08-29T15:00:00.000Z");
const firstStart = resolveOperationalStartWrite({
  tipo: "sessao",
  existingStartedAt: null,
  now,
});
must(firstStart?.getTime() === now.getTime(), "primeiro startedAt");
must(
  resolveOperationalStartWrite({ tipo: "sessao", existingStartedAt: now, now: new Date() }) === null,
  "retry start não sobrescreve"
);
must(
  resolveOperationalStartWrite({ tipo: "mix", existingStartedAt: null, now }) === null,
  "mix não grava startedAt"
);

const snap = resolveOperationalCompletionWrite({
  tipo: "sessao",
  startedAt: t0,
  existingCompletedAt: null,
  now: t80,
});
must(snap?.actualDurationSeconds === 4800, "actualDuration 80min");
must(snap?.suggestedOvertimeAmountCents === 1334, "snapshot R$13,34");
must(
  resolveOperationalCompletionWrite({
    tipo: "sessao",
    startedAt: t0,
    existingCompletedAt: t80,
    now: new Date(),
  }) === null,
  "retry complete não sobrescreve"
);
must(
  resolveOperationalCompletionWrite({
    tipo: "sessao",
    startedAt: t0,
    existingCompletedAt: null,
    existingActualDurationSeconds: 4800,
    now: new Date(),
  }) === null,
  "retry via actualDurationSeconds"
);
must(
  resolveOperationalCompletionWrite({
    tipo: "sessao",
    startedAt: null,
    existingCompletedAt: null,
    now: t80,
  }) === null,
  "legado sem startedAt"
);

const idle = resolveServiceTiming({ tipo: "sessao", status: "aceito" }, now);
must(!idle.running && !idle.frozen && !idle.missingHistorical, "não iniciado");

const under = resolveServiceTiming(
  { tipo: "sessao", status: "em_andamento", startedAt: new Date(now.getTime() - 58 * 60 * 1000) },
  now
);
must(under.running && !under.exceeded && formatHhMmSs(under.elapsedSeconds) === "00:58:00", "<1h");

const exact = resolveServiceTiming(
  { tipo: "sessao", status: "em_andamento", startedAt: new Date(now.getTime() - 3600 * 1000) },
  now
);
must(exact.running && !exact.exceeded && exact.elapsedSeconds === 3600, "exatamente 1h");

const over = resolveServiceTiming(
  { tipo: "sessao", status: "em_andamento", startedAt: new Date(now.getTime() - 3601 * 1000) },
  now
);
must(over.running && over.exceeded && over.elapsedSeconds === 3601, ">1h vermelho");

const frozen = resolveServiceTiming(
  {
    tipo: "sessao",
    status: "concluido",
    startedAt: t0,
    completedAt: t80,
    actualDurationSeconds: 4800,
    contractedDurationSeconds: 3600,
    overtimeBasePriceCents: 4000,
    suggestedOvertimeAmountCents: 1334,
  },
  new Date("2030-01-01T00:00:00.000Z")
);
must(frozen.frozen && !frozen.running && frozen.elapsedSeconds === 4800, "congelado ignora Date.now");
must(frozen.suggestedOvertimeAmountCents === 1334, "preço histórico");

const legacy = resolveServiceTiming({ tipo: "sessao", status: "concluido" }, now);
must(legacy.missingHistorical, "legado sem timestamps");

const mixRun = resolveServiceTiming(
  { tipo: "mix", status: "em_andamento", startedAt: t0 },
  now
);
must(!mixRun.applicable && !mixRun.running, "mix sem cronômetro");

const stats = aggregateOperationalTimingStats(
  [
    { tipo: "sessao", actualDurationSeconds: 4800, suggestedOvertimeAmountCents: 1334 },
    { tipo: "captacao", actualDurationSeconds: 1800, suggestedOvertimeAmountCents: 0 },
    { tipo: "mix", actualDurationSeconds: 9999, suggestedOvertimeAmountCents: 999 },
    { tipo: "sessao", actualDurationSeconds: null, suggestedOvertimeAmountCents: 10 },
  ],
  "todos"
);
must(stats.withTiming === 2, "stats ignora mix e null");
must(stats.exceededCount === 1, "um excedido");
must(stats.suggestedOvertimeTotalCents === 1334, "overtime não mistura mix");

console.log("[service-timing-domain-smoke] PASS");
