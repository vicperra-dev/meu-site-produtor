// src/app/api/test-payment/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { AsaasProvider, InfinityPayProvider } from "@/app/lib/payment-providers";
import { prisma } from "@/app/lib/prisma";

import { getAsaasApiKey, getEnv } from "@/app/lib/env";
import { SYMBOLIC_AGENDAMENTO_BRL, canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";

const ASAAS_API_KEY = getAsaasApiKey();
const INFINITYPAY_API_KEY = getEnv('INFINITYPAY_API_KEY');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const IS_TEST = process.env.NODE_ENV !== "production";

export async function POST(req: Request) {
  try {
    // 🔒 Verificar autenticação e se é admin
    const user = await requireAuth();
    
    // Apenas admin pode usar pagamento de teste
    if (!canUseSymbolicSimulation(user)) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem usar pagamento de teste." },
        { status: 403 }
      );
    }

    // Detectar qual provedor usar (prioridade: Asaas > Infinity Pay)
    let provider: AsaasProvider | InfinityPayProvider;
    let providerName: string;

    if (ASAAS_API_KEY) {
      provider = new AsaasProvider(ASAAS_API_KEY, IS_TEST);
      providerName = "asaas";
      console.log("[Test Payment] Usando Asaas como provedor");
    } else if (INFINITYPAY_API_KEY) {
      provider = new InfinityPayProvider(INFINITYPAY_API_KEY, IS_TEST);
      providerName = "infinitypay";
      console.log("[Test Payment] Usando Infinity Pay como provedor");
    } else {
      console.error("[Test Payment] Nenhum provedor de pagamento configurado (ASAAS_API_KEY ou INFINITYPAY_API_KEY).");
      console.error("[Test Payment] Variáveis de ambiente disponíveis:", Object.keys(process.env).filter(k => k.includes('ASAAS') || k.includes('INFINITY')));
      return NextResponse.json(
        { error: "Configuração de pagamento ausente no servidor. Reinicie o servidor após configurar ASAAS_API_KEY no .env" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { tipo } = body;

    if (tipo === "agendamento") {
      return NextResponse.json(
        {
          error:
            "Pagamento simbólico de agendamento usa o mesmo checkout do fluxo real. Chame POST /api/asaas/checkout-agendamento com symbolicAgendamento: true e o mesmo corpo (data, hora, servicos, beats, total, etc.).",
        },
        { status: 410 }
      );
    }

    const planId = typeof body.planId === "string" ? body.planId : "teste";
    const modo = body.modo === "anual" ? "anual" : "mensal";

    let metadata: Record<string, unknown> =
      tipo === "plano"
        ? {
            tipo: "plano",
            userId: user.id,
            planId,
            planName: planId === "teste" ? "Plano de Teste" : `Plano ${planId}`,
            modo,
            amount: String(SYMBOLIC_AGENDAMENTO_BRL),
            chargedAmount: String(SYMBOLIC_AGENDAMENTO_BRL),
            symbolicPlano: true,
            isTest: true,
            isTestPayment: true,
            billingDay: new Date().getDate(),
            paymentMethod: "pix",
          }
        : {
            tipo: tipo || "teste",
            userId: user.id,
            isTest: true,
            chargedAmount: SYMBOLIC_AGENDAMENTO_BRL,
          };

    const items = [
      {
        id: tipo === "plano" ? `teste-plano-${planId}` : "teste-pagamento",
        title:
          tipo === "plano"
            ? `Pagamento de Teste - Plano ${planId} - THouse Rec`
            : "Pagamento de Teste - THouse Rec",
        quantity: 1,
        unit_price: SYMBOLIC_AGENDAMENTO_BRL,
      },
    ];

    console.log(`[Test Payment] Criando checkout de teste com ${providerName}...`, {
      userEmail: user.email,
      tipo,
      valor: SYMBOLIC_AGENDAMENTO_BRL,
    });

    // Buscar CPF do usuário (obrigatório para Asaas em produção)
    const userWithCpf = await prisma.user.findUnique({
      where: { id: user.id },
      select: { cpf: true },
    });

    const cpfLimpo = userWithCpf?.cpf?.replace(/\D/g, "");
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: "CPF é obrigatório para gerar pagamento no Asaas. Cadastre seu CPF em Perfil ou Minha Conta e tente novamente." },
        { status: 400 }
      );
    }

    // IMPORTANTE: Asaas limita externalReference a 100 caracteres
    // 1. Salvar metadata completo em PaymentMetadata ANTES de criar checkout
    // 2. Passar apenas userId no externalReference (máximo 36 caracteres)
    // 3. No webhook, buscar metadata usando userId do externalReference
    
    console.log("[Test Payment] Salvando metadata completo em PaymentMetadata...");
    
    // Criar registro de PaymentMetadata com todos os dados
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira em 24 horas
    
    const paymentMetadata = await prisma.paymentMetadata.create({
      data: {
        userId: user.id,
        metadata: JSON.stringify(metadata),
        expiresAt,
      },
    });
    
    console.log("[Test Payment] PaymentMetadata criado:", paymentMetadata.id);
    console.log("[Test Payment] Operação de teste criada:", paymentMetadata.id);

    const checkoutResponse = await provider.createCheckout({
      items,
      payer: {
        name: user.nomeArtistico || user.email,
        email: user.email,
        cpf: cpfLimpo,
      },
      paymentMethod: undefined, // Para teste, deixar usuário escolher (UNDEFINED)
      metadata: {
        operationId: paymentMetadata.id,
      },
      backUrls: {
        success: `${SITE_URL}/pagamentos/sucesso?teste=true&tipo=${tipo === "plano" ? "plano" : "teste"}`,
        failure: `${SITE_URL}/pagamentos/falha?teste=true`,
        pending: `${SITE_URL}/pagamentos/pendente?teste=true`,
      },
    });
    
    // Vincular PaymentMetadata ao ID do pagamento Asaas para o webhook encontrar o metadata correto
    const asaasPaymentId = (checkoutResponse as { preferenceId?: string }).preferenceId;
    if (asaasPaymentId && paymentMetadata?.id) {
      try {
        await prisma.paymentMetadata.update({
          where: { id: paymentMetadata.id },
          data: { asaasId: asaasPaymentId },
        });
        console.log("[Test Payment] PaymentMetadata.asaasId atualizado:", asaasPaymentId);
      } catch (e) {
        console.warn("[Test Payment] Erro ao atualizar PaymentMetadata.asaasId:", e);
      }
    }

    console.log(`[Test Payment] Checkout criado com sucesso (${providerName}):`, checkoutResponse.initPoint);
    
    return NextResponse.json({ 
      initPoint: checkoutResponse.initPoint,
      provider: providerName,
      isTest: true,
    });
  } catch (err: any) {
    console.error("[Test Payment] Erro ao criar checkout:", err);
    
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    // Extrair mensagem de erro mais amigável
    let errorMessage = err?.message || "Erro desconhecido ao criar pagamento de teste";
    let errorCode = 500;
    let errorDetails: any = {};
    
    // Verificar se é erro de permissão do Asaas
    if (errorMessage.includes("insufficient_permission") || errorMessage.includes("PAYMENT:WRITE")) {
      errorCode = 403;
      errorDetails = {
        tipo: "permissao_insuficiente",
        solucao: "Gere um novo token no painel do Asaas com a permissão PAYMENT:WRITE",
        guia: "Consulte o arquivo GUIA_ASAAS.md para instruções detalhadas",
      };
    } else if (errorMessage.includes("invalid_environment")) {
      errorCode = 400;
      errorDetails = {
        tipo: "ambiente_invalido",
        solucao: "Verifique se está usando o token correto (produção ou sandbox)",
      };
    } else if (errorMessage.includes("Token inválido") || errorMessage.includes("401")) {
      errorCode = 401;
      errorDetails = {
        tipo: "token_invalido",
        solucao: "Verifique se o token no arquivo .env está correto",
      };
    }
    
    // Verificar se é erro de domínio não configurado
    if (errorMessage.includes("domínio configurado") || errorMessage.includes("Cadastre um site")) {
      errorCode = 400;
      errorDetails = {
        tipo: "dominio_nao_configurado",
        solucao: "Configure um domínio no painel do Asaas (Minha Conta → Informações → Domínios). Para desenvolvimento, use LocalTunnel ou ngrok.",
        guia: "Consulte o arquivo CONFIGURAR_DOMINIO_ASAAS.md para instruções detalhadas",
      };
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        debug: process.env.NODE_ENV === "development" ? {
          message: err?.message,
          stack: err?.stack,
        } : undefined
      },
      { status: errorCode }
    );
  }
}
