/**
 * EC-01 — Registry automático (via discovery).
 */

import { discoverAllScenarios, discoverScenarioIdsBySuite } from "@/app/lib/execution/discovery";
import type { ExecutionScenarioDefinition, ExecutionSuiteId } from "@/app/lib/execution/types";

const registry = new Map<string, ExecutionScenarioDefinition>();

function ensureRegistry(): void {
  if (registry.size > 0) return;
  for (const s of discoverAllScenarios()) {
    registry.set(s.id, s);
  }
}

export function getExecutionScenario(id: string): ExecutionScenarioDefinition | undefined {
  ensureRegistry();
  return registry.get(id);
}

export function listExecutionScenarios(): ExecutionScenarioDefinition[] {
  ensureRegistry();
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function listExecutionScenarioIds(): string[] {
  return listExecutionScenarios().map((s) => s.id);
}

export function listExecutionScenarioIdsForSuite(suite: ExecutionSuiteId): string[] {
  ensureRegistry();
  if (suite === "sim02") return discoverScenarioIdsBySuite("sim02");
  return listExecutionScenarios()
    .filter((s) => s.suites.includes(suite))
    .map((s) => s.id);
}

export function describeExecutionRegistry(): {
  id: string;
  name: string;
  description: string;
  kind: string;
  suites: ExecutionSuiteId[];
  pipeline?: string[];
  status?: string;
}[] {
  return listExecutionScenarios().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    kind: s.kind,
    suites: s.suites,
    pipeline: s.pipeline,
    status: s.status,
  }));
}
