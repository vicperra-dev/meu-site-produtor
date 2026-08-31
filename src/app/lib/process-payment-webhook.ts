// src/app/lib/process-payment-webhook.ts
// Orquestrador: valida evento, persiste Payment, resolve metadata e delega efeitos.
import { prisma } from "@/app/lib/prisma";
import { processAgendamentoPaymentEffects } from "@/app/lib/asaas-agendamento-payment-effects";
import {
  assertWebhookAmountMatchesMetadata,
  resolvePaymentOperationIdentity,
  resolvePaymentMetadataForWebhook,
} from "@/app/lib/asaas-agendamento-reconcile";
import { enrichPlanoMetadata, processPlanoPaymentEffects } from "@/app/lib/asaas-plano-payment-effects";
import {
  isAgendamentoPaymentDescription,
  isPlanoPaymentDescription,
  resolvePaymentTipo,
} from "@/app/lib/agendamento-payment-rules";
import {
  paymentByProviderIdWhere,
  paymentProviderPersistFields,
} from "@/app/lib/payment-provider/identity";

function isConfirmedPaymentEvent(event: string, status: string): boolean {
  return event === "PAYMENT_RECEIVED" && (status === "RECEIVED" || status === "CONFIRMED");
}

async function publishPaymentEffectsReady(
  paymentDbId: string,
  userId: string,
  paymentType: string
): Promise<void> {
  const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
  await publishSyncEvent({
    name: "PaymentConfirmed",
    entity: "payment",
    entityId: paymentDbId,
    to: "confirmado",
    options: {
      source: "lifecycle",
      userId,
      metadata: { effectsReady: true, paymentType },
    },
  });
}

// Payload Asaas: superfície variável; callers de teste/simulação passam o mesmo shape.
export async function processPaymentWebhook(body: {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payment: any;
}) {
  try {
    const { event, payment } = body;

    if (!event || !payment) {
      console.warn("[Process Payment Webhook] Evento sem dados necessários");
      return { received: true };
    }

    const paymentId = payment.id;
    const status = payment.status;
    const value = payment.value;
    const externalReference = payment.externalReference;

    console.log("[Process Payment Webhook] Processando:", {
      event,
      paymentId,
      status,
      value,
      customerId: payment.customer,
      externalReference,
      description: payment.description,
    });

    if (!isConfirmedPaymentEvent(event, status)) {
      return { received: true };
    }

    const isPlanoDesc = isPlanoPaymentDescription(payment.description);
    const isAgendamentoDesc = isAgendamentoPaymentDescription(payment.description);

    const existingPayment = await prisma.payment.findFirst({
      where: paymentByProviderIdWhere(paymentId),
    });

    let userId: string;
    if (existingPayment) {
      userId = existingPayment.userId;
    } else {
      try {
        const identity = await resolvePaymentOperationIdentity({
          asaasPaymentId: paymentId,
          externalReference,
        });
        userId = identity.userId;
      } catch (identityError) {
        console.error("[Process Payment Webhook] Operação rejeitada:", {
          paymentId,
          externalReference,
          error:
            identityError instanceof Error ? identityError.message : String(identityError),
        });
        return { received: true, error: "Operação de pagamento não identificada" };
      }
    }
    const metadata = await resolvePaymentMetadataForWebhook({
      userId,
      asaasPaymentId: paymentId,
      paymentMetadata: payment.metadata,
      description: payment.description,
    });
    assertWebhookAmountMatchesMetadata(metadata, value);

    let paymentRecord: { id: string; userId: string; type: string };

    if (existingPayment) {
      paymentRecord = {
        id: existingPayment.id,
        userId: existingPayment.userId,
        type: existingPayment.type,
      };
      userId = existingPayment.userId;
      console.log(
        "[Process Payment Webhook] Pagamento já no banco:",
        paymentId,
        "- verificando efeitos pendentes"
      );
      // HS-03B: status pending → confirmado apenas via State Machine
      const st = String(existingPayment.status || "").toLowerCase();
      if (st === "pending" || st === "pendente" || st === "recebido" || st === "received") {
        const { confirmPayment } = await import("@/app/lib/domain/workflow");
        await confirmPayment(existingPayment.id, { type: "webhook", id: paymentId });
      }
    } else {
      const providerFields = paymentProviderPersistFields({
        providerPaymentId: paymentId,
        metadata:
          payment.metadata && typeof payment.metadata === "object"
            ? (payment.metadata as Record<string, unknown>)
            : null,
      });
      const created = await prisma.payment.create({
        data: {
          userId,
          amount: value,
          status: "approved",
          type: isPlanoDesc
            ? "plano"
            : isAgendamentoDesc
              ? "agendamento"
              : "outro",
          currency: "BRL",
          ...providerFields,
          planId: isPlanoDesc ? payment.description?.match(/Plano (\w+)/)?.[1] || null : null,
        },
      });
      // Ajuste pós-create: metadata tipado como carrinho deve contar como agendamento
      const metaPeek = await resolvePaymentMetadataForWebhook({
        userId,
        asaasPaymentId: paymentId,
        paymentMetadata: payment.metadata,
        description: payment.description,
      }).catch(() => ({}) as Record<string, unknown>);
      if (String((metaPeek as Record<string, unknown>)?.tipo || "") === "carrinho" && created.type === "outro") {
        await prisma.payment.update({
          where: { id: created.id },
          data: { type: "agendamento" },
        });
        paymentRecord = { id: created.id, userId: created.userId, type: "agendamento" };
      } else {
        paymentRecord = { id: created.id, userId: created.userId, type: created.type };
      }
      console.log("[Process Payment Webhook] Pagamento registrado com sucesso:", paymentRecord.id);
      try {
        const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
        await publishSyncEvent({
          name: "PaymentConfirmed",
          entity: "payment",
          entityId: paymentRecord.id,
          from: "pending",
          to: "confirmado",
          options: {
            source: "lifecycle",
            userId,
            metadata: {
              providerPaymentId: paymentId,
              provider: providerFields.provider,
              via: "processPaymentWebhook-create",
            },
          },
        });
      } catch (syncErr) {
        console.error("[Process Payment Webhook] sync PaymentConfirmed falhou (non-fatal):", syncErr);
      }
    }

    const tipo = resolvePaymentTipo({
      metadata,
      paymentType: paymentRecord.type,
      description: payment.description,
    });

    console.log("[Process Payment Webhook] 📦 Metadata processado:", JSON.stringify(metadata, null, 2));
    console.log("[Process Payment Webhook] 📋 Tipo detectado:", tipo);

    if (tipo === "plano" || isPlanoDesc) {
      if (payment.subscription) {
        console.log(
          "[Process Payment Webhook] É assinatura recorrente, pulando efeitos de plano único"
        );
        return { received: true };
      }

      const planMetadata = enrichPlanoMetadata(metadata, payment.description);
      const fx = await processPlanoPaymentEffects({
        paymentDbId: paymentRecord.id,
        value,
        metadata: planMetadata,
        options: { sendEmails: true, source: "webhook" },
      });

      if (fx.skippedReason && !fx.userPlanId) {
        console.warn("[Process Payment Webhook] Plano não aplicado:", fx.skippedReason);
        return { received: true, success: false, error: fx.skippedReason };
      }

      if (fx.userPlanId) {
        const userPlan = await prisma.userPlan.findUnique({
          where: { id: fx.userPlanId },
          select: { id: true, planId: true, planName: true, status: true },
        });
        console.log("[Process Payment Webhook] ✅✅✅ PLANO PROCESSADO COM SUCESSO ✅✅✅");
        await publishPaymentEffectsReady(paymentRecord.id, userId, "plano");
        return {
          received: true,
          success: true,
          userPlanId: fx.userPlanId,
          userPlan: userPlan ?? undefined,
        };
      }

      return { received: true };
    }

    // Carrinho antes de isAgendamentoDesc: descrições com "Agendamento" não podem
    // short-circuitar metadata.tipo === "carrinho" (1 Payment → N Appointments).
    if (tipo === "carrinho") {
      const { processCarrinhoPaymentEffects } = await import(
        "@/app/lib/asaas-carrinho-payment-effects"
      );
      const fx = await processCarrinhoPaymentEffects({
        paymentDbId: paymentRecord.id,
        userId,
        value,
        metadata,
        options: { sendEmails: false, source: "webhook" },
      });
      if (fx.skippedReason) {
        console.warn("[Process Payment Webhook] Carrinho — efeitos não aplicados:", fx.skippedReason);
      }
      if (fx.paymentLinked) {
        await publishPaymentEffectsReady(paymentRecord.id, userId, "carrinho");
      }
      return {
        received: true,
        success: fx.paymentLinked,
        appointmentIds: fx.appointmentIds,
      };
    }

    if (tipo === "agendamento" || isAgendamentoDesc) {
      const fx = await processAgendamentoPaymentEffects({
        paymentDbId: paymentRecord.id,
        value,
        metadata,
        options: { sendEmails: true, source: "webhook" },
      });
      if (fx.skippedReason) {
        console.warn("[Process Payment Webhook] Agendamento — efeitos não aplicados:", fx.skippedReason);
      }
      if (fx.paymentLinked) {
        await publishPaymentEffectsReady(paymentRecord.id, userId, "agendamento");
      }
      return {
        received: true,
        success: fx.paymentLinked,
        agendamentoFinalId: fx.agendamentoFinalId,
        couponsCount: fx.couponsCount,
      };
    }

    return { received: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Process Payment Webhook] Erro geral:", error);
    return { received: true, error: message };
  }
}
