/**
 * EC-01 — Discovery automático de cenários, módulos e suites.
 * Nenhum cenário precisa ser registrado manualmente fora dos batch exports.
 */

import { teS01CompraSimples } from "@/app/lib/test-engine/scenarios/te-s01-compra-simples";
import { stubScenarios } from "@/app/lib/test-engine/scenarios/stubs";
import { te02aScenarios, TE02A_IDS } from "@/app/lib/test-engine/scenarios/te02a-batch1";
import { ph01Scenarios, PH01_IDS } from "@/app/lib/test-engine/scenarios/ph01-batch";
import { rc01Scenarios, RC01_IDS } from "@/app/lib/test-engine/scenarios/rc01-batch";
import { rc02Scenarios, RC02_IDS } from "@/app/lib/test-engine/scenarios/rc02-batch";
import { rc03Scenarios, RC03_IDS } from "@/app/lib/test-engine/scenarios/rc03-batch";
import { sync01aScenarios, SYNC01A_IDS } from "@/app/lib/test-engine/scenarios/sync01a-batch";
import { sim01Scenarios, SIM01_IDS } from "@/app/lib/simulation/scenarios/sim01-batch";
import type { ScenarioDefinition } from "@/app/lib/test-engine/types";
import type { SimulationDefinition } from "@/app/lib/simulation/types";
import type {
  ExecutionScenarioDefinition,
  ExecutionScenarioKind,
  ExecutionSuiteId,
} from "@/app/lib/execution/types";

export type DiscoveredBatch = {
  suite: ExecutionSuiteId;
  kind: ExecutionScenarioKind;
  modulePath: string;
  scenarioIds: string[];
  scenarios: ExecutionScenarioDefinition[];
};

function adaptTeScenario(
  def: ScenarioDefinition,
  suites: ExecutionSuiteId[]
): ExecutionScenarioDefinition {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    kind: "te",
    suites,
    status: def.status,
    run: async (ctx) => {
      const body = await def.run({
        runId: ctx.runId,
        startedAt: ctx.startedAt,
        actor: ctx.actor,
        cliToken: ctx.cliToken,
        artifactPrefix: ctx.artifactPrefix,
      });
      return {
        status: body.status as import("@/app/lib/execution/types").ExecutionStatus,
        asserts: body.asserts,
        errors: body.errors,
        warnings: body.warnings,
        artifacts: body.artifacts,
      };
    },
  };
}

function adaptSimScenario(
  def: SimulationDefinition,
  suites: ExecutionSuiteId[]
): ExecutionScenarioDefinition {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    kind: "sim",
    suites,
    pipeline: def.pipeline,
    status: "implemented",
    run: async (ctx) => {
      const body = await def.run({
        simulationId: def.id,
        runId: ctx.runId,
        startedAt: ctx.startedAt,
        actor: ctx.actor,
        cliToken: ctx.cliToken,
        artifactPrefix: ctx.artifactPrefix,
      });
      return {
        status: body.status,
        asserts: body.asserts,
        errors: body.errors,
        warnings: body.warnings,
        artifacts: body.artifacts,
        userId: body.userId,
        email: body.email,
        eventsProduced: body.eventsProduced,
        cleanup: body.cleanup,
      };
    },
  };
}

const SIM_SUITES: ExecutionSuiteId[] = ["sim01", "sim02"];

function buildBatches(): DiscoveredBatch[] {
  return [
    {
      suite: "te-s01",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/te-s01-compra-simples.ts",
      scenarioIds: [teS01CompraSimples.id],
      scenarios: [adaptTeScenario(teS01CompraSimples, ["te-s01"])],
    },
    {
      suite: "te-stubs",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/stubs.ts",
      scenarioIds: stubScenarios.map((s) => s.id),
      scenarios: stubScenarios.map((s) => adaptTeScenario(s, ["te-stubs"])),
    },
    {
      suite: "te02a",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/te02a-batch1.ts",
      scenarioIds: [...TE02A_IDS],
      scenarios: te02aScenarios.map((s) => adaptTeScenario(s, ["te02a"])),
    },
    {
      suite: "sync01a",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/sync01a-batch.ts",
      scenarioIds: [...SYNC01A_IDS],
      scenarios: sync01aScenarios.map((s) => adaptTeScenario(s, ["sync01a"])),
    },
    {
      suite: "ph01",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/ph01-batch.ts",
      scenarioIds: [...PH01_IDS],
      scenarios: ph01Scenarios.map((s) => adaptTeScenario(s, ["ph01"])),
    },
    {
      suite: "rc01",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/rc01-batch.ts",
      scenarioIds: [...RC01_IDS],
      scenarios: rc01Scenarios.map((s) => adaptTeScenario(s, ["rc01"])),
    },
    {
      suite: "rc02",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/rc02-batch.ts",
      scenarioIds: [...RC02_IDS],
      scenarios: rc02Scenarios.map((s) => adaptTeScenario(s, ["rc02"])),
    },
    {
      suite: "rc03",
      kind: "te",
      modulePath: "src/app/lib/test-engine/scenarios/rc03-batch.ts",
      scenarioIds: [...RC03_IDS],
      scenarios: rc03Scenarios.map((s) => adaptTeScenario(s, ["rc03"])),
    },
    {
      suite: "sim01",
      kind: "sim",
      modulePath: "src/app/lib/simulation/scenarios/sim01-batch.ts",
      scenarioIds: [...SIM01_IDS],
      scenarios: sim01Scenarios.map((s) => adaptSimScenario(s, SIM_SUITES)),
    },
  ];
}

let _batches: DiscoveredBatch[] | null = null;

export function discoverBatches(): DiscoveredBatch[] {
  if (!_batches) _batches = buildBatches();
  return _batches;
}

export function discoverAllScenarios(): ExecutionScenarioDefinition[] {
  const map = new Map<string, ExecutionScenarioDefinition>();
  for (const batch of discoverBatches()) {
    for (const s of batch.scenarios) {
      const existing = map.get(s.id);
      if (existing) {
        map.set(s.id, { ...existing, suites: [...new Set([...existing.suites, ...s.suites])] });
      } else {
        map.set(s.id, s);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function discoverScenarioIdsBySuite(suite: ExecutionSuiteId): string[] {
  if (suite === "sim02") return [...SIM01_IDS];
  const batch = discoverBatches().find((b) => b.suite === suite);
  return batch?.scenarioIds ?? [];
}

export function discoverSuites(): ExecutionSuiteId[] {
  return ["te-s01", "te-stubs", "te02a", "sync01a", "ph01", "rc01", "rc02", "rc03", "sim01", "sim02"];
}

export function discoverModulePaths(): string[] {
  return discoverBatches().map((b) => b.modulePath);
}

/** Discovery de módulos de plataforma (não apenas cenários). */
export function discoverPlatformModules(): {
  workflows: string[];
  domain: string[];
  execution: string[];
  assertions: string[];
  reports: string[];
  simulation: string[];
  synchronization: string[];
} {
  return {
    workflows: [
      "src/app/lib/domain/workflow.ts",
      "src/app/lib/domain/state-machine",
    ],
    domain: [
      "src/app/lib/domain",
      "src/app/lib/domain/graph",
    ],
    execution: [
      "src/app/lib/execution",
    ],
    assertions: [
      "src/app/lib/test-engine/assert-engine.ts",
      "src/app/lib/simulation/assertions.ts",
    ],
    reports: [
      "src/app/lib/execution/report.ts",
      "src/app/lib/simulation/report.ts",
      "src/app/lib/test-engine/execution-report.ts",
      "reports/domain-guardian",
    ],
    simulation: [
      "src/app/lib/simulation",
    ],
    synchronization: [
      "src/app/lib/synchronization",
    ],
  };
}

export function discoverAllArtifacts(): {
  suites: ExecutionSuiteId[];
  scenarios: ExecutionScenarioDefinition[];
  batchPaths: string[];
  modules: ReturnType<typeof discoverPlatformModules>;
} {
  return {
    suites: discoverSuites(),
    scenarios: discoverAllScenarios(),
    batchPaths: discoverModulePaths(),
    modules: discoverPlatformModules(),
  };
}

export { TE02A_IDS, SYNC01A_IDS, PH01_IDS, SIM01_IDS };
