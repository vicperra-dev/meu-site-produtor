"use client";

/**
 * GO-03A/F — Badges de domínio operacional.
 * Visual unificado via Design System (Badge / StatusBadge / Tag).
 */

import {
  Badge,
  StatusBadge as DsStatusBadge,
  Tag,
  formatBRL,
  type Intent,
} from "@/components/design-system";
import { Icons, paymentMeta, statusMetaFor } from "./meta";

const STATUS_SINGULAR: Record<string, string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  confirmado: "Aceito",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  recusado: "Recusado",
  remarcado: "Remarcado",
};

const STATUS_INTENT: Record<string, Intent> = {
  pendente: "pending",
  aceito: "success",
  confirmado: "success",
  em_andamento: "warning",
  concluido: "info",
  cancelado: "cancelled",
  recusado: "error",
  remarcado: "cancelled",
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const label = STATUS_SINGULAR[status];
  if (!label) return <DsStatusBadge status={status} className={className} />;
  const m = statusMetaFor(status);
  const Icon = Icons[m.icon];
  return (
    <Badge intent={STATUS_INTENT[status] ?? "neutral"} className={className}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

export function PaymentBadge({
  status,
  amount,
  className = "",
}: {
  status?: string | null;
  amount?: number;
  className?: string;
}) {
  const m = paymentMeta(status);
  const intent: Intent =
    status === "approved"
      ? "success"
      : status === "rejected"
      ? "error"
      : status === "refunded"
      ? "info"
      : "pending";
  return (
    <Badge intent={intent} className={className}>
      <Icons.card className="w-3 h-3" />
      {m.label}
      {typeof amount === "number" && (
        <span className="font-normal opacity-80">· {formatBRL(amount)}</span>
      )}
    </Badge>
  );
}

export function DeliveryBadge({ delivered, className = "" }: { delivered: boolean; className?: string }) {
  return delivered ? (
    <Tag intent="info" className={className}>
      <span className="inline-flex items-center gap-1">
        <Icons.music className="w-3 h-3" />
        Arquivo entregue
      </span>
    </Tag>
  ) : (
    <Tag intent="neutral" className={className}>
      <span className="inline-flex items-center gap-1">
        <Icons.file className="w-3 h-3" />
        Sem entrega
      </span>
    </Tag>
  );
}
