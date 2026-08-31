"use client";

import { Card } from "./shared";
import type { EngineeringData } from "./types";

export function RoadmapCard({ data }: { data: EngineeringData }) {
  const stab = data.stabilizationPlan as {
    roadmap?: Record<string, { name?: string; goals?: string[]; deliverables?: string[] }>;
    criticalPath?: string[];
  } | null;
  const cto = data.ctoReport as {
    roadmap?: { shortTerm?: Record<string, string[]>; mediumTerm?: Record<string, string[]>; longTerm?: Record<string, string[]> };
    priorities?: Array<{ rank?: number; title?: string; urgency?: string }>;
  } | null;
  const health = data.codeHealth as { roadmap?: { shortTerm?: string[]; mediumTerm?: string[]; longTerm?: string[] } } | null;

  return (
    <Card title="Roadmap" subtitle="Estabilização, refatoração e CTO">
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-red-400">Curto prazo</h4>
          <ul className="space-y-1 text-xs text-zinc-300">
            {(health?.roadmap?.shortTerm ?? []).map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
            {Object.values(cto?.roadmap?.shortTerm ?? {}).flat().slice(0, 4).map((item, i) => (
              <li key={`cto-s-${i}`}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-amber-400">Médio prazo</h4>
          <ul className="space-y-1 text-xs text-zinc-300">
            {(health?.roadmap?.mediumTerm ?? []).map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
            {stab?.roadmap?.sprint2?.goals?.map((g, i) => (
              <li key={`s2-${i}`}>• {g}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-emerald-400">Longo prazo</h4>
          <ul className="space-y-1 text-xs text-zinc-300">
            {(health?.roadmap?.longTerm ?? []).map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
            {stab?.roadmap?.sprint4?.goals?.map((g, i) => (
              <li key={`s4-${i}`}>• {g}</li>
            ))}
          </ul>
        </div>
      </div>
      {stab?.criticalPath && (
        <div className="mt-4 border-t border-zinc-700 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Caminho crítico</h4>
          <ol className="space-y-1 text-xs text-zinc-400">
            {stab.criticalPath.map((step, i) => (
              <li key={i}>{i + 1}. {step}</li>
            ))}
          </ol>
        </div>
      )}
      {(cto?.priorities?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-zinc-700 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Prioridades CTO</h4>
          <ul className="space-y-1 text-xs text-zinc-300">
            {cto!.priorities!.slice(0, 5).map((p) => (
              <li key={p.rank}>#{p.rank} {p.title} <span className="text-zinc-500">({p.urgency})</span></li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
