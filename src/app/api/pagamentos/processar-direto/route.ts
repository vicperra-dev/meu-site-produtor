// src/app/api/pagamentos/processar-direto/route.ts
// Rota para processar pagamento diretamente - apenas admin ou com chave secreta
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAsaasApiKey } from "@/app/lib/env";
import { getSessionUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    // Proteção: admin logado OU secretKey válida no body
    const sessionUser = await getSessionUser();
    const isAdmin = sessionUser && sessionUser.role === "ADMIN";

    let body;
    try {
      body = await req.json();
    } catch (jsonError: any) {
      console.error("[Processar Direto] Erro ao parsear body da requisição:", jsonError);
      return NextResponse.json(
        { 
          error: "Erro ao processar requisição", 
          details: jsonError.message,
          hint: "Verifique se o body está em formato JSON válido"
        },
        { status: 400 }
      );
    }
    
    const { numeroFatura, valor, descricao, secretKey } = body;

    // Verificar acesso: admin logado OU secretKey válida
    const expectedSecret = process.env.PAYMENT_PROCESS_SECRET;
    const hasValidSecret = expectedSecret && secretKey === expectedSecret;
    if (!isAdmin && !hasValidSecret) {
      return NextResponse.json(
        { error: "Acesso negado. Faça login como admin ou informe a chave secreta." },
        { status: 403 }
      );
    }

    if (!numeroFatura && !valor) {
      return NextResponse.json(
        { error: "Número da fatura ou valor é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[Processar Direto] Buscando pagamento:", { numeroFatura, valor, descricao });

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
    
    console.log("[Processar Direto] API URL:", apiUrl);
    console.log("[Processar Direto] Is Production:", isProduction);

    // Buscar pagamentos recentes confirmados
    // Construir URL de forma mais simples primeiro
    let url = `${apiUrl}/payments?limit=100&status=RECEIVED,CONFIRMED`;
    
    if (valor) {
      url += `&value=${valor}`;
    }
    
    // Buscar dos últimos 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];
    url += `&dateCreated[ge]=${dateStr}`;

    console.log("[Processar Direto] URL da requisição:", url);

    const listResponse = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
      },
    });

    const statusCode = listResponse.status;
    const contentType = listResponse.headers.get("content-type") || "";
    
    // Ler resposta como texto primeiro
    const responseText = await listResponse.text();
    
    console.log("[Processar Direto] Status code:", statusCode);
    console.log("[Processar Direto] Content-Type:", contentType);
    console.log("[Processar Direto] Resposta do Asaas (primeiros 500 chars):", responseText.substring(0, 500));
    
    if (!listResponse.ok) {
      console.error("[Processar Direto] Erro ao buscar pagamentos:", {
        status: statusCode,
        error: responseText,
        url: url,
      });
      return NextResponse.json(
        { 
          error: "Erro ao buscar pagamentos no Asaas", 
          details: responseText.substring(0, 500),
          statusCode: statusCode,
          apiUrl: apiUrl,
          url: url,
        },
        { status: 500 }
      );
    }
    
    let paymentsData;
    try {
      paymentsData = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error("[Processar Direto] Erro ao parsear JSON:", parseError);
      console.error("[Processar Direto] Resposta completa (primeiros 1000 chars):", responseText.substring(0, 1000));
      return NextResponse.json(
        { 
          error: "Erro ao processar resposta do Asaas", 
          details: parseError.message,
          responsePreview: responseText.substring(0, 1000),
          responseLength: responseText.length,
          contentType: contentType,
          statusCode: statusCode,
          url: url,
          firstChars: responseText.substring(0, 100),
        },
        { status: 500 }
      );
    }
    
    const payments = paymentsData.data || [];

    console.log(`[Processar Direto] Encontrados ${payments.length} pagamentos`);

    // Filtrar pagamento que corresponde aos critérios
    let paymentToProcess: any = null;
    
    for (const payment of payments) {
      // Verificar se já foi processado
      const existing = await prisma.payment.findFirst({
        where: { asaasId: payment.id },
      });
      
      if (existing) {
        console.log(`[Processar Direto] Pagamento ${payment.id} já foi processado`);
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
        console.log(`[Processar Direto] Pagamento encontrado: ${payment.id}`);
        break;
      }
    }

    if (!paymentToProcess) {
      return NextResponse.json({
        success: false,
        message: "Nenhum pagamento não processado encontrado com os critérios fornecidos",
        totalEncontrados: payments.length,
        criterios: { numeroFatura, valor, descricao },
        pagamentosEncontrados: payments.map((p: any) => ({
          id: p.id,
          value: p.value,
          description: p.description,
          invoiceNumber: p.invoiceNumber,
          status: p.status,
        })),
      });
    }

    console.log("[Processar Direto] Processando pagamento:", paymentToProcess.id);

    // Processar o pagamento diretamente sem chamar via HTTP
    // Isso evita problemas de parse de JSON
    console.log("[Processar Direto] Processando pagamento diretamente (sem HTTP)");
    
    try {
      const { processPaymentWebhook } = await import("@/app/lib/process-payment-webhook");
      
      const webhookBody = {
        event: "PAYMENT_RECEIVED",
        payment: paymentToProcess,
      };
      
      const webhookResult = await processPaymentWebhook(webhookBody);
      console.log("[Processar Direto] Webhook processado:", webhookResult);
      
      // Aguardar um pouco para garantir que tudo foi salvo
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (webhookError: any) {
      console.error("[Processar Direto] Erro ao processar webhook:", webhookError);
      console.error("[Processar Direto] Stack:", webhookError.stack);
    }
    
    // Verificar se o pagamento foi criado no banco após processar
    const paymentInDb = await prisma.payment.findFirst({
      where: { asaasId: paymentToProcess.id },
    });
    
    console.log("[Processar Direto] PaymentInDb encontrado:", !!paymentInDb);
    
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
      console.log("[Processar Direto] UserPlan encontrado:", !!userPlan, userPlan ? userPlan.id : null);
    } else {
      console.warn("[Processar Direto] userId não encontrado no externalReference");
    }
    
    const webhookResult = {
      processed: true,
      paymentCreated: !!paymentInDb,
      planCreated: !!userPlan,
      userId: userId,
      paymentId: paymentToProcess.id,
    };

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
      paymentInDb: paymentInDb ? {
        id: paymentInDb.id,
        status: paymentInDb.status,
        type: paymentInDb.type,
      } : null,
      webhookResult: webhookResult,
      userPlan: userPlan ? {
        id: userPlan.id,
        planId: userPlan.planId,
        planName: userPlan.planName,
        status: userPlan.status,
        modo: userPlan.modo,
      } : null,
    });

  } catch (error: any) {
    console.error("[Processar Direto] Erro:", error);
    console.error("[Processar Direto] Stack:", error.stack);
    
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
