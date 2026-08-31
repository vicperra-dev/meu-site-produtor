/**
 * SIM-01 — permissões (delegam ao Execution Core unificado).
 */

import {
  assertExecutionAllowed,
  isLocalOrDevelopmentRuntime,
  isPreviewRuntime,
  isProductionRuntimeBlocked,
} from "@/app/lib/execution/permissions";
import type { ExecutionActor } from "@/app/lib/execution/types";
import type { SimulationGateResult } from "@/app/lib/simulation/types";

export type SimActor = ExecutionActor;

export { isLocalOrDevelopmentRuntime, isPreviewRuntime, isProductionRuntimeBlocked };

export function assertSimulationAllowed(opts: {
  actor?: SimActor;
  cliToken?: string | null;
}): SimulationGateResult {
  return assertExecutionAllowed(opts);
}
