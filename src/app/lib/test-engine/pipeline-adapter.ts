/**
 * TE-01B — Official Pipeline Adapter.
 * Reutiliza handlers/effects oficiais — sem segundo fluxo de domínio.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { processPaymentWebhook } from "@/app/lib/process-payment-webhook";
import { ensureServicesForAppointment } from "@/app/lib/ensure-appointment-services";
import { SYMBOLIC_AGENDAMENTO_BRL } from "@/app/lib/symbolic-payment";

export type SeedUserInput = {
  email: string;
  nomeCompleto?: string;
  nomeArtistico?: string;
  senha?: string;
  cpf?: string;
};

export type SeedUserResult = {
  userId: string;
  email: string;
};

/** Cria usuário de teste no mesmo modelo do registro (Prisma oficial). */
export async function seedTestUser(input: SeedUserInput): Promise<SeedUserResult> {
  const hash = await bcrypt.hash(input.senha || "Te01b@Test!", 10);
  const cpf =
    input.cpf ||
    `9${String(Date.now()).slice(-10)}`.slice(0, 11);

  const user = await prisma.user.create({
    data: {
      nomeCompleto: input.nomeCompleto || "TE Engine User",
      nomeArtistico: input.nomeArtistico || "TE Artist",
      email: input.email,
      senha: hash,
      telefone: "21999999999",
      cpf,
      pais: "Brasil",
      estado: "RJ",
      cidade: "Rio de Janeiro",
      bairro: "Botafogo",
      dataNascimento: new Date("1995-06-15"),
      sexo: "prefiro_nao_declarar",
      genero: "prefiro_nao_informar",
      role: "USER",
    },
    select: { id: true, email: true },
  });

  return { userId: user.id, email: user.email };
}

export type AgendamentoMetadataInput = {
  userId: string;
  data: string;
  hora: string;
  duracaoMinutos?: number;
  tipoAgendamento?: string;
  servicos?: { id: string; nome: string; quantidade: number }[];
  beats?: { id: string; nome: string; quantidade: number }[];
  total?: number;
};

/**
 * Espelha a gravação de PaymentMetadata do checkout-agendamento oficial
 * (JSON string + expiresAt + flags simbólicas).
 */
export async function writeAgendamentoPaymentMetadata(
  input: AgendamentoMetadataInput
): Promise<{ metadataId: string; asaasId: string }> {
  const asaasId = `pay_te_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const metadataCompleto: Record<string, unknown> = {
    tipo: "agendamento",
    userId: input.userId,
    data: input.data,
    hora: input.hora,
    duracaoMinutos: input.duracaoMinutos ?? 60,
    tipoAgendamento: input.tipoAgendamento || "sessao",
    observacoes: "TE-01B scenario",
    servicos: input.servicos || [{ id: "sessao", nome: "Sessão", quantidade: 1 }],
    beats: input.beats || [],
    total: String(input.total ?? 40),
    chargedAmount: String(SYMBOLIC_AGENDAMENTO_BRL),
    paymentMethod: "pix",
    symbolicAgendamento: true,
    isTestPayment: true,
    teEngine: true,
  };

  const row = await prisma.paymentMetadata.create({
    data: {
      userId: input.userId,
      metadata: JSON.stringify(metadataCompleto),
      asaasId,
      expiresAt,
    },
    select: { id: true, asaasId: true },
  });

  return { metadataId: row.id, asaasId: row.asaasId! };
}

/**
 * Dispara o orquestrador oficial de webhook (mesmos effects do Asaas).
 */
export async function dispatchOfficialPaymentReceived(params: {
  userId: string;
  asaasPaymentId: string;
  value?: number;
  description?: string;
}): Promise<Awaited<ReturnType<typeof processPaymentWebhook>>> {
  const value = params.value ?? SYMBOLIC_AGENDAMENTO_BRL;
  return processPaymentWebhook({
    event: "PAYMENT_RECEIVED",
    payment: {
      id: params.asaasPaymentId,
      status: "RECEIVED",
      value,
      netValue: value,
      billingType: "PIX",
      customer: "cus_te_engine",
      externalReference: params.userId,
      description: params.description || "TE Agendamento simbólico",
      metadata: {},
    },
  });
}

/** Replay idempotente do mesmo payload (cenários de duplicata). */
export async function dispatchOfficialPaymentReceivedDuplicate(
  params: Parameters<typeof dispatchOfficialPaymentReceived>[0]
): Promise<Awaited<ReturnType<typeof processPaymentWebhook>>> {
  return dispatchOfficialPaymentReceived(params);
}

/** Reusa ensure oficial (aceitação / A5). */
export async function ensureServicesOfficial(appointmentId: number): Promise<number> {
  return ensureServicesForAppointment(appointmentId);
}

export async function findLatestPaymentByAsaasId(asaasId: string) {
  return prisma.payment.findFirst({
    where: { asaasId },
    select: {
      id: true,
      userId: true,
      status: true,
      type: true,
      amount: true,
      appointmentId: true,
      asaasId: true,
    },
  });
}
