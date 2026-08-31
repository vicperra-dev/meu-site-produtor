/**
 * SIM-01 — Hooks de integração com Sync Engine (SIM-02/03 preparação).
 */

import { configureSyncSimulation } from "@/app/lib/synchronization/engine";
import type { SyncSimulationHooks } from "@/app/lib/synchronization/types";

export function beginSimulationHooks(runId: string): void {
  configureSyncSimulation({
    sourceTag: "sim-scenario",
    clock: { now: () => new Date() },
  });
  void runId;
}

export function endSimulationHooks(): void {
  configureSyncSimulation({ sourceTag: "live" });
}

export function configureSimulationClock(hooks: SyncSimulationHooks): void {
  configureSyncSimulation(hooks);
}
