"use client";

import { formatCurrency } from "./meta";
import type { AdminFinancialSummaryView } from "./types";

function moneyOrUnknown(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "Não informado";
  return formatCurrency(value);
}

export function FinancialSummaryCompact({ financial }: { financial?: AdminFinancialSummaryView | null }) {
  if (!financial) {
    return <p className="text-[11px] text-zinc-500">Financeiro: não informado</p>;
  }
  const final = moneyOrUnknown(financial.finalAmount);
  const couponBit = financial.hasCoupon
    ? `Cupom ${financial.couponCode} · ${financial.couponKindLabel}`
    : "Cupom: nenhum";
  return (
    <div className="text-[11px] leading-snug text-zinc-400">
      <p className="text-zinc-300">
        {moneyOrUnknown(financial.originalAmount)}
        <span className="text-zinc-500"> → </span>
        desconto {formatCurrency(financial.discountAmount)}
        <span className="text-zinc-500"> → </span>
        <span className="font-medium text-zinc-100">final {final}</span>
      </p>
      <p className="mt-0.5 truncate">
        {financial.paymentLabel} · {couponBit}
      </p>
    </div>
  );
}

export function FinancialSummaryDetails({ financial }: { financial?: AdminFinancialSummaryView | null }) {
  const f = financial;
  return (
    <dl className="space-y-1 text-xs">
      <div className="flex justify-between gap-3">
        <dt className="text-zinc-500">Valor original</dt>
        <dd className="text-zinc-200">{moneyOrUnknown(f?.originalAmount)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-zinc-500">Desconto</dt>
        <dd className="text-green-400">
          {f ? `- ${formatCurrency(f.discountAmount)}` : "Não informado"}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-zinc-500">Valor final</dt>
        <dd className="font-medium text-zinc-100">{moneyOrUnknown(f?.finalAmount)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-zinc-500">Pagamento</dt>
        <dd className="text-zinc-200">{f?.paymentLabel || "Não informado"}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-zinc-500">Cupom</dt>
        <dd className="font-mono text-zinc-200">{f?.couponCode || "Nenhum"}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-zinc-500">Tipo de cupom</dt>
        <dd className="text-zinc-200">{f?.couponKindLabel || "Nenhum"}</dd>
      </div>
    </dl>
  );
}
