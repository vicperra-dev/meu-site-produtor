/**
 * EC-01 — Execution Core barrel.
 */

export * from "@/app/lib/execution/types";
export * from "@/app/lib/execution/pipeline";
export * from "@/app/lib/execution/permissions";
export * from "@/app/lib/execution/discovery";
export * from "@/app/lib/execution/registry";
export * from "@/app/lib/execution/context";
export * from "@/app/lib/execution/session";
export * from "@/app/lib/execution/report";
export * from "@/app/lib/execution/hooks";
export * from "@/app/lib/execution/observer";
export * from "@/app/lib/execution/cleanup";
export * from "@/app/lib/execution/history";
export * from "@/app/lib/execution/impact";
export * from "@/app/lib/execution/studio-template";
export { ExecutionCore, runExecution } from "@/app/lib/execution/core";
export { toTeExecutionReport, toSimulationReport } from "@/app/lib/execution/result";
