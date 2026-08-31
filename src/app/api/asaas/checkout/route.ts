// src/app/api/asaas/checkout/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { checkoutSchema } from "@/app/lib/validations";
import { AsaasProvider } from "@/app/lib/payment-providers";
import { prisma } from "@/app/lib/prisma";

import { getAsaasApiKey } from "@/app/lib/env";

const ASAAS_API_KEY = getAsaasApiKey();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const IS_TEST = process.env.NODE_ENV !== "production";

import { PLAN_PRICES } from "@/app/lib/plan-prices";
import { findActiveUserPlan, ACTIVE_PLAN_BLOCK_MESSAGE } from "@/app/lib/checkout-active-plan-gate";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";

type ModoPlano = "mensal" | "anual";

export async function POST(req: Request) {
  try {
    // 🔒 Verificar autenticação
    const user = await requireAuth();
    const goLiveBlocked = goLiveBlockIfNeeded(user.role);
    if (goLiveBlocked) return goLiveBlocked;

    // Debug: Verificar se a variável está sendo lida
    console.log("[Asaas Checkout] Verificando ASAAS_API_KEY...");
    console.log("[Asaas Checkout] ASAAS_API_KEY existe:", !!ASAAS_API_KEY);
    console.log("[Asaas Checkout] ASAAS_API_KEY length:", ASAAS_API_KEY?.length || 0);

    if (!ASAAS_API_KEY) {
      console.error("[Asaas Checkout] ASAAS_API_KEY não configurado.");
      console.error("[Asaas Checkout] Variáveis de ambiente disponíveis:", Object.keys(process.env).filter(k => k.includes('ASAAS')));
      return NextResponse.json(
        { error: "Configuração de pagamento ausente no servidor. Reinicie o servidor após configurar ASAAS_API_KEY no .env" },
        { status: 500 }
      );
    }

    const body = await req.json();
    
    // ✅ Validar entrada
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { planId: planoId, modo, paymentMethod } = validation.data;
    const userName = user.nomeArtistico;
    const userEmail = user.email;
    
    // Buscar CPF do usuário (obrigatório para Asaas)
    const userWithCpf = await prisma.user.findUnique({
      where: { id: user.id },
      select: { cpf: true },
    });

    const cpfLimpo = userWithCpf?.cpf?.replace(/\D/g, "");
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: "CPF é obrigatório para pagamentos. Preencha seu CPF na página de pagamentos antes de continuar." },
        { status: 400 }
      );
    }

    const plano = PLAN_PRICES.find((p) => p.id === planoId);
    if (!plano) {
      return NextResponse.json(
        { error: "Plano inválido." },
        { status: 400 }
      );
    }

    const valor = modo === "mensal" ? plano.mensal : plano.anual;

    const planoAtivo = await findActiveUserPlan(user.id);
    if (planoAtivo) {
      return NextResponse.json(
        {
          error: ACTIVE_PLAN_BLOCK_MESSAGE,
          planoAtivo: { id: planoAtivo.id, planName: planoAtivo.planName },
        },
        { status: 409 }
      );
    }

    // 📋 NÃO criar plano antes do pagamento
    // Os dados serão armazenados no metadata e o plano será criado apenas após pagamento confirmado no webhook
    console.log("[Asaas] Dados do plano preparados para criação após pagamento");

    // Criar provedor Asaas
    const provider = new AsaasProvider(ASAAS_API_KEY, IS_TEST);

    // Preparar itens
    const items = [
      {
        id: plano.id,
        title: `${plano.nome} - ${modo === "mensal" ? "Mensal" : "Anual"}`,
        quantity: 1,
        unit_price: Number(valor.toFixed(2)),
        currency_id: "BRL",
      },
    ];

    console.log("[Asaas] Criando checkout para plano:", {
      planoId,
      modo,
      valor,
      userEmail,
    });

    // IMPORTANTE: Asaas limita externalReference a 100 caracteres
    // 1. Salvar metadata completo em PaymentMetadata ANTES de criar checkout
    // 2. Passar apenas userId no externalReference (máximo 36 caracteres)
    // 3. No webhook, buscar metadata usando userId do externalReference
    
    console.log("[Asaas] Salvando metadata completo em PaymentMetadata...");
    
    const metadataCompleto = {
      tipo: "plano",
      userId: user.id,
      planId: planoId,
      planName: plano.nome,
      modo,
      amount: valor.toString(),
      paymentMethod: paymentMethod || "pix",
      billingDay: new Date().getDate(),
    };
    
    // Criar registro de PaymentMetadata com todos os dados
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira em 24 horas
    
    const paymentMetadata = await prisma.paymentMetadata.create({
      data: {
        userId: user.id,
        metadata: JSON.stringify(metadataCompleto),
        expiresAt,
      },
    });
    
    console.log("[Asaas] PaymentMetadata criado:", paymentMetadata.id);
    console.log("[Asaas] Operação de checkout criada:", paymentMetadata.id);

    // Criar checkout
    const checkoutResponse = await provider.createCheckout({
      items,
      payer: {
        name: userName,
        email: userEmail,
        cpf: cpfLimpo,
      },
      paymentMethod: paymentMethod || undefined, // Passar método de pagamento escolhido
      metadata: {
        operationId: paymentMetadata.id,
      },
      backUrls: {
        success: `${SITE_URL}/pagamentos/sucesso?tipo=plano&operationId=${encodeURIComponent(paymentMetadata.id)}`,
        failure: `${SITE_URL}/pagamentos/falha`,
        pending: `${SITE_URL}/pagamentos/pendente`,
      },
    });

    const asaasPaymentId = (checkoutResponse as { preferenceId?: string }).preferenceId;
    if (asaasPaymentId && paymentMetadata?.id) {
      try {
        await prisma.paymentMetadata.update({
          where: { id: paymentMetadata.id },
          data: { asaasId: asaasPaymentId },
        });
        console.log("[Asaas Checkout] PaymentMetadata.asaasId atualizado:", asaasPaymentId);
      } catch (e) {
        console.warn("[Asaas Checkout] Erro ao atualizar PaymentMetadata.asaasId:", e);
      }
    }

    console.log("[Asaas] Checkout criado com sucesso:", checkoutResponse.initPoint);
    
    return NextResponse.json({ 
      initPoint: checkoutResponse.initPoint,
      provider: "asaas",
    });
  } catch (err: any) {
    console.error("[Asaas] Erro ao criar checkout:", err);
    console.error("[Asaas] Tipo do erro:", err?.constructor?.name);
    console.error("[Asaas] Mensagem do erro:", err?.message);
    
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const errorMessage = err?.message || "Erro desconhecido ao criar pagamento";
    return NextResponse.json(
      { 
        error: errorMessage,
        debug: process.env.NODE_ENV === "development" ? {
          message: err?.message,
          stack: err?.stack,
        } : undefined
      },
      { status: 500 }
    );
  }
}
