"use client";

import { Card, MetricTile, Badge, statusTone } from "./shared";
import type { EngineeringData } from "./types";
import { parseDecisionStatus } from "@/app/lib/engineering-dashboard-shared";

export function EngineeringOverviewCard({ data }: { data: EngineeringData }) {
  const latest = data.latest as { summary?: { errors?: number; warnings?: number; info?: number }; generatedAt?: string } | null;
  const health = data.codeHealth as { summary?: { codeHealthScore?: number; grade?: string }; metrics?: { totalFiles?: number; totalLines?: number } } | null;
  const exec = data.executionStatus as {
    currentSprint?: { name?: string };
    currentPR?: { id?: string; name?: string };
    currentCommit?: { id?: string; title?: string };
    summary?: { deployReady?: boolean };
  } | null;
  const refactor = data.refactorReport as { summary?: { technicalDebtScore?: number } } | null;
  const cto = data.ctoReport as { health?: { deploy?: { ready?: boolean } }; currentState?: { pendingFiles?: number } } | null;
  const decision = parseDecisionStatus(data.decisionMd, data.decisionJson);
  const guardianStatus = (latest?.summary?.errors ?? 0) === 0 ? "HEALTHY" : "UNHEALTHY";

  return (
    <Card title="Visão Geral" subtitle="Painel consolidado dos agentes THouse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="Guardian" value={guardianStatus} sub={`${latest?.summary?.errors ?? 0} erros`} />
        <MetricTile label="Health Score" value={`${health?.summary?.codeHealthScore ?? "—"}/100`} sub={health?.summary?.grade ?? ""} />
        <MetricTile label="Decision" value={decision} />
        <MetricTile label="Sprint" value={exec?.currentSprint?.name?.replace("Sprint 1 — ", "S1 · ") ?? "—"} />
        <MetricTile label="PR atual" value={exec?.currentPR?.id ?? "—"} sub={exec?.currentPR?.name} />
        <MetricTile label="Commit" value={exec?.currentCommit?.id ?? "—"} sub={exec?.currentCommit?.title} />
        <MetricTile
          label="Deploy Ready"
          value={cto?.health?.deploy?.ready || exec?.summary?.deployReady ? "Sim" : "Não"}
        />
        <MetricTile label="Technical Debt" value={`${refactor?.summary?.technicalDebtScore ?? "—"}/100`} />
        <MetricTile label="Arquivos" value={health?.metrics?.totalFiles ?? cto?.currentState?.pendingFiles ?? "—"} />
        <MetricTile label="Linhas" value={(health?.metrics?.totalLines ?? 0).toLocaleString("pt-BR")} />
        <MetricTile label="Críticos" value={cto?.currentState?.pendingFiles ?? "—"} sub="arquivos pendentes" />
        <MetricTile
          label="Última execução"
          value={latest?.generatedAt ? new Date(latest.generatedAt).toLocaleString("pt-BR") : "—"}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={statusTone(guardianStatus)}>Guardian {guardianStatus}</Badge>
        <Badge tone={statusTone(decision)}>Decision {decision}</Badge>
        <Badge tone={cto?.health?.deploy?.ready ? "success" : "danger"}>
          Deploy {cto?.health?.deploy?.ready ? "Ready" : "Blocked"}
        </Badge>
      </div>
    </Card>
  );
}
