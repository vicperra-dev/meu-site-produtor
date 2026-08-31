/**
 * SIM-01 — Simulation Session builder.
 */

import type {
  SimulationContext,
  SimulationDefinition,
  SimulationSession,
  SimulationStatus,
} from "@/app/lib/simulation/types";
import type { AssertResult } from "@/app/lib/test-engine/types";
import type { SyncEnvelope } from "@/app/lib/synchronization/types";

export function newSessionId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildSession(params: {
  def: SimulationDefinition;
  ctx: SimulationContext;
  sessionId: string;
  durationMs: number;
  status: SimulationStatus;
  userId: string;
  email: string;
  asserts: AssertResult[];
  errors: string[];
  warnings: string[];
  eventsProduced: SyncEnvelope[];
  cleanup: Record<string, number>;
  artifacts?: Record<string, unknown>;
}): SimulationSession {
  return {
    simulationId: params.def.id,
    sessionId: params.sessionId,
    timestamp: params.ctx.startedAt,
    scenario: params.def.name,
    userId: params.userId,
    email: params.email,
    result: params.status,
    durationMs: params.durationMs,
    eventsProduced: params.eventsProduced,
    asserts: params.asserts,
    warnings: params.warnings,
    errors: params.errors,
    cleanup: params.cleanup,
    artifacts: params.artifacts,
  };
}
