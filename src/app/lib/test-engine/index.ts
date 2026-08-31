/**
 * TE-01B — núcleo do Test Engine (sem UI).
 */
export {
  assertPayment,
  assertAppointment,
  assertService,
  assertCoupon,
  assertDashboard,
  assertMinhaConta,
} from "@/app/lib/test-engine/assert-engine";

export {
  assertTestEngineAllowed,
  isLocalOrDevelopmentRuntime,
  isPreviewRuntime,
  isProductionRuntimeBlocked,
} from "@/app/lib/test-engine/permissions";

export {
  seedTestUser,
  writeAgendamentoPaymentMetadata,
  dispatchOfficialPaymentReceived,
  dispatchOfficialPaymentReceivedDuplicate,
  ensureServicesOfficial,
} from "@/app/lib/test-engine/pipeline-adapter";

export {
  getScenario,
  listScenarios,
  listScenarioIds,
  registerScenario,
} from "@/app/lib/test-engine/scenario-registry";

export {
  runScenario,
  runAllScenarios,
  runScenarioIds,
  describeRegistry,
} from "@/app/lib/test-engine/scenario-runner";

export { TE02A_IDS } from "@/app/lib/test-engine/scenarios/te02a-batch1";
export { SYNC01A_IDS } from "@/app/lib/test-engine/scenarios/sync01a-batch";
export { PH01_IDS } from "@/app/lib/test-engine/scenarios/ph01-batch";
export { RC01_IDS } from "@/app/lib/test-engine/scenarios/rc01-batch";
export { RC02_IDS } from "@/app/lib/test-engine/scenarios/rc02-batch";
export { RC03_IDS } from "@/app/lib/test-engine/scenarios/rc03-batch";

export {
  runSimulation,
  runSimulationBatch,
  runAllSimulations,
  runAllSimulationsViaExecutionCore,
  describeSimulationRegistry,
  SIM01_IDS,
} from "@/app/lib/simulation";

export {
  ExecutionCore,
  runExecution,
  describeExecutionRegistry,
  discoverBatches,
  analyzeImpact,
  getExecutionHistory,
  SIM01_IDS as EC_SIM01_IDS,
} from "@/app/lib/execution";

export {
  cleanupTeUserArtifacts,
  writeCarrinhoPaymentMetadata,
  writePlanoPaymentMetadata,
  redeemServiceCouponOfficial,
} from "@/app/lib/test-engine/te02a-helpers";

export { buildExecutionReport, printExecutionReport } from "@/app/lib/test-engine/execution-report";

export type {
  ScenarioId,
  ScenarioDefinition,
  ScenarioResult,
  ExecutionReport,
  AssertResult,
  ScenarioContext,
} from "@/app/lib/test-engine/types";
