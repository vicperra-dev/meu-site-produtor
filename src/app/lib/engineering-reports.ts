import { readFile } from "fs/promises";
import path from "path";
import type { EngineeringReportsBundle } from "./engineering-dashboard-shared";

export type { EngineeringReportsBundle } from "./engineering-dashboard-shared";

const ROOT = process.cwd();

async function tryReadJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function tryReadText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function loadEngineeringReports(): Promise<EngineeringReportsBundle> {
  const entries: Array<{ key: keyof EngineeringReportsBundle; name: string; rel: string; type: "json" | "md" }> = [
    { key: "projectContext", name: "project-context.json", rel: "reports/domain-guardian/project-context.json", type: "json" },
    { key: "latest", name: "latest.json", rel: "reports/domain-guardian/latest.json", type: "json" },
    { key: "decisionMd", name: "decision.md", rel: "reports/domain-guardian/decision.md", type: "md" },
    { key: "decisionJson", name: "decision.json", rel: "reports/domain-guardian/decision.json", type: "json" },
    { key: "executionStatus", name: "execution-status.json", rel: "reports/domain-guardian/execution-status.json", type: "json" },
    { key: "refactorReport", name: "refactor-report.json", rel: "reports/domain-guardian/refactor-report.json", type: "json" },
    { key: "codeHealth", name: "code-health.json", rel: "reports/domain-guardian/code-health.json", type: "json" },
    { key: "memory", name: "memory.json", rel: "reports/domain-guardian/memory.json", type: "json" },
    { key: "evolutionReport", name: "evolution-report.json", rel: "reports/domain-guardian/evolution-report.json", type: "json" },
    { key: "implementationPlan", name: "implementation-plan.json", rel: "reports/domain-guardian/implementation-plan.json", type: "json" },
    { key: "stabilizationPlan", name: "stabilization-plan.json", rel: "reports/domain-guardian/stabilization-plan.json", type: "json" },
    { key: "ctoReport", name: "cto-report.json", rel: "reports/domain-guardian/cto-report.json", type: "json" },
    { key: "architectureDecisions", name: "architecture-decisions.json", rel: "reports/domain-guardian/architecture-decisions.json", type: "json" },
    { key: "knowledgeGraph", name: "project-knowledge-graph.json", rel: "reports/domain-guardian/project-knowledge-graph.json", type: "json" },
    { key: "humanReport", name: "project-report.json", rel: "reports/human/project-report.json", type: "json" },
  ];

  const bundle = {
    loadedAt: new Date().toISOString(),
    sources: [] as EngineeringReportsBundle["sources"],
    projectContext: null,
    latest: null,
    decisionMd: null,
    decisionJson: null,
    executionStatus: null,
    refactorReport: null,
    codeHealth: null,
    memory: null,
    evolutionReport: null,
    implementationPlan: null,
    stabilizationPlan: null,
    ctoReport: null,
    architectureDecisions: null,
    knowledgeGraph: null,
    humanReport: null,
  } as EngineeringReportsBundle;

  await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(ROOT, entry.rel);
      if (entry.type === "json") {
        const data = await tryReadJson(full);
        (bundle as Record<string, unknown>)[entry.key] = data;
        bundle.sources.push({ name: entry.name, loaded: data !== null, path: entry.rel });
      } else {
        const text = await tryReadText(full);
        (bundle as Record<string, unknown>)[entry.key] = text;
        bundle.sources.push({ name: entry.name, loaded: text !== null, path: entry.rel });
      }
    })
  );

  return bundle;
}
