// src/app/api/webhooks/asaas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { processAgendamentoPaymentEffects } from "@/app/lib/asaas-agendamento-payment-effects";
import { processCarrinhoPaymentEffects } from "@/app/lib/asaas-carrinho-payment-effects";
import {
  assertWebhookAmountMatchesMetadata,
  reconcileAgendamentoPaymentArtifacts,
  resolvePaymentOperationIdentity,
  resolvePaymentMetadataForWebhook,
} from "@/app/lib/asaas-agendamento-reconcile";
import { enrichPlanoMetadata, processPlanoPaymentEffects } from "@/app/lib/asaas-plano-payment-effects";
import {
  isAgendamentoPaymentDescription,
  isPlanoPaymentDescription,
  resolvePaymentTipo,
} from "@/app/lib/agendamento-payment-rules";
import { publishSyncEvent } from "@/app/lib/synchronization/engine";
import { syncInboundRefundConfirmation } from "@/app/lib/payment-refund-sync";
import { logFinancialFailure } from "@/app/lib/financial-ops-log";

/**
 * Webhook do Asaas para notificações de pagamento
 *
 * IMPORTANTE: Esta rota SEMPRE retorna HTTP 200 ao Asaas (exceto em erros de rede).
 * O Asaas interrompe a fila e aplica penalidade quando recebe 4xx/5xx. Por isso
 * erros internos são logados e a resposta é sempre 200, para a fila não ser interrompida.
 *
 * GO-04A.2 RC-08: se ASAAS_WEBHOOK_ACCESS_TOKEN estiver ausente/inválido, o evento
 * NÃO é processado. A resposta HTTP 200 evita penalidade Asaas, mas o corpo deixa
 * explícito processed=false (nunca sucesso operacional silencioso).
 *
 * Eventos suportados:
 * - PAYMENT_CREATED: Pagamento criado
 * - PAYMENT_RECEIVED: Pagamento confirmado ✅
 * - PAYMENT_REFUNDED: Estorno confirmado no Asaas (sincroniza refundAsaasStatus local)
 * - PAYMENT_OVERDUE: Pagamento vencido
 * - PAYMENT_DELETED: Pagamento deletado
 */
export async function POST(req: Request) {
  try {
    const webhookToken = process.env.ASAAS_WEBHOOK_ACCESS_TOKEN;
    const receivedToken = req.headers.get("asaas-access-token");

    if (process.env.NODE_ENV === "production" && !webhookToken) {
      logFinancialFailure({
        provider: "asaas",
        motivo:
          "ASAAS_WEBHOOK_ACCESS_TOKEN ausente em produção — evento ignorado; pagamento NÃO entrou no domínio",
        status: "config_error",
        code: "ASAAS_WEBHOOK_ACCESS_TOKEN_MISSING",
        extra: { processed: false, httpStatusReturned: 200 },
      });
      return NextResponse.json(
        {
          received: true,
          processed: false,
          ignored: true,
          reason: "ASAAS_WEBHOOK_ACCESS_TOKEN_MISSING",
          error:
            "Webhook não configurado: defina ASAAS_WEBHOOK_ACCESS_TOKEN no ambiente e no painel Asaas (mesmo valor).",
        },
        { status: 200 }
      );
    }

    if (webhookToken && receivedToken !== webhookToken) {
      logFinancialFailure({
        provider: "asaas",
        motivo:
          "Token de webhook inválido ou ausente no header asaas-access-token — evento ignorado",
        status: "auth_rejected",
        code: "ASAAS_WEBHOOK_TOKEN_MISMATCH",
        extra: {
          processed: false,
          tokenHeaderPresent: Boolean(receivedToken),
          httpStatusReturned: 200,
        },
      });
      return NextResponse.json(
        {
          received: true,
          processed: false,
          ignored: true,
          reason: "ASAAS_WEBHOOK_TOKEN_MISMATCH",
          error: "Token inválido — evento não processado",
        },
        { status: 200 }
      );
    }

    const bodyText = await req.text();
    console.log("[Asaas Webhook] Body recebido (primeiros 500 chars):", bodyText.substring(0, 500));

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      console.error("[Asaas Webhook] Erro ao parsear body:", parseError);
      console.error("[Asaas Webhook] Body completo:", bodyText);
      return NextResponse.json(
        {
          received: true,
          error: "Erro ao parsear body",
          details: parseError.message,
        },
        { status: 200 }
      );
    }

    console.log("[Asaas Webhook] Evento recebido:", JSON.stringify(body, null, 2));

    const { event, payment } = body;

    if (event && !event.startsWith("PAYMENT_")) {
      console.log(`[Asaas Webhook] Evento ignorado (não é de pagamento): ${event}`);
      return NextResponse.json({ received: true, message: `Evento ${event} ignorado` }, { status: 200 });
    }

    if (!event || !payment) {
      console.warn("[Asaas Webhook] Evento sem dados necessários");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paymentId = payment.id;
    const status = payment.status;
    const value = payment.value;
    const customerId = payment.customer;
    const externalReference = payment.externalReference;

    console.log("[Asaas Webhook] Processando:", {
      event,
      paymentId,
      status,
      value,
      customerId,
      externalReference,
      description: payment.description,
      metadata: payment.metadata,
    });

    console.log("[Asaas Webhook] Verificando condições:", {
      event,
      status,
      shouldProcess: event === "PAYMENT_RECEIVED" && (status === "RECEIVED" || status === "CONFIRMED"),
    });

    if (event === "PAYMENT_RECEIVED" && (status === "RECEIVED" || status === "CONFIRMED")) {
      console.log("[Asaas Webhook] ✅ Condições atendidas, processando pagamento...");
      try {
        const paymentByProviderId = await prisma.payment.findFirst({
          where: {
            OR: [{ asaasId: paymentId }, { mercadopagoId: paymentId }],
          },
          select: { userId: true },
        });
        let userId: string;
        let operationId: string | null = null;
        let subscriptionMetadata: Record<string, unknown> | null = null;
        if (paymentByProviderId) {
          userId = paymentByProviderId.userId;
          const operation = await prisma.paymentMetadata.findUnique({
            where: { asaasId: paymentId },
            select: { id: true },
          });
          operationId = operation?.id || null;
        } else if (payment.subscription) {
          const subscription = await prisma.subscription.findUnique({
            where: { asaasSubscriptionId: payment.subscription },
            select: {
              userId: true,
              userPlan: {
                select: {
                  planId: true,
                  planName: true,
                  modo: true,
                  amount: true,
                },
              },
            },
          });
          if (!subscription) {
            console.error("[WEBHOOK_SECURITY_AUDIT]", {
              code: "SUBSCRIPTION_NOT_FOUND",
              subscriptionId: payment.subscription,
              paymentId,
            });
            return NextResponse.json(
              { received: true, error: "Assinatura não identificada" },
              { status: 200 }
            );
          }
          userId = subscription.userId;
          subscriptionMetadata = {
            tipo: "plano",
            planId: subscription.userPlan.planId,
            planName: subscription.userPlan.planName,
            modo: subscription.userPlan.modo,
            amount: subscription.userPlan.amount,
            subscriptionId: payment.subscription,
          };
        } else {
          try {
            const identity = await resolvePaymentOperationIdentity({
              asaasPaymentId: paymentId,
              externalReference,
            });
            userId = identity.userId;
            operationId = identity.operationId;
          } catch (identityError) {
            console.error("[Asaas Webhook] Operação rejeitada sem efeitos:", {
              paymentId,
              externalReference,
              customerId,
              error:
                identityError instanceof Error
                  ? identityError.message
                  : String(identityError),
            });
            return NextResponse.json(
              { received: true, error: "Operação de pagamento não identificada" },
              { status: 200 }
            );
          }
        }

        const existingPayment = await prisma.payment.findFirst({
          where: {
            OR: [{ asaasId: paymentId }, { mercadopagoId: paymentId }],
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingPayment) {
          console.log("[Asaas Webhook] Pagamento já processado:", paymentId);
          if (Math.abs(Number(existingPayment.amount) - Number(value)) > 0.01) {
            console.error("[WEBHOOK_SECURITY_AUDIT]", {
              code: "DUPLICATE_AMOUNT_MISMATCH",
              paymentId,
              stored: existingPayment.amount,
              received: value,
            });
            return NextResponse.json(
              { received: true, error: "Valor divergente" },
              { status: 200 }
            );
          }
          let reconciliationReady = true;
          try {
            await reconcileAgendamentoPaymentArtifacts({
              paymentDbId: existingPayment.id,
              userId,
              asaasPaymentId: paymentId,
            });
          } catch (reconcileErr: any) {
            reconciliationReady = false;
            console.error("[Asaas Webhook] Reconcile pós-duplicata falhou:", {
              paymentDbId: existingPayment.id,
              asaasPaymentId: paymentId,
              userId,
              message: reconcileErr?.message,
              stack: reconcileErr?.stack,
            });
          }
          if (!reconciliationReady) {
            return NextResponse.json(
              { received: true, error: "Reconciliação incompleta" },
              { status: 200 }
            );
          }
          await publishSyncEvent({
            name: "PaymentConfirmed",
            entity: "payment",
            entityId: existingPayment.id,
            to: "confirmado",
            options: {
              source: "recovery",
              userId,
              metadata: { effectsReady: true, duplicate: true, operationId },
            },
          });
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const isPlanoDesc = isPlanoPaymentDescription(payment.description);
        const isAgendamentoDesc = isAgendamentoPaymentDescription(payment.description);
        const metadata =
          subscriptionMetadata ||
          (await resolvePaymentMetadataForWebhook({
            userId,
            asaasPaymentId: paymentId,
            paymentMetadata: payment.metadata,
            description: payment.description,
          }));
        assertWebhookAmountMatchesMetadata(metadata, value);

        const newPayment = await prisma.payment.create({
          data: {
            userId,
            amount: value,
            status: "approved",
            type: isPlanoDesc ? "plano" : isAgendamentoDesc ? "agendamento" : "outro",
            currency: "BRL",
            asaasId: paymentId,
            planId: isPlanoDesc ? payment.description?.match(/Plano (\w+)/)?.[1] || null : null,
          },
        });

        console.log("[Asaas Webhook] Pagamento registrado com sucesso:", newPayment.id);

        const tipo = resolvePaymentTipo({
          metadata,
          paymentType: newPayment.type,
          description: payment.description,
        });

        console.log("[Asaas Webhook] 📦 Metadata processado:", JSON.stringify(metadata, null, 2));
        console.log("[Asaas Webhook] 📋 Tipo detectado:", tipo);

        let effectsReady = false;
        if (tipo === "plano" || isPlanoDesc) {
          const subscriptionId = payment.subscription;

          console.log("[Asaas Webhook] Processando pagamento de plano. subscriptionId:", subscriptionId);

          if (subscriptionId) {
            await processSubscriptionPayment(subscriptionId, userId, value, paymentId);
            effectsReady = true;
          } else {
            const planMetadata = enrichPlanoMetadata(metadata, payment.description);
            const fx = await processPlanoPaymentEffects({
              paymentDbId: newPayment.id,
              value,
              metadata: planMetadata,
              options: { sendEmails: true, source: "webhook" },
            });

            if (fx.skippedReason && !fx.userPlanId) {
              console.warn("[Asaas Webhook] Plano não aplicado:", fx.skippedReason);
            } else if (fx.userPlanId) {
              effectsReady = true;
              console.log("[Asaas Webhook] ✅✅✅ PLANO PROCESSADO COM SUCESSO ✅✅✅");
              console.log("[Asaas Webhook] UserPlan ID:", fx.userPlanId);
            }
          }
        } else if (tipo === "carrinho") {
          const fx = await processCarrinhoPaymentEffects({
            paymentDbId: newPayment.id,
            userId,
            value,
            metadata,
            options: { sendEmails: true, source: "webhook" },
          });
          if (fx.skippedReason) {
            console.warn("[Asaas Webhook] Carrinho — efeitos não aplicados:", fx.skippedReason);
          }
          effectsReady = fx.paymentLinked;
        } else if (tipo === "agendamento" || isAgendamentoDesc) {
          const fx = await processAgendamentoPaymentEffects({
            paymentDbId: newPayment.id,
            value,
            metadata,
            options: { sendEmails: true, source: "webhook" },
          });
          if (fx.skippedReason) {
            console.warn("[Asaas Webhook] Agendamento — efeitos não aplicados:", fx.skippedReason);
          }
          effectsReady = fx.paymentLinked;
        }
        if (!effectsReady) {
          console.error("[Asaas Webhook] Efeitos incompletos; evento ready não publicado", {
            paymentId,
            tipo,
          });
          return NextResponse.json(
            { received: true, error: "Efeitos de pagamento incompletos" },
            { status: 200 }
          );
        }
        await publishSyncEvent({
          name: "PaymentConfirmed",
          entity: "payment",
          entityId: newPayment.id,
          from: "pending",
          to: "confirmado",
          options: {
            source: "lifecycle",
            userId,
            metadata: { effectsReady: true, paymentType: tipo, operationId },
          },
        });
      } catch (dbError: any) {
        console.error("[Asaas Webhook] ❌ Erro ao processar pagamento no banco:", dbError);
        console.error("[Asaas Webhook] Stack:", dbError.stack);
      }
    } else if (
      event === "PAYMENT_REFUNDED" ||
      String(status || "").toUpperCase() === "REFUNDED"
    ) {
      try {
        const sync = await syncInboundRefundConfirmation(paymentId);
        console.log("[Asaas Webhook] ✅ PAYMENT_REFUNDED sincronizado:", {
          asaasPaymentId: paymentId,
          ...sync,
        });
      } catch (refundSyncError: any) {
        console.error("[Asaas Webhook] ❌ Erro ao sincronizar PAYMENT_REFUNDED:", refundSyncError);
        console.error("[Asaas Webhook] Stack:", refundSyncError.stack);
      }
    } else if (event === "PAYMENT_OVERDUE" || String(status || "").toUpperCase() === "OVERDUE") {
      try {
        const subId = payment.subscription ? String(payment.subscription) : null;
        if (subId) {
          const { markSubscriptionPaymentFailed } = await import(
            "@/app/lib/subscription-lifecycle"
          );
          const updated = await markSubscriptionPaymentFailed(subId);
          console.log("[Asaas Webhook] PAYMENT_OVERDUE → assinatura:", {
            subscriptionId: subId,
            status: updated?.status,
            failureCount: updated?.failureCount,
          });
        } else {
          console.log("[Asaas Webhook] PAYMENT_OVERDUE sem subscription vinculada", paymentId);
        }
      } catch (overdueErr) {
        console.error("[Asaas Webhook] Erro OVERDUE:", overdueErr);
      }
    } else {
      console.log("[Asaas Webhook] ⚠️ Evento não processado:", {
        event,
        status,
        reason:
          event !== "PAYMENT_RECEIVED"
            ? "Evento não é PAYMENT_RECEIVED"
            : "Status não é RECEIVED ou CONFIRMED",
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Asaas Webhook] Erro ao processar webhook:", error);
    return NextResponse.json({ received: true, error: error.message }, { status: 200 });
  }
}

/**
 * Processar pagamento de assinatura recorrente (renovação comercial).
 * GO-H10C — usa renewSubscriptionAfterPaidCharge (H10B para benefícios).
 */
async function processSubscriptionPayment(
  subscriptionId: string,
  userId: string,
  value: number,
  paymentId: string
) {
  try {
    const { renewSubscriptionAfterPaidCharge } = await import(
      "@/app/lib/subscription-lifecycle"
    );
    const result = await renewSubscriptionAfterPaidCharge({
      asaasSubscriptionId: subscriptionId,
      paymentValue: value,
      asaasPaymentId: paymentId,
    });

    console.log(
      `[Asaas Webhook] Renovação comercial OK sub=${subscriptionId} cupons=${result.renewal.generatedCoupons}`
    );

    try {
      const { sendPlanRenewalEmail } = await import("@/app/lib/sendEmail");
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const subscription = await prisma.subscription.findUnique({
        where: { asaasSubscriptionId: subscriptionId },
        include: { userPlan: true },
      });
      if (user && subscription) {
        await sendPlanRenewalEmail(
          user.email,
          user.nomeArtistico,
          subscription.userPlan.planName,
          subscription.userPlan.modo,
          value,
          result.newEndDate,
          result.renewal.generatedCoupons
        );
      }
    } catch (emailError: unknown) {
      console.error("[Asaas Webhook] Email renovação (non-fatal):", emailError);
    }
  } catch (error: unknown) {
    console.error("[Asaas Webhook] Erro ao processar pagamento de assinatura:", error);
    throw error;
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Asaas webhook endpoint",
    status: "active",
  });
}
