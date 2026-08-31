"use client";

/**
 * Design System — feedback visual: Skeleton, Spinner, LoadingBlock,
 * EmptyState, ErrorState, Tooltip e Callout.
 */

import React from "react";
import { cx, Intent, intentClasses, surface } from "./tokens";
import { Icon, IconName } from "./Icons";
import { Button } from "./Button";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx("animate-pulse rounded-lg bg-zinc-800/80", className)} />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className={cx("rounded-xl p-4 space-y-2.5", surface.base)}>
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cx("h-3", i % 2 ? "w-2/3" : "w-5/6")} />
      ))}
    </div>
  );
}

export function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin",
        className
      )}
      role="status"
      aria-label="Carregando"
    />
  );
}

export function LoadingBlock({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-zinc-400 text-sm">
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({
  icon = "box",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-10 text-center",
        className
      )}
    >
      <span className="flex w-11 h-11 items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description && <p className="text-xs text-zinc-500 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Algo deu errado",
  description,
  onRetry,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-8 text-center",
        className
      )}
    >
      <span className="flex w-11 h-11 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <Icon name="alert" className="w-5 h-5" />
      </span>
      <p className="text-sm font-medium text-red-300">{title}</p>
      {description && <p className="text-xs text-zinc-500 max-w-sm">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="xs" icon="refresh" onClick={onRetry} className="mt-1">
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/** Tooltip simples via CSS (hover/focus), sem dependências. */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("relative inline-flex group/tt", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}

/** Aviso/nota contextual dentro de páginas e cards. */
export function Callout({
  intent = "info",
  icon,
  title,
  children,
  className,
  align = "start",
}: {
  intent?: Intent;
  icon?: IconName;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** `center` empilha ícone + conteúdo e centraliza (ex.: CTA de login no FAQ). */
  align?: "start" | "center";
}) {
  const c = intentClasses[intent];
  const centered = align === "center";
  return (
    <div className={cx("rounded-lg border p-3", c.bg, c.border, className)}>
      <div
        className={cx(
          "flex gap-2.5",
          centered && "flex-col items-center text-center"
        )}
      >
        <Icon
          name={icon ?? "info"}
          className={cx(
            "w-4 h-4 flex-shrink-0",
            centered ? "mt-0" : "mt-0.5",
            c.text
          )}
        />
        <div
          className={cx(
            "min-w-0 text-xs leading-relaxed text-zinc-300",
            centered && "w-full flex flex-col items-center"
          )}
        >
          {title && (
            <p className={cx("font-semibold mb-0.5 text-sm", c.text)}>{title}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
