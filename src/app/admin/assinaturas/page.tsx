"use client";

/**
 * GO-H10C — Administração de Assinaturas.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Card,
  LoadingBlock,
  PageHeader,
  Section,
  formatBRL,
  formatDate,
} from "@/components/design-system";

type Row = {
  id: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  nextBillingDate: string;
  cyclesRemaining: number | null;
  failureCount: number;
  asaasSubscriptionId: string | null;
  user: { email: string; nomeArtistico: string };
  userPlan: {
    planName: string;
    modo: string;
    amount: number;
    status: string;
    refundAmount: number | null;
    refundAsaasStatus: string | null;
  };
};

export default function AdminAssinaturasPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/assinaturas", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao carregar");
        return;
      }
      setRows(data.subscriptions || []);
      setTotals(data.totals || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        subtitle="Ciclo comercial (renovações, inadimplência, cancelamentos e reembolsos). Benefícios não são editados aqui."
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge intent="success">Ativas: {totals.active ?? 0}</Badge>
        <Badge intent="warning">Inadimplentes: {totals.delinquent ?? 0}</Badge>
        <Badge intent="error">Suspensas: {totals.suspended ?? 0}</Badge>
        <Badge intent="neutral">Canceladas: {totals.cancelled ?? 0}</Badge>
      </div>

      {loading ? (
        <LoadingBlock label="Carregando assinaturas…" />
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : (
        <Section title="Histórico">
          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma assinatura registrada.</p>
            ) : (
              rows.map((r) => (
                <Card key={r.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-zinc-100">
                          {r.userPlan.planName}
                        </span>
                        <Badge>{r.statusLabel}</Badge>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {r.user.nomeArtistico} · {r.user.email}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {r.userPlan.modo} · {formatBRL(r.userPlan.amount)} ·{" "}
                        {r.paymentMethod} · próxima cobrança{" "}
                        {formatDate(r.nextBillingDate)}
                        {r.cyclesRemaining != null
                          ? ` · ciclos restantes ${r.cyclesRemaining}`
                          : ""}
                        {r.failureCount > 0 ? ` · falhas ${r.failureCount}` : ""}
                      </p>
                      {r.asaasSubscriptionId && (
                        <p className="text-[11px] text-zinc-600">
                          Asaas: {r.asaasSubscriptionId}
                        </p>
                      )}
                      {r.userPlan.refundAmount != null && (
                        <p className="text-xs text-amber-200">
                          Reembolso: {formatBRL(r.userPlan.refundAmount)} (
                          {r.userPlan.refundAsaasStatus || "—"})
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
