/**
 * SIM-01 — Tipos oficiais do Domain Simulation Engine.
 */

import type { AssertResult } from "@/app/lib/test-engine/types";
import type { SyncEnvelope } from "@/app/lib/synchronization/types";

export type SimulationId =
  | "SIM-001"
  | "SIM-002"
  | "SIM-003"
  | "SIM-004"
  | "SIM-005"
  | "SIM-006"
  | "SIM-007"
  | "SIM-008"
  | "SIM-009"
  | "SIM-010";

export type SimulationStatus = "pass" | "fail" | "error" | "skipped";

export type SimulationContext = {
  simulationId: string;
  runId: string;
  startedAt: string;
  actor?: { role: string | null; email: string | null } | null;
  cliToken?: string | null;
  artifactPrefix: string;
};

export type SimulationSession = {
  simulationId: SimulationId;
  sessionId: string;
  timestamp: string;
  scenario: string;
  userId: string;
  email: string;
  result: SimulationStatus;
  durationMs: number;
  eventsProduced: SyncEnvelope[];
  asserts: AssertResult[];
  warnings: string[];
  errors: string[];
  cleanup: Record<string, number>;
  artifacts?: Record<string, unknown>;
};

export type SimulationDefinition = {
  id: SimulationId;
  name: string;
  description: string;
  pipeline: string[];
  run: (ctx: SimulationContext) => Promise<{
    status: SimulationStatus;
    asserts: AssertResult[];
    errors: string[];
    warnings: string[];
    artifacts?: Record<string, unknown>;
    userId: string;
    email: string;
    eventsProduced?: SyncEnvelope[];
    cleanup?: Record<string, number>;
  }>;
};

export type SimulationGateResult = {
  allowed: boolean;
  reason?: string;
  warnings: string[];
};

export type SimulationReport = {
  reportId: "SIM-01-execution" | "SIM-02-execution";
  /** Distingue engine quando reportId=SIM-02 (mismos cenários via Execution Core). */
  engine?: "SIM-01" | "SIM-02";
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  gate: SimulationGateResult;
  sessions: SimulationSession[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    avgDurationMs: number;
  };
  /** Preparação QA Center — stream de progresso serializado. */
  progress?: { step: string; simulationId: SimulationId; at: string }[];
};
