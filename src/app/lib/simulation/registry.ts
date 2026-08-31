/**
 * SIM-01 — Simulation Registry (delega ao Execution Core discovery).
 */

import {
  getExecutionScenario,
  listExecutionScenarios,
} from "@/app/lib/execution/registry";
import type { SimulationDefinition, SimulationId } from "@/app/lib/simulation/types";

export function getSimulation(id: SimulationId): SimulationDefinition | undefined {
  const s = getExecutionScenario(id);
  if (!s || s.kind !== "sim") return undefined;
  return {
    id: s.id as SimulationId,
    name: s.name,
    description: s.description,
    pipeline: s.pipeline || [],
    run: async (ctx) => {
      const body = await s.run({
        executionId: `legacy_${Date.now()}`,
        runId: ctx.runId,
        scenarioId: s.id,
        startedAt: ctx.startedAt,
        suite: ctx.artifactPrefix.startsWith("sim02") ? "sim02" : "sim01",
        kind: "sim",
        actor: ctx.actor,
        cliToken: ctx.cliToken,
        artifactPrefix: ctx.artifactPrefix,
        via: "execution-core",
      });
      return {
        status: body.status as "pass" | "fail" | "error" | "skipped",
        asserts: body.asserts,
        errors: body.errors,
        warnings: body.warnings,
        artifacts: body.artifacts,
        userId: body.userId || "",
        email: body.email || "",
        eventsProduced: body.eventsProduced,
        cleanup: body.cleanup,
      };
    },
  };
}

export function listSimulations(): SimulationDefinition[] {
  return listExecutionScenarios()
    .filter((s) => s.kind === "sim")
    .map((s) => getSimulation(s.id as SimulationId)!)
    .filter(Boolean);
}

export function listSimulationIds(): SimulationId[] {
  return listSimulations().map((s) => s.id);
}

export function registerSimulation(def: SimulationDefinition): void {
  void def;
  console.warn("[simulation-registry] registerSimulation deprecated — use batch exports + discovery");
}

export function describeSimulationRegistry(): {
  id: SimulationId;
  name: string;
  description: string;
  pipeline: string[];
}[] {
  return listSimulations().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    pipeline: s.pipeline,
  }));
}
