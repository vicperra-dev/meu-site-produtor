/**
 * SimulationProvider — gateway virtual.
 * Produz os mesmos efeitos de domínio que o Asaas via processPaymentWebhook / SM.
 * NÃO grava ids simulados em Payment.asaasId (usa provider + providerPaymentId).
 */
import { prisma } from "@/app/lib/prisma";
import { processPaymentWebhook } from "@/app/lib/process-payment-webhook";
import { refundPaymentStatus } from "@/app/lib/domain/workflow";
import { syncInboundRefundConfirmation } from "@/app/lib/payment-refund-sync";
import { REFUND_ASAAS_STATUS_SIMULATED } from "@/app/lib/symbolic-payment";
import { paymentByProviderIdWhere } from "@/app/lib/payment-provider/identity";
import type {
  CheckoutParams,
  CheckoutResponse,
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentProvider,
  ProviderPaymentSnapshot,
  RefundLifecycleStatus,
  RefundPaymentResult,
  SimulateWebhookParams,
  SimulateWebhookResult,
} from "@/app/lib/payment-provider/types";

function newSimPaymentId(): string {
  return `sim_pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function markRefundRequested(
  local: { id: string; userId: string; type: string; planId: string | null; appointmentId: number | null; amount: number },
  value: number
) {
  const now = new Date();
  if (local.appointmentId) {
    await prisma.appointment.updateMany({
      where: { id: local.appointmentId },
      data: {
        cancelRefundOption: "reembolso",
        refundProcessedAt: now,
        refundAsaasStatus: "pending",
      },
    });
  }
  await prisma.coupon.updateMany({
    where: { paymentId: local.id, refundProcessedAt: null },
    data: {
      refundRequestedAt: now,
      refundProcessedAt: now,
      refundAmount: value,
      refundAsaasStatus: "pending",
    },
  });
  if (local.type === "plano") {
    await prisma.userPlan.updateMany({
      where: {
        userId: local.userId,
        ...(local.planId ? { planId: local.planId } : {}),
        refundProcessedAt: null,
      },
      data: {
        refundRequestedAt: now,
        refundProcessedAt: now,
        refundAmount: value,
        refundAsaasStatus: "pending",
      },
    });
  }
}

async function markRefundTerminalStatus(
  local: { id: string; userId: string; appointmentId: number | null },
  status: "FAILED" | "TIMEOUT" | "pending"
) {
  if (local.appointmentId) {
    await prisma.appointment.updateMany({
      where: { id: local.appointmentId },
      data: { refundAsaasStatus: status },
    });
  }
  await prisma.coupon.updateMany({
    where: { paymentId: local.id },
    data: { refundAsaasStatus: status === "pending" ? "pending" : status.toLowerCase() },
  });
  await prisma.userPlan.updateMany({
    where: { userId: local.userId, refundAsaasStatus: "pending" },
    data: { refundAsaasStatus: status === "pending" ? "pending" : status.toLowerCase() },
  });
}

export class SimulationProvider implements PaymentProvider {
  readonly kind = "simulation" as const;

  async createCheckout(params: CheckoutParams): Promise<CheckoutResponse> {
    const created = await this.createPayment(params);
    return {
      initPoint: created.initPoint || `/admin/homologacao?paymentId=${created.providerPaymentId}`,
      preferenceId: created.providerPaymentId,
      provider: "simulation",
    };
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const value =
      params.value ??
      params.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const providerPaymentId = newSimPaymentId();
    const operationId =
      typeof params.metadata?.operationId === "string" ? params.metadata.operationId : null;

    if (operationId) {
      // PaymentMetadata.asaasId permanece como vínculo operacional genérico (legado)
      // até v1.1 renomear a coluna. O valor é o id do gateway (sim_pay_*).
      await prisma.paymentMetadata.update({
        where: { id: operationId },
        data: { asaasId: providerPaymentId },
      });
      try {
        const row = await prisma.paymentMetadata.findUnique({ where: { id: operationId } });
        if (row) {
          const meta = JSON.parse(row.metadata || "{}") as Record<string, unknown>;
          meta.provider = "SIMULATION";
          meta.providerPaymentId = providerPaymentId;
          await prisma.paymentMetadata.update({
            where: { id: operationId },
            data: { metadata: JSON.stringify(meta) },
          });
        }
      } catch {
        /* non-fatal */
      }
    }

    return {
      providerPaymentId,
      provider: "simulation",
      status: "PENDING",
      value: Number(value.toFixed(2)),
      initPoint: `/admin/homologacao?paymentId=${encodeURIComponent(providerPaymentId)}`,
      invoiceUrl: undefined,
      raw: {
        id: providerPaymentId,
        status: "PENDING",
        value,
        billingType: "UNDEFINED",
        provider: "SIMULATION",
      },
    };
  }

  async confirmPayment(providerPaymentId: string): Promise<SimulateWebhookResult> {
    const meta = await prisma.paymentMetadata.findFirst({
      where: { asaasId: providerPaymentId },
    });
    let description = "Agendamento THouse Rec - simulação";
    let value = 0;
    let externalReference: string | undefined;
    if (meta) {
      externalReference = meta.id;
      try {
        const parsed = JSON.parse(meta.metadata || "{}") as Record<string, unknown>;
        value = Number(parsed.chargedAmount ?? parsed.total ?? 0) || 0;
        if (parsed.tipo === "plano") {
          description = `Plano ${String(parsed.planName || parsed.planId || "")}`.trim();
        } else {
          description = "Agendamento THouse Rec - simulação";
        }
      } catch {
        /* keep defaults */
      }
    }
    return this.simulateWebhook({
      providerPaymentId,
      event: "PAYMENT_RECEIVED",
      status: "RECEIVED",
      value,
      description,
      externalReference,
      metadata: { provider: "SIMULATION" },
    });
  }

  async cancelPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot> {
    const local = await prisma.payment.findFirst({
      where: paymentByProviderIdWhere(providerPaymentId),
    });
    if (local && !["refunded", "reembolsado"].includes(String(local.status).toLowerCase())) {
      await prisma.payment.update({
        where: { id: local.id },
        data: { status: "cancelled" },
      });
    }
    return {
      providerPaymentId,
      provider: "simulation",
      status: "CANCELLED",
      value: local?.amount ?? 0,
      description: null,
      refundStatus: null,
    };
  }

  async refundPayment(
    providerPaymentId: string,
    opts?: { value?: number; description?: string; outcome?: RefundLifecycleStatus }
  ): Promise<RefundPaymentResult> {
    const outcome: RefundLifecycleStatus = opts?.outcome || "APPROVED";
    const local = await prisma.payment.findFirst({
      where: paymentByProviderIdWhere(providerPaymentId),
    });
    if (!local) {
      return {
        status: "FAILED",
        providerPaymentId,
        provider: "simulation",
        reason: "Pagamento local não encontrado para reembolso simulado.",
      };
    }

    const value = opts?.value ?? local.amount;

    try {
      await markRefundRequested(local, value);

      if (outcome === "PENDING") {
        try {
          const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
          await publishSyncEvent({
            name: "PaymentRefunded",
            entity: "payment",
            entityId: local.id,
            to: "refund_pending",
            options: {
              source: "lifecycle",
              userId: local.userId,
              metadata: { provider: "SIMULATION", outcome: "PENDING" },
            },
          });
        } catch {
          /* non-fatal */
        }
        return {
          status: "PENDING",
          providerPaymentId,
          provider: "simulation",
          reason: "Reembolso simulado pendente — aguardando confirmação do gateway.",
          value,
          raw: { outcome: "PENDING" },
        };
      }

      if (outcome === "TIMEOUT") {
        await markRefundTerminalStatus(local, "TIMEOUT");
        try {
          const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
          await publishSyncEvent({
            name: "PaymentRefunded",
            entity: "payment",
            entityId: local.id,
            to: "refund_timeout",
            options: {
              source: "lifecycle",
              userId: local.userId,
              metadata: { provider: "SIMULATION", outcome: "TIMEOUT" },
            },
          });
        } catch {
          /* non-fatal */
        }
        return {
          status: "TIMEOUT",
          providerPaymentId,
          provider: "simulation",
          reason: "Timeout simulado: gateway não confirmou o estorno a tempo.",
          value,
          raw: { outcome: "TIMEOUT" },
        };
      }

      if (outcome === "FAILED") {
        await markRefundTerminalStatus(local, "FAILED");
        try {
          const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
          await publishSyncEvent({
            name: "PaymentRefunded",
            entity: "payment",
            entityId: local.id,
            to: "refund_failed",
            options: {
              source: "lifecycle",
              userId: local.userId,
              metadata: {
                provider: "SIMULATION",
                outcome: "FAILED",
                description: opts?.description || "Falha simulada de reembolso",
              },
            },
          });
        } catch {
          /* non-fatal */
        }
        return {
          status: "FAILED",
          providerPaymentId,
          provider: "simulation",
          reason: opts?.description || "Reembolso simulado recusado (cenário FAILED).",
          value,
          raw: { outcome: "FAILED" },
        };
      }

      // APPROVED (default) — mesmo pipeline do Asaas confirmado
      const sm = await refundPaymentStatus(local.id, {
        type: "system",
        id: "simulation-provider",
      });
      if (!sm.ok) {
        return {
          status: "FAILED",
          providerPaymentId,
          provider: "simulation",
          reason: sm.error || "Falha na State Machine ao reembolsar pagamento.",
          value,
        };
      }

      const sync = await syncInboundRefundConfirmation(providerPaymentId);

      await prisma.coupon.updateMany({
        where: { paymentId: local.id, refundAsaasStatus: "confirmed" },
        data: { refundAsaasStatus: REFUND_ASAAS_STATUS_SIMULATED },
      });

      try {
        const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
        await publishSyncEvent({
          name: "PaymentRefunded",
          entity: "payment",
          entityId: local.id,
          to: "reembolsado",
          options: {
            source: "lifecycle",
            userId: local.userId,
            metadata: {
              provider: "SIMULATION",
              providerPaymentId,
              sync,
              description: opts?.description || "Reembolso simulado",
            },
          },
        });
      } catch {
        /* non-fatal */
      }

      return {
        status: "APPROVED",
        providerPaymentId,
        provider: "simulation",
        reason: "Reembolso simulado aprovado (pipeline oficial SM + sync).",
        value,
        raw: { sync, paymentStatus: "refunded" },
      };
    } catch (e: unknown) {
      const reason = e instanceof Error ? e.message : String(e);
      return {
        status: "FAILED",
        providerPaymentId,
        provider: "simulation",
        reason,
        value,
      };
    }
  }

  async simulateWebhook(params: SimulateWebhookParams): Promise<SimulateWebhookResult> {
    if (params.event === "PAYMENT_REFUNDED") {
      const refund = await this.refundPayment(params.providerPaymentId, {
        value: params.value,
        outcome: "APPROVED",
      });
      return {
        received: true,
        success: refund.status === "APPROVED",
        error: refund.status === "FAILED" ? refund.reason : undefined,
        domainResult: refund,
      };
    }

    if (params.event !== "PAYMENT_RECEIVED" && params.event !== "PAYMENT_CONFIRMED") {
      return {
        received: true,
        success: false,
        error: `Evento ${params.event} não gera efeitos de confirmação.`,
      };
    }

    const meta = await prisma.paymentMetadata.findFirst({
      where: { asaasId: params.providerPaymentId },
    });
    let value = params.value ?? 0;
    let description = params.description || "Agendamento THouse Rec - simulação";
    let externalReference = params.externalReference || meta?.id || undefined;
    if (meta && !params.value) {
      try {
        const parsed = JSON.parse(meta.metadata || "{}") as Record<string, unknown>;
        value = Number(parsed.chargedAmount ?? parsed.total ?? 0) || 0;
      } catch {
        /* ignore */
      }
    }

    const domainResult = await processPaymentWebhook({
      event: "PAYMENT_RECEIVED",
      payment: {
        id: params.providerPaymentId,
        status: params.status || "RECEIVED",
        value,
        netValue: value,
        billingType: "UNDEFINED",
        customer: "cus_simulation",
        externalReference,
        description,
        metadata: { ...(params.metadata || {}), provider: "SIMULATION" },
      },
    });

    return {
      received: Boolean((domainResult as { received?: boolean })?.received),
      success: Boolean((domainResult as { success?: boolean })?.success),
      error: (domainResult as { error?: string })?.error,
      domainResult,
    };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot | null> {
    const local = await prisma.payment.findFirst({
      where: paymentByProviderIdWhere(providerPaymentId),
    });
    if (local) {
      const st = String(local.status).toLowerCase();
      return {
        providerPaymentId,
        provider: "simulation",
        status:
          st === "refunded" || st === "reembolsado"
            ? "REFUNDED"
            : st === "approved" || st === "confirmado"
              ? "RECEIVED"
              : st === "cancelled" || st === "cancelado"
                ? "CANCELLED"
                : "PENDING",
        value: local.amount,
        description: null,
        refundStatus: st === "refunded" || st === "reembolsado" ? "APPROVED" : null,
        raw: local,
      };
    }
    const meta = await prisma.paymentMetadata.findFirst({
      where: { asaasId: providerPaymentId },
    });
    if (!meta) return null;
    let value = 0;
    try {
      const parsed = JSON.parse(meta.metadata || "{}") as Record<string, unknown>;
      value = Number(parsed.chargedAmount ?? parsed.total ?? 0) || 0;
    } catch {
      /* ignore */
    }
    return {
      providerPaymentId,
      provider: "simulation",
      status: "PENDING",
      value,
      externalReference: meta.id,
      refundStatus: null,
    };
  }
}
