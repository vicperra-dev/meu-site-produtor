/**
 * EC-01 — Pipeline oficial único.
 */

export const EXECUTION_PIPELINE = [
  "ExecutionCore",
  "Workflow",
  "StateMachine",
  "DomainEvents",
  "Synchronization",
  "Assertions",
  "Reports",
  "Cleanup",
] as const;

export const OFFICIAL_DOMAIN_PIPELINE = [
  "OfficialPipelineAdapter",
  "processPaymentWebhook",
  "Workflow",
  "StateMachine",
  "SynchronizationEngine",
  "Assertions",
] as const;
