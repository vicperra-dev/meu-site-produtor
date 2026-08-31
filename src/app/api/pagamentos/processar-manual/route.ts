// src/app/api/pagamentos/processar-manual/route.ts
// Rota para processar manualmente pagamentos que não foram processados pelo webhook
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getAsaasApiKey } from "@/app/lib/env";

export async function POST(req: Request) {
  try {
    // Apenas admin pode processar manualmente
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem processar pagamentos manualmente." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "ID do pagamento é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[Processar Manual] Processando pagamento:", paymentId);

    // Verificar se já foi processado
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { asaasId: paymentId },
          { mercadopagoId: paymentId },
        ],
      },
    });

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        message: "Pagamento já foi processado",
        payment: existingPayment,
      });
    }

    // Buscar pagamento no Asaas
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key não configurada" },
        { status: 500 }
      );
    }

    const isProduction = apiKey.startsWith("$aact_prod_");
    const apiUrl = isProduction
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    // Tentar buscar pelo ID fornecido
    let response = await fetch(`${apiUrl}/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
      },
    });

    // Se não encontrou, pode ser que seja um ID de transação Pix
    // Tentar buscar na lista de pagamentos usando externalReference ou transactionReceiptUrl
    if (!response.ok) {
      console.log("[Processar Manual] ID não encontrado diretamente, tentando buscar na lista...");
      
      // Buscar pagamentos recentes e procurar pelo ID na transactionReceiptUrl ou externalReference
      const listResponse = await fetch(`${apiUrl}/payments?limit=100&status=RECEIVED,CONFIRMED`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "access_token": apiKey,
        },
      });
      
      if (listResponse.ok) {
        const paymentsList = await listResponse.json();
        const foundPayment = paymentsList.data?.find((p: any) => 
          p.transactionReceiptUrl?.includes(paymentId) ||
          p.id === paymentId ||
          p.externalReference === paymentId
        );
        
        if (foundPayment) {
          console.log("[Processar Manual] Pagamento encontrado na lista:", foundPayment.id);
          response = { ok: true, json: async () => foundPayment } as Response;
        } else {
          const errorText = await response.text();
          console.error("[Processar Manual] Erro ao buscar pagamento no Asaas:", errorText);
          return NextResponse.json(
            { 
              error: "Pagamento não encontrado no Asaas", 
              details: errorText,
              hint: "Verifique se o ID está correto. O ID deve ser o 'pay_xxxxx' do Asaas, não o ID da transação Pix."
            },
            { status: 404 }
          );
        }
      } else {
        const errorText = await response.text();
        console.error("[Processar Manual] Erro ao buscar pagamento no Asaas:", errorText);
        return NextResponse.json(
          { 
            error: "Pagamento não encontrado no Asaas", 
            details: errorText,
            hint: "Verifique se o ID está correto. O ID deve ser o 'pay_xxxxx' do Asaas, não o ID da transação Pix."
          },
          { status: 404 }
        );
      }
    }

    const payment = await response.json();
    console.log("[Processar Manual] Pagamento encontrado no Asaas:", JSON.stringify(payment, null, 2));

    // Verificar se o pagamento está confirmado
    if (payment.status !== "RECEIVED" && payment.status !== "CONFIRMED") {
      return NextResponse.json({
        success: false,
        message: `Pagamento não está confirmado. Status atual: ${payment.status}`,
        payment,
      });
    }

    // Simular webhook chamando a mesma lógica
    // Importar e chamar a função de processamento do webhook
    const webhookBody = {
      event: "PAYMENT_RECEIVED",
      payment: payment,
    };

    // Chamar o webhook internamente
    const webhookHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const whToken = process.env.ASAAS_WEBHOOK_ACCESS_TOKEN;
    if (whToken) {
      webhookHeaders["asaas-access-token"] = whToken;
    }

    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/webhooks/asaas`, {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify(webhookBody),
    });

    const webhookResult = await webhookResponse.json();

    // Verificar se o plano foi criado
    const userId = payment.externalReference;
    let userPlan = null;
    if (userId) {
      userPlan = await prisma.userPlan.findFirst({
        where: {
          userId: userId,
          status: { in: ["active", "pending"] },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento processado manualmente",
      payment: payment,
      webhookResult: webhookResult,
      userPlan: userPlan,
    });

  } catch (error: any) {
    console.error("[Processar Manual] Erro:", error);
    console.error("[Processar Manual] Stack:", error.stack);
    return NextResponse.json(
      { 
        error: "Erro ao processar pagamento manualmente", 
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
