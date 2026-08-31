/**
 * POST /api/admin/reprocessar-pagamento-teste
 * Simula processamento de pagamento RECEIVED para agendamento (mesmo pipeline do webhook).
 * Body opcional: { paymentId?: string, sendEmails?: boolean, simulacao?: { data, hora, ... } }
 * Só admin. Requer Payment simbólico existente — não cria nem atualiza Payment na rota.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  parseAgendamentoMetadataItems,
  processAgendamentoPaymentEffects,
} from "@/app/lib/asaas-agendamento-payment-effects";
import {
  countAgendamentoItemLines,
  exigeAgendamentoHora,
  exigeAgendamentoNoCheckout,
  isCouponsOnlyAgendamentoPayment,
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
} from "@/app/lib/agendamento-payment-rules";
import { SYMBOLIC_AGENDAMENTO_BRL, canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import {
  findFirstSymbolicAgendamentoPayment,
  resolvePaymentMetadata,
} from "@/app/lib/symbolic-payment-resolve";

const itemSchema = z.object({
  id: z.string(),
  nome: z.string(),
  quantidade: z.number(),
  preco: z.number(),
});

const simulacaoSchema = z
  .object({
    data: z.string().optional(),
    hora: z.string().optional(),
    observacoes: z.string().optional(),
    duracaoMinutos: z.number().optional(),
    tipo: z.string().optional(),
    servicos: z.array(itemSchema).optional(),
    beats: z.array(itemSchema).optional(),
    total: z.number().optional(),
    cupomCode: z.string().optional(),
  })
  .superRefine((payload, ctx) => {
    const lines = countAgendamentoItemLines(payload.servicos, payload.beats);
    if (lines === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione ao menos um serviço ou pacote na simulação.",
      });
    }
    if (!exigeAgendamentoNoCheckout(payload.servicos, payload.beats)) return;
    if (!payload.data?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a data do agendamento para um único item.",
        path: ["data"],
      });
    }
    if (exigeAgendamentoHora(payload.servicos, payload.beats) && !payload.hora?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o horário do agendamento para um único item.",
        path: ["hora"],
      });
    }
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
  const needsCheckout = exigeAgendamentoNoCheckout(simulacao.servicos, simulacao.beats);
  const needsHour = exigeAgendamentoHora(simulacao.servicos, simulacao.beats);
  const hora =
    simulacao.hora?.trim() ||
    (needsCheckout && simulacao.data?.trim() && !needsHour
      ? PRODUCTION_SCHEDULE_DEFAULT_HOUR
      : undefined);
  return {
    tipo: "agendamento",
    userId,
    ...(simulacao.data?.trim() && hora
      ? { data: simulacao.data, hora }
      : {}),
    duracaoMinutos: simulacao.duracaoMinutos ?? 60,
    tipoAgendamento: simulacao.tipo ?? "sessao",
    observacoes: simulacao.observacoes ?? "",
    servicos: simulacao.servicos ?? [],
    beats: simulacao.beats ?? [],
    total: String(simulacao.total ?? SYMBOLIC_AGENDAMENTO_BRL),
    chargedAmount: String(SYMBOLIC_AGENDAMENTO_BRL),
    symbolicAgendamento: true,
    cupomCode: simulacao.cupomCode,
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
          {
            success: false,
            error: parsed.error.errors[0]?.message || "Dados de simulação inválidos.",
          },
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

    const pagamento = await findFirstSymbolicAgendamentoPayment({
      paymentId: paymentIdParam,
      userId: user.id,
      email: user.email,
    });

    if (!pagamento) {
      return NextResponse.json(
        {
          success: false,
          error: simulacao
            ? "Nenhum pagamento simbólico de agendamento existente. Conclua o checkout simbólico antes de simular itens, ou informe paymentId."
            : "Nenhum pagamento de teste (R$ 5, agendamento) encontrado. Informe paymentId ou faça um pagamento simbólico antes.",
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

    const { services: metaServicos, beats: metaBeats } = parseAgendamentoMetadataItems(metadata);
    const fluxoSomenteCupons = isCouponsOnlyAgendamentoPayment(metadata, metaServicos, metaBeats);

    if (
      !fluxoSomenteCupons &&
      !metadata.data &&
      !metadata.appointmentId &&
      !pagamento.appointmentId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Metadata sem data nem appointmentId. Compra unitária exige data (e horário se Sessão/Captação); multi-serviço gera cupons.",
        },
        { status: 400 }
      );
    }

    const fx = await processAgendamentoPaymentEffects({
      paymentDbId: pagamento.id,
      value: Number(pagamento.amount),
      metadata,
      options: { sendEmails, source: "admin_reprocess" },
    });

    if (!fx.agendamentoFinalId && fx.couponsCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: fx.skippedReason || "Não foi possível aplicar efeitos de agendamento.",
          details: fx,
        },
        { status: 409 }
      );
    }

    const owner = await prisma.user.findUnique({
      where: { id: pagamento.userId },
      select: { email: true, nomeArtistico: true },
    });

    return NextResponse.json({
      success: true,
      message: fx.agendamentoFinalId
        ? "Simulação concluída com agendamento único e serviços vinculados."
        : "Simulação concluída: cupons gerados em Minha Conta sem criar agendamento.",
      appointmentId: fx.agendamentoFinalId,
      paymentId: pagamento.id,
      servicesCreatedThisRun: fx.servicesCreatedThisRun,
      couponsCount: fx.couponsCount,
      emailsSent: fx.emailsSent,
      paymentLinked: fx.paymentLinked,
      forUser: owner ? { email: owner.email, nome: owner.nomeArtistico } : null,
      hint: "Quem fez o pagamento pode atualizar Minha Conta. No admin, atualize Agendamentos e Serviços.",
    });
  } catch (err: unknown) {
    console.error("[Reprocessar Pagamento Teste]", err);
    const message = err instanceof Error ? err.message : "Erro ao reprocessar pagamento de teste.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
