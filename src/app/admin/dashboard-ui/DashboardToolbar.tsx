"use client";

/**
 * GO-03C — Toolbar de filtros globais do Dashboard (estado na URL).
 */
import { PERIOD_OPTIONS, type PeriodKey } from "./period";
import { Icons } from "@/app/admin/servicos-ui/meta";

export function DashboardToolbar({
  period,
  from,
  to,
  onPeriod,
  onCustom,
}: {
  period: PeriodKey;
  from: string;
  to: string;
  onPeriod: (key: PeriodKey) => void;
  onCustom: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <Icons.filter className="w-3.5 h-3.5" />
        Período
      </span>
      {PERIOD_OPTIONS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onPeriod(p.value)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            period === p.value
              ? "border-red-500/60 bg-red-500/15 text-red-300"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          }`}
        >
          {p.label}
        </button>
      ))}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            De
            <input
              type="date"
              value={from}
              onChange={(e) => onCustom(e.target.value, to)}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            Até
            <input
              type="date"
              value={to}
              onChange={(e) => onCustom(from, e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
            />
          </label>
        </div>
      )}
    </div>
  );
}
