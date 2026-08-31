"use client";

/**
 * Portal do Cliente — Histórico unificado e pesquisável.
 * Une pagamentos, agendamentos, cupons, planos e reembolsos já
 * retornados por /api/meus-dados. Busca + filtros client-side.
 */

import { useMemo, useState } from "react";
import {
  Card,
  EmptyState,
  Icon,
  IconName,
  SearchInput,
  Section,
  Select,
  StatusBadge,
  Tag,
  Toolbar,
  formatBRL,
  formatDateTime,
  Intent,
} from "@/components/design-system";
import type { PortalData } from "./types";
import { isRefundFamilyCoupon } from "./helpers";

type HistoryKind =
  | "pagamento"
  | "agendamento"
  | "cupom"
  | "plano"
  | "reembolso";

interface HistoryRow {
  key: string;
  kind: HistoryKind;
  icon: IconName;
  intent: Intent;
  title: string;
  detail?: string;
  status?: string;
  amount?: number;
  date: string; // ISO
}

const KIND_LABEL: Record<HistoryKind, string> = {
  pagamento: "Pagamento",
  agendamento: "Agendamento",
  cupom: "Cupom",
  plano: "Plano",
  reembolso: "Reembolso",
};

export function buildHistory(data: PortalData): HistoryRow[] {
  const rows: HistoryRow[] = [];

  for (const p of data.pagamentos ?? []) {
    rows.push({
      key: `pay-${p.id}`,
      kind: "pagamento",
      icon: "credit-card",
      intent: p.status === "approved" ? "success" : p.status === "rejected" ? "error" : "pending",
      title: `Pagamento ${p.type === "plano" ? "de plano" : p.type === "agendamento" ? "de agendamento" : ""}`.trim(),
      detail: p.paymentMethod || undefined,
      status: p.status,
      amount: p.amount,
      date: p.createdAt,
    });
  }

  for (const a of data.agendamentos) {
    rows.push({
      key: `apt-${a.id}`,
      kind: "agendamento",
      icon: "calendar",
      intent:
        a.status === "concluido"
          ? "success"
          : a.status === "cancelado" || a.status === "recusado"
          ? "error"
          : a.status === "pendente"
          ? "pending"
          : "info",
      title: a.tipo,
      detail: `${a.duracaoMinutos} min`,
      status: a.status,
      amount: a.pagamento?.amount,
      date: a.data,
    });
    if (a.refundProcessedAt && a.cancelRefundOption === "reembolso") {
      rows.push({
        key: `apt-refund-${a.id}`,
        kind: "reembolso",
        icon: "wallet",
        intent: "info",
        title: `Reembolso do agendamento ${a.tipo}`,
        detail: "Reembolso direto solicitado",
        status: "refunded",
        amount: a.pagamento?.amount,
        date: a.refundProcessedAt,
      });
    }
  }

  for (const c of data.cupons) {
    rows.push({
      key: `coupon-${c.id}`,
      kind: isRefundFamilyCoupon(c) ? "reembolso" : "cupom",
      icon: "ticket",
      intent: c.status === "disponivel" ? "success" : c.status === "expirado" ? "error" : "neutral",
      title: `Cupom ${c.code}`,
      detail: c.serviceType || undefined,
      status: c.status,
      amount: c.discountType === "fixed" ? c.discountValue : undefined,
      date: c.createdAt || new Date(0).toISOString(),
    });
  }

  for (const pl of data.planos) {
    rows.push({
      key: `plan-${pl.id}`,
      kind: "plano",
      icon: "box",
      intent: pl.ativo ? "success" : "neutral",
      title: `Plano ${pl.planName}`,
      detail: pl.modo === "mensal" ? "Mensal" : "Anual",
      status: pl.status,
      amount: pl.amount,
      date: pl.startDate,
    });
    if (pl.refundProcessedAt) {
      rows.push({
        key: `plan-refund-${pl.id}`,
        kind: "reembolso",
        icon: "wallet",
        intent: "info",
        title: `Reembolso do plano ${pl.planName}`,
        status: "refunded",
        date: pl.refundProcessedAt,
      });
    }
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

export function HistorySection({ data }: { data: PortalData }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const all = useMemo(() => buildHistory(data), [data]);

  const statusOptions = useMemo(() => {
    const set = new Set(all.map((r) => r.status).filter(Boolean) as string[]);
    return ["todos", ...Array.from(set)];
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = all;
    if (kind !== "todos") rows = rows.filter((r) => r.kind === kind);
    if (status !== "todos") rows = rows.filter((r) => r.status === status);
    if (q) {
      rows = rows.filter((r) =>
        [r.title, r.detail, r.status, KIND_LABEL[r.kind]]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    }
    if (order === "asc") rows = [...rows].reverse();
    return rows;
  }, [all, query, kind, status, order]);

  return (
    <Section
      title="Histórico"
      icon="history"
      description="Todos os seus pagamentos, serviços, agendamentos, cupons e reembolsos em um só lugar."
    >
      <Toolbar>
        <SearchInput
          placeholder="Buscar no histórico..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-44"
        />
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={[
            { value: "todos", label: "Todos os tipos" },
            { value: "pagamento", label: "Pagamentos" },
            { value: "agendamento", label: "Agendamentos" },
            { value: "cupom", label: "Cupons" },
            { value: "plano", label: "Planos" },
            { value: "reembolso", label: "Reembolsos" },
          ]}
          className="!w-auto"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={statusOptions.map((s) => ({
            value: s,
            label: s === "todos" ? "Todos os status" : s,
          }))}
          className="!w-auto"
        />
        <Select
          value={order}
          onChange={(e) => setOrder(e.target.value as "desc" | "asc")}
          options={[
            { value: "desc", label: "Mais recentes" },
            { value: "asc", label: "Mais antigos" },
          ]}
          className="!w-auto"
        />
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon="history"
          title="Nada encontrado"
          description="Ajuste a busca ou os filtros para ver outros registros."
        />
      ) : (
        <Card className="!p-0 divide-y divide-zinc-800">
          {filtered.map((r) => (
            <div key={r.key} className="flex items-center gap-3 px-4 py-3">
              <span className="flex w-9 h-9 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 flex-shrink-0">
                <Icon name={r.icon} className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-100 truncate">{r.title}</p>
                  <Tag intent={r.intent}>{KIND_LABEL[r.kind]}</Tag>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {formatDateTime(r.date)}
                  {r.detail ? ` · ${r.detail}` : ""}
                </p>
              </div>
              {typeof r.amount === "number" && (
                <span className="text-sm font-semibold text-zinc-200 whitespace-nowrap">
                  {formatBRL(r.amount)}
                </span>
              )}
              {r.status && <StatusBadge status={r.status} className="hidden sm:inline-flex" />}
            </div>
          ))}
        </Card>
      )}
    </Section>
  );
}
