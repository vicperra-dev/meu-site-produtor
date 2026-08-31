/**
 * TE-01B / TE-02A — Scenario Registry (delega ao Execution Core discovery).
 */

import {
  listExecutionScenarios,
  getExecutionScenario,
} from "@/app/lib/execution/registry";
import type { ScenarioDefinition, ScenarioId } from "@/app/lib/test-engine/types";

export function getScenario(id: ScenarioId): ScenarioDefinition | undefined {
  const s = getExecutionScenario(id);
  if (!s || s.kind !== "te") return undefined;
  return {
    id: s.id as ScenarioId,
    name: s.name,
    description: s.description,
    status: s.status || "implemented",
    run: async (ctx) => {
      const body = await s.run({
        executionId: `legacy_${Date.now()}`,
        runId: ctx.runId,
        scenarioId: s.id,
        startedAt: ctx.startedAt,
        suite: s.suites[0] || "te02a",
        kind: "te",
        actor: ctx.actor,
        cliToken: ctx.cliToken,
        artifactPrefix: ctx.artifactPrefix,
        via: "execution-core",
      });
      return {
        status: body.status as "pass" | "fail" | "error" | "skipped" | "stub",
        asserts: body.asserts,
        errors: body.errors,
        warnings: body.warnings,
        artifacts: body.artifacts,
      };
    },
  };
}

export function listScenarios(): ScenarioDefinition[] {
  return listExecutionScenarios()
    .filter((s) => s.kind === "te")
    .map((s) => getScenario(s.id as ScenarioId)!)
    .filter(Boolean);
}

export function listScenarioIds(): ScenarioId[] {
  return listScenarios().map((s) => s.id);
}

export function registerScenario(def: ScenarioDefinition): void {
  void def;
  console.warn("[scenario-registry] registerScenario deprecated — use batch exports + discovery");
}
