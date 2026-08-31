import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { getAsaasApiKey } from "@/app/lib/env";
import { listAsaasPaymentsReceived } from "@/app/lib/asaas-list-payments";
import { processPaymentWebhook } from "@/app/lib/process-payment-webhook";

/**
 * Processa o último pagamento de plano do usuário (quando o webhook não foi chamado, ex.: localhost).
 * Chamado pela página de sucesso quando tipo=plano.
 */
export async function POST() {
  try {
    const user = await requireAuth();
    const userId = user.id;

    const existing = await prisma.payment.findFirst({
      where: { userId, type: "plano", status: "approved" },
      orderBy: { createdAt: "desc" },
    });
    const lastUserPlan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (existing && lastUserPlan && existing.createdAt <= lastUserPlan.createdAt) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        userPlan: {
          id: lastUserPlan.id,
          planId: lastUserPlan.planId,
          planName: lastUserPlan.planName,
          status: lastUserPlan.status,
        },
      });
    }

    const rawList = await listAsaasPaymentsReceived(userId, 10);
    const list = [...rawList].sort(
      (a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );
    const apiKey = getAsaasApiKey();
    const isProduction = apiKey?.startsWith("$aact_prod_");
    const apiUrl = isProduction ? "https://www.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";

    for (const item of list) {
      const alreadyInDb = await prisma.payment.findFirst({
        where: { userId, asaasId: item.id },
      });
      const existingPlan = await prisma.userPlan.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      // Pagamento já no banco e usuário já tem plano: nada a fazer
      if (alreadyInDb && existingPlan) {
        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          userPlan: { id: existingPlan.id, planId: existingPlan.planId, planName: existingPlan.planName, status: existingPlan.status },
        });
      }

      const isPlano = (item.description || "").toLowerCase().includes("plano");
      if (!isPlano) continue;

      const fullRes = await fetch(`${apiUrl}/payments/${item.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", access_token: apiKey! },
      });
      if (!fullRes.ok) continue;
      const fullPayment = await fullRes.json();

      // Sempre processar: se pagamento já existir, o webhook cria só o plano/cupons
      const result = await processPaymentWebhook({
        event: "PAYMENT_RECEIVED",
        payment: fullPayment,
      });

      if (result && (result as any).userPlan) {
        return NextResponse.json({
          success: true,
          userPlan: (result as any).userPlan,
        });
      }
      const plan = await prisma.userPlan.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (plan) {
        return NextResponse.json({
          success: true,
          userPlan: { id: plan.id, planId: plan.planId, planName: plan.planName, status: plan.status },
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: "Nenhum pagamento de plano pendente encontrado para processar.",
    });
  } catch (err: any) {
    if (err.message === "Não autenticado" || err.message === "Acesso negado") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("[Processar Plano] Erro:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao processar pagamento do plano." },
      { status: 500 }
    );
  }
}
