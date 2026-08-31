import { prisma } from "@/app/lib/prisma";
import {
  isSymbolicAgendamentoApprovedPayment,
  isSymbolicApprovedPayment,
  isSymbolicFromMetadata,
  type SymbolicPaymentLike,
} from "@/app/lib/symbolic-payment";

export type PaymentMetadataLookupFields = {
  id: string;
  userId: string;
  type: string;
  asaasId: string | null;
  createdAt: Date;
};

function parseMetadataJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function loadMetadataByAsaasIds(
  asaasIds: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (asaasIds.length === 0) return map;

  const rows = await prisma.paymentMetadata.findMany({
    where: { asaasId: { in: asaasIds } },
    select: { asaasId: true, metadata: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  for (const row of rows) {
    if (!row.asaasId || map.has(row.asaasId)) continue;
    const parsed = parseMetadataJson(row.metadata);
    if (parsed) map.set(row.asaasId, parsed);
  }
  return map;
}

export async function findNearestMetadataForPayment(payment: {
  userId: string;
  type: string;
  createdAt: Date;
}): Promise<Record<string, unknown> | null> {
  const windowStart = new Date(payment.createdAt.getTime() - 48 * 60 * 60 * 1000);
  const windowEnd = new Date(payment.createdAt.getTime() + 48 * 60 * 60 * 1000);

  const rows = await prisma.paymentMetadata.findMany({
    where: {
      userId: payment.userId,
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
    take: 20,
  });

  for (const row of rows) {
    const parsed = parseMetadataJson(row.metadata);
    if (parsed && isSymbolicFromMetadata(payment.type, parsed)) return parsed;
  }
  return null;
}

export async function resolvePaymentMetadata(
  payment: PaymentMetadataLookupFields
): Promise<Record<string, unknown> | null> {
  if (payment.asaasId) {
    const byAsaas = await loadMetadataByAsaasIds([payment.asaasId]);
    const meta = byAsaas.get(payment.asaasId);
    if (meta) return meta;
  }
  return findNearestMetadataForPayment(payment);
}

export async function resolvePaymentMetadataBatch<T extends PaymentMetadataLookupFields>(
  payments: T[]
): Promise<Map<string, Record<string, unknown> | null>> {
  const result = new Map<string, Record<string, unknown> | null>();
  if (payments.length === 0) return result;

  const asaasIds = payments
    .map((p) => p.asaasId)
    .filter((id): id is string => Boolean(id));
  const metadataByAsaas = await loadMetadataByAsaasIds(asaasIds);

  const needsNearest: T[] = [];
  for (const payment of payments) {
    if (payment.asaasId) {
      const meta = metadataByAsaas.get(payment.asaasId) ?? null;
      if (meta) {
        result.set(payment.id, meta);
        continue;
      }
    }
    needsNearest.push(payment);
  }

  for (const payment of needsNearest) {
    result.set(payment.id, await findNearestMetadataForPayment(payment));
  }

  return result;
}

export async function filterResolvedSymbolicApprovedPayments<
  T extends SymbolicPaymentLike & PaymentMetadataLookupFields,
>(payments: T[]): Promise<T[]> {
  const metadataById = await resolvePaymentMetadataBatch(payments);
  return payments.filter((payment) =>
    isSymbolicApprovedPayment(payment, metadataById.get(payment.id) ?? null)
  );
}

type AgendamentoPaymentRow = PaymentMetadataLookupFields &
  SymbolicPaymentLike & {
    appointmentId?: number | null;
  };

export async function findFirstSymbolicAgendamentoPayment(params: {
  paymentId?: string;
  userId?: string;
  email?: string | null;
}): Promise<AgendamentoPaymentRow | null> {
  if (params.paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: params.paymentId },
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        status: true,
        asaasId: true,
        createdAt: true,
        appointmentId: true,
      },
    });
    if (!payment || payment.type !== "agendamento" || payment.status !== "approved") {
      return null;
    }
    const metadata = await resolvePaymentMetadata(payment);
    if (!isSymbolicAgendamentoApprovedPayment(payment, metadata)) return null;
    return payment;
  }

  const where: { userId?: string; type: "agendamento"; status: "approved" } = {
    type: "agendamento",
    status: "approved",
  };
  if (params.userId) where.userId = params.userId;

  let candidates = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      status: true,
      asaasId: true,
      createdAt: true,
      appointmentId: true,
    },
  });

  if (candidates.length === 0 && params.email?.trim()) {
    candidates = await prisma.payment.findMany({
      where: {
        type: "agendamento",
        status: "approved",
        user: { email: { equals: params.email.trim(), mode: "insensitive" } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        status: true,
        asaasId: true,
        createdAt: true,
        appointmentId: true,
      },
    });
  }

  const metadataById = await resolvePaymentMetadataBatch(candidates);
  for (const payment of candidates) {
    const metadata = metadataById.get(payment.id) ?? null;
    if (isSymbolicAgendamentoApprovedPayment(payment, metadata)) return payment;
  }
  return null;
}

type PlanoPaymentRow = PaymentMetadataLookupFields & SymbolicPaymentLike;

export async function findFirstSymbolicPlanoPayment(params: {
  paymentId?: string;
  userId?: string;
}): Promise<PlanoPaymentRow | null> {
  if (params.paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: params.paymentId },
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        status: true,
        asaasId: true,
        createdAt: true,
      },
    });
    if (!payment || payment.type !== "plano" || payment.status !== "approved") return null;
    const metadata = await resolvePaymentMetadata(payment);
    if (!isSymbolicApprovedPayment(payment, metadata)) return null;
    return payment;
  }

  const where: { userId?: string; type: "plano"; status: "approved" } = {
    type: "plano",
    status: "approved",
  };
  if (params.userId) where.userId = params.userId;

  const candidates = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      status: true,
      asaasId: true,
      createdAt: true,
    },
  });

  const metadataById = await resolvePaymentMetadataBatch(candidates);
  for (const payment of candidates) {
    const metadata = metadataById.get(payment.id) ?? null;
    if (isSymbolicApprovedPayment(payment, metadata)) return payment;
  }
  return null;
}
