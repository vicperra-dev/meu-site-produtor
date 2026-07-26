"use client";

/**
 * Design System — Badges e Tags padronizados.
 * GO-H9: mapeamento único de status → paleta oficial.
 */

import React from "react";
import { cx, Intent, intentClasses } from "./tokens";
import { statusVisualMeta } from "@/app/lib/ui/status-palette";

export function Badge({
  intent = "neutral",
  children,
  dot = false,
  className,
}: {
  intent?: Intent;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const c = intentClasses[intent] ?? intentClasses.neutral;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        c.text,
        c.bg,
        c.border,
        className
      )}
    >
      {dot && <span className={cx("w-1.5 h-1.5 rounded-full", c.dot)} />}
      {children}
    </span>
  );
}

export function Tag({
  intent = "neutral",
  children,
  className,
}: {
  intent?: Intent;
  children: React.ReactNode;
  className?: string;
}) {
  const c = intentClasses[intent] ?? intentClasses.neutral;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
        c.text,
        c.bg,
        className
      )}
    >
      {children}
    </span>
  );
}

/** @deprecated Use statusVisualMeta — mantido para compatibilidade de imports. */
export const STATUS_INTENT: Record<string, { label: string; intent: Intent }> = {
  pendente: { label: "Pendente", intent: "pending" },
  aceito: { label: "Aceito", intent: "success" },
  confirmado: { label: "Aceito", intent: "success" },
  em_andamento: { label: "Em andamento", intent: "warning" },
  concluido: { label: "Concluído", intent: "info" },
  recusado: { label: "Recusado", intent: "error" },
  cancelado: { label: "Cancelado", intent: "cancelled" },
  remarcado: { label: "Remarcado", intent: "cancelled" },
  approved: { label: "Aprovado", intent: "success" },
  pending: { label: "Pendente", intent: "pending" },
  rejected: { label: "Recusado", intent: "error" },
  refunded: { label: "Reembolsado", intent: "info" },
  disponivel: { label: "Disponível", intent: "success" },
  usado: { label: "Usado", intent: "neutral" },
  expirado: { label: "Expirado", intent: "error" },
  active: { label: "Ativo", intent: "success" },
  cancelled: { label: "Cancelado", intent: "cancelled" },
  respondida: { label: "Respondida", intent: "success" },
  recusada: { label: "Recusada", intent: "error" },
};

/** Badge de status pronto — recebe o status bruto do domínio. */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = statusVisualMeta(status);
  return (
    <Badge intent={meta.intent as Intent} dot className={className}>
      {meta.label}
    </Badge>
  );
}
