"use client";

import { Card, MetricTile, DataTable } from "./shared";
import type { EngineeringData } from "./types";

export function KnowledgeGraphCard({ data, search = "" }: { data: EngineeringData; search?: string }) {
  const kg = data.knowledgeGraph as {
    summary?: {
      entitiesMapped?: number;
      filesIndexed?: number;
      apisIndexed?: number;
      flowsMapped?: number;
      guardianChecks?: number;
      adrsLinked?: number;
    };
    entities?: Array<{ name?: string; files?: string[]; apis?: string[]; flows?: string[]; guardianChecks?: string[] }>;
  } | null;

  const entities = kg?.entities ?? [];
  const q = search.toLowerCase();
  const filtered = q
    ? entities.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.files?.some((f) => f.toLowerCase().includes(q)) ||
          e.flows?.some((f) => f.toLowerCase().includes(q))
      )
    : entities;

  return (
    <Card title="Knowledge Graph" subtitle={`${kg?.summary?.entitiesMapped ?? 0} entidades · ${kg?.summary?.filesIndexed ?? 0} arquivos`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
        <MetricTile label="Entidades" value={kg?.summary?.entitiesMapped ?? 0} />
        <MetricTile label="Arquivos" value={kg?.summary?.filesIndexed ?? 0} />
        <MetricTile label="APIs" value={kg?.summary?.apisIndexed ?? 0} />
        <MetricTile label="Fluxos" value={kg?.summary?.flowsMapped ?? 0} />
        <MetricTile label="Checks" value={kg?.summary?.guardianChecks ?? 0} />
        <MetricTile label="ADRs" value={kg?.summary?.adrsLinked ?? 0} />
      </div>
      <DataTable
        headers={["Entidade", "Arquivos", "APIs", "Fluxos", "Checks"]}
        rows={filtered.map((e) => [
          e.name ?? "",
          e.files?.length ?? 0,
          e.apis?.length ?? 0,
          e.flows?.length ?? 0,
          (e.guardianChecks ?? []).join(", "),
        ])}
      />
    </Card>
  );
}
