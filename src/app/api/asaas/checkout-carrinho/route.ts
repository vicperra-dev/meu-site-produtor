// src/app/api/asaas/checkout-carrinho/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { z } from "zod";
import { AsaasProvider } from "@/app/lib/payment-providers";
import { prisma } from "@/app/lib/prisma";
import { getAsaasApiKey } from "@/app/lib/env";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { calculateServerCheckout } from "@/app/lib/checkout-calculation";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { parseStudioDateTime } from "@/app/lib/calendar-day-state";

const ASAAS_API_KEY = getAsaasApiKey();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const IS_TEST = process.env.NODE_ENV !== "production";

const itemSchema = z.object({
  data: z.string().optional(),
  hora: z.string().optional(),
  somenteCupons: z.boolean().optional(),
  duracaoMinutos: z.number().optional(),
  tipo: z.string().optional(),
  servicos: z.array(z.object({
    id: z.string(),
    quantidade: z.number().int().min(1).max(20),
  })).optional(),
  beats: z.array(z.object({
    id: z.string(),
    quantidade: z.number().int().min(1).max(20),
  })).optional(),
  observacoes: z.string().optional(),
  cupomCode: z.string().trim().min(1).optional(),
});

const carrinhoCheckoutSchema = z.object({
  items: z.array(itemSchema).min(1, "Carrinho deve ter pelo menos um agendamento"),
  paymentMethod: z.enum(["cartao_credito", "cartao_debito", "pix", "boleto"]).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const goLiveBlocked = goLiveBlockIfNeeded(user.role);
    if (goLiveBlocked) return goLiveBlocked;

    if (!ASAAS_API_KEY) {
      return NextResponse.json(
        { error: "Configuração de pagamento ausente no servidor. Configure ASAAS_API_KEY no .env" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const validation = carrinhoCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { items, paymentMethod } = validation.data;
    const userEmail = user.email || "";
    const userName = (user.nomeArtistico || user.nomeCompleto || "Cliente") as string;

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

    const couponCodes = items
      .map((item) => item.cupomCode?.toUpperCase())
      .filter((code): code is string => Boolean(code));
    if (new Set(couponCodes).size !== couponCodes.length) {
      return NextResponse.json(
        { error: "O mesmo cupom não pode ser aplicado mais de uma vez na compra." },
        { status: 400 }
      );
    }

    const safeItems: Array<Record<string, unknown>> = [];
    let total = 0;
    for (const item of items) {
      let calculation;
      try {
        calculation = await calculateServerCheckout({
          userId: user.id,
          services: item.servicos,
          beats: item.beats,
          couponCode: item.cupomCode,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const safeError = message.startsWith("CUPOM_INVALIDO:")
          ? message.slice("CUPOM_INVALIDO:".length)
          : "Item ou quantidade inválida no carrinho.";
        return NextResponse.json({ error: safeError }, { status: 400 });
      }
      total = Math.round((total + calculation.total) * 100) / 100;
      safeItems.push({
        data: item.data,
        hora: item.hora,
        somenteCupons: item.somenteCupons,
        duracaoMinutos: item.duracaoMinutos ?? 60,
        tipo: item.tipo,
        servicos: calculation.services,
        beats: calculation.beats,
        subtotal: calculation.subtotal,
        total: calculation.total,
        observacoes: item.observacoes,
        cupomCode: item.cupomCode?.toUpperCase(),
        couponId: calculation.couponId,
        couponType: calculation.couponType,
      });
    }
    if (total <= 0) {
      return NextResponse.json(
        { error: "Compras com valor zero devem ser concluídas pelo fluxo de resgate do cupom." },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.data?.trim() || !item.hora?.trim() || item.somenteCupons) continue;
      const dataHoraISO = parseStudioDateTime(item.data, item.hora);
      const duracao = item.duracaoMinutos ?? 60;
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
          { error: `Já existe um agendamento em ${item.data} às ${item.hora}. Remova ou altere no carrinho.` },
          { status: 409 }
        );
      }
    }

    const metadataCompleto = {
      tipo: "carrinho",
      userId: user.id,
      items: JSON.stringify(safeItems),
      total: total.toString(),
      paymentMethod: paymentMethod || null,
    };
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const paymentMetadataRow = await prisma.paymentMetadata.create({
      data: {
        userId: user.id,
        metadata: JSON.stringify(metadataCompleto),
        expiresAt,
      },
    });

    const provider = new AsaasProvider(ASAAS_API_KEY, IS_TEST);
    const descricao = `Carrinho THouse Rec - ${safeItems.length} agendamento(s)`;

    const checkoutResponse = await provider.createCheckout({
      items: [
        {
          id: "carrinho",
          title: descricao,
          quantity: 1,
          unit_price: Number(total.toFixed(2)),
          currency_id: "BRL",
        },
      ],
      payer: {
        name: userName,
        email: userEmail,
        cpf: cpfLimpo,
      },
      paymentMethod: paymentMethod || undefined,
      metadata: {
        operationId: paymentMetadataRow.id,
      },
      backUrls: {
        success: `${SITE_URL}/pagamentos/sucesso?tipo=agendamento&operationId=${encodeURIComponent(paymentMetadataRow.id)}`,
        failure: `${SITE_URL}/pagamentos/falha`,
        pending: `${SITE_URL}/pagamentos/pendente`,
      },
    });

    const asaasPaymentId = checkoutResponse.preferenceId;
    if (asaasPaymentId && paymentMetadataRow?.id) {
      try {
        await prisma.paymentMetadata.update({
          where: { id: paymentMetadataRow.id },
          data: { asaasId: asaasPaymentId },
        });
        console.log("[Asaas Checkout Carrinho] PaymentMetadata.asaasId atualizado:", asaasPaymentId);
      } catch (e) {
        console.warn("[Asaas Checkout Carrinho] Erro ao atualizar PaymentMetadata.asaasId:", e);
      }
    }

    return NextResponse.json({
      initPoint: checkoutResponse.initPoint,
      provider: "asaas",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const safeMessage = message || "Erro desconhecido ao criar pagamento";
    if (safeMessage === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("[Asaas Checkout Carrinho] Erro completo:", err);
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
