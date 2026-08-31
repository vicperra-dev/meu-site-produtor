/**
 * EC-01 — Adaptadores de resultado (Execution Core ↔ TE/SIM).
 */

import type { ExecutionReport, ExecutionSession } from "@/app/lib/execution/types";
import type { ExecutionReport as TeExecutionReport, ScenarioResult } from "@/app/lib/test-engine/types";
import type { SimulationReport, SimulationSession } from "@/app/lib/simulation/types";
import type { TeGateResult } from "@/app/lib/test-engine/permissions";
import type { SimulationGateResult } from "@/app/lib/simulation/types";

export function toTeExecutionReport(report: ExecutionReport): TeExecutionReport {
  const results: ScenarioResult[] = report.sessions.map((s) => ({
    id: s.scenarioId as ScenarioResult["id"],
    name: s.scenario,
    status: s.result as ScenarioResult["status"],
    durationMs: s.durationMs,
    asserts: s.asserts,
    errors: s.errors,
    warnings: s.warnings,
    artifacts: s.artifacts,
  }));

  return {
    reportId: (report.reportId === "TE-02A-execution" ||
    report.reportId === "SYNC-01A-execution" ||
    report.reportId === "PH-01-execution" ||
    report.reportId === "RC-01-execution" ||
    report.reportId === "RC-02-execution" ||
    report.reportId === "RC-03-execution" ||
    report.reportId === "TE-01B-execution"
      ? report.reportId
      : "TE-01B-execution") as TeExecutionReport["reportId"],
    runId: report.runId,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    durationMs: report.durationMs,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
      vercelEnv: process.env.VERCEL_ENV,
      testEngineEnabled: process.env.TEST_ENGINE_ENABLED === "1",
    },
    gate: report.gate as TeGateResult,
    results,
    summary: {
      total: report.summary.total,
      passed: report.summary.passed,
      failed: report.summary.failed,
      stubs: report.summary.stubs,
      skipped: report.summary.skipped,
      errors: report.summary.errors,
    },
  };
}

export function toSimulationReport(report: ExecutionReport): SimulationReport {
  const sessions: SimulationSession[] = report.sessions
    .filter((s) => s.kind === "sim")
    .map(toSimulationSession);

  const isSim02 = report.reportId === "SIM-02-execution";
  return {
    reportId: isSim02 ? ("SIM-02-execution" as const) : ("SIM-01-execution" as const),
    engine: isSim02 ? ("SIM-02" as const) : ("SIM-01" as const),
    runId: report.runId,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    durationMs: report.durationMs,
    gate: report.gate as SimulationGateResult,
    sessions,
    progress: report.progress?.map((p) => ({
      step: p.step,
      simulationId: p.scenarioId as SimulationSession["simulationId"],
      at: p.at,
    })),
    summary: {
      total: sessions.length,
      passed: sessions.filter((s) => s.result === "pass").length,
      failed: sessions.filter((s) => s.result === "fail").length,
      errors: sessions.filter((s) => s.result === "error").length,
      skipped: sessions.filter((s) => s.result === "skipped").length,
      avgDurationMs: sessions.length
        ? Math.round(sessions.reduce((a, s) => a + s.durationMs, 0) / sessions.length)
        : 0,
    },
  };
}

function toSimulationSession(s: ExecutionSession): SimulationSession {
  return {
    simulationId: s.scenarioId as SimulationSession["simulationId"],
    sessionId: s.sessionId,
    timestamp: s.timestamp,
    scenario: s.scenario,
    userId: s.userId,
    email: s.email,
    result: s.result as SimulationSession["result"],
    durationMs: s.durationMs,
    eventsProduced: s.eventsProduced,
    asserts: s.asserts,
    warnings: s.warnings,
    errors: s.errors,
    cleanup: s.cleanup,
    artifacts: s.artifacts,
  };
}

export function toSim02Report(report: ExecutionReport): ExecutionReport {
  return { ...report, reportId: "SIM-02-execution" };
}
