/**
 * EC-01 — Execution Session builder.
 */

import type {
  ExecutionContext,
  ExecutionScenarioDefinition,
  ExecutionSession,
  ExecutionStatus,
} from "@/app/lib/execution/types";
import { newSessionId } from "@/app/lib/execution/context";

export function buildExecutionSession(params: {
  def: ExecutionScenarioDefinition;
  ctx: ExecutionContext;
  sessionId?: string;
  durationMs: number;
  status: ExecutionStatus;
  userId?: string;
  email?: string;
  asserts: ExecutionSession["asserts"];
  errors: string[];
  warnings: string[];
  eventsProduced?: ExecutionSession["eventsProduced"];
  cleanup?: Record<string, number>;
  artifacts?: Record<string, unknown>;
}): ExecutionSession {
  return {
    executionId: params.ctx.executionId,
    sessionId: params.sessionId || newSessionId(),
    scenarioId: params.def.id,
    scenario: params.def.name,
    suite: params.ctx.suite,
    kind: params.def.kind,
    timestamp: params.ctx.startedAt,
    userId: params.userId || "",
    email: params.email || "",
    result: params.status,
    durationMs: params.durationMs,
    eventsProduced: params.eventsProduced || [],
    asserts: params.asserts,
    warnings: params.warnings,
    errors: params.errors,
    cleanup: params.cleanup || {},
    artifacts: params.artifacts,
    workflow: params.def.pipeline,
  };
}
