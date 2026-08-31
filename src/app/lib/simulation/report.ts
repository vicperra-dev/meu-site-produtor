/**
 * SIM-01 — Simulation Report builder.
 */

import type { SimulationGateResult, SimulationReport, SimulationSession } from "@/app/lib/simulation/types";

export function buildSimulationReport(params: {
  runId: string;
  startedAt: string;
  gate: SimulationGateResult;
  sessions: SimulationSession[];
  progress?: SimulationReport["progress"];
}): SimulationReport {
  const finishedAt = new Date().toISOString();
  const started = Date.parse(params.startedAt);
  const durationMs = Number.isFinite(started) ? Date.now() - started : 0;

  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;
  let totalDur = 0;

  for (const s of params.sessions) {
    totalDur += s.durationMs;
    if (s.result === "pass") passed++;
    else if (s.result === "fail") failed++;
    else if (s.result === "error") errors++;
    else if (s.result === "skipped") skipped++;
  }

  const total = params.sessions.length;

  return {
    reportId: "SIM-01-execution",
    runId: params.runId,
    startedAt: params.startedAt,
    finishedAt,
    durationMs,
    gate: params.gate,
    sessions: params.sessions,
    progress: params.progress,
    summary: {
      total,
      passed,
      failed,
      errors,
      skipped,
      avgDurationMs: total ? Math.round(totalDur / total) : 0,
    },
  };
}

export function printSimulationReport(report: SimulationReport): void {
  console.log(JSON.stringify(report, null, 2));
}
