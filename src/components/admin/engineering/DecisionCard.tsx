"use client";

import { Card, Badge } from "./shared";
import type { EngineeringData } from "./types";
import { parseDecisionStatus } from "@/app/lib/engineering-dashboard-shared";

export function DecisionCard({ data }: { data: EngineeringData }) {
  const status = parseDecisionStatus(data.decisionMd, data.decisionJson);
  const md = data.decisionMd ?? "";
  const reasons: string[] = [];
  const blockMatch = md.match(/### Bloqueio[\s\S]*?(?=###|$)/);
  if (blockMatch) {
    blockMatch[0]
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .slice(0, 6)
      .forEach((l) => reasons.push(l.replace(/^- /, "")));
  }

  const tone = status === "APPROVED" ? "success" : status === "BLOCKED" ? "danger" : status === "REVIEW_REQUIRED" ? "warning" : "neutral";

  return (
    <Card title="Decision Engine" subtitle="Veredito do motor de decisão">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={tone}>{status}</Badge>
        {status === "APPROVED" && <span className="text-sm text-emerald-400">Liberado para avançar</span>}
        {status === "BLOCKED" && <span className="text-sm text-red-400">Deploy e merge bloqueados</span>}
        {status === "REVIEW_REQUIRED" && <span className="text-sm text-amber-400">Revisão humana necessária</span>}
      </div>
      {reasons.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-red-400">•</span>
              {r}
            </li>
          ))}
        </ul>
      )}
      {!data.decisionMd && !data.decisionJson && (
        <p className="mt-3 text-sm text-zinc-500">decision.md não encontrado. Execute domain-decision-engine.ts.</p>
      )}
    </Card>
  );
}
