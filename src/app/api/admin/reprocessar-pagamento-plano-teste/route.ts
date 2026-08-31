/**
 * POST /api/admin/reprocessar-pagamento-plano-teste
 * Simula pagamento RECEIVED de plano (mesmo pipeline do webhook, sem Asaas).
 * Requer Payment simbólico existente — não cria nem atualiza Payment na rota.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { processPlanoPaymentEffects } from "@/app/lib/asaas-plano-payment-effects";
import { SYMBOLIC_PLANO_BRL, canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import {
  findFirstSymbolicPlanoPayment,
  resolvePaymentMetadata,
} from "@/app/lib/symbolic-payment-resolve";
import { PLAN_PRICES } from "@/app/lib/plan-prices";

const simulacaoSchema = z.object({
  planId: z.enum(["teste", "bronze", "prata", "ouro"]).default("teste"),
  modo: z.enum(["mensal", "anual"]).default("mensal"),
});

const bodySchema = z.object({
  paymentId: z.string().optional(),
  sendEmails: z.boolean().optional(),
  simulacao: simulacaoSchema.optional(),
});

function buildMetadataFromSimulacao(
  userId: string,
  simulacao: z.infer<typeof simulacaoSchema>
): Record<string, unknown> {
  const catalog = PLAN_PRICES.find((p) => p.id === simulacao.planId);
  const planName =
    simulacao.planId === "teste"
      ? "Plano de Teste"
      : catalog?.nome || `Plano ${simulacao.planId}`;

  return {
    tipo: "plano",
    userId,
    planId: simulacao.planId,
    planName,
    modo: simulacao.modo,
    amount: String(SYMBOLIC_PLANO_BRL),
    chargedAmount: String(SYMBOLIC_PLANO_BRL),
    symbolicPlano: true,
    isTest: true,
    isTestPayment: true,
    billingDay: new Date().getDate(),
    paymentMethod: "pix",
  };
}

async function persistSimulacaoMetadata(
  userId: string,
  metadata: Record<string, unknown>,
  asaasId: string | null
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  await prisma.paymentMetadata.create({
    data: {
      userId,
      metadata: JSON.stringify(metadata),
      expiresAt,
      ...(asaasId ? { asaasId } : {}),
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    let body: z.infer<typeof bodySchema> = {};
    try {
      const raw = await req.json().catch(() => ({}));
      const parsed = bodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message || "Dados de simulação inválidos." },
          { status: 400 }
        );
      }
      body = parsed.data;
    } catch {
      // ignore
    }

    const paymentIdParam = body.paymentId;
    const sendEmails = body.sendEmails === true;
    const simulacao = body.simulacao;

    const pagamento = await findFirstSymbolicPlanoPayment({
      paymentId: paymentIdParam,
      userId: user.id,
    });

    if (!pagamento) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pagamento de plano simbólico não encontrado. Informe paymentId ou conclua checkout simbólico de plano.",
        },
        { status: 404 }
      );
    }

    let metadata: Record<string, unknown>;

    if (simulacao) {
      metadata = buildMetadataFromSimulacao(pagamento.userId, simulacao);
      await persistSimulacaoMetadata(pagamento.userId, metadata, pagamento.asaasId);
    } else {
      const resolved = await resolvePaymentMetadata(pagamento);
      if (!resolved || Object.keys(resolved).length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Metadata do pagamento não encontrada. Envie simulacao ou confira PaymentMetadata.",
          },
          { status: 400 }
        );
      }
      metadata = resolved;
    }

    const fx = await processPlanoPaymentEffects({
      paymentDbId: pagamento.id,
      value: Number(pagamento.amount),
      metadata,
      options: { sendEmails, source: "admin_reprocess" },
    });

    if (!fx.userPlanId || fx.couponsCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: fx.skippedReason || "Não foi possível aplicar efeitos do plano.",
          details: fx,
        },
        { status: 409 }
      );
    }

    const owner = await prisma.user.findUnique({
      where: { id: pagamento.userId },
      select: { email: true, nomeArtistico: true },
    });

    const planIdLabel = String(metadata.planId ?? "plano");

    return NextResponse.json({
      success: true,
      message: `Simulação de plano concluída: ${fx.couponsCount} cupom(ns) gerado(s) para ${planIdLabel}.`,
      paymentId: pagamento.id,
      userPlanId: fx.userPlanId,
      couponsCount: fx.couponsCount,
      emailsSent: fx.emailsSent,
      forUser: owner ? { email: owner.email, nome: owner.nomeArtistico } : null,
      hint: "Confira Minha Conta (cupons de plano) e a aba Cupons no admin.",
    });
  } catch (err: unknown) {
    console.error("[Reprocessar Pagamento Plano Teste]", err);
    const message = err instanceof Error ? err.message : "Erro ao simular pagamento de plano.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
