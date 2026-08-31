// src/app/api/pagamentos/buscar-por-valor/route.ts
// Rota alternativa para buscar pagamento por valor e processar
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getAsaasApiKey } from "@/app/lib/env";

export async function POST(req: Request) {
  try {
    // Apenas admin pode processar manualmente
    let user;
    try {
      user = await requireAuth();
    } catch (authError: any) {
      console.error("[Buscar por Valor] Erro de autenticação:", authError);
      return NextResponse.json(
        { 
          error: "Erro de autenticação", 
          details: authError.message,
          hint: "Certifique-se de estar logado no sistema"
        },
        { status: 401 }
      );
    }
    
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem processar pagamentos manualmente." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { valor, dataInicio } = body; // valor em reais (ex: 5.00)

    if (!valor) {
      return NextResponse.json(
        { error: "Valor do pagamento é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[Buscar por Valor] Buscando pagamento de R$", valor);

    // Buscar pagamento no Asaas
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      console.error("[Buscar por Valor] API key não configurada");
      return NextResponse.json(
        { 
          error: "API key não configurada",
          hint: "Verifique se ASAAS_API_KEY está configurado no arquivo .env"
        },
        { status: 500 }
      );
    }
    
    console.log("[Buscar por Valor] API key encontrada, tipo:", apiKey.startsWith("$aact_prod_") ? "produção" : "sandbox");

    const isProduction = apiKey.startsWith("$aact_prod_");
    const apiUrl = isProduction
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    // Buscar pagamentos recentes confirmados
    const dateFilter = dataInicio 
      ? `&dateCreated[ge]=${dataInicio}` 
      : `&dateCreated[ge]=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`; // Últimos 7 dias

    const listResponse = await fetch(
      `${apiUrl}/payments?limit=100&status=RECEIVED,CONFIRMED&value=${valor}${dateFilter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "access_token": apiKey,
        },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("[Buscar por Valor] Erro ao buscar pagamentos:", errorText);
      return NextResponse.json(
        { error: "Erro ao buscar pagamentos no Asaas", details: errorText },
        { status: 500 }
      );
    }

    const paymentsData = await listResponse.json();
    const payments = paymentsData.data || [];

    console.log(`[Buscar por Valor] Encontrados ${payments.length} pagamentos de R$ ${valor}`);

    // Filtrar pagamentos que ainda não foram processados
    const unprocessedPayments = [];
    for (const payment of payments) {
      const existing = await prisma.payment.findFirst({
        where: { asaasId: payment.id },
      });
      if (!existing && (payment.status === "RECEIVED" || payment.status === "CONFIRMED")) {
        unprocessedPayments.push(payment);
      }
    }

    if (unprocessedPayments.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Nenhum pagamento de R$ ${valor} não processado encontrado`,
        totalEncontrados: payments.length,
      });
    }

    // Processar o primeiro pagamento não processado
    const paymentToProcess = unprocessedPayments[0];
    console.log("[Buscar por Valor] Processando pagamento:", paymentToProcess.id);

    // Chamar o webhook internamente
    const webhookBody = {
      event: "PAYMENT_RECEIVED",
      payment: paymentToProcess,
    };

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
    const userId = paymentToProcess.externalReference;
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
      message: "Pagamento processado com sucesso",
      payment: paymentToProcess,
      webhookResult: webhookResult,
      userPlan: userPlan,
      totalEncontrados: payments.length,
      totalNaoProcessados: unprocessedPayments.length,
    });

  } catch (error: any) {
    console.error("[Buscar por Valor] Erro:", error);
    console.error("[Buscar por Valor] Stack:", error.stack);
    console.error("[Buscar por Valor] Tipo do erro:", error.constructor.name);
    
    // Retornar erro mais detalhado
    const errorResponse: any = {
      error: "Erro ao buscar e processar pagamento",
      details: error.message,
    };
    
    if (process.env.NODE_ENV === "development") {
      errorResponse.stack = error.stack;
      errorResponse.errorType = error.constructor.name;
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
