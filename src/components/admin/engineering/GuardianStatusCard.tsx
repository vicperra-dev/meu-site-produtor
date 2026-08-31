"use client";

import { Card, MetricTile, Badge, DataTable, statusTone } from "./shared";
import type { EngineeringData } from "./types";

export function GuardianStatusCard({ data }: { data: EngineeringData }) {
  const latest = data.latest as {
    summary?: { errors?: number; warnings?: number; info?: number; checks?: number };
    generatedAt?: string;
    executionMs?: number;
    results?: Array<{ code: string; severity: string; errorCount: number; warningCount: number }>;
  } | null;

  const errors = latest?.summary?.errors ?? 0;
  const warnings = latest?.summary?.warnings ?? 0;
  const info = latest?.summary?.info ?? 0;
  const status = errors === 0 ? "HEALTHY" : "UNHEALTHY";
  const checks = latest?.results ?? [];

  return (
    <Card title="Domain Guardian" subtitle="Última verificação automática">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Errors" value={errors} />
        <MetricTile label="Warnings" value={warnings} />
        <MetricTile label="Info" value={info} />
        <MetricTile label="Status" value={status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={statusTone(status)}>{status}</Badge>
        <Badge tone="info">{latest?.summary?.checks ?? checks.length} checks</Badge>
        {latest?.generatedAt && (
          <Badge tone="neutral">{new Date(latest.generatedAt).toLocaleString("pt-BR")}</Badge>
        )}
        {latest?.executionMs != null && <Badge tone="neutral">{latest.executionMs}ms</Badge>}
      </div>
      {checks.length > 0 && (
        <div className="mt-4">
          <DataTable
            headers={["Check", "Severity", "Errors", "Warnings"]}
            rows={checks.map((c) => [c.code, c.severity, c.errorCount, c.warningCount])}
          />
        </div>
      )}
    </Card>
  );
}
