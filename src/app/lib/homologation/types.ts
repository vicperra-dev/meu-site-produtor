import type { RefundLifecycleStatus } from "@/app/lib/payment-provider/types";
import type { HomologationScenarioId } from "@/app/lib/homologation/scenarios";

export type HomologationCheckKey =
  | "paymentCreated"
  | "webhookExecuted"
  | "appointmentCreated"
  | "servicesCreated"
  | "couponsCreated"
  | "serviceOrdersCreated"
  | "refundRequested"
  | "refundResolved"
  | "workflowUpdated"
  | "minhaContaUpdated"
  | "dashboardUpdated";

export type HomologationCheck = {
  key: HomologationCheckKey;
  label: string;
  ok: boolean;
  detail?: string;
};

export type HomologationTimelineEvent = {
  at: string;
  step: string;
  ok: boolean;
  detail?: string;
  data?: unknown;
};

export type HomologationServiceOrderSummary = {
  id: string;
  serviceType: string;
  commercialSource: string | null;
  phase: string;
  couponId: string | null;
  appointmentId: number | null;
  sequenceIndex: number;
};

export type HomologationRunInput = {
  userId: string;
  userEmail: string;
  userName: string;
  scenarioId?: HomologationScenarioId | string;
  scenarioKind?: "cupom_desconto" | "cupom_remarcacao";
  tipo?: "agendamento" | "plano";
  servicos?: { id: string; nome?: string; quantidade: number; preco?: number }[];
  beats?: { id: string; nome?: string; quantidade: number; preco?: number }[];
  data?: string;
  hora?: string;
  duracaoMinutos?: number;
  observacoes?: string;
  planId?: string;
  modo?: "mensal" | "anual";
  runRefund?: boolean;
  refundOutcome?: RefundLifecycleStatus;
  expectedServiceCoupons?: number | null;
  /** GO-H6: seleção livre (laboratório) — ignora scenarioId se true com itens. */
  freeLab?: boolean;
  /** GO-H6: resultado do pagamento simulado (default approved). */
  paymentOutcome?: "approved" | "pending" | "refused";
};

export type HomologationRun = {
  runId: string;
  startedAt: string;
  finishedAt?: string;
  provider: "SIMULATION";
  scenarioId?: string;
  input: HomologationRunInput;
  providerPaymentId?: string;
  paymentDbId?: string;
  appointmentIds?: number[];
  serviceIds?: string[];
  couponCodes?: string[];
  serviceOrders?: HomologationServiceOrderSummary[];
  orderCount?: number;
  refund?: {
    status: RefundLifecycleStatus;
    reason?: string;
  };
  checks: HomologationCheck[];
  timeline: HomologationTimelineEvent[];
  ok: boolean;
  error?: string;
};
