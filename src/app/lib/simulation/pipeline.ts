/**
 * SIM-01 — Official Pipeline Adapter (delega ao TE adapter + processPaymentWebhook).
 * Proibido criar Payment/Appointment/Service/Coupon diretamente.
 */

import { processPaymentWebhook } from "@/app/lib/process-payment-webhook";
import {
  dispatchOfficialPaymentReceived,
  dispatchOfficialPaymentReceivedDuplicate,
  ensureServicesOfficial,
  findLatestPaymentByAsaasId,
  seedTestUser,
  writeAgendamentoPaymentMetadata,
} from "@/app/lib/test-engine/pipeline-adapter";
import {
  futureSlots,
  redeemServiceCouponOfficial,
  writeCarrinhoPaymentMetadata,
  writePlanoPaymentMetadata,
} from "@/app/lib/test-engine/te02a-helpers";
import { SYMBOLIC_AGENDAMENTO_BRL } from "@/app/lib/symbolic-payment";

export const SIM_PIPELINE = [
  "Simulation",
  "ScenarioRunner",
  "OfficialPipelineAdapter",
  "Workflow",
  "StateMachine",
  "DomainEvents",
  "SynchronizationEngine",
  "Assertions",
] as const;

export const SIM_META = {
  source: "SIMULATION_ENGINE",
  createdBy: "SIMULATION_ENGINE",
} as const;

export function simScenarioMeta(scenario: string, runId: string) {
  return {
    ...SIM_META,
    scenario,
    runId,
    simEngine: true,
    isTestPayment: true,
  };
}

/** Webhook Asaas oficial — qualquer evento/status. */
export async function dispatchOfficialPaymentEvent(params: {
  userId: string;
  asaasPaymentId: string;
  event?: string;
  status?: string;
  value?: number;
  description?: string;
}) {
  const value = params.value ?? SYMBOLIC_AGENDAMENTO_BRL;
  return processPaymentWebhook({
    event: params.event || "PAYMENT_RECEIVED",
    payment: {
      id: params.asaasPaymentId,
      status: params.status || "RECEIVED",
      value,
      netValue: value,
      billingType: "PIX",
      customer: "cus_sim_engine",
      externalReference: params.userId,
      description: params.description || "SIM Agendamento simbólico",
      metadata: {},
    },
  });
}

export {
  dispatchOfficialPaymentReceived,
  dispatchOfficialPaymentReceivedDuplicate,
  ensureServicesOfficial,
  findLatestPaymentByAsaasId,
  seedTestUser,
  writeAgendamentoPaymentMetadata,
  writeCarrinhoPaymentMetadata,
  writePlanoPaymentMetadata,
  futureSlots,
  redeemServiceCouponOfficial,
};
