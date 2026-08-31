"use client";

import { Card, MetricTile, Badge, ProgressBar, DataTable } from "./shared";
import type { EngineeringData } from "./types";

export function ExecutionCard({ data }: { data: EngineeringData }) {
  const exec = data.executionStatus as {
    currentSprint?: { name?: string; progressPercent?: number };
    currentPR?: { id?: string; name?: string; status?: string };
    currentCommit?: { id?: string; title?: string; filesPending?: number };
    summary?: { overallProgressPercent?: number; commitsCompleted?: number; commitsTotal?: number };
    nextAction?: { action?: string; detail?: string };
    blockers?: Array<{ severity?: string; message?: string }>;
    timeline?: Array<{ label?: string; percent?: number; bar?: string }>;
  } | null;

  if (!exec) {
    return <Card title="Execução"><p className="text-sm text-zinc-500">execution-status.json não carregado.</p></Card>;
  }

  return (
    <Card title="Execution Manager" subtitle="Sprint, PR e commit atual">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricTile label="Sprint" value={exec.currentSprint?.name ?? "—"} />
        <MetricTile label="PR" value={exec.currentPR?.id ?? "—"} sub={exec.currentPR?.name} />
        <MetricTile label="Commit" value={exec.currentCommit?.id ?? "—"} sub={exec.currentCommit?.title} />
      </div>
      <div className="mt-4">
        <ProgressBar
          value={exec.summary?.overallProgressPercent ?? 0}
          label={`Progresso ${exec.summary?.commitsCompleted ?? 0}/${exec.summary?.commitsTotal ?? 0} commits`}
        />
      </div>
      {exec.nextAction && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-300 font-medium">Próxima ação</p>
          <p className="mt-1 text-sm text-zinc-100">{exec.nextAction.action}</p>
          <p className="text-xs text-zinc-400">{exec.nextAction.detail}</p>
        </div>
      )}
      {(exec.blockers?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-zinc-400">Bloqueadores</p>
          <div className="flex flex-wrap gap-2">
            {exec.blockers!.slice(0, 5).map((b, i) => (
              <Badge key={i} tone={b.severity === "critical" ? "danger" : "warning"}>
                {b.message}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {(exec.timeline?.length ?? 0) > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-zinc-400">Timeline</p>
          {exec.timeline!.slice(0, 3).map((t, i) => (
            <div key={i} className="text-xs text-zinc-400">
              <span className="text-zinc-300">{t.label}</span> · {t.percent}%
              <pre className="mt-1 font-mono text-[10px] text-zinc-500">{t.bar}</pre>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
