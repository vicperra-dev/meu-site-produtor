/**
 * Utilitários puros do Engineering Dashboard — sem dependências Node (fs/path).
 * Seguro para import em componentes "use client".
 */

export type EngineeringReportsBundle = {
  loadedAt: string;
  sources: Array<{ name: string; loaded: boolean; path: string }>;
  projectContext: Record<string, unknown> | null;
  latest: Record<string, unknown> | null;
  decisionMd: string | null;
  decisionJson: Record<string, unknown> | null;
  executionStatus: Record<string, unknown> | null;
  refactorReport: Record<string, unknown> | null;
  codeHealth: Record<string, unknown> | null;
  memory: Record<string, unknown> | null;
  evolutionReport: Record<string, unknown> | null;
  implementationPlan: Record<string, unknown> | null;
  stabilizationPlan: Record<string, unknown> | null;
  ctoReport: Record<string, unknown> | null;
  architectureDecisions: Record<string, unknown> | null;
  knowledgeGraph: Record<string, unknown> | null;
  humanReport: Record<string, unknown> | null;
};

export function parseDecisionStatus(
  decisionMd: string | null,
  decisionJson: Record<string, unknown> | null
): string {
  const fromJson = decisionJson?.status ?? decisionJson?.decision;
  if (typeof fromJson === "string") return fromJson.toUpperCase();
  if (!decisionMd) return "UNKNOWN";
  if (/\*\*BLOCKED\*\*/i.test(decisionMd) || decisionMd.includes("🛑")) return "BLOCKED";
  if (/\*\*REVIEW/i.test(decisionMd) || /REVIEW_REQUIRED/i.test(decisionMd)) return "REVIEW_REQUIRED";
  if (/\*\*APPROVED\*\*/i.test(decisionMd)) return "APPROVED";
  return "UNKNOWN";
}
