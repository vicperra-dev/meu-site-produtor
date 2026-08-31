/**
 * SIM-01 — Domain Simulation Engine (barrel).
 * TE-02B consumirá este módulo — TE executa, SIM produz.
 */

export * from "@/app/lib/simulation/types";
export * from "@/app/lib/simulation/permissions";
export * from "@/app/lib/simulation/pipeline";
export * from "@/app/lib/simulation/assertions";
export * from "@/app/lib/simulation/cleanup";
export * from "@/app/lib/simulation/hooks";
export * from "@/app/lib/simulation/session";
export * from "@/app/lib/simulation/report";
export * from "@/app/lib/simulation/registry";
export * from "@/app/lib/simulation/runner";
export { runAllSimulationsViaExecutionCore } from "@/app/lib/simulation/runner";
export { ExecutionCore } from "@/app/lib/execution/core";
export { SIM01_IDS, sim01Scenarios } from "@/app/lib/simulation/scenarios/sim01-batch";
