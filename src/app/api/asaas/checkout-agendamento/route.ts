// src/app/api/asaas/checkout-agendamento/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { z } from "zod";
import { AsaasProvider } from "@/app/lib/payment-providers";
import { prisma } from "@/app/lib/prisma";
import { SYMBOLIC_AGENDAMENTO_BRL, canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import {
  countAgendamentoItemLines,
  exigeAgendamentoHora,
  exigeAgendamentoNoCheckout,
  exigeAgendamentoSomenteData,
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
} from "@/app/lib/agendamento-payment-rules";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { getAsaasApiKey } from "@/app/lib/env";
import { calculateServerCheckout } from "@/app/lib/checkout-calculation";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { parseStudioDateTime } from "@/app/lib/calendar-day-state";

const ASAAS_API_KEY = getAsaasApiKey();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const IS_TEST = process.env.NODE_ENV !== "production";

const agendamentoCheckoutSchema = z
  .object({
    servicos: z
      .array(
        z.object({
          id: z.string(),
          nome: z.string().optional(),
          quantidade: z.number().int().min(1).max(20),
          preco: z.number().optional(),
        })
      )
      .optional(),
    beats: z
      .array(
        z.object({
          id: z.string(),
          nome: z.string().optional(),
          quantidade: z.number().int().min(1).max(20),
          preco: z.number().optional(),
        })
      )
      .optional(),
    data: z.string().optional(),
    hora: z.string().optional(),
    duracaoMinutos: z.number().optional(),
    tipo: z.string().optional(),
    observacoes: z.string().optional(),
    paymentMethod: z.enum(["cartao_credito", "cartao_debito", "pix", "boleto"]).optional(),
    cupomCode: z.string().optional(),
    symbolicAgendamento: z.boolean().optional(),
  })
  .superRefine((payload, ctx) => {
    const lines = countAgendamentoItemLines(payload.servicos, payload.beats);
    if (lines === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione ao menos um serviço ou pacote.",
      });
    }
    if (!exigeAgendamentoNoCheckout(payload.servicos, payload.beats)) return;
    if (!payload.data?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione a data do agendamento.",
        path: ["data"],
      });
    }
    if (exigeAgendamentoHora(payload.servicos, payload.beats) && !payload.hora?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o horário do agendamento.",
        path: ["hora"],
      });
    }
  });

export async function POST(req: Request) {
  try {
    // 🔒 Verificar autenticação
    const user = await requireAuth();
    const goLiveBlocked = goLiveBlockIfNeeded(user.role);
    if (goLiveBlocked) return goLiveBlocked;

    // Debug: Verificar se a variável está sendo lida
    console.log("[Asaas Checkout Agendamento] Verificando ASAAS_API_KEY...");
    console.log("[Asaas Checkout Agendamento] ASAAS_API_KEY existe:", !!ASAAS_API_KEY);

    if (!ASAAS_API_KEY) {
      console.error("[Asaas Checkout Agendamento] ASAAS_API_KEY não configurado.");
      return NextResponse.json(
        { error: "Configuração de pagamento ausente no servidor. Reinicie o servidor após configurar ASAAS_API_KEY no .env" },
        { status: 500 }
      );
    }

    const body = await req.json();
    
    // ✅ Validar entrada
    const validation = agendamentoCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    let { servicos, beats, data, hora, duracaoMinutos, tipo, observacoes, paymentMethod, cupomCode, symbolicAgendamento } =
      validation.data;
    const userName = user.nomeArtistico;

    if (symbolicAgendamento) {
      if (!canUseSymbolicSimulation(user)) {
        return NextResponse.json(
          { error: "Acesso negado. Apenas administradores podem usar checkout simbólico de agendamento." },
          { status: 403 }
        );
      }
    }

    let calculation;
    try {
      calculation = await calculateServerCheckout({
        userId: user.id,
        services: servicos,
        beats,
        couponCode: cupomCode,
        allowTestCoupon: Boolean(symbolicAgendamento && canUseSymbolicSimulation(user)),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          error: message.startsWith("CUPOM_INVALIDO:")
            ? message.slice("CUPOM_INVALIDO:".length)
            : "Serviço ou quantidade inválida.",
        },
        { status: 400 }
      );
    }
    servicos = calculation.services;
    beats = calculation.beats;
    const total = calculation.total;
    if (total <= 0 && !symbolicAgendamento) {
      return NextResponse.json(
        { error: "Use o fluxo de resgate para concluir um agendamento sem cobrança." },
        { status: 400 }
      );
    }
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

    const requerHora = exigeAgendamentoHora(servicos || [], beats || []);
    const requerAgenda = exigeAgendamentoNoCheckout(servicos || [], beats || []);
    const somenteData = exigeAgendamentoSomenteData(servicos || [], beats || []);
    const duracao = duracaoMinutos || 60;
    const horaEfetiva =
      hora?.trim() || (somenteData && data?.trim() ? PRODUCTION_SCHEDULE_DEFAULT_HOUR : undefined);

    if (requerHora && data?.trim() && horaEfetiva) {
      const dataHoraISO = parseStudioDateTime(data, horaEfetiva);
      const conflito = await prisma.appointment.findFirst({
        where: {
          ...appointmentCalendarOccupancyFilter,
          AND: [
            { data: { lt: new Date(dataHoraISO.getTime() + duracao * 60000) } },
            { data: { gte: new Date(dataHoraISO.getTime() - duracao * 60000) } },
          ],
        },
        select: { id: true },
      });

      if (conflito) {
        return NextResponse.json(
          { error: "Já existe um agendamento neste horário." },
          { status: 409 }
        );
      }
    }

    console.log("[Asaas] Dados do agendamento preparados para criação após pagamento");

    // Criar provedor Asaas
    const provider = new AsaasProvider(ASAAS_API_KEY, IS_TEST);

    // Preparar descrição do agendamento
    const descricaoItens: string[] = [];
    if (servicos && servicos.length > 0) {
      servicos.forEach(s => {
        descricaoItens.push(`${s.nome} (${s.quantidade}x)`);
      });
    }
    if (beats && beats.length > 0) {
      beats.forEach(b => {
        descricaoItens.push(`${b.nome} (${b.quantidade}x)`);
      });
    }
    
    const agendaLabel = requerAgenda
      ? data?.trim() && horaEfetiva
        ? `${data} ${requerHora ? horaEfetiva : "(entrega desejada)"}`
        : "agendar"
      : "cupons (agendar depois)";
    const descricao = `Agendamento THouse Rec - ${agendaLabel}${descricaoItens.length > 0 ? ` - ${descricaoItens.join(", ")}` : ""}`;

    const valorCobradoAsaas = symbolicAgendamento ? SYMBOLIC_AGENDAMENTO_BRL : Number(total.toFixed(2));

    // Preparar itens para o checkout
    const items = [
      {
        id: "agendamento",
        title: descricao,
        quantity: 1,
        unit_price: valorCobradoAsaas,
        currency_id: "BRL",
      },
    ];

    console.log("[Asaas] Criando checkout para agendamento:", {
      data,
      hora: horaEfetiva,
      totalCatalogo: total,
      valorCobradoAsaas,
      symbolicAgendamento: !!symbolicAgendamento,
      userEmail,
    });

    // Salvar metadata em PaymentMetadata para o webhook encontrar após o pagamento (linkagem Asaas)
    const metadataCompleto: Record<string, unknown> = {
      tipo: "agendamento",
      userId: user.id,
      ...(data?.trim() && horaEfetiva ? { data, hora: horaEfetiva } : {}),
      duracaoMinutos: duracaoMinutos || 60,
      tipoAgendamento: tipo || "sessao",
      observacoes: observacoes || "",
      servicos: servicos || [],
      beats: beats || [],
      total: total.toString(),
      chargedAmount: valorCobradoAsaas.toString(),
      paymentMethod: paymentMethod || null,
      cupomCode: cupomCode || undefined,
    };
    if (symbolicAgendamento) {
      metadataCompleto.symbolicAgendamento = true;
    }
    const expiresAtAg = new Date();
    expiresAtAg.setHours(expiresAtAg.getHours() + 24);

    const paymentMetadataRow = await prisma.paymentMetadata.create({
      data: {
        userId: user.id,
        metadata: JSON.stringify(metadataCompleto),
        expiresAt: expiresAtAg,
      },
    });

    const backSuccess = symbolicAgendamento
      ? `${SITE_URL}/pagamentos/sucesso?teste=true&tipo=agendamento&operationId=${encodeURIComponent(paymentMetadataRow.id)}`
      : `${SITE_URL}/pagamentos/sucesso?tipo=agendamento&operationId=${encodeURIComponent(paymentMetadataRow.id)}`;
    const backFailure = symbolicAgendamento
      ? `${SITE_URL}/pagamentos/falha?teste=true`
      : `${SITE_URL}/pagamentos/falha`;
    const backPending = symbolicAgendamento
      ? `${SITE_URL}/pagamentos/pendente?teste=true`
      : `${SITE_URL}/pagamentos/pendente`;

    // Criar checkout com identificador único da operação.
    const checkoutResponse = await provider.createCheckout({
      items,
      payer: {
        name: userName,
        email: userEmail,
        cpf: cpfLimpo,
      },
      paymentMethod: paymentMethod || undefined, // Passar método de pagamento escolhido
      metadata: {
        operationId: paymentMetadataRow.id,
      },
      backUrls: {
        success: backSuccess,
        failure: backFailure,
        pending: backPending,
      },
    });

    const asaasPaymentId = (checkoutResponse as { preferenceId?: string }).preferenceId;
    if (asaasPaymentId && paymentMetadataRow?.id) {
      try {
        await prisma.paymentMetadata.update({
          where: { id: paymentMetadataRow.id },
          data: { asaasId: asaasPaymentId },
        });
        console.log("[Asaas Checkout Agendamento] PaymentMetadata.asaasId atualizado:", asaasPaymentId);
      } catch (e) {
        console.warn("[Asaas Checkout Agendamento] Erro ao atualizar PaymentMetadata.asaasId:", e);
      }
    }

    console.log("[Asaas] Checkout criado com sucesso:", checkoutResponse.initPoint);
    
    return NextResponse.json({ 
      initPoint: checkoutResponse.initPoint,
      provider: "asaas",
      symbolicAgendamento: !!symbolicAgendamento,
    });
  } catch (err: any) {
    console.error("[Asaas] Erro ao criar checkout de agendamento:", err);
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
