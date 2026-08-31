"use client";

import { Card, MetricTile, ProgressBar } from "./shared";
import type { EngineeringData } from "./types";

export function HealthCard({ data }: { data: EngineeringData }) {
  const health = data.codeHealth as {
    overallHealth?: { score?: number; grade?: string; trend?: string };
    scores?: Record<string, number>;
  } | null;

  if (!health) {
    return <Card title="Code Health"><p className="text-sm text-zinc-500">code-health.json não carregado.</p></Card>;
  }

  const dims: Array<[string, string]> = [
    ["arquitetura", "Arquitetura"],
    ["qualidade", "Qualidade"],
    ["escalabilidade", "Escalabilidade"],
    ["legibilidade", "Legibilidade"],
    ["modularizacao", "Modularização"],
    ["acoplamento", "Acoplamento"],
    ["organizacao", "Organização"],
    ["manutenibilidade", "Manutenibilidade"],
  ];

  return (
    <Card title="Code Health" subtitle={`Grade ${health.overallHealth?.grade ?? "—"} · ${health.overallHealth?.trend ?? ""}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Score" value={`${health.overallHealth?.score ?? "—"}/100`} />
        <MetricTile label="Grade" value={health.overallHealth?.grade ?? "—"} />
        <MetricTile label="Tendência" value={health.overallHealth?.trend ?? "—"} />
        <MetricTile label="CTO Score" value={(data.ctoReport as { scores?: { overall?: { score?: number } } })?.scores?.overall?.score ?? "—"} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {dims.map(([key, label]) => (
          <ProgressBar key={key} value={health.scores?.[key] ?? 0} label={label} />
        ))}
      </div>
    </Card>
  );
}
