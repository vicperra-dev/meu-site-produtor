export type PaymentRefundStatus =
  | "nao_reembolsado"
  | "aguardando_confirmacao"
  | "reembolsado_confirmado"
  | "reembolso_disputado";

export type PaymentRefundSource = {
  refundProcessedAt?: Date | string | null;
  refundUserConfirmedAt?: Date | string | null;
  refundUserDisputedAt?: Date | string | null;
  refundAsaasStatus?: string | null;
  refundAmount?: number | null;
  cancelRefundOption?: string | null;
};

export type PaymentRefundInfo = {
  statusReembolso: PaymentRefundStatus;
  label: string;
  refundAmount: number | null;
  refundProcessedAt: string | null;
  refundUserConfirmedAt: string | null;
  refundAsaasStatus: string | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sourceHasRefund(source: PaymentRefundSource): boolean {
  return Boolean(source.refundProcessedAt);
}

export function resolvePaymentRefundInfo(
  sources: PaymentRefundSource[]
): PaymentRefundInfo {
  const refunded = sources.filter(sourceHasRefund);
  if (refunded.length === 0) {
    return {
      statusReembolso: "nao_reembolsado",
      label: "Sem reembolso",
      refundAmount: null,
      refundProcessedAt: null,
      refundUserConfirmedAt: null,
      refundAsaasStatus: null,
    };
  }

  const disputed = refunded.some((s) => s.refundUserDisputedAt);
  const allConfirmed = refunded.every((s) => s.refundUserConfirmedAt);
  const anyProcessed = refunded.some((s) => s.refundProcessedAt);

  let statusReembolso: PaymentRefundStatus = "aguardando_confirmacao";
  let label = "Reembolsado (aguardando confirmação)";

  if (disputed) {
    statusReembolso = "reembolso_disputado";
    label = "Reembolso em disputa";
  } else if (allConfirmed) {
    statusReembolso = "reembolsado_confirmado";
    label = "Reembolsado";
  } else if (anyProcessed) {
    statusReembolso = "aguardando_confirmacao";
    label = "Reembolsado (aguardando confirmação)";
  }

  const amounts = refunded
    .map((s) => s.refundAmount)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const refundAmount =
    amounts.length > 0 ? amounts.reduce((sum, v) => sum + v, 0) : null;

  const latest = refunded.reduce<(typeof refunded)[number] | null>((best, current) => {
    const currentAt = current.refundProcessedAt
      ? new Date(current.refundProcessedAt).getTime()
      : 0;
    const bestAt = best?.refundProcessedAt ? new Date(best.refundProcessedAt).getTime() : 0;
    return currentAt >= bestAt ? current : best;
  }, null);

  return {
    statusReembolso,
    label,
    refundAmount,
    refundProcessedAt: toIso(latest?.refundProcessedAt),
    refundUserConfirmedAt: toIso(latest?.refundUserConfirmedAt),
    refundAsaasStatus: latest?.refundAsaasStatus ?? null,
  };
}

export function paymentRefundStatusClass(status: PaymentRefundStatus): string {
  switch (status) {
    case "reembolsado_confirmado":
      return "bg-blue-500/20 text-blue-300";
    case "aguardando_confirmacao":
      return "bg-amber-500/20 text-amber-300";
    case "reembolso_disputado":
      return "bg-red-500/20 text-red-300";
    default:
      return "bg-zinc-500/20 text-zinc-400";
  }
}
