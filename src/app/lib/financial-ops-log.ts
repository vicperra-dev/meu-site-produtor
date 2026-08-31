/**
 * GO-04A.2 — logs operacionais financeiros (sem segredos).
 * Nunca registrar API keys, tokens ou payloads sensíveis.
 */

export type FinancialOpsLogInput = {
  operationId?: string | null;
  paymentId?: string | null;
  provider?: string | null;
  providerPaymentId?: string | null;
  motivo: string;
  status: string;
  code?: string;
  extra?: Record<string, string | number | boolean | null | undefined>;
};

export function logFinancialFailure(input: FinancialOpsLogInput): void {
  const payload: Record<string, unknown> = {
    level: "FINANCIAL_OPS",
    timestamp: new Date().toISOString(),
    operationId: input.operationId ?? null,
    paymentId: input.paymentId ?? null,
    provider: input.provider ?? null,
    providerPaymentId: input.providerPaymentId ?? null,
    motivo: input.motivo,
    status: input.status,
  };
  if (input.code) payload.code = input.code;
  if (input.extra) {
    for (const [k, v] of Object.entries(input.extra)) {
      if (v !== undefined) payload[k] = v;
    }
  }
  console.error("[FINANCIAL_OPS_FAILURE]", payload);
}

export function logFinancialInfo(input: FinancialOpsLogInput): void {
  const payload: Record<string, unknown> = {
    level: "FINANCIAL_OPS",
    timestamp: new Date().toISOString(),
    operationId: input.operationId ?? null,
    paymentId: input.paymentId ?? null,
    provider: input.provider ?? null,
    providerPaymentId: input.providerPaymentId ?? null,
    motivo: input.motivo,
    status: input.status,
  };
  if (input.code) payload.code = input.code;
  if (input.extra) {
    for (const [k, v] of Object.entries(input.extra)) {
      if (v !== undefined) payload[k] = v;
    }
  }
  console.info("[FINANCIAL_OPS]", payload);
}
