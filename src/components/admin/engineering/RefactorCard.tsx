"use client";

import { Card, DataTable, Badge } from "./shared";
import type { EngineeringData } from "./types";

export function RefactorCard({ data }: { data: EngineeringData }) {
  const refactor = data.refactorReport as {
    topOpportunities?: Array<{ type?: string; severity?: string; description?: string; files?: string[]; domain?: string }>;
    quickWins?: Array<{ description?: string; files?: string[] }>;
    majorRefactors?: Array<{ description?: string; severity?: string; files?: string[] }>;
    largeFiles?: Array<{ files?: string[]; metrics?: { lines?: number }; severity?: string }>;
    metrics?: { filesOver500?: number; filesOver1000?: number };
  } | null;

  if (!refactor) {
    return <Card title="Refatoração"><p className="text-sm text-zinc-500">refactor-report.json não carregado.</p></Card>;
  }

  const top = refactor.topOpportunities ?? [];
  const large = (refactor.largeFiles ?? []).slice(0, 10);

  return (
    <Card title="Refatoração" subtitle={`${refactor.metrics?.filesOver500 ?? 0} arquivos > 500 linhas`}>
      <div className="space-y-6">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Top 20 Oportunidades</h4>
          <DataTable
            headers={["#", "Tipo", "Severidade", "Domínio", "Descrição"]}
            rows={top.slice(0, 20).map((o, i) => [
              i + 1,
              o.type ?? "",
              <Badge key={i} tone={o.severity === "CRITICAL" || o.severity === "HIGH" ? "danger" : "warning"}>{o.severity}</Badge>,
              o.domain ?? "",
              (o.description ?? "").slice(0, 60),
            ])}
          />
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Quick Wins</h4>
          <ul className="space-y-1 text-sm text-zinc-300">
            {(refactor.quickWins ?? []).slice(0, 8).map((q, i) => (
              <li key={i} className="text-xs">• {q.description} <span className="text-zinc-500">({q.files?.[0]})</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Grandes Refatorações</h4>
          <ul className="space-y-1 text-sm text-zinc-300">
            {(refactor.majorRefactors ?? []).slice(0, 5).map((m, i) => (
              <li key={i} className="text-xs">• [{m.severity}] {m.description}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Arquivos Maiores</h4>
          <DataTable
            headers={["Arquivo", "Linhas", "Severidade"]}
            rows={large.map((f) => [f.files?.[0] ?? "", f.metrics?.lines ?? "—", f.severity ?? ""])}
          />
        </div>
      </div>
    </Card>
  );
}
