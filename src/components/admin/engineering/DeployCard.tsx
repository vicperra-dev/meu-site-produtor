"use client";

import { Card, MetricTile, Badge, statusTone } from "./shared";
import type { EngineeringData } from "./types";
import { parseDecisionStatus } from "@/app/lib/engineering-dashboard-shared";

export function DeployCard({ data }: { data: EngineeringData }) {
  const cto = data.ctoReport as {
    health?: { deploy?: { ready?: boolean; reason?: string } };
    currentState?: { migrationsPending?: number };
  } | null;
  const stab = data.stabilizationPlan as {
    deploymentPlan?: {
      homologation?: { checklist?: string[]; migrations?: string[] };
      production?: { checklist?: string[]; rollback?: string[]; monitoring?: string[] };
    };
  } | null;
  const latest = data.latest as { summary?: { errors?: number } } | null;
  const decision = parseDecisionStatus(data.decisionMd, data.decisionJson);
  const guardianOk = (latest?.summary?.errors ?? 0) === 0;
  const deployReady = cto?.health?.deploy?.ready === true && decision === "APPROVED" && guardianOk;

  return (
    <Card title="Deploy" subtitle="Prontidão para homologação e produção">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <MetricTile label="Deploy Ready" value={deployReady ? "Sim" : "Não"} />
        <MetricTile label="Guardian" value={guardianOk ? "HEALTHY" : "UNHEALTHY"} />
        <MetricTile label="Decision" value={decision} />
        <MetricTile label="Migrations" value={cto?.currentState?.migrationsPending ?? stab?.deploymentPlan?.homologation?.migrations?.length ?? 0} />
      </div>
      {cto?.health?.deploy?.reason && (
        <p className="mb-4 text-xs text-zinc-400">{cto.health.deploy.reason}</p>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge tone={deployReady ? "success" : "danger"}>Deploy {deployReady ? "Ready" : "Blocked"}</Badge>
        <Badge tone={statusTone(decision)}>{decision}</Badge>
        <Badge tone={guardianOk ? "success" : "danger"}>Guardian</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Checklist Homologação</h4>
          <ul className="space-y-1 text-xs text-zinc-300">
            {(stab?.deploymentPlan?.homologation?.checklist ?? []).map((item, i) => (
              <li key={i} className="flex gap-2"><span className="text-zinc-600">☐</span>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Rollback Produção</h4>
          <ul className="space-y-1 text-xs text-zinc-300">
            {(stab?.deploymentPlan?.production?.rollback ?? []).map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-zinc-400">Monitoramento</h4>
          <ul className="space-y-1 text-xs text-zinc-300">
            {(stab?.deploymentPlan?.production?.monitoring ?? []).map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
