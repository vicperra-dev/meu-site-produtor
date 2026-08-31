"use client";

import { Card, MetricTile, ProgressBar } from "./shared";
import type { EngineeringData } from "./types";

export function CtoCard({ data }: { data: EngineeringData }) {
  const cto = data.ctoReport as {
    summary?: { headline?: string; primaryRecommendation?: string; verdict?: string };
    scores?: Record<string, { score?: number; reason?: string }>;
    priorities?: Array<{ rank?: number; title?: string; urgency?: string; effort?: string; description?: string }>;
    nextActions?: string[];
    roadmap?: { shortTerm?: Record<string, string[]>; mediumTerm?: Record<string, string[]> };
  } | null;

  if (!cto) {
    return <Card title="CTO Report"><p className="text-sm text-zinc-500">cto-report.json não carregado.</p></Card>;
  }

  const scoreEntries = Object.entries(cto.scores ?? {}).filter(([k]) => k !== "overall");

  return (
    <Card title="CTO Agent" subtitle={cto.summary?.verdict ?? ""}>
      <p className="mb-3 text-sm text-zinc-300">{cto.summary?.primaryRecommendation}</p>
      <MetricTile label="Score Geral" value={`${cto.scores?.overall?.score ?? "—"}/100`} sub={cto.scores?.overall?.reason} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {scoreEntries.slice(0, 6).map(([key, val]) => (
          <ProgressBar key={key} value={val.score ?? 0} label={key} />
        ))}
      </div>
      <div className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Prioridades</h4>
        <ol className="space-y-2 text-xs text-zinc-300">
          {(cto.priorities ?? []).slice(0, 6).map((p) => (
            <li key={p.rank}>
              <span className="font-medium text-red-400">#{p.rank}</span> {p.title}
              <span className="text-zinc-500"> · {p.urgency} · {p.effort}</span>
            </li>
          ))}
        </ol>
      </div>
      {(cto.nextActions?.length ?? 0) > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Próximos passos</h4>
          <ul className="space-y-1 text-xs text-zinc-400">
            {cto.nextActions!.map((a, i) => (
              <li key={i}>→ {a}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
