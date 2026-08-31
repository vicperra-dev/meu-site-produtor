"use client";

import { Card, DataTable } from "./shared";
import type { EngineeringData } from "./types";

export function TimelineCard({ data }: { data: EngineeringData }) {
  const health = data.codeHealth as {
    timeline?: { snapshots?: Array<{ generatedAt?: string; codeHealthScore?: number; grade?: string; technicalDebt?: number }>; guardianTrend?: string };
  } | null;
  const evolution = data.evolutionReport as {
    timeline?: Array<{ label?: string; description?: string; items?: string[] }>;
  } | null;
  const memory = data.memory as { guardianRuns?: Array<{ generatedAt?: string; errors?: number; status?: string }> } | null;

  const snapshots = health?.timeline?.snapshots ?? [];
  const evoTimeline = evolution?.timeline ?? [];
  const guardianRuns = (memory?.guardianRuns ?? []).slice(-5);

  return (
    <Card title="Timeline" subtitle="Evolução de health, Guardian e projeto">
      {snapshots.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Code Health Snapshots</h4>
          <DataTable
            headers={["Data", "Score", "Grade", "Dívida"]}
            rows={snapshots.slice(-8).map((s) => [
              s.generatedAt?.slice(0, 10) ?? "",
              s.codeHealthScore ?? "",
              s.grade ?? "",
              s.technicalDebt ?? "",
            ])}
          />
        </div>
      )}
      {evoTimeline.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Evolution Report</h4>
          {evoTimeline.map((step, i) => (
            <div key={i} className="mb-3 rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3">
              <p className="text-sm font-medium text-zinc-200">{step.label}</p>
              <p className="text-xs text-zinc-500">{step.description}</p>
              <ul className="mt-2 space-y-0.5 text-xs text-zinc-400">
                {(step.items ?? []).slice(0, 4).map((item, j) => (
                  <li key={j}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {guardianRuns.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Guardian Runs (memory)</h4>
          <DataTable
            headers={["Data", "Status", "Errors"]}
            rows={guardianRuns.map((r) => [
              r.generatedAt ? new Date(r.generatedAt).toLocaleString("pt-BR") : "",
              r.status ?? "",
              r.errors ?? 0,
            ])}
          />
        </div>
      )}
    </Card>
  );
}
