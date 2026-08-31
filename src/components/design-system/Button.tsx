"use client";

/**
 * Design System — Botões padronizados.
 * Variantes: primary, secondary, danger, success, outline, ghost.
 */

import React from "react";
import { cx } from "./tokens";
import { Icon, IconName } from "./Icons";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "outline"
  | "ghost";

export type ButtonSize = "xs" | "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-900/30 focus-visible:ring-red-400",
  secondary:
    "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 focus-visible:ring-zinc-400",
  danger:
    "bg-red-700 hover:bg-red-600 text-white focus-visible:ring-red-400",
  success:
    "bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-400",
  outline:
    "bg-transparent border border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800/60 text-zinc-200 focus-visible:ring-zinc-400",
  ghost:
    "bg-transparent hover:bg-zinc-800/70 text-zinc-300 hover:text-zinc-100 focus-visible:ring-zinc-500",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-xs gap-1",
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "secondary",
  size = "sm",
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon && <Icon name={icon} className="w-3.5 h-3.5" />
      )}
      {children}
      {iconRight && !loading && <Icon name={iconRight} className="w-3.5 h-3.5" />}
    </button>
  );
}
