// src/app/api/pagamentos/buscar-por-fatura/route.ts
// Buscar pagamento pelo número da fatura do Asaas
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
    const { numeroFatura, valor, descricao } = body;

    if (!numeroFatura && !valor) {
      return NextResponse.json(
        { error: "Número da fatura ou valor é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[Buscar por Fatura] Buscando pagamento:", { numeroFatura, valor, descricao });

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

    // Buscar pagamentos recentes confirmados
    const filters: string[] = [];
    filters.push("status=RECEIVED,CONFIRMED");
    filters.push("limit=100");
    
    if (valor) {
      filters.push(`value=${valor}`);
    }
    
    // Buscar dos últimos 7 dias
    const dateFilter = `dateCreated[ge]=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;
    filters.push(dateFilter);

    const listResponse = await fetch(
      `${apiUrl}/payments?${filters.join('&')}`,
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
      console.error("[Buscar por Fatura] Erro ao buscar pagamentos:", errorText);
      return NextResponse.json(
        { error: "Erro ao buscar pagamentos no Asaas", details: errorText },
        { status: 500 }
      );
    }

    const paymentsData = await listResponse.json();
    const payments = paymentsData.data || [];

    console.log(`[Buscar por Fatura] Encontrados ${payments.length} pagamentos`);

    // Filtrar pagamento que corresponde aos critérios
    let paymentToProcess: any = null;
    
    for (const payment of payments) {
      // Verificar se já foi processado
      const existing = await prisma.payment.findFirst({
        where: { asaasId: payment.id },
      });
      
      if (existing) {
        continue; // Já foi processado, pular
      }
      
      // Verificar se corresponde aos critérios
      let matches = true;
      
      if (numeroFatura && payment.invoiceNumber !== numeroFatura.toString()) {
        matches = false;
      }
      
      if (valor && Math.abs(payment.value - parseFloat(valor.toString())) > 0.01) {
        matches = false;
      }
      
      if (descricao && !payment.description?.includes(descricao)) {
        matches = false;
      }
      
      if (matches && (payment.status === "RECEIVED" || payment.status === "CONFIRMED")) {
        paymentToProcess = payment;
        break;
      }
    }

    if (!paymentToProcess) {
      return NextResponse.json({
        success: false,
        message: "Nenhum pagamento não processado encontrado com os critérios fornecidos",
        totalEncontrados: payments.length,
        criterios: { numeroFatura, valor, descricao },
      });
    }

    console.log("[Buscar por Fatura] Pagamento encontrado:", paymentToProcess.id);

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
      payment: {
        id: paymentToProcess.id,
        value: paymentToProcess.value,
        status: paymentToProcess.status,
        description: paymentToProcess.description,
        invoiceNumber: paymentToProcess.invoiceNumber,
        externalReference: paymentToProcess.externalReference,
      },
      webhookResult: webhookResult,
      userPlan: userPlan,
    });

  } catch (error: any) {
    console.error("[Buscar por Fatura] Erro:", error);
    console.error("[Buscar por Fatura] Stack:", error.stack);
    
    return NextResponse.json(
      { 
        error: "Erro ao buscar e processar pagamento", 
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
