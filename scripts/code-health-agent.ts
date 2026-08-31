/**
 * Code Health Agent V1 — Painel permanente da saúde do código THouse.
 *
 * Não modifica código, banco, APIs ou UI.
 * Mede qualidade estrutural e evolução ao longo do tempo.
 *
 * Uso: node --experimental-strip-types scripts/code-health-agent.ts
 *
 * Saída:
 *   reports/domain-guardian/code-health.json
 *   reports/domain-guardian/code-health.md
 *
 * Exit code: sempre 0 (agente informativo).
 */

import { execFile } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const GUARDIAN_DIR = path.join(ROOT, "reports/domain-guardian");
const DOCS_DIR = path.join(ROOT, "docs/ai");

const AGENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Grade = "A+" | "A" | "B" | "C" | "D" | "E";
type Trend = "melhorando" | "piorando" | "estável";
type ModuleId =
  | "Financeiro"
  | "Appointment"
  | "Coupon"
  | "MinhaConta"
  | "Webhook"
  | "Admin"
  | "Guardian"
  | "Scripts"
  | "Infraestrutura";

type DimensionScores = {
  arquitetura: number;
  qualidade: number;
  organizacao: number;
  modularizacao: number;
  acoplamento: number;
  legibilidade: number;
  escalabilidade: number;
  manutenibilidade: number;
};

type ModuleHealth = {
  id: ModuleId;
  name: string;
  healthScore: number;
  grade: Grade;
  trend: Trend;
  fileCount: number;
  lines: number;
  avgFileSize: number;
  complexity: number;
  duplications: number;
  legacyCode: number;
  technicalDebt: number;
  coupling: number;
  criticalFiles: string[];
  recommendation: "refatorar" | "congelar" | "evoluir" | "monitorar";
  recommendationReason: string;
};

type CodeHealthReport = {
  agentVersion: string;
  generatedAt: string;
  language: "pt-BR";
  summary: {
    projectName: string;
    headline: string;
    executiveSummary: string;
    codeHealthScore: number;
    grade: Grade;
    trend: Trend;
    filesTotal: number;
    linesTotal: number;
  };
  overallHealth: {
    score: number;
    grade: Grade;
    trend: Trend;
    trendDetail: string;
  };
  scores: DimensionScores & { overall: number; grade: Grade };
  modules: ModuleHealth[];
  ranking: {
    healthiest: Array<{ rank: number; module: string; score: number; grade: Grade }>;
    critical: Array<{ rank: number; module: string; score: number; grade: Grade; reason: string }>;
  };
  criticalModules: string[];
  healthyModules: string[];
  technicalDebt: {
    overall: number;
    level: string;
    byModule: Record<string, number>;
  };
  coupling: {
    score: number;
    circularDependencies: number;
    highImportFiles: number;
  };
  complexity: {
    score: number;
    avgCyclomatic: number;
    largeFiles: number;
    largeFunctions: number;
  };
  growth: {
    mostImproved: { module: string; reason: string } | null;
    mostDeclined: { module: string; reason: string } | null;
    deservesRefactor: string[];
    deservesFreeze: string[];
    canReceiveFeatures: string[];
  };
  recommendations: string[];
  roadmap: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
  metrics: {
    totalLines: number;
    totalFiles: number;
    apis: number;
    libs: number;
    components: number;
    hooks: number;
    scripts: number;
    entities: number;
    flows: number;
    issuesTotal: number;
    duplications: number;
    legacyMarkers: number;
  };
  timeline: {
    snapshots: Array<{
      generatedAt: string;
      codeHealthScore: number;
      grade: Grade;
      technicalDebt: number;
      modules: Record<string, number>;
    }>;
    guardianTrend: Trend;
    guardianRuns: number;
  };
  context: {
    sourcesConsulted: Array<{ path: string; loaded: boolean }>;
    refactorReportAt: string | null;
  };
  limitations: string[];
};

type RefactorReport = {
  generatedAt: string;
  summary: { projectName: string; issuesFound: number; technicalDebtScore: number; debtLevel: string };
  technicalDebtScore: { score: number; level: string; breakdown: Record<string, number> };
  technicalDebtMap: Record<string, { score: number; issues: number; topFiles: string[] }>;
  metrics: {
    totalLines: number;
    filesOver500: number;
    filesOver300: number;
    functionsOver80: number;
    duplicateBlocks: number;
    legacyMarkerCount: number;
    circularDependencies: number;
    avgImportsPerFile: number;
  };
  files: Array<{ path: string; lines: number; complexityScore: number; imports: number; domains: string[] }>;
  duplications: Array<{ domain: string; files: string[]; severity: string }>;
  legacyCode: Array<{ domain: string; files: string[] }>;
  dependencies: Array<{ domain: string; files: string[] }>;
  complexity: Array<{ domain: string; files: string[]; severity: string }>;
};

// ---------------------------------------------------------------------------
// Module rules
// ---------------------------------------------------------------------------

const MODULE_IDS: ModuleId[] = [
  "Financeiro",
  "Appointment",
  "Coupon",
  "MinhaConta",
  "Webhook",
  "Admin",
  "Guardian",
  "Scripts",
  "Infraestrutura",
];

const MODULE_PATTERNS: Record<ModuleId, RegExp[]> = {
  Financeiro: [/payment|pagamento|asaas|checkout|refund|symbolic|plano-payment/i],
  Appointment: [/appointment|agendamento/i],
  Coupon: [/coupon|cupom/i],
  MinhaConta: [/meus-dados|minha-conta|\/conta\//i],
  Webhook: [/webhook/i],
  Admin: [/src\/app\/admin\//i],
  Guardian: [/domain-guardian|domain-decision|domain-change|domain-memory|domain-pr-review|-agent\.ts$/i, /^reports\/domain-guardian\//i],
  Scripts: [/^scripts\//i],
  Infraestrutura: [/middleware|layout\.tsx|globals\.css|next\.config|package\.json|prisma\//i, /^\.github\//i],
};

const REFACTOR_DOMAIN_MAP: Record<ModuleId, string[]> = {
  Financeiro: ["Financeiro"],
  Appointment: ["Appointment"],
  Coupon: ["Coupon"],
  MinhaConta: ["MinhaConta"],
  Webhook: ["Webhook"],
  Admin: ["Admin"],
  Guardian: ["Guardian"],
  Scripts: ["Scripts"],
  Infraestrutura: ["Infraestrutura", "Prisma", "Backend"],
};

const MODULE_DISPLAY: Record<ModuleId, string> = {
  Financeiro: "Financeiro",
  Appointment: "Appointment",
  Coupon: "Coupon",
  MinhaConta: "Minha Conta",
  Webhook: "Webhook",
  Admin: "Admin",
  Guardian: "Guardian",
  Scripts: "Scripts",
  Infraestrutura: "Infraestrutura",
};

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

async function tryReadJson<T>(p: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as T;
  } catch {
    return null;
  }
}

async function tryReadText(p: string): Promise<string | null> {
  try {
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function runGit(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: ROOT, maxBuffer: 20 * 1024 * 1024 });
    return stdout.trimEnd();
  } catch {
    return "";
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function classifyModule(filePath: string): ModuleId[] {
  const n = normalizePath(filePath);
  const mods = new Set<ModuleId>();
  for (const id of MODULE_IDS) {
    if (MODULE_PATTERNS[id].some((p) => p.test(n))) mods.add(id);
  }
  return mods.size > 0 ? [...mods] : [];
}

function scoreToGrade(score: number): Grade {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
}

function healthBar(score: number): string {
  const filled = Math.round(score / 10);
  return "█".repeat(Math.min(10, filled)) + "░".repeat(Math.max(0, 10 - filled));
}

function debtToHealth(debtScore: number, issues: number, fileCount: number): number {
  if (debtScore === 0 && issues === 0) return 95;
  const issuePenalty = Math.min(30, issues * 0.4 + (issues / Math.max(1, fileCount)) * 5);
  return Math.max(0, Math.min(100, Math.round(100 - debtScore * 0.65 - issuePenalty)));
}

// ---------------------------------------------------------------------------
// Metrics from git + refactor
// ---------------------------------------------------------------------------

function countGitBuckets(gitFiles: string[]): CodeHealthReport["metrics"] {
  const source = gitFiles.filter((f) => /\.(ts|tsx|js|mjs)$/.test(f));
  return {
    totalLines: 0,
    totalFiles: source.length,
    apis: source.filter((f) => f.includes("src/app/api/") && f.endsWith("route.ts")).length,
    libs: source.filter((f) => f.includes("src/app/lib/")).length,
    components: source.filter((f) => f.includes("/components/") && f.endsWith(".tsx")).length,
    hooks: source.filter((f) => f.includes("/hooks/")).length,
    scripts: source.filter((f) => f.startsWith("scripts/")).length,
    entities: 0,
    flows: 0,
    issuesTotal: 0,
    duplications: 0,
    legacyMarkers: 0,
  };
}

function buildModuleMetrics(
  moduleId: ModuleId,
  refactor: RefactorReport,
  gitFiles: string[]
): Omit<ModuleHealth, "id" | "name" | "grade" | "trend" | "recommendation" | "recommendationReason"> {
  const patterns = MODULE_PATTERNS[moduleId];
  const moduleFiles = gitFiles.filter((f) => patterns.some((p) => p.test(f)));

  const refactorFiles = (refactor.files ?? []).filter((f) =>
    f.domains?.some((d) => REFACTOR_DOMAIN_MAP[moduleId].includes(d)) ||
    patterns.some((p) => p.test(f.path))
  );

  const lines = refactorFiles.reduce((s, f) => s + f.lines, 0) || moduleFiles.length * 50;
  const fileCount = moduleFiles.length || refactorFiles.length;
  const avgFileSize = fileCount > 0 ? Math.round(lines / fileCount) : 0;

  const debtKeys = REFACTOR_DOMAIN_MAP[moduleId];
  let debtSum = 0;
  let issueSum = 0;
  const criticalFiles: string[] = [];
  for (const key of debtKeys) {
    const entry = refactor.technicalDebtMap?.[key];
    if (entry) {
      debtSum = Math.max(debtSum, entry.score);
      issueSum += entry.issues;
      criticalFiles.push(...(entry.topFiles ?? []));
    }
  }

  const duplications = (refactor.duplications ?? []).filter(
    (d) => debtKeys.includes(d.domain) || d.files.some((f) => patterns.some((p) => p.test(f)))
  ).length;

  const legacyCode = (refactor.legacyCode ?? []).filter(
    (d) => debtKeys.includes(d.domain) || d.files?.some((f) => patterns.some((p) => p.test(f)))
  ).length;

  const coupling = (refactor.dependencies ?? []).filter(
    (d) => debtKeys.includes(d.domain) || d.files?.some((f) => patterns.some((p) => p.test(f)))
  ).length;

  const complexityIssues = (refactor.complexity ?? []).filter(
    (d) => debtKeys.includes(d.domain) || d.files?.some((f) => patterns.some((p) => p.test(f)))
  ).length;

  const avgComplexity =
    refactorFiles.length > 0
      ? Math.round(refactorFiles.reduce((s, f) => s + (f.complexityScore ?? 0), 0) / refactorFiles.length)
      : complexityIssues * 5;

  const healthScore = debtToHealth(debtSum, issueSum, fileCount);

  return {
    healthScore,
    fileCount,
    lines,
    avgFileSize,
    complexity: avgComplexity,
    duplications,
    legacyCode,
    technicalDebt: debtSum,
    coupling,
    criticalFiles: [...new Set(criticalFiles)].slice(0, 5),
  };
}

function computeDimensionScores(
  refactor: RefactorReport,
  knowledgeGraph: Record<string, unknown> | null,
  architectureDecisions: Record<string, unknown> | null,
  guardianHealthy: boolean
): DimensionScores {
  const m = refactor.metrics;
  const debt = refactor.technicalDebtScore.score;
  const adrs = (architectureDecisions as { decisions?: unknown[] } | null)?.decisions?.length ?? 0;
  const entities = (knowledgeGraph as { summary?: { entitiesMapped?: number } } | null)?.summary?.entitiesMapped ?? 0;

  return {
    arquitetura: Math.min(100, Math.round(50 + adrs * 2 + entities * 3 + (guardianHealthy ? 15 : 0))),
    qualidade: Math.max(0, Math.round(100 - debt * 0.5 - (m.filesOver500 ?? 0) * 2)),
    organizacao: Math.max(0, Math.round(100 - (m.filesOver300 ?? 0) * 1.5 - (m.avgImportsPerFile ?? 0) * 2)),
    modularizacao: Math.max(0, Math.round(100 - (m.filesOver500 ?? 0) * 3 - (m.functionsOver80 ?? 0) * 0.5)),
    acoplamento: Math.max(0, Math.round(100 - (m.circularDependencies ?? 0) * 20 - (m.avgImportsPerFile ?? 0) * 1.5)),
    legibilidade: Math.max(0, Math.round(100 - (m.functionsOver80 ?? 0) * 1.2 - (m.filesOver500 ?? 0) * 2)),
    escalabilidade: Math.min(100, Math.round(60 + entities * 4 + (knowledgeGraph ? 10 : 0))),
    manutenibilidade: Math.max(0, Math.round(100 - (m.duplicateBlocks ?? 0) * 2 - (m.legacyMarkerCount ?? 0) * 0.8 - debt * 0.3)),
  };
}

function computeOverallScore(dimensions: DimensionScores): number {
  const weights = {
    arquitetura: 0.15,
    qualidade: 0.2,
    organizacao: 0.1,
    modularizacao: 0.15,
    acoplamento: 0.1,
    legibilidade: 0.15,
    escalabilidade: 0.05,
    manutenibilidade: 0.1,
  };
  let sum = 0;
  for (const [k, w] of Object.entries(weights)) {
    sum += (dimensions[k as keyof DimensionScores] ?? 0) * w;
  }
  return Math.round(sum);
}

function inferRecommendation(
  moduleId: ModuleId,
  health: number,
  debt: number,
  executionProgress: number
): { recommendation: ModuleHealth["recommendation"]; reason: string } {
  const criticalDomains: ModuleId[] = ["Financeiro", "Webhook", "Appointment"];
  const safeDomains: ModuleId[] = ["Guardian", "Infraestrutura", "Coupon"];

  if (criticalDomains.includes(moduleId) && (health < 50 || debt >= 80)) {
    return {
      recommendation: executionProgress < 50 ? "congelar" : "refatorar",
      reason:
        executionProgress < 50
          ? "Domínio crítico — congelar até Sprint 1 de estabilização concluir"
          : "Alta dívida e arquivos monolíticos — priorizar refatoração",
    };
  }
  if (health < 45) {
    return { recommendation: "refatorar", reason: "Health score baixo e dívida técnica elevada" };
  }
  if (safeDomains.includes(moduleId) && health >= 70) {
    return { recommendation: "evoluir", reason: "Saúde adequada para novas funcionalidades de baixo risco" };
  }
  if (health >= 60) {
    return { recommendation: "monitorar", reason: "Estável — evoluir com cautela e Guardian" };
  }
  return { recommendation: "refatorar", reason: "Métricas abaixo do ideal para expansão" };
}

function analyzeGuardianTrend(memory: Record<string, unknown> | null): { trend: Trend; runs: number } {
  const runs = (memory as { guardianRuns?: Array<{ errors: number; warnings: number }> } | null)?.guardianRuns ?? [];
  if (runs.length < 2) return { trend: "estável", runs: runs.length };
  const recent = runs.slice(-5);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const errDelta = (last.errors ?? 0) - (first.errors ?? 0);
  const warnDelta = (last.warnings ?? 0) - (first.warnings ?? 0);
  if (errDelta < 0 || warnDelta < 0) return { trend: "melhorando", runs: runs.length };
  if (errDelta > 0 || warnDelta > 2) return { trend: "piorando", runs: runs.length };
  return { trend: "estável", runs: runs.length };
}

function compareModuleTrends(
  current: ModuleHealth[],
  previous: CodeHealthReport | null
): Map<ModuleId, Trend> {
  const trends = new Map<ModuleId, Trend>();
  if (!previous?.timeline?.snapshots?.length) {
    for (const m of current) trends.set(m.id, "estável");
    return trends;
  }
  const prevSnap = previous.timeline.snapshots[previous.timeline.snapshots.length - 1];
  for (const m of current) {
    const prevScore = prevSnap.modules[m.id];
    if (prevScore === undefined) {
      trends.set(m.id, "estável");
    } else if (m.healthScore > prevScore + 3) {
      trends.set(m.id, "melhorando");
    } else if (m.healthScore < prevScore - 3) {
      trends.set(m.id, "piorando");
    } else {
      trends.set(m.id, "estável");
    }
  }
  return trends;
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function buildMarkdown(report: CodeHealthReport): string {
  const L: string[] = [];
  L.push(`# Code Health — ${report.summary.projectName}`);
  L.push("");
  L.push(`**Gerado em:** ${report.generatedAt}`);
  L.push(`**Code Health Score:** ${report.overallHealth.score}/100 · **Grade ${report.overallHealth.grade}** · Tendência: **${report.overallHealth.trend}**`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Resumo Executivo");
  L.push("");
  L.push(report.summary.executiveSummary);
  L.push("");
  L.push("| Métrica | Valor |");
  L.push("|---------|-------|");
  L.push(`| Code Health Score | ${report.overallHealth.score}/100 (${report.overallHealth.grade}) |`);
  L.push(`| Dívida técnica | ${report.technicalDebt.overall}/100 (${report.technicalDebt.level}) |`);
  L.push(`| Arquivos | ${report.metrics.totalFiles} |`);
  L.push(`| Linhas | ${report.metrics.totalLines.toLocaleString("pt-BR")} |`);
  L.push(`| APIs | ${report.metrics.apis} |`);
  L.push(`| Entidades | ${report.metrics.entities} |`);
  L.push(`| Tendência | ${report.overallHealth.trend} |`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Notas por Dimensão (0–100)");
  L.push("");
  L.push("| Dimensão | Nota | Barra |");
  L.push("|----------|------|-------|");
  const dims: Array<[string, number]> = [
    ["Arquitetura", report.scores.arquitetura],
    ["Qualidade", report.scores.qualidade],
    ["Organização", report.scores.organizacao],
    ["Modularização", report.scores.modularizacao],
    ["Acoplamento", report.scores.acoplamento],
    ["Legibilidade", report.scores.legibilidade],
    ["Escalabilidade", report.scores.escalabilidade],
    ["Manutenibilidade", report.scores.manutenibilidade],
  ];
  for (const [name, score] of dims) {
    L.push(`| ${name} | ${score} | ${healthBar(score)} |`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Heatmap por Módulo");
  L.push("");
  L.push("| Módulo | Health | Grade | Arquivos | Linhas | Dívida | Dup. | Recomendação |");
  L.push("|--------|--------|-------|----------|--------|--------|------|--------------|");
  for (const m of report.modules) {
    L.push(
      `| ${m.name} | ${m.healthScore} ${healthBar(m.healthScore)} | ${m.grade} | ${m.fileCount} | ${m.lines.toLocaleString("pt-BR")} | ${m.technicalDebt} | ${m.duplications} | ${m.recommendation} |`
    );
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Ranking — Top Módulos Saudáveis");
  L.push("");
  for (const r of report.ranking.healthiest) {
    L.push(`${r.rank}. **${r.module}** — ${r.score}/100 (${r.grade})`);
  }
  L.push("");
  L.push("## Ranking — Top Módulos Críticos");
  L.push("");
  for (const r of report.ranking.critical) {
    L.push(`${r.rank}. **${r.module}** — ${r.score}/100 (${r.grade}) — ${r.reason}`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Diagnóstico Estratégico");
  L.push("");
  L.push(`- **Mais evoluído:** ${report.growth.mostImproved?.module ?? "—"} — ${report.growth.mostImproved?.reason ?? "Sem histórico anterior"}`);
  L.push(`- **Mais crítico:** ${report.growth.mostDeclined?.module ?? report.criticalModules[0] ?? "—"} — ${report.growth.mostDeclined?.reason ?? "Alta dívida técnica"}`);
  L.push(`- **Merece refatoração:** ${report.growth.deservesRefactor.join(", ") || "—"}`);
  L.push(`- **Merece congelamento:** ${report.growth.deservesFreeze.join(", ") || "—"}`);
  L.push(`- **Pode receber features:** ${report.growth.canReceiveFeatures.join(", ") || "—"}`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Roadmap");
  L.push("");
  L.push("### Curto prazo");
  for (const item of report.roadmap.shortTerm) L.push(`- [ ] ${item}`);
  L.push("");
  L.push("### Médio prazo");
  for (const item of report.roadmap.mediumTerm) L.push(`- [ ] ${item}`);
  L.push("");
  L.push("### Longo prazo");
  for (const item of report.roadmap.longTerm) L.push(`- [ ] ${item}`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Timeline");
  L.push("");
  if (report.timeline.snapshots.length === 0) {
    L.push("_Primeira execução — baseline registrado. Reexecute para ver tendências._");
  } else {
    L.push("| Data | Score | Grade | Dívida |");
    L.push("|------|-------|-------|--------|");
    for (const s of report.timeline.snapshots.slice(-10)) {
      L.push(`| ${s.generatedAt.slice(0, 10)} | ${s.codeHealthScore} | ${s.grade} | ${s.technicalDebt} |`);
    }
  }
  L.push(`\nGuardian (${report.timeline.guardianRuns} runs): **${report.timeline.guardianTrend}**`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Recomendações");
  L.push("");
  for (const r of report.recommendations) L.push(`- ${r}`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Limitações V1");
  L.push("");
  for (const lim of report.limitations) L.push(`- ${lim}`);
  L.push("");
  L.push("---");
  L.push("_Code Health Agent — somente análise. Nenhum código foi alterado._");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const sources: Array<{ path: string; loaded: boolean }> = [];

  const paths = {
    refactor: path.join(GUARDIAN_DIR, "refactor-report.json"),
    previous: path.join(GUARDIAN_DIR, "code-health.json"),
    projectContext: path.join(GUARDIAN_DIR, "project-context.json"),
    knowledgeGraph: path.join(GUARDIAN_DIR, "project-knowledge-graph.json"),
    memory: path.join(GUARDIAN_DIR, "memory.json"),
    latest: path.join(GUARDIAN_DIR, "latest.json"),
    executionStatus: path.join(GUARDIAN_DIR, "execution-status.json"),
    evolution: path.join(GUARDIAN_DIR, "evolution-report.json"),
    architectureDecisions: path.join(GUARDIAN_DIR, "architecture-decisions.json"),
    changeAnalysis: path.join(GUARDIAN_DIR, "change-analysis.md"),
    decision: path.join(GUARDIAN_DIR, "decision.md"),
    actionPlan: path.join(GUARDIAN_DIR, "action-plan.md"),
    domainMap: path.join(DOCS_DIR, "domain-map.md"),
    domainDeps: path.join(DOCS_DIR, "domain-dependencies.md"),
    domainInv: path.join(DOCS_DIR, "domain-invariants.md"),
  };

  const [
    refactor,
    previousHealth,
    projectContext,
    knowledgeGraph,
    memory,
    latest,
    executionStatus,
    evolution,
    architectureDecisions,
    changeAnalysis,
    decisionMd,
    actionPlan,
    domainMap,
    domainDeps,
    domainInv,
  ] = await Promise.all([
    tryReadJson<RefactorReport>(paths.refactor),
    tryReadJson<CodeHealthReport>(paths.previous),
    tryReadJson<Record<string, unknown>>(paths.projectContext),
    tryReadJson<Record<string, unknown>>(paths.knowledgeGraph),
    tryReadJson<Record<string, unknown>>(paths.memory),
    tryReadJson<Record<string, unknown>>(paths.latest),
    tryReadJson<Record<string, unknown>>(paths.executionStatus),
    tryReadJson<Record<string, unknown>>(paths.evolution),
    tryReadJson<Record<string, unknown>>(paths.architectureDecisions),
    tryReadText(paths.changeAnalysis),
    tryReadText(paths.decision),
    tryReadText(paths.actionPlan),
    tryReadText(paths.domainMap),
    tryReadText(paths.domainDeps),
    tryReadText(paths.domainInv),
  ]);

  const sourceEntries: Array<[string, unknown]> = [
    ["refactor-report.json", refactor],
    ["project-context.json", projectContext],
    ["project-knowledge-graph.json", knowledgeGraph],
    ["memory.json", memory],
    ["latest.json", latest],
    ["execution-status.json", executionStatus],
    ["evolution-report.json", evolution],
    ["architecture-decisions.json", architectureDecisions],
    ["change-analysis.md", changeAnalysis],
    ["decision.md", decisionMd],
    ["action-plan.md", actionPlan],
    ["domain-map.md", domainMap],
    ["domain-dependencies.md", domainDeps],
    ["domain-invariants.md", domainInv],
  ];
  for (const [name, data] of sourceEntries) {
    sources.push({ path: name.startsWith("domain") ? `docs/ai/${name}` : `reports/domain-guardian/${name}`, loaded: data !== null });
  }

  if (!refactor) {
    console.error("ERRO: refactor-report.json não encontrado. Execute refactor-agent.ts primeiro.");
    process.exit(1);
  }

  const [gitFilesRaw, gitStatus, gitDiff] = await Promise.all([
    runGit(["ls-files"]),
    runGit(["status", "--porcelain"]),
    runGit(["diff", "--name-only"]),
  ]);
  sources.push({ path: "git ls-files", loaded: gitFilesRaw.length > 0 });

  const gitFiles = gitFilesRaw.split(/\r?\n/).filter(Boolean).map(normalizePath);
  const metrics = countGitBuckets(gitFiles);
  metrics.totalLines = refactor.metrics.totalLines;
  metrics.entities = (knowledgeGraph as { summary?: { entitiesMapped?: number } } | null)?.summary?.entitiesMapped ?? 0;
  metrics.flows = (knowledgeGraph as { summary?: { flowsMapped?: number } } | null)?.summary?.flowsMapped ?? 0;
  metrics.issuesTotal = refactor.summary.issuesFound;
  metrics.duplications = refactor.metrics.duplicateBlocks;
  metrics.legacyMarkers = refactor.metrics.legacyMarkerCount;

  const executionProgress =
    (executionStatus as { summary?: { overallProgressPercent?: number } } | null)?.summary?.overallProgressPercent ?? 0;

  const guardianErrors = (latest as { summary?: { errors?: number } } | null)?.summary?.errors ?? 0;
  const guardianHealthy = guardianErrors === 0;

  const dimensions = computeDimensionScores(refactor, knowledgeGraph, architectureDecisions, guardianHealthy);
  const overallScore = computeOverallScore(dimensions);
  const grade = scoreToGrade(overallScore);

  const moduleMetrics = MODULE_IDS.map((id) => {
    const base = buildModuleMetrics(id, refactor, gitFiles);
    return { id, ...base };
  });

  const moduleTrends = compareModuleTrends(
    moduleMetrics.map((m) => ({ ...m, id: m.id, name: MODULE_DISPLAY[m.id], grade: scoreToGrade(m.healthScore), trend: "estável" as Trend, recommendation: "monitorar" as const, recommendationReason: "" })),
    previousHealth
  );

  const modules: ModuleHealth[] = moduleMetrics.map((m) => {
    const rec = inferRecommendation(m.id, m.healthScore, m.technicalDebt, executionProgress);
    return {
      ...m,
      name: MODULE_DISPLAY[m.id],
      grade: scoreToGrade(m.healthScore),
      trend: moduleTrends.get(m.id) ?? "estável",
      recommendation: rec.recommendation,
      recommendationReason: rec.reason,
    };
  });

  const sortedHealthy = [...modules].sort((a, b) => b.healthScore - a.healthScore);
  const sortedCritical = [...modules].sort((a, b) => a.healthScore - b.healthScore);

  const guardianTrendInfo = analyzeGuardianTrend(memory);

  let overallTrend: Trend = guardianTrendInfo.trend;
  if (previousHealth?.overallHealth?.score !== undefined) {
    const delta = overallScore - previousHealth.overallHealth.score;
    if (delta > 2) overallTrend = "melhorando";
    else if (delta < -2) overallTrend = "piorando";
  }

  const prevSnapshots = previousHealth?.timeline?.snapshots ?? [];
  const newSnapshot = {
    generatedAt: new Date().toISOString(),
    codeHealthScore: overallScore,
    grade,
    technicalDebt: refactor.summary.technicalDebtScore,
    modules: Object.fromEntries(modules.map((m) => [m.id, m.healthScore])),
  };
  const snapshots = [...prevSnapshots, newSnapshot].slice(-30);

  const improved = modules
    .filter((m) => m.trend === "melhorando")
    .sort((a, b) => b.healthScore - a.healthScore)[0];
  const declined = modules
    .filter((m) => m.trend === "piorando")
    .sort((a, b) => a.healthScore - b.healthScore)[0];

  const projectName =
    refactor.summary.projectName ??
    (projectContext as { projectName?: string } | null)?.projectName ??
    "THouse";

  const report: CodeHealthReport = {
    agentVersion: AGENT_VERSION,
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    summary: {
      projectName,
      headline: `Code Health ${overallScore}/100 (${grade}) · ${overallTrend}`,
      executiveSummary: [
        `O ${projectName} tem Code Health Score ${overallScore}/100 (grade ${grade}).`,
        `Dívida técnica ${refactor.summary.debtLevel.toLowerCase()} (${refactor.summary.technicalDebtScore}/100).`,
        `${metrics.totalFiles} arquivos, ${metrics.totalLines.toLocaleString("pt-BR")} linhas, ${metrics.apis} APIs.`,
        `Módulos mais saudáveis: ${sortedHealthy.slice(0, 2).map((m) => m.name).join(", ")}.`,
        `Módulos críticos: ${sortedCritical.slice(0, 2).map((m) => m.name).join(", ")}.`,
        `Tendência geral: ${overallTrend}. Guardian: ${guardianHealthy ? "HEALTHY" : "UNHEALTHY"}.`,
        executionProgress < 50
          ? "Congelar Financeiro/Webhook até estabilização; Guardian e Infraestrutura podem evoluir."
          : "Fase de estabilização avançada — iniciar refatorações planejadas.",
      ].join(" "),
      codeHealthScore: overallScore,
      grade,
      trend: overallTrend,
      filesTotal: metrics.totalFiles,
      linesTotal: metrics.totalLines,
    },
    overallHealth: {
      score: overallScore,
      grade,
      trend: overallTrend,
      trendDetail:
        overallTrend === "estável" && snapshots.length <= 1
          ? "Baseline inicial — reexecute após mudanças para medir evolução"
          : `Comparado com ${snapshots.length - 1} snapshot(s) anterior(es); Guardian ${guardianTrendInfo.trend}`,
    },
    scores: { ...dimensions, overall: overallScore, grade },
    modules,
    ranking: {
      healthiest: sortedHealthy.slice(0, 20).map((m, i) => ({
        rank: i + 1,
        module: m.name,
        score: m.healthScore,
        grade: m.grade,
      })),
      critical: sortedCritical.slice(0, 20).map((m, i) => ({
        rank: i + 1,
        module: m.name,
        score: m.healthScore,
        grade: m.grade,
        reason: m.recommendationReason,
      })),
    },
    criticalModules: sortedCritical.filter((m) => m.healthScore < 55).map((m) => m.name),
    healthyModules: sortedHealthy.filter((m) => m.healthScore >= 75).map((m) => m.name),
    technicalDebt: {
      overall: refactor.summary.technicalDebtScore,
      level: refactor.summary.debtLevel,
      byModule: Object.fromEntries(modules.map((m) => [m.id, m.technicalDebt])),
    },
    coupling: {
      score: dimensions.acoplamento,
      circularDependencies: refactor.metrics.circularDependencies,
      highImportFiles: refactor.dependencies?.length ?? 0,
    },
    complexity: {
      score: dimensions.legibilidade,
      avgCyclomatic: Math.round(
        (refactor.files ?? []).reduce((s, f) => s + f.complexityScore, 0) / Math.max(1, refactor.files?.length ?? 1)
      ),
      largeFiles: refactor.metrics.filesOver500,
      largeFunctions: refactor.metrics.functionsOver80,
    },
    growth: {
      mostImproved: improved
        ? { module: improved.name, reason: `Tendência ${improved.trend}; score ${improved.healthScore}` }
        : snapshots.length > 1
          ? { module: sortedHealthy[0].name, reason: "Maior health score atual" }
          : null,
      mostDeclined: declined
        ? { module: declined.name, reason: `Tendência ${declined.trend}; dívida ${declined.technicalDebt}` }
        : { module: sortedCritical[0].name, reason: sortedCritical[0].recommendationReason },
      deservesRefactor: modules.filter((m) => m.recommendation === "refatorar").map((m) => m.name),
      deservesFreeze: modules.filter((m) => m.recommendation === "congelar").map((m) => m.name),
      canReceiveFeatures: modules.filter((m) => m.recommendation === "evoluir").map((m) => m.name),
    },
    recommendations: [
      "Executar code-health-agent.ts após cada sprint para medir evolução",
      "Manter Guardian HEALTHY antes de refatorar domínios Financeiro/Webhook",
      `Priorizar divisão de arquivos monolíticos (${refactor.metrics.filesOver500} arquivos > 500 linhas)`,
      "Coupon e Minha Conta têm health intermediário — refatorar após estabilização",
      "Guardian e Infraestrutura são candidatos seguros para novos agentes e tooling",
      decisionMd?.includes("BLOCKED") ? "Decision BLOCKED — não misturar refatoração com deploy pendente" : "Validar decision engine antes de grandes refatorações",
    ],
    roadmap: {
      shortTerm: [
        "Baseline code-health registrado",
        "Quick wins do refactor-report (imports mortos, legacy documentado)",
        "Monitorar módulos Financeiro e Appointment sem alterar regras",
      ],
      mediumTerm: [
        "Dividir agendamento/page.tsx e minha-conta/page.tsx",
        "Centralizar queries Prisma duplicadas",
        "Extrair hooks useUnread* compartilhados",
      ],
      longTerm: [
        "Repository layer para Payment e Appointment",
        "Reduzir dívida técnica abaixo de 60/100",
        "Alcançar Code Health Score B (80+) pós-deploy produção",
      ],
    },
    metrics,
    timeline: {
      snapshots,
      guardianTrend: guardianTrendInfo.trend,
      guardianRuns: guardianTrendInfo.runs,
    },
    context: {
      sourcesConsulted: sources,
      refactorReportAt: refactor.generatedAt,
    },
    limitations: [
      "Depende de refactor-report.json — executar refactor-agent.ts antes",
      "Tendências por módulo requerem execuções anteriores de code-health-agent.ts",
      "memory.json usado apenas para tendência Guardian, não métricas de código",
      "Health score é heurístico — não mede bugs ou cobertura de testes",
      "Módulos podem sobrepor arquivos (ex.: Webhook ⊂ Financeiro)",
      "Primeira execução registra baseline; comparativos a partir da segunda",
    ],
  };

  await mkdir(GUARDIAN_DIR, { recursive: true });
  const jsonPath = path.join(GUARDIAN_DIR, "code-health.json");
  const mdPath = path.join(GUARDIAN_DIR, "code-health.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  console.log("Code Health Agent — análise concluída");
  console.log(`  Projeto:        ${report.summary.projectName}`);
  console.log(`  Health Score:   ${report.overallHealth.score}/100 (${report.overallHealth.grade})`);
  console.log(`  Tendência:      ${report.overallHealth.trend}`);
  console.log(`  Dívida técnica: ${report.technicalDebt.overall}/100`);
  console.log(`  Arquivos:       ${report.metrics.totalFiles} · ${report.metrics.totalLines.toLocaleString("pt-BR")} linhas`);
  console.log(`  Módulos:        ${report.modules.length}`);
  console.log(`  Saudáveis:      ${report.healthyModules.join(", ") || "—"}`);
  console.log(`  Críticos:       ${report.criticalModules.join(", ") || "—"}`);
  console.log(`  Snapshots:      ${report.timeline.snapshots.length}`);
  console.log(`  JSON:           ${path.relative(ROOT, jsonPath)}`);
  console.log(`  Markdown:       ${path.relative(ROOT, mdPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
