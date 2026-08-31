import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { buildSubscriptionRefundPreview } from "@/app/lib/subscription-refund";
import { cancelLocalSubscription } from "@/app/lib/subscription-lifecycle";
import { refundAsaasPayment } from "@/app/lib/asaas-refund";
import { invalidatePlanCouponsOnCancel } from "@/app/lib/plan-cancel-coupons";
import { logFinancialFailure, logFinancialInfo } from "@/app/lib/financial-ops-log";
import { sendPlanCancellationEmail } from "@/app/lib/sendEmail";

/**
 * POST /api/assinatura/cancel
 * Body: { userPlanId, confirm: true, requestRefund?: boolean }
 * Nunca cancela sem confirm=true. Reembolso só via Asaas oficial.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const userPlanId = String(body.userPlanId || "");
    const confirm = body.confirm === true;
    const requestRefund = body.requestRefund === true;

    if (!userPlanId) {
      return NextResponse.json({ error: "userPlanId obrigatório" }, { status: 400 });
    }
    if (!confirm) {
      const preview = await buildSubscriptionRefundPreview(userPlanId);
      return NextResponse.json(
        {
          error: "Confirmação obrigatória. Envie confirm=true após revisar o resumo.",
          preview,
        },
        { status: 400 }
      );
    }

    const userPlan = await prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: { user: true, subscription: true, coupons: true },
    });
    if (!userPlan || userPlan.userId !== user.id) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }
    if (userPlan.status !== "active" && userPlan.subscription?.status !== "active") {
      return NextResponse.json({ error: "Assinatura já inativa ou cancelada" }, { status: 400 });
    }

    const preview = await buildSubscriptionRefundPreview(userPlanId);
    if (!preview) {
      return NextResponse.json({ error: "Não foi possível calcular o resumo." }, { status: 400 });
    }

    // Cancelar Assinatura (local + Asaas)
    if (userPlan.subscription) {
      await cancelLocalSubscription(userPlan.subscription.id, { cancelRemote: true });
    } else {
      await prisma.userPlan.update({
        where: { id: userPlanId },
        data: { status: "cancelled" },
      });
    }

    // Invalidar cupons de plano não usados + derivados (remarcação) ainda disponíveis.
    // O preview já usa consumo efetivo: derivado unused não desconta e será invalidado.
    const couponInvalidation = await invalidatePlanCouponsOnCancel(userPlanId);
    const now = new Date();

    let refundResult: {
      requested: boolean;
      amount: number;
      status?: string;
      message?: string;
    } = { requested: false, amount: 0 };

    if (requestRefund && preview.refundAvailable) {
      const payment =
        (userPlan.subscription?.rootPaymentId
          ? await prisma.payment.findUnique({
              where: { id: userPlan.subscription.rootPaymentId },
            })
          : null) ||
        (await prisma.payment.findFirst({
          where: {
            userId: user.id,
            type: "plano",
            status: "approved",
            asaasId: { not: null },
          },
          orderBy: { createdAt: "desc" },
        }));

      if (!payment?.asaasId) {
        refundResult = {
          requested: false,
          amount: preview.refundAmount,
          message:
            "Cancelamento OK, mas não há pagamento Asaas vinculado para estorno automático. Contate o suporte.",
        };
      } else if (
        payment.asaasId.startsWith("sim_pay_") ||
        payment.asaasId.startsWith("homo_pay_") ||
        payment.asaasId.startsWith("sim_") ||
        payment.asaasId.startsWith("homo_")
      ) {
        refundResult = {
          requested: false,
          amount: preview.refundAmount,
          message:
            "Cancelamento OK. Este pagamento é de homologação/simulação — não há estorno real no Asaas.",
        };
      } else {
        const reserved = await prisma.userPlan.updateMany({
          where: {
            id: userPlanId,
            refundProcessedAt: null,
          },
          data: {
            refundRequestedAt: now,
            refundProcessedAt: now,
            refundAmount: preview.refundAmount,
            refundAsaasStatus: "pending",
          },
        });

        if (reserved.count > 0) {
          try {
            await refundAsaasPayment(
              payment.asaasId,
              preview.refundAmount,
              `Reembolso assinatura ${preview.planName} (desconto benefícios usados)`
            );
            logFinancialInfo({
              paymentId: payment.id,
              provider: "asaas",
              providerPaymentId: payment.asaasId,
              motivo: "Estorno de assinatura solicitado",
              status: "pending",
              code: "SUBSCRIPTION_REFUND_REQUESTED",
              extra: { userPlanId, refundAmount: preview.refundAmount },
            });
            refundResult = {
              requested: true,
              amount: preview.refundAmount,
              status: "pending",
            };
          } catch (err: unknown) {
            await prisma.userPlan.update({
              where: { id: userPlanId },
              data: { refundAsaasStatus: "failed", refundProcessedAt: null },
            });
            logFinancialFailure({
              paymentId: payment.id,
              provider: "asaas",
              providerPaymentId: payment.asaasId,
              motivo: err instanceof Error ? err.message : "Falha estorno",
              status: "failed",
              code: "SUBSCRIPTION_REFUND_FAILED",
              extra: { userPlanId },
            });
            refundResult = {
              requested: false,
              amount: preview.refundAmount,
              message:
                err instanceof Error
                  ? err.message
                  : "Falha ao solicitar estorno no Asaas. Contate o suporte.",
            };
          }
        }
      }
    }

    try {
      const { emitPlanCancelled } = await import("@/app/lib/synchronization/lifecycle");
      await emitPlanCancelled({
        userPlanId,
        userId: user.id,
        metadata: {
          planName: userPlan.planName,
          requestRefund,
          couponInvalidation,
        },
      });
    } catch {
      /* non-fatal */
    }

    try {
      await sendPlanCancellationEmail(
        userPlan.user.email,
        userPlan.user.nomeArtistico,
        userPlan.planName,
        refundResult.requested ? refundResult.amount : null,
        refundResult.requested ? "asaas" : null,
        preview.used.length,
        preview.used.length + preview.unused.length
      );
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      message: "Assinatura cancelada com sucesso",
      preview,
      couponInvalidation,
      refund: refundResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[api/assinatura/cancel]", err);
    return NextResponse.json({ error: msg || "Erro ao cancelar" }, { status: 500 });
  }
}
