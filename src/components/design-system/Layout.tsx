"use client";

/**
 * Design System — estrutura de página: PageHeader, Section, Card,
 * Grid, Toolbar e Divider.
 */

import React from "react";
import { cx, surface, typography } from "./tokens";
import { Icon, IconName } from "./Icons";

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: IconName;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className="hidden sm:flex w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700 items-center justify-center text-zinc-300 flex-shrink-0">
            <Icon name={icon} className="w-5 h-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className={typography.pageTitle}>{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: IconName;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <Icon name={icon} className="w-4 h-4 text-zinc-400 flex-shrink-0" />}
            <h2 className={typography.sectionTitle}>{title}</h2>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {description && <p className="text-xs text-zinc-500">{description}</p>}
      {children}
    </section>
  );
}

export function Card({
  children,
  className,
  interactive = false,
  onClick,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={cx(
        "rounded-xl p-4",
        surface.base,
        interactive &&
          "transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Grid({
  cols = 3,
  children,
  className,
}: {
  /** máximo de colunas em telas largas (1–4) */
  cols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  const map = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
  } as const;
  return <div className={cx("grid gap-3", map[cols], className)}>{children}</div>;
}

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx("h-px bg-zinc-800 my-3", className)} />;
}
