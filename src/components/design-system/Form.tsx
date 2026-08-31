"use client";

/**
 * Design System — Inputs, Selects, SearchInput e Field.
 */

import React from "react";
import { cx } from "./tokens";
import { Icon } from "./Icons";

const FIELD_BASE =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 " +
  "placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      {label && (
        <span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>
      )}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Input({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(FIELD_BASE, className)} />;
}

export function Select({
  options,
  className,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={cx(FIELD_BASE, "appearance-none pr-9 cursor-pointer", className)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500"
      />
    </div>
  );
}

export function SearchInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx("relative", className)}>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
      />
      <input {...rest} className={cx(FIELD_BASE, "pl-9")} />
    </div>
  );
}
