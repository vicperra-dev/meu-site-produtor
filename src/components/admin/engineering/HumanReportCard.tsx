"use client";

import { Card } from "./shared";
import type { EngineeringData } from "./types";

export function HumanReportCard({ data }: { data: EngineeringData }) {
  const human = data.humanReport as {
    summary?: {
      headline?: string;
      productionReady?: boolean;
      productionReadyReason?: string;
      guardianStatus?: string;
      decisionStatus?: string;
    };
    changes?: Array<{
      title?: string;
      benefits?: string[];
      userImpact?: string;
      adminImpact?: string;
      whatChanged?: string;
    }>;
    executiveSummary?: string;
  } | null;

  if (!human) {
    return <Card title="Human Report"><p className="text-sm text-zinc-500">project-report.json não carregado.</p></Card>;
  }

  return (
    <Card title="Human Report" subtitle="Relatório para o proprietário do projeto">
      <p className="text-sm text-zinc-300">{human.executiveSummary ?? human.summary?.headline}</p>
      {human.summary?.productionReadyReason && (
        <p className="mt-2 text-xs text-amber-400">{human.summary.productionReadyReason}</p>
      )}
      <div className="mt-4 space-y-4">
        {(human.changes ?? []).slice(0, 4).map((c, i) => (
          <div key={i} className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3">
            <p className="text-sm font-medium text-zinc-100">{c.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{c.whatChanged}</p>
            {(c.benefits?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-emerald-400/90">
                {c.benefits!.slice(0, 3).map((b, j) => (
                  <li key={j}>+ {b}</li>
                ))}
              </ul>
            )}
            {c.userImpact && (
              <p className="mt-2 text-xs text-zinc-500"><strong className="text-zinc-400">Cliente:</strong> {c.userImpact}</p>
            )}
            {c.adminImpact && (
              <p className="mt-1 text-xs text-zinc-500"><strong className="text-zinc-400">Admin:</strong> {c.adminImpact}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
