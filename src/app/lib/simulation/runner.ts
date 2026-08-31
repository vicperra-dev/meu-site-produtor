/**
 * SIM-01 / SIM-02 — Simulation Runner (delega ao Execution Core).
 */

import { ExecutionCore } from "@/app/lib/execution/core";
import { toSimulationReport } from "@/app/lib/execution/result";
import { printSimulationReport } from "@/app/lib/simulation/report";
import type { SimActor } from "@/app/lib/simulation/permissions";
import type { SimulationId, SimulationReport } from "@/app/lib/simulation/types";
import { SIM01_IDS } from "@/app/lib/simulation/scenarios/sim01-batch";

export type RunSimulationOptions = {
  actor?: SimActor;
  cliToken?: string | null;
  artifactPrefix?: string;
  print?: boolean;
  /** SIM-02: mesmos cenários via Execution Core */
  engine?: "sim01" | "sim02";
};

async function runViaCore(
  ids: SimulationId[],
  opts: RunSimulationOptions,
  suite: "sim01" | "sim02"
): Promise<SimulationReport> {
  const report = await ExecutionCore.run({
    scenarioIds: ids,
    suite,
    actor: opts.actor,
    cliToken: opts.cliToken,
    artifactPrefix: opts.artifactPrefix || suite,
    print: false,
    reportId: suite === "sim02" ? "SIM-02-execution" : "SIM-01-execution",
  });
  const simReport = toSimulationReport(report);
  if (opts.print !== false) printSimulationReport(simReport);
  return simReport;
}

export async function runSimulation(
  id: SimulationId,
  opts: RunSimulationOptions = {}
): Promise<SimulationReport> {
  const suite = opts.engine === "sim02" ? "sim02" : "sim01";
  return runViaCore([id], opts, suite);
}

export async function runSimulationBatch(
  ids: SimulationId[],
  opts: RunSimulationOptions = {}
): Promise<SimulationReport> {
  const suite = opts.engine === "sim02" ? "sim02" : "sim01";
  return runViaCore(ids, opts, suite);
}

export async function runAllSimulations(opts: RunSimulationOptions = {}): Promise<SimulationReport> {
  const suite = opts.engine === "sim02" ? "sim02" : "sim01";
  return runViaCore([...SIM01_IDS], opts, suite);
}

/** SIM-02 — mesmos cenários SIM-001…010 via Execution Core */
export async function runAllSimulationsViaExecutionCore(
  opts: RunSimulationOptions = {}
): Promise<SimulationReport> {
  return runAllSimulations({ ...opts, engine: "sim02" });
}
