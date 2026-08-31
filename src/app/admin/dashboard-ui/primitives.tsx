"use client";

/**
 * GO-03C — Primitivos reutilizáveis do Dashboard Executivo.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icons } from "@/app/admin/servicos-ui/meta";
import { Spinner } from "@/app/admin/servicos-ui/States";

export function DashboardSection({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardEmptyState({
  title,
  description,
  minHeight = "min-h-[120px]",
}: {
  title: string;
  description?: string;
  minHeight?: string;
}) {
  return (
    <div
      className={`${minHeight} flex flex-col items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center`}
    >
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description && <p className="max-w-md text-xs text-zinc-500">{description}</p>}
    </div>
  );
}

export function DashboardWidget({
  loading,
  error,
  onRetry,
  skeleton,
  children,
  minHeight = "min-h-[120px]",
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
  minHeight?: string;
}) {
  if (loading) {
    return (
      <div className={`${minHeight} rounded-xl border border-zinc-800 bg-zinc-900/40 p-4`}>
        {skeleton || <WidgetSkeleton />}
      </div>
    );
  }
  if (error) {
    return (
      <div
        className={`${minHeight} flex flex-col items-center justify-center gap-2 rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-center`}
      >
        <p className="text-xs text-red-300">Não foi possível carregar este widget.</p>
        <p className="max-w-xs text-[11px] text-zinc-500">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            <Icons.refresh className="w-3 h-3" />
            Tentar novamente
          </button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}

export function WidgetSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-700/50" />
      <div className="h-8 w-1/2 animate-pulse rounded bg-zinc-700/60" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-700/40" />
    </div>
  );
}

export function DashboardCard({
  href,
  icon,
  label,
  value,
  badge,
  delta,
  tooltip,
  accent = "text-zinc-100",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  badge?: string;
  delta?: string | null;
  tooltip?: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      title={tooltip}
      className="group relative flex flex-col rounded-xl border border-zinc-700/80 bg-zinc-900/70 p-3.5 transition-all duration-200 hover:border-zinc-500 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-1.5 text-zinc-400 transition-colors group-hover:text-zinc-200">
          {icon}
        </span>
        {badge && (
          <span className="rounded-full border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${accent}`}>{value}</p>
      {delta != null && (
        <p
          className={`mt-1 text-[11px] tabular-nums ${
            delta.startsWith("+") ? "text-emerald-400" : delta.startsWith("-") ? "text-red-400" : "text-zinc-500"
          }`}
        >
          {delta} vs período anterior
        </p>
      )}
    </Link>
  );
}

export function DashboardAlert({
  href,
  tone,
  title,
  detail,
}: {
  href: string;
  tone: "amber" | "red" | "sky" | "orange";
  title: string;
  detail?: string;
}) {
  const tones = {
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-400/60",
    red: "border-red-500/40 bg-red-500/10 text-red-200 hover:border-red-400/60",
    sky: "border-sky-500/40 bg-sky-500/10 text-sky-200 hover:border-sky-400/60",
    orange: "border-orange-500/40 bg-orange-500/10 text-orange-200 hover:border-orange-400/60",
  };
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${tones[tone]}`}
    >
      <Icons.clock className="mt-0.5 w-4 h-4 shrink-0 opacity-80" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {detail && <p className="mt-0.5 text-xs opacity-80">{detail}</p>}
      </div>
      <Icons.chevronRight className="ml-auto mt-0.5 w-4 h-4 shrink-0 opacity-60" />
    </Link>
  );
}

export function DashboardKPI({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const unavailable = value === "Indisponível";
  return (
    <div
      title={hint}
      className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-1.5 text-lg font-bold tabular-nums ${
          unavailable ? "text-zinc-500" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[10px] text-zinc-600">{hint}</p>}
    </div>
  );
}

export function Unavailable() {
  return <span className="text-zinc-500">Indisponível</span>;
}

export function InlineSpinner() {
  return <Spinner className="w-3.5 h-3.5" />;
}
