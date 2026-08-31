/**
 * EC-01 — Execution Context builder.
 */

import type { ExecutionContext, ExecutionScenarioKind, ExecutionSuiteId } from "@/app/lib/execution/types";

export function newExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newRunId(): string {
  return `ecrun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildExecutionContext(params: {
  scenarioId: string;
  runId: string;
  startedAt: string;
  suite: ExecutionSuiteId;
  kind: ExecutionScenarioKind;
  artifactPrefix: string;
  actor?: ExecutionContext["actor"];
  cliToken?: string | null;
}): ExecutionContext {
  return {
    executionId: newExecutionId(),
    runId: params.runId,
    scenarioId: params.scenarioId,
    startedAt: params.startedAt,
    suite: params.suite,
    kind: params.kind,
    actor: params.actor,
    cliToken: params.cliToken,
    artifactPrefix: params.artifactPrefix,
    via: "execution-core",
  };
}
