import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAsaasApiKey } from "@/app/lib/env";
import { processPaymentWebhook } from "@/app/lib/process-payment-webhook";
import { requireAdmin } from "@/app/lib/auth";

// Endpoint para processar o último pagamento não processado (apenas admin)
export async function POST() {
  try {
    await requireAdmin();

    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "API key não configurada" }, { status: 500 });
    }

    const isProduction = apiKey.startsWith("$aact_prod_");
    const apiUrl = isProduction
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    // Buscar últimos pagamentos recebidos/confirmados
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];
    const url = `${apiUrl}/payments?limit=10&status=RECEIVED,CONFIRMED&dateCreated[ge]=${dateStr}`;

    console.log("[Debug Processar Último] Buscando pagamentos:", url);

    const listResponse = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
      },
    });

    const responseText = await listResponse.text();
    
    if (!listResponse.ok) {
      console.error("[Debug Processar Último] Erro ao buscar pagamentos:", responseText);
      return NextResponse.json(
        { error: "Erro ao buscar pagamentos no Asaas", details: responseText.substring(0, 500) },
        { status: 500 }
      );
    }

    let paymentsData;
    try {
      paymentsData = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error("[Debug Processar Último] Erro ao parsear JSON:", parseError);
      return NextResponse.json(
        { error: "Erro ao processar resposta do Asaas", details: parseError.message },
        { status: 500 }
      );
    }

    const payments = paymentsData.data || [];
    console.log(`[Debug Processar Último] Encontrados ${payments.length} pagamentos`);

    // Encontrar o primeiro pagamento não processado
    let paymentToProcess: any = null;
    
    for (const payment of payments) {
      if (payment.status !== "RECEIVED" && payment.status !== "CONFIRMED") {
        continue;
      }

      const existing = await prisma.payment.findFirst({
        where: { asaasId: payment.id },
      });
      
      if (!existing) {
        paymentToProcess = payment;
        console.log(`[Debug Processar Último] Pagamento não processado encontrado: ${payment.id}`);
        break;
      }
    }

    if (!paymentToProcess) {
      return NextResponse.json({
        success: false,
        message: "Nenhum pagamento não processado encontrado",
        totalEncontrados: payments.length,
        pagamentos: payments.map((p: any) => ({
          id: p.id,
          value: p.value,
          description: p.description,
          status: p.status,
          externalReference: p.externalReference,
          dateCreated: p.dateCreated,
        })),
      });
    }

    console.log("[Debug Processar Último] Processando pagamento:", paymentToProcess.id);

    // Processar webhook diretamente
    let webhookResult: any = { processed: false };
    try {
      webhookResult = await processPaymentWebhook({
        event: "PAYMENT_RECEIVED",
        payment: paymentToProcess,
      });
      console.log("[Debug Processar Último] Webhook processado com sucesso");
    } catch (webhookError: any) {
      console.error("[Debug Processar Último] Erro ao processar webhook:", webhookError);
      webhookResult = { 
        processed: false, 
        error: webhookError.message,
        stack: webhookError.stack,
      };
    }
    
    // Aguardar um pouco para garantir que as operações de banco foram concluídas
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar se foi criado
    const paymentInDb = await prisma.payment.findFirst({
      where: { asaasId: paymentToProcess.id },
    });
    
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
      message: "Pagamento processado",
      payment: {
        id: paymentToProcess.id,
        value: paymentToProcess.value,
        status: paymentToProcess.status,
        description: paymentToProcess.description,
        externalReference: paymentToProcess.externalReference,
        dateCreated: paymentToProcess.dateCreated,
      },
      paymentInDb: paymentInDb ? {
        id: paymentInDb.id,
        status: paymentInDb.status,
        type: paymentInDb.type,
      } : null,
      userPlan: userPlan ? {
        id: userPlan.id,
        planId: userPlan.planId,
        planName: userPlan.planName,
        status: userPlan.status,
        modo: userPlan.modo,
        userId: userPlan.userId,
      } : null,
      webhookResult: webhookResult,
    });

  } catch (error: any) {
    console.error("[Debug Processar Último] Erro:", error);
    return NextResponse.json(
      { 
        error: "Erro ao processar pagamento", 
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
