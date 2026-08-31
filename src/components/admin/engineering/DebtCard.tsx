"use client";

import { Card, HeatBar, DataTable } from "./shared";
import type { EngineeringData } from "./types";

const MODULE_ORDER = [
  "Financeiro",
  "Appointment",
  "Coupon",
  "MinhaConta",
  "Webhook",
  "Guardian",
  "Scripts",
  "Admin",
  "Infraestrutura",
];

const MODULE_LABELS: Record<string, string> = {
  MinhaConta: "Minha Conta",
};

export function DebtCard({ data }: { data: EngineeringData }) {
  const health = data.codeHealth as {
    technicalDebt?: { overall?: number; level?: string; byModule?: Record<string, number> };
    technicalDebtMap?: Record<string, { score?: number; issues?: number; topFiles?: string[] }>;
  } | null;
  const refactor = data.refactorReport as {
    technicalDebtMap?: Record<string, { score?: number; issues?: number; topFiles?: string[] }>;
  } | null;

  const debtMap = health?.technicalDebtMap ?? refactor?.technicalDebtMap ?? {};
  const debtOverall = (data.refactorReport as { summary?: { technicalDebtScore?: number; debtLevel?: string } } | null)?.summary;
  const byModuleDebt = health?.technicalDebt?.byModule ?? {};

  const rows = MODULE_ORDER.map((id) => {
    const entry = debtMap[id] ?? debtMap[id === "Infraestrutura" ? "Backend" : id];
    const debt = entry?.score ?? (byModuleDebt as Record<string, number>)[id] ?? 0;
    const healthScore = Math.max(0, 100 - Math.round(debt * 0.65));
    return {
      id,
      label: MODULE_LABELS[id] ?? id,
      debt,
      issues: entry?.issues ?? 0,
      healthScore,
      topFile: entry?.topFiles?.[0] ?? "—",
    };
  }).sort((a, b) => b.debt - a.debt);

  return (
    <Card title="Dívida Técnica" subtitle={`${debtOverall?.technicalDebtScore ?? "—"}/100 · ${debtOverall?.debtLevel ?? health?.technicalDebt?.level ?? ""}`}>
      <DataTable
        headers={["Módulo", "Dívida", "Issues", "Heatmap", "Arquivo crítico"]}
        rows={rows.map((r) => [
          r.label,
          r.debt,
          r.issues,
          <HeatBar key={r.id} score={r.debt} />,
          <span className="max-w-[200px] truncate block">{r.topFile}</span>,
        ])}
      />
    </Card>
  );
}
