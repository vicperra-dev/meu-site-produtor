"use client";

/**
 * Design System — Breadcrumb, Textarea, AuthShell, StatusPage, LinkButton.
 */

import React from "react";
import Link from "next/link";
import { cx, surface, typography } from "./tokens";
import { Icon, IconName } from "./Icons";
import type { ButtonProps } from "./Button";
import { Card } from "./Layout";
import { Callout } from "./Feedback";
import { COPY } from "./copy";

export function Breadcrumb({
  items,
  className,
}: {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cx("flex flex-wrap items-center gap-1.5 text-xs", className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <Icon name="chevron-right" className="w-3 h-3 text-zinc-600 flex-shrink-0" />
            )}
            {item.href && !last ? (
              <Link
                href={item.href}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-zinc-300 font-medium" : "text-zinc-500"}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cx(
        "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100",
        "placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors",
        "min-h-[96px] resize-y",
        className
      )}
    />
  );
}

const LINK_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-900/30",
  secondary:
    "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
  danger: "bg-red-700 hover:bg-red-600 text-white",
  success: "bg-emerald-600 hover:bg-emerald-500 text-white",
  outline:
    "bg-transparent border border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800/60 text-zinc-200",
  ghost: "bg-transparent hover:bg-zinc-800/70 text-zinc-300 hover:text-zinc-100",
};

const LINK_SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  xs: "px-2.5 py-1 text-xs gap-1",
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

/** Link com aparência de botão do Design System (HTML semântico correto). */
export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "sm",
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:ring-red-400",
        LINK_VARIANTS[variant ?? "primary"],
        LINK_SIZES[size ?? "sm"],
        className
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Shell de páginas de autenticação. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  backgroundImage,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backgroundImage?: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12 text-zinc-100 overflow-x-hidden">
      {backgroundImage && (
        <div
          className="fixed inset-0 z-0 bg-no-repeat bg-zinc-900 page-bg-image"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            ["--page-bg-size" as string]: "cover",
            ["--page-bg-position" as string]: "center center",
          }}
          aria-hidden
        />
      )}
      {!backgroundImage && <div className="fixed inset-0 z-0 bg-zinc-950" aria-hidden />}
      <div className="relative z-10 w-full max-w-md space-y-5">
        <div className="text-center space-y-1.5">
          <h1 className={typography.pageTitle}>{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
        </div>
        <div className={cx("rounded-xl p-4 sm:p-5", surface.raised, "border-zinc-700/80")}>
          {children}
        </div>
        {footer}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Icon name="chevron-right" className="w-3 h-3 rotate-180" />
            {COPY.actions.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Página de status (pagamento sucesso/falha/pendente). */
export function StatusPage({
  intent,
  icon,
  title,
  description,
  children,
  actions,
}: {
  intent: "success" | "error" | "warning" | "info";
  icon: IconName;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const ring =
    intent === "success"
      ? "bg-emerald-500/15 text-emerald-300"
      : intent === "error"
      ? "bg-red-500/15 text-red-300"
      : intent === "warning"
      ? "bg-amber-500/15 text-amber-300"
      : "bg-sky-500/15 text-sky-300";
  const titleColor =
    intent === "success"
      ? "text-emerald-300"
      : intent === "error"
      ? "text-red-300"
      : intent === "warning"
      ? "text-amber-300"
      : "text-sky-300";

  return (
    <main className="mx-auto max-w-xl px-4 sm:px-6 py-14 sm:py-16 text-zinc-100">
      <div className="text-center space-y-5">
        <span
          className={cx(
            "inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full",
            ring
          )}
        >
          <Icon name={icon} className="w-8 h-8 sm:w-10 sm:h-10" />
        </span>
        <h1 className={cx("text-2xl sm:text-3xl font-bold", titleColor)}>{title}</h1>
        {description && <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>}
        {children && <div className="text-left space-y-3">{children}</div>}
        {actions && (
          <div className="flex flex-wrap gap-3 justify-center pt-2">{actions}</div>
        )}
      </div>
    </main>
  );
}

export function ComingSoon({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <Card className="text-center space-y-4 py-10">
      <span className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 mx-auto">
        <Icon name="sparkles" className="w-6 h-6" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        {description && <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">{description}</p>}
      </div>
      <Callout intent="info" className="text-left">
        Esta área estará disponível em breve. Enquanto isso, você já pode agendar serviços e
        assinar planos.
      </Callout>
      {actions && <div className="flex flex-wrap gap-2 justify-center">{actions}</div>}
    </Card>
  );
}
