"use client";

import type { ReactNode } from "react";
import {
  Card as DsCard,
  Badge as DsBadge,
  EmptyState as DsEmptyState,
  type Intent,
} from "@/components/design-system";

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DsCard className={className}>
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
      </header>
      {children}
    </DsCard>
  );
}

const TONE_TO_INTENT: Record<
  "success" | "warning" | "danger" | "info" | "neutral",
  Intent
> = {
  success: "success",
  warning: "warning",
  danger: "error",
  info: "info",
  neutral: "neutral",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return <DsBadge intent={TONE_TO_INTENT[tone]}>{children}</DsBadge>;
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MetricTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-zinc-100">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-zinc-500">{sub}</p>}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number | ReactNode>>;
}) {
  if (rows.length === 0) {
    return <DsEmptyState title="Nenhum dado disponível." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-700 text-zinc-400">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/80 text-zinc-300">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HeatBar({ score }: { score: number }) {
  const filled = Math.round(score / 10);
  return (
    <span className="font-mono text-xs text-zinc-400">
      <span className="text-red-400">{"█".repeat(Math.min(10, filled))}</span>
      <span>{"░".repeat(Math.max(0, 10 - filled))}</span>
      <span className="ml-2 text-zinc-500">{score}</span>
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <DsEmptyState title={message} />;
}

export function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const s = status.toUpperCase();
  if (s.includes("HEALTHY") || s.includes("APPROVED") || s === "OK") return "success";
  if (s.includes("BLOCKED") || s.includes("UNHEALTHY") || s.includes("CRITICAL")) return "danger";
  if (s.includes("REVIEW") || s.includes("WARNING") || s.includes("MEDIUM")) return "warning";
  return "neutral";
}
