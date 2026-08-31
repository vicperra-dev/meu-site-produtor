"use client";

import { Card, MetricTile, Badge, statusTone } from "./shared";
import type { EngineeringData } from "./types";

export function EvolutionCard({ data }: { data: EngineeringData }) {
  const evo = data.evolutionReport as {
    summary?: {
      answer?: string;
      deployReady?: boolean;
      featuresAdded?: number;
      featuresChanged?: number;
      guardianStatus?: string;
      pendingFiles?: number;
    };
    changes?: Array<{ title?: string; status?: string; benefit?: string[]; userImpact?: string }>;
    improvements?: string[];
    timeline?: Array<{ label?: string; items?: string[] }>;
  } | null;

  if (!evo) {
    return <Card title="Evolution"><p className="text-sm text-zinc-500">evolution-report.json não carregado.</p></Card>;
  }

  return (
    <Card title="Evolution Report" subtitle="O que mudou desde o último deploy">
      <p className="mb-4 text-sm text-zinc-300">{evo.summary?.answer}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <MetricTile label="Features +" value={evo.summary?.featuresAdded ?? 0} />
        <MetricTile label="Alteradas" value={evo.summary?.featuresChanged ?? 0} />
        <MetricTile label="Pendentes" value={evo.summary?.pendingFiles ?? 0} />
        <MetricTile label="Guardian" value={evo.summary?.guardianStatus ?? "—"} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone={statusTone(evo.summary?.guardianStatus ?? "")}>Guardian {evo.summary?.guardianStatus}</Badge>
        <Badge tone={evo.summary?.deployReady ? "success" : "danger"}>
          Deploy {evo.summary?.deployReady ? "Ready" : "Blocked"}
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase text-zinc-400">Mudanças</h4>
        {(evo.changes ?? []).slice(0, 5).map((c, i) => (
          <div key={i} className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3">
            <p className="text-sm font-medium text-zinc-200">{c.title}</p>
            <p className="text-xs text-zinc-500">{c.status}</p>
            {c.userImpact && <p className="mt-1 text-xs text-zinc-400">{c.userImpact}</p>}
          </div>
        ))}
      </div>
      {(evo.improvements?.length ?? 0) > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-zinc-400">
          {evo.improvements!.slice(0, 6).map((imp, i) => (
            <li key={i}>✓ {imp}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
