/**
 * EC-01 — Execution hooks (sync + lifecycle).
 */

import { configureSyncSimulation } from "@/app/lib/synchronization/engine";
import { beginSimulationHooks, endSimulationHooks } from "@/app/lib/simulation/hooks";

export function beginExecutionHooks(runId: string): void {
  beginSimulationHooks(runId);
  configureSyncSimulation({ sourceTag: "sim-scenario" });
}

export function endExecutionHooks(): void {
  endSimulationHooks();
}
