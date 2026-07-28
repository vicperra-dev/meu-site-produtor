import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { refundAsaasPayment } from "@/app/lib/asaas-refund";
import { logFinancialFailure, logFinancialInfo } from "@/app/lib/financial-ops-log";
import { buildSubscriptionRefundPreview } from "@/app/lib/subscription-refund";

/**
 * Solicita reembolso do plano cancelado (GO-H10C).
 * Cálculo: valorPago − Σ valores internos dos benefícios utilizados.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { userPlanId } = body;

    if (!userPlanId) {
      return NextResponse.json({ error: "ID do plano é obrigatório" }, { status: 400 });
    }

    const userPlan = await prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: { subscription: true },
    });

    if (!userPlan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }
    if (userPlan.userId !== user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    if (userPlan.status !== "cancelled" && userPlan.subscription?.status !== "cancelled") {
      return NextResponse.json(
        { error: "Reembolso só está disponível para planos cancelados." },
        { status: 400 }
      );
    }
    if (userPlan.refundProcessedAt) {
      return NextResponse.json(
        {
          error: "O reembolso deste plano já foi solicitado.",
          refundAsaasStatus: userPlan.refundAsaasStatus ?? "pending",
        },
        { status: 400 }
      );
    }

    const preview = await buildSubscriptionRefundPreview(userPlanId);
    if (!preview || !preview.refundAvailable) {
      return NextResponse.json(
        {
          error:
            preview?.message ||
            "Não há reembolso disponível: benefícios utilizados cobrem o valor pago.",
          preview,
        },
        { status: 400 }
      );
    }

    const valorReembolsavelArredondado = preview.refundAmount;

    const payment =
      (userPlan.subscription?.rootPaymentId
        ? await prisma.payment.findUnique({ where: { id: userPlan.subscription.rootPaymentId } })
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
      logFinancialFailure({
        paymentId: payment?.id ?? null,
        provider: "asaas",
        motivo: "Pagamento do plano sem asaasId para reembolso",
        status: "failed",
        code: "PLAN_REFUND_PAYMENT_MISSING",
        extra: { userPlanId },
      });
      return NextResponse.json(
        {
          error:
            "Pagamento do plano não encontrado ou sem vínculo com o Asaas. Entre em contato com o suporte.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const reserved = await prisma.userPlan.updateMany({
      where: {
        id: userPlanId,
        userId: user.id,
        refundProcessedAt: null,
      },
      data: {
        refundRequestedAt: now,
        refundProcessedAt: now,
        refundAmount: valorReembolsavelArredondado,
        refundAsaasStatus: "pending",
      },
    });

    if (reserved.count === 0) {
      return NextResponse.json(
        { error: "O reembolso deste plano já foi solicitado.", alreadyProcessed: true },
        { status: 409 }
      );
    }

    let reembolsoJaEmAndamento = false;
    try {
      await refundAsaasPayment(
        payment.asaasId,
        valorReembolsavelArredondado,
        `Reembolso do plano ${userPlan.planName} (benefícios utilizados descontados)`
      );
      logFinancialInfo({
        paymentId: payment.id,
        provider: "asaas",
        providerPaymentId: payment.asaasId,
        motivo: "Reembolso de plano solicitado no gateway",
        status: "pending",
        code: "PLAN_REFUND_REQUESTED",
        extra: {
          userPlanId,
          refundAmount: valorReembolsavelArredondado,
          usedInternalTotal: preview.usedInternalTotal,
          refundAvailable: preview.refundAvailable,
        },
      });
    } catch (err: unknown) {
      const errAny = err as { message?: string; body?: unknown };
      const msg = String(errAny?.message || "").toLowerCase();
      const bodyStr =
        typeof errAny?.body === "string"
          ? errAny.body
          : JSON.stringify(errAny?.body || {});
      if (
        msg.includes("400") ||
        msg.includes("já está em andamento") ||
        msg.includes("already in progress") ||
        (bodyStr.includes("estorno") && bodyStr.includes("em andamento"))
      ) {
        reembolsoJaEmAndamento = true;
      } else {
        await prisma.userPlan.updateMany({
          where: { id: userPlanId, refundAsaasStatus: "pending" },
          data: { refundAsaasStatus: "failed", refundProcessedAt: null },
        });
        logFinancialFailure({
          paymentId: payment.id,
          provider: "asaas",
          providerPaymentId: payment.asaasId,
          motivo: errAny?.message || "Erro ao processar reembolso no Asaas",
          status: "failed",
          code: "PLAN_REFUND_ASAAS_ERROR",
          extra: { userPlanId },
        });
        return NextResponse.json(
          {
            error:
              errAny?.message ||
              "Erro ao processar reembolso no Asaas. Tente novamente ou entre em contato.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      message: reembolsoJaEmAndamento
        ? "O reembolso desta cobrança já estava em andamento no Asaas."
        : "Reembolso solicitado com sucesso. O valor será creditado em até 5 dias úteis.",
      refundAmount: valorReembolsavelArredondado,
      refundAsaasStatus: "pending",
      preview,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    return NextResponse.json({ error: message || "Erro ao solicitar reembolso." }, { status: 500 });
  }
}
