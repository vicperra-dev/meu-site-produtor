/**
 * EC-01 — Tipos unificados do Execution Core.
 */

import type { AssertResult } from "@/app/lib/test-engine/types";
import type { SyncEnvelope } from "@/app/lib/synchronization/types";

export type ExecutionScenarioKind = "te" | "sim";

export type ExecutionSuiteId =
  | "te-s01"
  | "te-stubs"
  | "te02a"
  | "sync01a"
  | "ph01"
  | "rc01"
  | "rc02"
  | "rc03"
  | "sim01"
  | "sim02";

export type ExecutionReportId =
  | "EC-01-execution"
  | "TE-01B-execution"
  | "TE-02A-execution"
  | "SYNC-01A-execution"
  | "PH-01-execution"
  | "RC-01-execution"
  | "RC-02-execution"
  | "RC-03-execution"
  | "SIM-01-execution"
  | "SIM-02-execution";

export type ExecutionStatus = "pass" | "fail" | "error" | "skipped" | "stub";

export type ExecutionActor = { role: string | null; email: string | null } | null | undefined;

export type ExecutionContext = {
  executionId: string;
  runId: string;
  scenarioId: string;
  startedAt: string;
  suite: ExecutionSuiteId;
  kind: ExecutionScenarioKind;
  actor?: ExecutionActor;
  cliToken?: string | null;
  artifactPrefix: string;
  via: "execution-core";
};

export type ExecutionGateResult = {
  allowed: boolean;
  reason?: string;
  warnings: string[];
};

export type ExecutionScenarioMeta = {
  id: string;
  name: string;
  description: string;
  kind: ExecutionScenarioKind;
  suites: ExecutionSuiteId[];
  pipeline?: string[];
  status?: "implemented" | "stub";
  entities?: string[];
  assertions?: string[];
  modules?: string[];
};

export type ExecutionScenarioDefinition = ExecutionScenarioMeta & {
  run: (ctx: ExecutionContext) => Promise<ExecutionScenarioBody>;
};

export type ExecutionScenarioBody = {
  status: ExecutionStatus;
  asserts: AssertResult[];
  errors: string[];
  warnings: string[];
  artifacts?: Record<string, unknown>;
  userId?: string;
  email?: string;
  eventsProduced?: SyncEnvelope[];
  cleanup?: Record<string, number>;
};

export type ExecutionSession = {
  executionId: string;
  sessionId: string;
  scenarioId: string;
  scenario: string;
  suite: ExecutionSuiteId;
  kind: ExecutionScenarioKind;
  timestamp: string;
  userId: string;
  email: string;
  result: ExecutionStatus;
  durationMs: number;
  eventsProduced: SyncEnvelope[];
  asserts: AssertResult[];
  warnings: string[];
  errors: string[];
  cleanup: Record<string, number>;
  artifacts?: Record<string, unknown>;
  workflow?: string[];
};

export type ExecutionProgress = {
  step: "running" | "completed" | "skipped";
  scenarioId: string;
  at: string;
};

export type ExecutionReport = {
  reportId: ExecutionReportId;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  gate: ExecutionGateResult;
  pipeline: readonly string[];
  sessions: ExecutionSession[];
  progress?: ExecutionProgress[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    stubs: number;
    avgDurationMs: number;
  };
};

export type ExecutionRunRequest = {
  scenarioIds?: string[];
  suite?: ExecutionSuiteId;
  suites?: ExecutionSuiteId[];
  reportId?: ExecutionReportId;
  actor?: ExecutionActor;
  cliToken?: string | null;
  artifactPrefix?: string;
  print?: boolean;
  skipGate?: boolean;
};

export type ExecutionHistoryEntry = {
  executionId: string;
  runId: string;
  scenarioId: string;
  suite: ExecutionSuiteId;
  result: ExecutionStatus;
  durationMs: number;
  timestamp: string;
  eventsCount: number;
  assertsPassed: number;
  assertsFailed: number;
  cleanup: Record<string, number>;
  warnings: string[];
};
