/**
 * Identidade de pagamento multi-gateway (OP-02B / OP-02H / GO-H7).
 * Lookups nunca dependem só de asaasId — Simulation/Homologation usam providerPaymentId.
 */
import type { Prisma } from "@prisma/client";

export type PaymentGatewayProvider =
  | "ASAAS"
  | "SIMULATION"
  | "HOMOLOGATION"
  | "MERCADOPAGO"
  | "OTHER";

export function detectPaymentGatewayProvider(
  providerPaymentId: string,
  hints?: { provider?: string | null; metadata?: Record<string, unknown> | null }
): PaymentGatewayProvider {
  const hint = String(
    hints?.provider || hints?.metadata?.provider || hints?.metadata?.origin || ""
  ).toUpperCase();
  if (
    hint === "SIMULATION" ||
    hint === "HOMOLOGATION" ||
    hint === "ASAAS" ||
    hint === "MERCADOPAGO"
  ) {
    return hint as PaymentGatewayProvider;
  }
  if (String(providerPaymentId).startsWith("sim_pay_")) return "SIMULATION";
  if (String(providerPaymentId).startsWith("homo_pay_")) return "HOMOLOGATION";
  if (String(providerPaymentId).startsWith("pay_")) return "ASAAS";
  return "OTHER";
}

/** Where clause para achar Payment por id de gateway (qualquer coluna legada/canônica). */
export function paymentByProviderIdWhere(
  providerPaymentId: string
): Prisma.PaymentWhereInput {
  return {
    OR: [
      { providerPaymentId },
      { asaasId: providerPaymentId },
      { mercadopagoId: providerPaymentId },
    ],
  };
}

/**
 * Campos a gravar no create/update de Payment.
 * Simulation / Homologation: NÃO preenche asaasId.
 * Asaas: dual-write asaasId + providerPaymentId (compat até v1.1).
 */
export function paymentProviderPersistFields(params: {
  providerPaymentId: string;
  provider?: PaymentGatewayProvider | string | null;
  metadata?: Record<string, unknown> | null;
}): {
  provider: string;
  providerPaymentId: string;
  asaasId?: string | null;
  mercadopagoId?: string | null;
} {
  const provider = detectPaymentGatewayProvider(params.providerPaymentId, {
    provider: params.provider,
    metadata: params.metadata,
  });
  if (provider === "SIMULATION" || provider === "HOMOLOGATION") {
    return {
      provider,
      providerPaymentId: params.providerPaymentId,
      asaasId: null,
    };
  }
  if (provider === "MERCADOPAGO") {
    return {
      provider: "MERCADOPAGO",
      providerPaymentId: params.providerPaymentId,
      mercadopagoId: params.providerPaymentId,
    };
  }
  // ASAAS / OTHER: dual-write asaasId até unificação v1.1
  return {
    provider: provider === "OTHER" ? "ASAAS" : provider,
    providerPaymentId: params.providerPaymentId,
    asaasId: params.providerPaymentId,
  };
}

export function isHomologationProviderPaymentId(id: string | null | undefined): boolean {
  return String(id || "").startsWith("homo_pay_");
}

export function newHomologationPaymentId(): string {
  return `homo_pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
