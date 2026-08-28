/**
 * Efeitos pós-aprovação idempotentes: completa o que faltar, não duplica.
 */
import { prisma } from "@/app/lib/prisma";
import { processAgendamentoPaymentEffects } from "@/app/lib/asaas-agendamento-payment-effects";
import { processCarrinhoPaymentEffects } from "@/app/lib/asaas-carrinho-payment-effects";
import { resolvePaymentMetadataForWebhook } from "@/app/lib/asaas-agendamento-reconcile";
import {
  isAgendamentoPaymentDescription,
  isPlanoPaymentDescription,
  resolvePaymentTipo,
} from "@/app/lib/agendamento-payment-rules";

export type ProcessApprovedPaymentResult = {
  ok: boolean;
  paymentLinked: boolean;
  tipo: string;
  appointmentIds: number[];
  skippedReason?: string;
  emailsSent: boolean;
};

export async function processApprovedPayment(params: {
  paymentDbId: string;
  value?: number;
  metadata?: Record<string, unknown>;
  asaasPaymentId?: string;
  description?: string | null;
  options?: { sendEmails?: boolean; source?: "webhook" | "admin_reprocess" };
}): Promise<ProcessApprovedPaymentResult> {
  const pay = await prisma.payment.findUnique({
    where: { id: params.paymentDbId },
    select: {
      id: true,
      userId: true,
      amount: true,
      type: true,
      asaasId: true,
      appointmentId: true,
    },
  });
  if (!pay) {
    return {
      ok: false,
      paymentLinked: false,
      tipo: "unknown",
      appointmentIds: [],
      emailsSent: false,
      skippedReason: "Pagamento não encontrado",
    };
  }

  const asaasPaymentId = params.asaasPaymentId || pay.asaasId;
  let metadata = params.metadata;
  if (!metadata) {
    if (!asaasPaymentId) {
      return {
        ok: false,
        paymentLinked: false,
        tipo: pay.type,
        appointmentIds: [],
        emailsSent: false,
        skippedReason: "Metadata ausente (sem asaasId)",
      };
    }
    metadata = await resolvePaymentMetadataForWebhook({
      userId: pay.userId,
      asaasPaymentId,
    });
  }

  const value = params.value ?? pay.amount;
  const tipo = resolvePaymentTipo({
    metadata,
    paymentType: pay.type,
    description: params.description,
  });
  const sendEmails = params.options?.sendEmails === true;
  const source = params.options?.source ?? "webhook";

  if (tipo === "plano" || isPlanoPaymentDescription(params.description)) {
    return {
      ok: true,
      paymentLinked: true,
      tipo: "plano",
      appointmentIds: [],
      emailsSent: false,
      skippedReason: "Plano não é processado por processApprovedPayment",
    };
  }

  if (tipo === "carrinho") {
    const fx = await processCarrinhoPaymentEffects({
      paymentDbId: pay.id,
      userId: pay.userId,
      value,
      metadata,
      options: { sendEmails, source },
    });
    return {
      ok: fx.paymentLinked,
      paymentLinked: fx.paymentLinked,
      tipo: "carrinho",
      appointmentIds: fx.appointmentIds,
      skippedReason: fx.skippedReason,
      emailsSent: fx.emailsSent,
    };
  }

  if (tipo === "agendamento" || isAgendamentoPaymentDescription(params.description)) {
    const fx = await processAgendamentoPaymentEffects({
      paymentDbId: pay.id,
      value,
      metadata,
      options: { sendEmails, source },
    });
    return {
      ok: fx.paymentLinked,
      paymentLinked: fx.paymentLinked,
      tipo: "agendamento",
      appointmentIds: fx.agendamentoFinalId != null ? [fx.agendamentoFinalId] : [],
      skippedReason: fx.skippedReason,
      emailsSent: fx.emailsSent,
    };
  }

  return {
    ok: false,
    paymentLinked: Boolean(pay.appointmentId),
    tipo,
    appointmentIds: pay.appointmentId != null ? [pay.appointmentId] : [],
    emailsSent: false,
    skippedReason: "Tipo de pagamento sem efeitos de agendamento",
  };
}
