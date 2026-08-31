/**
 * EC-01 — ExecutionCore — único ponto oficial de entrada.
 */

import { runExecution } from "@/app/lib/execution/runner";
import type { ExecutionReport, ExecutionRunRequest } from "@/app/lib/execution/types";

export const ExecutionCore = {
  run: (request: ExecutionRunRequest = {}): Promise<ExecutionReport> => runExecution(request),
};

export { runExecution };
