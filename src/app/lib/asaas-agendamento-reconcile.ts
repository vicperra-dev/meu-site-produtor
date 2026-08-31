import { prisma } from "@/app/lib/prisma";

async function loadMetadataForPayment(
  userId: string,
  asaasPaymentId: string,
): Promise<Record<string, unknown>> {
  let metadata: Record<string, unknown> = {};
  const paymentMetadata = await prisma.paymentMetadata.findUnique({
    where: { asaasId: asaasPaymentId },
  });
  if (paymentMetadata && paymentMetadata.userId !== userId) {
    throw new Error("WEBHOOK_OPERATION_OWNER_MISMATCH");
  }
  if (paymentMetadata) {
    try {
      metadata = JSON.parse(paymentMetadata.metadata || "{}");
    } catch {
      metadata = {};
    }
  }
  return metadata;
}

/**
 * Identidade segura da operação: Asaas ID e/ou PaymentMetadata.id.
 * Nunca infere operação a partir de userId, email, valor, descrição ou recência.
 */
export async function resolvePaymentOperationIdentity(params: {
  asaasPaymentId: string;
  externalReference?: string | null;
}): Promise<{ userId: string; operationId: string }> {
  const [byAsaas, byOperation] = await Promise.all([
    prisma.paymentMetadata.findUnique({
      where: { asaasId: params.asaasPaymentId },
      select: { id: true, userId: true, asaasId: true },
    }),
    params.externalReference
      ? prisma.paymentMetadata.findUnique({
          where: { id: params.externalReference },
          select: { id: true, userId: true, asaasId: true },
        })
      : null,
  ]);

  if (byAsaas && byOperation && byAsaas.id !== byOperation.id) {
    console.error("[WEBHOOK_SECURITY_AUDIT]", {
      code: "AMBIGUOUS_OPERATION",
      asaasPaymentId: params.asaasPaymentId,
      externalReference: params.externalReference,
      byAsaas: byAsaas.id,
      byOperation: byOperation.id,
    });
    throw new Error("WEBHOOK_AMBIGUOUS_OPERATION");
  }

  const operation = byAsaas || byOperation;
  if (!operation) {
    console.error("[WEBHOOK_SECURITY_AUDIT]", {
      code: "OPERATION_NOT_FOUND",
      asaasPaymentId: params.asaasPaymentId,
      externalReference: params.externalReference,
    });
    throw new Error("WEBHOOK_OPERATION_NOT_FOUND");
  }
  if (operation.asaasId && operation.asaasId !== params.asaasPaymentId) {
    console.error("[WEBHOOK_SECURITY_AUDIT]", {
      code: "PAYMENT_ID_MISMATCH",
      operationId: operation.id,
      expected: operation.asaasId,
      received: params.asaasPaymentId,
    });
    throw new Error("WEBHOOK_PAYMENT_ID_MISMATCH");
  }
  if (!operation.asaasId) {
    await prisma.paymentMetadata.update({
      where: { id: operation.id },
      data: { asaasId: params.asaasPaymentId },
    });
  }

  return { userId: operation.userId, operationId: operation.id };
}

export function assertWebhookAmountMatchesMetadata(
  metadata: Record<string, unknown>,
  receivedValue: number
): void {
  const rawExpected =
    metadata.chargedAmount ?? metadata.amount ?? metadata.total;
  const expected = Number(rawExpected);
  const received = Number(receivedValue);
  if (
    !Number.isFinite(expected) ||
    !Number.isFinite(received) ||
    expected <= 0 ||
    Math.abs(expected - received) > 0.01
  ) {
    console.error("[WEBHOOK_SECURITY_AUDIT]", {
      code: "AMOUNT_MISMATCH",
      expected: Number.isFinite(expected) ? expected : null,
      received: Number.isFinite(received) ? received : null,
    });
    throw new Error("WEBHOOK_AMOUNT_MISMATCH");
  }
}

/**
 * Resolve metadata para o orquestrador de webhook: payload Asaas → PaymentMetadata → fallback descrição.
 */
export async function resolvePaymentMetadataForWebhook(params: {
  userId: string;
  asaasPaymentId: string;
  paymentMetadata?: unknown;
  description?: string | null;
}): Promise<Record<string, unknown>> {
  // Payload, descrição e userId do provedor não são fontes de verdade.
  // A operação já foi vinculada de forma exata a PaymentMetadata.asaasId.
  const metadata = await loadMetadataForPayment(params.userId, params.asaasPaymentId);

  if (Object.keys(metadata).length === 0) {
    throw new Error("WEBHOOK_METADATA_NOT_FOUND");
  }

  if (!metadata.userId) {
    metadata.userId = params.userId;
  }

  return metadata;
}

/**
 * Replay idempotente: completa Appointment/Service/cupom faltantes sem duplicar.
 */
export async function reconcileAgendamentoPaymentArtifacts(params: {
  paymentDbId: string;
  userId: string;
  asaasPaymentId: string;
}): Promise<void> {
  const { processApprovedPayment } = await import("@/app/lib/process-approved-payment");
  const pay = await prisma.payment.findUnique({
    where: { id: params.paymentDbId },
    select: { id: true, amount: true, type: true },
  });
  if (!pay) return;
  const fx = await processApprovedPayment({
    paymentDbId: params.paymentDbId,
    value: pay.amount,
    asaasPaymentId: params.asaasPaymentId,
    options: { sendEmails: false, source: "webhook" },
  });
  if (!fx.paymentLinked) {
    console.warn("[Reconcile] Efeitos ainda incompletos:", {
      paymentDbId: params.paymentDbId,
      skippedReason: fx.skippedReason,
    });
  }
}
