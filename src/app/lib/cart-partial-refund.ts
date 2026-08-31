/**
 * GO-04A.2 RC-11 — valor de reembolso parcial para pagamento de carrinho multi-item.
 * Usa totais por item do PaymentMetadata quando disponíveis; senão rateio igualitário.
 * Nunca permite estornar mais que o restante do pagamento.
 */
import { prisma } from "@/app/lib/prisma";

function parseAppointmentIds(payment: {
  appointmentId: number | null;
  appointmentIds: unknown;
}): number[] {
  const ids: number[] = [];
  if (payment.appointmentId != null) ids.push(payment.appointmentId);
  let raw = payment.appointmentIds;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (Array.isArray(raw)) {
    for (const v of raw) {
      const n = Number(v);
      if (Number.isFinite(n)) ids.push(n);
    }
  }
  return [...new Set(ids)];
}

function parseItemTotals(metadataJson: string | null | undefined): number[] | null {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson) as Record<string, unknown>;
    let items: unknown = parsed.items;
    if (typeof items === "string") items = JSON.parse(items);
    if (!Array.isArray(items) || items.length === 0) return null;
    const totals = items.map((item) => {
      const row = item as Record<string, unknown>;
      const t = Number(row.total ?? row.subtotal ?? 0);
      return Number.isFinite(t) ? Math.round(t * 100) / 100 : 0;
    });
    if (totals.every((t) => t <= 0)) return null;
    return totals;
  } catch {
    return null;
  }
}

export async function resolveCartPartialRefundAmount(params: {
  payment: {
    id: string;
    amount: number;
    asaasId: string | null;
    appointmentId: number | null;
    appointmentIds: unknown;
  };
  appointmentId: number;
}): Promise<{ amount: number; source: "metadata" | "equal_split"; remaining: number }> {
  const { payment, appointmentId } = params;
  const ids = parseAppointmentIds(payment);
  const safeIds = ids.length > 0 ? ids : [appointmentId];
  const index = safeIds.indexOf(appointmentId);

  let itemTotals: number[] | null = null;
  if (payment.asaasId) {
    const meta = await prisma.paymentMetadata.findFirst({
      where: { asaasId: payment.asaasId },
      select: { metadata: true },
    });
    itemTotals = parseItemTotals(meta?.metadata);
  }

  let source: "metadata" | "equal_split" = "equal_split";
  let requested: number;
  if (itemTotals && index >= 0 && itemTotals[index] != null && itemTotals[index]! > 0) {
    requested = itemTotals[index]!;
    source = "metadata";
  } else {
    requested =
      payment.amount > 0 && safeIds.length > 0
        ? Math.round((payment.amount / safeIds.length) * 100) / 100
        : payment.amount;
  }

  const siblings = await prisma.appointment.findMany({
    where: {
      id: { in: safeIds.filter((id) => id !== appointmentId) },
      cancelRefundOption: "reembolso",
      refundProcessedAt: { not: null },
    },
    select: { id: true },
  });

  let alreadyRefunded = 0;
  for (const s of siblings) {
    const si = safeIds.indexOf(s.id);
    if (itemTotals && si >= 0 && itemTotals[si] != null && itemTotals[si]! > 0) {
      alreadyRefunded += itemTotals[si]!;
    } else if (safeIds.length > 0) {
      alreadyRefunded += payment.amount / safeIds.length;
    }
  }
  alreadyRefunded = Math.round(alreadyRefunded * 100) / 100;
  const remaining = Math.round((payment.amount - alreadyRefunded) * 100) / 100;
  const amount = Math.min(requested, Math.max(0, remaining));
  return {
    amount: Math.round(amount * 100) / 100,
    source,
    remaining: Math.max(0, remaining),
  };
}
