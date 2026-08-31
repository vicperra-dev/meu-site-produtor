/**
 * EC-01 — Execution Report builder.
 */

import { EXECUTION_PIPELINE } from "@/app/lib/execution/pipeline";
import type { ExecutionGateResult, ExecutionReport, ExecutionReportId, ExecutionSession } from "@/app/lib/execution/types";

export function buildExecutionCoreReport(params: {
  runId: string;
  startedAt: string;
  gate: ExecutionGateResult;
  sessions: ExecutionSession[];
  reportId?: ExecutionReportId;
  progress?: ExecutionReport["progress"];
}): ExecutionReport {
  const finishedAt = new Date().toISOString();
  const started = Date.parse(params.startedAt);
  const durationMs = Number.isFinite(started) ? Date.now() - started : 0;

  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;
  let stubs = 0;
  let totalDur = 0;

  for (const s of params.sessions) {
    totalDur += s.durationMs;
    if (s.result === "pass") passed++;
    else if (s.result === "fail") failed++;
    else if (s.result === "error") errors++;
    else if (s.result === "skipped") skipped++;
    else if (s.result === "stub") stubs++;
  }

  const total = params.sessions.length;

  return {
    reportId: params.reportId || "EC-01-execution",
    runId: params.runId,
    startedAt: params.startedAt,
    finishedAt,
    durationMs,
    gate: params.gate,
    pipeline: EXECUTION_PIPELINE,
    sessions: params.sessions,
    progress: params.progress,
    summary: {
      total,
      passed,
      failed,
      errors,
      skipped,
      stubs,
      avgDurationMs: total ? Math.round(totalDur / total) : 0,
    },
  };
}

export function printExecutionCoreReport(report: ExecutionReport): void {
  console.log(JSON.stringify(report, null, 2));
}
