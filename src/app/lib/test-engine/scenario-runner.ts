/**
 * TE-01B — Scenario Runner (delega ao Execution Core).
 */
import { ExecutionCore } from "@/app/lib/execution/core";
import { listExecutionScenarios } from "@/app/lib/execution/registry";
import { toTeExecutionReport } from "@/app/lib/execution/result";
import { printExecutionReport } from "@/app/lib/test-engine/execution-report";
import type { TeActor } from "@/app/lib/test-engine/permissions";
import type { ExecutionReport, ScenarioId } from "@/app/lib/test-engine/types";

export type RunOptions = {
  actor?: TeActor;
  cliToken?: string | null;
  artifactPrefix?: string;
  print?: boolean;
};

export async function runScenario(
  id: ScenarioId,
  opts: RunOptions = {}
): Promise<ExecutionReport> {
  const def = listExecutionScenarios().find((s) => s.id === id);
  const suite = def?.suites[0] || "te-s01";
  const report = await ExecutionCore.run({
    scenarioIds: [id],
    suite,
    actor: opts.actor,
    cliToken: opts.cliToken,
    artifactPrefix:
      opts.artifactPrefix ||
      (suite === "sync01a" ? "sync01a" : suite === "te02a" ? "te02a" : suite === "ph01" ? "ph01" : "te01b"),
    print: false,
    reportId:
      suite === "sync01a"
        ? "SYNC-01A-execution"
        : suite === "te02a"
          ? "TE-02A-execution"
          : suite === "ph01"
            ? "PH-01-execution"
            : suite === "rc01"
              ? "RC-01-execution"
              : suite === "rc02"
                ? "RC-02-execution"
                : suite === "rc03"
                  ? "RC-03-execution"
                  : "TE-01B-execution",
  });
  const teReport = toTeExecutionReport(report);
  if (opts.print !== false) printExecutionReport(teReport);
  return teReport;
}

export async function runAllScenarios(opts: RunOptions = {}): Promise<ExecutionReport> {
  const teIds = listExecutionScenarios()
    .filter((s) => s.kind === "te")
    .map((s) => s.id);
  const report = await ExecutionCore.run({
    scenarioIds: teIds,
    actor: opts.actor,
    cliToken: opts.cliToken,
    artifactPrefix: opts.artifactPrefix || "te01b",
    print: false,
    reportId: "TE-01B-execution",
  });
  const teReport = toTeExecutionReport(report);
  if (opts.print !== false) printExecutionReport(teReport);
  return teReport;
}

export async function runScenarioIds(
  ids: ScenarioId[],
  opts: RunOptions & { reportId?: ExecutionReport["reportId"] } = {}
): Promise<ExecutionReport> {
  const suite =
    opts.reportId === "SYNC-01A-execution"
      ? "sync01a"
      : opts.reportId === "PH-01-execution"
        ? "ph01"
        : opts.reportId === "RC-01-execution"
          ? "rc01"
          : opts.reportId === "RC-02-execution"
            ? "rc02"
            : opts.reportId === "RC-03-execution"
              ? "rc03"
              : "te02a";
  const report = await ExecutionCore.run({
    scenarioIds: ids,
    suite,
    actor: opts.actor,
    cliToken: opts.cliToken,
    artifactPrefix:
      opts.artifactPrefix ||
      (suite === "sync01a"
        ? "sync01a"
        : suite === "te02a"
          ? "te02a"
          : suite === "ph01"
            ? "ph01"
            : suite === "rc01"
              ? "rc01"
              : suite === "rc02"
                ? "rc02"
                : suite === "rc03"
                  ? "rc03"
                  : "te01b"),
    print: false,
    reportId: opts.reportId,
  });
  const teReport = toTeExecutionReport(report);
  if (opts.print !== false) printExecutionReport(teReport);
  return teReport;
}

export function describeRegistry(): {
  id: ScenarioId;
  name: string;
  status: string;
  description: string;
}[] {
  return listExecutionScenarios()
    .filter((s) => s.kind === "te")
    .map((s) => ({
      id: s.id as ScenarioId,
      name: s.name,
      status: s.status || "implemented",
      description: s.description,
    }));
}
