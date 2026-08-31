/**
 * EC-01 — Execution Runner (coordena pipeline oficial).
 */

import { buildExecutionContext, newRunId, newSessionId } from "@/app/lib/execution/context";
import { getExecutionScenario } from "@/app/lib/execution/registry";
import { buildExecutionSession } from "@/app/lib/execution/session";
import type {
  ExecutionContext,
  ExecutionReport,
  ExecutionReportId,
  ExecutionRunRequest,
  ExecutionSession,
  ExecutionStatus,
  ExecutionSuiteId,
} from "@/app/lib/execution/types";
import { assertExecutionAllowed } from "@/app/lib/execution/permissions";
import { buildExecutionCoreReport, printExecutionCoreReport } from "@/app/lib/execution/report";
import { listExecutionScenarioIdsForSuite } from "@/app/lib/execution/registry";
import { recordExecutionHistory } from "@/app/lib/execution/history";

function resolveReportId(suite?: ExecutionSuiteId): ExecutionReportId {
  switch (suite) {
    case "te02a":
      return "TE-02A-execution";
    case "sync01a":
      return "SYNC-01A-execution";
    case "ph01":
      return "PH-01-execution";
    case "sim01":
      return "SIM-01-execution";
    case "sim02":
      return "SIM-02-execution";
    case "te-s01":
    case "te-stubs":
      return "TE-01B-execution";
    default:
      return "EC-01-execution";
  }
}

function defaultArtifactPrefix(suite?: ExecutionSuiteId): string {
  switch (suite) {
    case "sim01":
    case "sim02":
      return suite;
    case "te02a":
      return "te02a";
    case "sync01a":
      return "sync01a";
    case "ph01":
      return "ph01";
    default:
      return "ec01";
  }
}

async function executeOne(
  scenarioId: string,
  ctx: ExecutionContext
): Promise<ExecutionSession> {
  const def = getExecutionScenario(scenarioId);
  const sessionId = newSessionId();
  const started = Date.now();

  if (!def) {
    return buildExecutionSession({
      def: {
        id: scenarioId,
        name: scenarioId,
        description: "",
        kind: "te",
        suites: [ctx.suite],
        run: async () => ({ status: "error", asserts: [], errors: [], warnings: [] }),
      },
      ctx,
      sessionId,
      durationMs: 0,
      status: "error",
      asserts: [],
      errors: [`Cenário ${scenarioId} não encontrado no Execution Registry`],
      warnings: [],
    });
  }

  // Lifecycle hooks/observer ficam nos wrappers dos cenários (withSimulation / withCleanup).
  // Evita nested enable/disable no Execution Core.
  try {
    const body = await def.run(ctx);
    let status: ExecutionStatus = body.status;
    const failed = body.asserts.filter((a) => !a.ok);
    if (status !== "fail" && status !== "error" && status !== "skipped" && status !== "stub") {
      status = failed.length ? "fail" : "pass";
    }
    const errors =
      failed.length > 0
        ? [...body.errors, ...failed.map((f) => f.message || f.name)]
        : body.errors;

    return buildExecutionSession({
      def,
      ctx,
      sessionId,
      durationMs: Date.now() - started,
      status,
      userId: body.userId,
      email: body.email,
      asserts: body.asserts,
      errors,
      warnings: body.warnings,
      eventsProduced: body.eventsProduced,
      cleanup: body.cleanup,
      artifacts: body.artifacts,
    });
  } catch (e: unknown) {
    return buildExecutionSession({
      def,
      ctx,
      sessionId,
      durationMs: Date.now() - started,
      status: "error",
      asserts: [],
      errors: [e instanceof Error ? e.message : String(e)],
      warnings: [],
    });
  }
}

export async function runExecution(request: ExecutionRunRequest = {}): Promise<ExecutionReport> {
  const startedAt = new Date().toISOString();
  const runId = newRunId();
  const gate = request.skipGate
    ? { allowed: true, warnings: [] as string[] }
    : assertExecutionAllowed({ actor: request.actor, cliToken: request.cliToken });

  const suite = request.suite;
  const artifactPrefix = request.artifactPrefix || defaultArtifactPrefix(suite);
  const reportId = request.reportId || resolveReportId(suite);

  let scenarioIds = request.scenarioIds;
  if (!scenarioIds?.length && suite) {
    scenarioIds = listExecutionScenarioIdsForSuite(suite);
  }
  if (!scenarioIds?.length) {
    scenarioIds = [];
  }

  const progress: ExecutionReport["progress"] = [];

  if (!gate.allowed) {
    const report = buildExecutionCoreReport({
      runId,
      startedAt,
      gate,
      reportId,
      sessions: scenarioIds.map((id) =>
        buildExecutionSession({
          def: getExecutionScenario(id) || {
            id,
            name: id,
            description: "",
            kind: "te",
            suites: suite ? [suite] : [],
            run: async () => ({ status: "skipped", asserts: [], errors: [], warnings: [] }),
          },
          ctx: buildExecutionContext({
            scenarioId: id,
            runId,
            startedAt,
            suite: suite || "te02a",
            kind: "te",
            artifactPrefix,
            actor: request.actor,
            cliToken: request.cliToken,
          }),
          durationMs: 0,
          status: "skipped",
          asserts: [],
          errors: [],
          warnings: [gate.reason || "bloqueado"],
        })
      ),
    });
    if (request.print !== false) printExecutionCoreReport(report);
    return report;
  }

  const sessions: ExecutionSession[] = [];
  for (const id of scenarioIds) {
    const def = getExecutionScenario(id);
    const kind = def?.kind || "te";
    progress.push({ step: "running", scenarioId: id, at: new Date().toISOString() });
    const ctx = buildExecutionContext({
      scenarioId: id,
      runId,
      startedAt,
      suite: suite || def?.suites[0] || "te02a",
      kind,
      artifactPrefix,
      actor: request.actor,
      cliToken: request.cliToken,
    });
    sessions.push(await executeOne(id, ctx));
    progress.push({ step: "completed", scenarioId: id, at: new Date().toISOString() });
  }

  const report = buildExecutionCoreReport({
    runId,
    startedAt,
    gate,
    reportId,
    sessions,
    progress,
  });
  recordExecutionHistory(report);
  if (request.print !== false) printExecutionCoreReport(report);
  return report;
}
