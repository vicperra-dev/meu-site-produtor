/**
 * TE-01B — Execution Report builder.
 */
import type { ExecutionReport, ScenarioResult } from "@/app/lib/test-engine/types";
import type { TeGateResult } from "@/app/lib/test-engine/permissions";

export function buildExecutionReport(params: {
  runId: string;
  startedAt: string;
  gate: TeGateResult;
  results: ScenarioResult[];
  reportId?: ExecutionReport["reportId"];
}): ExecutionReport {
  const finishedAt = new Date().toISOString();
  const started = Date.parse(params.startedAt);
  const durationMs = Number.isFinite(started) ? Date.now() - started : 0;

  let passed = 0;
  let failed = 0;
  let stubs = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of params.results) {
    if (r.status === "pass") passed++;
    else if (r.status === "fail") failed++;
    else if (r.status === "stub") stubs++;
    else if (r.status === "skipped") skipped++;
    else if (r.status === "error") errors++;
  }

  return {
    reportId: params.reportId || "TE-01B-execution",
    runId: params.runId,
    startedAt: params.startedAt,
    finishedAt,
    durationMs,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
      vercelEnv: process.env.VERCEL_ENV,
      testEngineEnabled: process.env.TEST_ENGINE_ENABLED === "1",
    },
    gate: {
      allowed: params.gate.allowed,
      reason: params.gate.reason,
      warnings: params.gate.warnings,
    },
    results: params.results,
    summary: {
      total: params.results.length,
      passed,
      failed,
      stubs,
      skipped,
      errors,
    },
  };
}

export function printExecutionReport(report: ExecutionReport): void {
  console.log(JSON.stringify(report, null, 2));
}
