/**
 * TE-01B — permissões (delegam ao Execution Core unificado).
 */

import {
  assertExecutionAllowed,
  isLocalOrDevelopmentRuntime,
  isPreviewRuntime,
  isProductionRuntimeBlocked,
} from "@/app/lib/execution/permissions";
import type { ExecutionActor } from "@/app/lib/execution/types";

export type TeActor = ExecutionActor;

export type TeGateResult = {
  allowed: boolean;
  reason?: string;
  warnings: string[];
};

export { isLocalOrDevelopmentRuntime, isPreviewRuntime, isProductionRuntimeBlocked };

export function assertTestEngineAllowed(opts: {
  actor?: TeActor;
  cliToken?: string | null;
}): TeGateResult {
  return assertExecutionAllowed(opts);
}
