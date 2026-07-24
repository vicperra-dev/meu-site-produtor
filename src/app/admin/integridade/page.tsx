"use client";

/**
 * GO-H8B/H8C — Auditor e reparo de integridade do domínio.
 */
import { useCallback, useState } from "react";
import {
  PageHeader,
  Card,
  Section,
  Button,
  Badge,
  Callout,
  LoadingBlock,
} from "@/components/design-system";

type Finding = {
  code: string;
  severity: "high" | "medium" | "info";
  label: string;
  count: number;
  sampleIds: string[];
};

type Report = {
  generatedAt: string;
  findings: Finding[];
  totalIssues: number;
  highCount?: number;
  mediumCount?: number;
  infoCount?: number;
  ok: boolean;
  historyModel?: string;
};

type RepairReport = {
  generatedAt: string;
  actions: Array<{ code: string; description: string; affected: number }>;
  before: Report;
  after: Report;
};

function badgeIntent(severity: Finding["severity"]) {
  if (severity === "high") return "error" as const;
  if (severity === "medium") return "warning" as const;
  return "info" as const;
}

export default function IntegridadeAdminPage() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [repair, setRepair] = useState<RepairReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audit = useCallback(async () => {
    setBusy(true);
    setError(null);
    setRepair(null);
    try {
      const res = await fetch("/api/admin/integridade", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha na auditoria.");
        return;
      }
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }, []);

  const reparar = useCallback(async () => {
    if (
      !window.confirm(
        "Reparar integridade?\nApenas FKs stale e sync de fase serão corrigidos.\nHistory/Sync (log imutável) NÃO são apagados.\nNenhum Pedido Raiz válido será removido."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integridade/reparar", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha no reparo.");
        return;
      }
      setRepair(data.report);
      setReport(data.report.after);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }, []);

  const highs = report?.findings.filter((f) => f.severity === "high") || [];
  const mediums = report?.findings.filter((f) => f.severity === "medium") || [];
  const infos = report?.findings.filter((f) => f.severity === "info") || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integridade do Domínio"
        subtitle="GO-H8C: Alta/Média = inconsistência · Informativo = History imutável (Modelo A)."
      />

      <Callout intent="info">
        History é log permanente de auditoria: a entidade pode sumir e o registro permanece.
        Isso não é erro. Alta/Média exigem ação; Informativo é rastreabilidade.
      </Callout>

      <Card>
        <Section title="Ações">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" loading={busy} onClick={() => void audit()}>
              Verificar Integridade
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void reparar()}
              className="!border-amber-800 !text-amber-200"
            >
              Reparar Integridade
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </Section>
      </Card>

      {busy && !report && <LoadingBlock />}

      {report && (
        <Card>
          <Section title="Resultado da auditoria">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge intent={report.ok ? "success" : "error"}>
                {report.ok ? "ÍNTEGRO (Alta+Média=0)" : "ISSUES"}
              </Badge>
              <span className="text-xs text-zinc-500">{report.generatedAt}</span>
              <span className="text-sm text-zinc-300">
                Alta {report.highCount ?? highs.reduce((a, f) => a + f.count, 0)} · Média{" "}
                {report.mediumCount ?? mediums.reduce((a, f) => a + f.count, 0)} · Info{" "}
                {report.infoCount ?? infos.reduce((a, f) => a + f.count, 0)}
              </span>
            </div>

            {(
              [
                ["Alta severidade", highs],
                ["Média severidade", mediums],
                ["Informativo", infos],
              ] as const
            ).map(([title, list]) => (
              <div key={title} className="mb-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">{title}</h3>
                {list.length === 0 ? (
                  <p className="text-sm text-emerald-300/90">0 ocorrências — PASS</p>
                ) : (
                  <div className="space-y-3">
                    {list.map((f) => (
                      <div
                        key={f.code}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge intent={badgeIntent(f.severity)}>{f.severity}</Badge>
                          <span className="font-medium text-zinc-100">{f.label}</span>
                          <span className="text-zinc-500">×{f.count}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 font-mono">{f.code}</p>
                        {f.sampleIds.length > 0 && (
                          <p className="mt-1 text-xs text-zinc-400 break-all">
                            Amostra: {f.sampleIds.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>
        </Card>
      )}

      {repair && (
        <Card>
          <Section title="Relatório do reparo">
            <p className="text-xs text-zinc-500 mb-3">{repair.generatedAt}</p>
            {repair.actions.length === 0 ? (
              <p className="text-sm text-zinc-400">Nenhuma ação necessária.</p>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-300">
                {repair.actions.map((a) => (
                  <li key={a.code}>
                    <span className="text-amber-200">{a.affected}</span> — {a.description}{" "}
                    <span className="text-zinc-600 font-mono text-xs">({a.code})</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm">
              Issues (Alta+Média) antes: {repair.before.totalIssues} · depois:{" "}
              {repair.after.totalIssues}{" "}
              <Badge intent={repair.after.ok ? "success" : "warning"}>
                {repair.after.ok ? "OK" : "RESTANTE"}
              </Badge>
            </p>
          </Section>
        </Card>
      )}
    </div>
  );
}
