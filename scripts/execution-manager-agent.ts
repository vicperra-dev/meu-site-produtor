/**
 * Execution Manager Agent V1 — Gerente técnico da execução do roadmap.
 *
 * Não implementa código, banco, APIs ou UI.
 * Acompanha Sprint, PR, Commit e progresso contra stabilization-plan.json.
 *
 * Uso: node --experimental-strip-types scripts/execution-manager-agent.ts
 *
 * Saída:
 *   reports/domain-guardian/execution-status.json
 *   reports/domain-guardian/execution-status.md
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

const AGENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RiskLevel = "Crítico" | "Alto" | "Médio" | "Baixo";
type Complexity = "Muito Alta" | "Alta" | "Média" | "Baixa";
type ItemStatus = "completed" | "in_progress" | "ready_to_open" | "ready_to_merge" | "merged" | "blocked" | "pending";
type SprintId = "sprint1" | "sprint2" | "sprint3" | "sprint4";

type StabilizationPlan = {
  agentVersion: string;
  generatedAt: string;
  sprint: string;
  summary: {
    projectName: string;
    headline: string;
    totalFiles: number;
    commitsPlanned: number;
    pullRequestsPlanned: number;
    migrationsCount: number;
    workRemainingBeforeDeploy: string;
  };
  commitPlan: Array<{
    id: string;
    title: string;
    description: string;
    files: string[];
    objective: string;
    dependencies: string[];
    risk: RiskLevel;
    rollback: string;
    suggestedMessage: string;
    workGroup: string;
    prId: string;
  }>;
  pullRequestPlan: Array<{
    id: string;
    name: string;
    objective: string;
    commitIds: string[];
    files: string[];
    dependencies: string[];
    complexity: Complexity;
    reviewer: string;
    mergeCriteria: string[];
    rollbackCriteria: string[];
    order: number;
    risk: RiskLevel;
  }>;
  deploymentPlan: {
    homologation: { checklist: string[]; migrations: string[] };
    production: { checklist: string[]; monitoring: string[] };
  };
  rollbackPlan: Array<{ prId: string; howToRevert: string[]; impact: string; requiresMigration: boolean }>;
  testingPlan: Array<{ prId: string; smoke: string[]; guardianMandatory: string[]; criticalFlows: string[] }>;
  roadmap: Record<SprintId, { name: string; goals: string[]; deliverables: string[] }>;
  criticalPath: string[];
  context?: {
    decisionStatus: string | null;
    guardianStatus: string | null;
  };
};

type CommitExecution = {
  id: string;
  title: string;
  prId: string;
  objective: string;
  files: string[];
  filesTotal: number;
  filesPending: number;
  filesCommitted: number;
  complexity: Complexity;
  risk: RiskLevel;
  dependencies: string[];
  entryCriteria: string[];
  exitCriteria: string[];
  rollback: string;
  suggestedMessage: string;
  status: ItemStatus;
  progressPercent: number;
};

type PrExecution = {
  id: string;
  name: string;
  objective: string;
  commitIds: string[];
  files: string[];
  filesTotal: number;
  dependencies: string[];
  status: ItemStatus;
  progressPercent: number;
  guardianExecuted: boolean;
  decisionEngine: string;
  canOpenPr: boolean;
  canMerge: boolean;
  canDeploy: boolean;
  blockerReasons: string[];
  mergeCriteria: string[];
  reviewer: string;
  risk: RiskLevel;
  complexity: Complexity;
};

type SprintExecution = {
  id: SprintId;
  name: string;
  status: ItemStatus;
  progressPercent: number;
  progressBar: string;
  goals: string[];
  deliverables: string[];
  deliverablesCompleted: number;
  deliverablesTotal: number;
};

type Blocker = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  resolution: string;
};

type ExecutionStatus = {
  agentVersion: string;
  generatedAt: string;
  language: "pt-BR";
  summary: {
    projectName: string;
    headline: string;
    executiveSummary: string;
    overallProgressPercent: number;
    sprint1ProgressPercent: number;
    commitsCompleted: number;
    commitsTotal: number;
    commitsRemaining: number;
    prsCompleted: number;
    prsTotal: number;
    prsRemaining: number;
    deployReady: boolean;
    deployEstimate: string;
  };
  currentSprint: { id: SprintId; name: string; progressPercent: number };
  currentPR: { id: string; name: string; status: ItemStatus } | null;
  currentCommit: { id: string; title: string; status: ItemStatus; filesPending: number } | null;
  progress: {
    byCommits: number;
    byFiles: number;
    byPrs: number;
    phasesTotal: number;
    phasesCompleted: number;
  };
  sprints: SprintExecution[];
  prs: PrExecution[];
  commits: CommitExecution[];
  blockers: Blocker[];
  nextAction: {
    action: string;
    type: "commit" | "guardian" | "open_pr" | "merge_pr" | "migration" | "wait" | "deploy" | "review";
    detail: string;
    priority: number;
  };
  roadmap: {
    remaining: Array<{ sprint: string; focus: string; status: string }>;
    criticalPath: string[];
  };
  deploymentReadiness: {
    homologationReady: boolean;
    productionReady: boolean;
    migrationsPending: number;
    checklist: string[];
    blockers: string[];
    estimatedWhen: string;
  };
  guardian: {
    status: string;
    errors: number;
    warnings: number;
    lastRun: string | null;
    healthy: boolean;
  };
  decision: {
    status: string;
    blocked: boolean;
    source: string;
  };
  git: {
    branch: string;
    head: string;
    headMessage: string;
    pendingFiles: number;
    stagedFiles: number;
    modifiedFiles: number;
    untrackedFiles: number;
    recentCommits: string[];
    workingTreeClean: boolean;
  };
  timeline: Array<{ label: string; status: string; bar: string; percent: number }>;
  metrics: {
    totalPlannedFiles: number;
    pendingPlannedFiles: number;
    committedPlannedFiles: number;
    unplannedPendingFiles: number;
  };
  context: {
    sourcesConsulted: Array<{ path: string; loaded: boolean }>;
    stabilizationPlanGeneratedAt: string | null;
    stabilizationPlanVersion: string | null;
  };
  limitations: string[];
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
    const { stdout } = await execFileAsync("git", args, { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
    return stdout.trimEnd();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Path normalization
// ---------------------------------------------------------------------------

function normalizePath(p: string): string {
  let n = p.replace(/\\/g, "/").trim();
  if (n.startsWith("/app/")) n = "src" + n;
  if (n.startsWith("app/")) n = "src/" + n;
  return n.replace(/^\.\//, "");
}

function pathVariants(p: string): string[] {
  const n = normalizePath(p);
  const variants = new Set([n, p.replace(/\\/g, "/")]);
  if (n.startsWith("src/app/")) variants.add(n.slice(4));
  if (p.startsWith("/app/")) variants.add("src" + p.replace(/\\/g, "/"));
  return [...variants];
}

function fileInPending(file: string, pendingSet: Set<string>): boolean {
  for (const v of pathVariants(file)) {
    if (pendingSet.has(v)) return true;
  }
  for (const p of pendingSet) {
    if (p.endsWith(file) || file.endsWith(p)) return true;
  }
  return false;
}

function collectPendingFiles(gitStatus: string, gitDiff: string, gitDiffCached: string): Set<string> {
  const pending = new Set<string>();
  for (const line of gitStatus.split(/\r?\n/).filter(Boolean)) {
    const p = line.length >= 4 ? line.slice(3).trim() : line.trim();
    const pathOnly = p.includes(" -> ") ? p.split(" -> ").pop()!.trim() : p;
    if (pathOnly && !pathOnly.endsWith("/")) pending.add(normalizePath(pathOnly));
  }
  for (const line of [...gitDiff.split(/\r?\n/), ...gitDiffCached.split(/\r?\n/)].filter(Boolean)) {
    pending.add(normalizePath(line.trim()));
  }
  return pending;
}

function parseGitStatusCounts(gitStatus: string): { staged: number; modified: number; untracked: number } {
  let staged = 0;
  let modified = 0;
  let untracked = 0;
  for (const line of gitStatus.split(/\r?\n/).filter(Boolean)) {
    const code = line.slice(0, 2);
    if (code.includes("?")) untracked++;
    else if (code[0] !== " " && code[0] !== "?") staged++;
    else if (code[1] !== " ") modified++;
  }
  return { staged, modified, untracked };
}

function progressBar(percent: number, width = 10): string {
  const filled = Math.round((percent / 100) * width);
  return "█".repeat(Math.min(filled, width)) + "░".repeat(Math.max(0, width - filled));
}

function complexityFromRisk(risk: RiskLevel): Complexity {
  if (risk === "Crítico") return "Muito Alta";
  if (risk === "Alto") return "Alta";
  if (risk === "Médio") return "Média";
  return "Baixa";
}

function parseDecisionStatus(decisionMd: string | null, cto: Record<string, unknown> | null): string {
  if (decisionMd) {
    const m = decisionMd.match(/\*\*(BLOCKED|APPROVED|WARNING|REVIEW)\*\*/i);
    if (m) return m[1].toUpperCase();
    if (decisionMd.includes("BLOCKED")) return "BLOCKED";
    if (decisionMd.includes("APPROVED")) return "APPROVED";
  }
  const cs = (cto as { currentState?: { decisionStatus?: string } } | null)?.currentState?.decisionStatus;
  return cs ?? "UNKNOWN";
}

function parseGuardianFromLatest(latest: Record<string, unknown> | null): {
  status: string;
  errors: number;
  warnings: number;
  healthy: boolean;
  lastRun: string | null;
} {
  if (!latest) return { status: "UNKNOWN", errors: 0, warnings: 0, healthy: false, lastRun: null };
  const summary = latest.summary as { errors?: number; warnings?: number } | undefined;
  const errors = summary?.errors ?? 0;
  const warnings = summary?.warnings ?? 0;
  const healthy = errors === 0;
  return {
    status: healthy ? "HEALTHY" : "UNHEALTHY",
    errors,
    warnings,
    healthy,
    lastRun: (latest.generatedAt as string) ?? null,
  };
}

function commitInGitLog(suggestedMessage: string, gitLog: string): boolean {
  const subject = suggestedMessage.split("\n")[0].trim().toLowerCase();
  return gitLog
    .split(/\r?\n/)
    .some((line) => line.toLowerCase().includes(subject.slice(0, 40)));
}

// ---------------------------------------------------------------------------
// Execution detection
// ---------------------------------------------------------------------------

function analyzeCommits(
  plan: StabilizationPlan,
  pendingSet: Set<string>,
  gitLog: string
): CommitExecution[] {
  const allPlannedFiles = new Set<string>();
  for (const c of plan.commitPlan) {
    for (const f of c.files) for (const v of pathVariants(f)) allPlannedFiles.add(v);
  }

  const results: CommitExecution[] = [];
  let foundCurrent = false;

  for (const c of plan.commitPlan) {
    const pendingFiles = c.files.filter((f) => fileInPending(f, pendingSet));
    const total = c.files.length;
    const pending = pendingFiles.length;
    const committed = total - pending;
    const progressPercent = total > 0 ? Math.round((committed / total) * 100) : 100;
    const inLog = commitInGitLog(c.suggestedMessage, gitLog);

    let status: ItemStatus;
    if (pending === 0 && (inLog || committed === total)) {
      status = "completed";
    } else if (!foundCurrent && pending > 0) {
      status = "in_progress";
      foundCurrent = true;
    } else if (pending === 0 && !inLog) {
      status = "ready_to_open";
    } else {
      status = "pending";
    }

    const priorDone = results.every((r) => r.status === "completed" || r.status === "ready_to_open");
    if (status === "in_progress" && !priorDone) status = "blocked";
    if (status === "pending" && results.some((r) => r.status === "in_progress" || r.status === "blocked")) {
      status = "pending";
    }

    const depsMet = c.dependencies.every((dep) => {
      const depCommits = plan.commitPlan.filter((x) => x.workGroup === dep || x.title === dep);
      if (depCommits.length === 0) return true;
      return depCommits.every((dc) => {
        const match = results.find((r) => r.id === dc.id);
        return match?.status === "completed" || match?.status === "ready_to_open";
      });
    });

    if (!depsMet && status === "in_progress") status = "blocked";

    results.push({
      id: c.id,
      title: c.title,
      prId: c.prId,
      objective: c.objective,
      files: c.files,
      filesTotal: total,
      filesPending: pending,
      filesCommitted: committed,
      complexity: complexityFromRisk(c.risk),
      risk: c.risk,
      dependencies: c.dependencies,
      entryCriteria: [
        ...c.dependencies.map((d) => `Grupo ${d} concluído ou commitado`),
        "Working tree sem conflitos no escopo",
      ],
      exitCriteria: [
        "Todos os arquivos do commit commitados",
        `Mensagem: ${c.suggestedMessage}`,
        "Guardian exit 0 para escopo afetado",
      ],
      rollback: c.rollback,
      suggestedMessage: c.suggestedMessage,
      status,
      progressPercent,
    });
  }

  return results;
}

function analyzePrs(
  plan: StabilizationPlan,
  commits: CommitExecution[],
  guardian: { healthy: boolean },
  decisionBlocked: boolean,
  gitLog: string
): PrExecution[] {
  return plan.pullRequestPlan.map((pr) => {
    const prCommits = commits.filter((c) => pr.commitIds.includes(c.id));
    const allCompleted = prCommits.every((c) => c.status === "completed" || c.status === "ready_to_open");
    const anyInProgress = prCommits.some((c) => c.status === "in_progress");
    const anyBlocked = prCommits.some((c) => c.status === "blocked");
    const totalFiles = pr.files.length;
    const pendingFiles = pr.files.filter((f) =>
      prCommits.some((c) => c.files.includes(f) && c.filesPending > 0)
    ).length;
    const progressPercent =
      prCommits.length > 0
        ? Math.round(prCommits.reduce((s, c) => s + c.progressPercent, 0) / prCommits.length)
        : 0;

    const depsMet = pr.dependencies.every((depId) => {
      const depPr = plan.pullRequestPlan.find((p) => p.id === depId);
      if (!depPr) return true;
      const depCommits = commits.filter((c) => depPr.commitIds.includes(c.id));
      return depCommits.every((c) => c.status === "completed");
    });

    const mergeMsgInLog = prCommits.some((c) => commitInGitLog(c.suggestedMessage, gitLog)) && allCompleted;

    let status: ItemStatus = "pending";
    if (mergeMsgInLog && allCompleted) status = "merged";
    else if (allCompleted && depsMet) status = "ready_to_open";
    else if (allCompleted && !depsMet) status = "blocked";
    else if (anyInProgress) status = "in_progress";
    else if (anyBlocked) status = "blocked";

    const blockerReasons: string[] = [];
    if (!depsMet) blockerReasons.push(`Dependência não satisfeita: ${pr.dependencies.join(", ")}`);
    if (decisionBlocked) blockerReasons.push("Decision Engine BLOCKED");
    if (!guardian.healthy) blockerReasons.push("Guardian unhealthy");

    const canOpenPr = allCompleted && depsMet && guardian.healthy && !decisionBlocked;
    const canMerge = canOpenPr && prCommits.every((c) => c.status === "completed");
    const canDeploy = false;

    return {
      id: pr.id,
      name: pr.name,
      objective: pr.objective,
      commitIds: pr.commitIds,
      files: pr.files,
      filesTotal: totalFiles,
      dependencies: pr.dependencies,
      status,
      progressPercent,
      guardianExecuted: guardian.healthy,
      decisionEngine: decisionBlocked ? "BLOCKED" : "OK",
      canOpenPr,
      canMerge,
      canDeploy,
      blockerReasons,
      mergeCriteria: pr.mergeCriteria,
      reviewer: pr.reviewer,
      risk: pr.risk,
      complexity: pr.complexity,
    };
  });
}

function detectCurrentSprint(
  plan: StabilizationPlan,
  prs: PrExecution[],
  deployReady: boolean
): { id: SprintId; name: string; progressPercent: number } {
  const sprint1Done = prs.every((p) => p.status === "merged" || p.status === "completed" || p.status === "ready_to_open");
  const allPrsMerged = prs.every((p) => p.status === "merged");

  if (!sprint1Done) {
    const done = prs.filter((p) => ["merged", "completed", "ready_to_open"].includes(p.status)).length;
    return {
      id: "sprint1",
      name: plan.roadmap.sprint1.name,
      progressPercent: Math.round((done / prs.length) * 100),
    };
  }
  if (!allPrsMerged || !deployReady) {
    return { id: "sprint2", name: plan.roadmap.sprint2.name, progressPercent: allPrsMerged ? 50 : 20 };
  }
  if (deployReady) {
    return { id: "sprint3", name: plan.roadmap.sprint3.name, progressPercent: 30 };
  }
  return { id: "sprint4", name: plan.roadmap.sprint4.name, progressPercent: 0 };
}

function buildBlockers(
  decisionBlocked: boolean,
  guardian: { healthy: boolean; errors: number },
  prs: PrExecution[],
  migrationsPending: number,
  currentPr: PrExecution | null
): Blocker[] {
  const blockers: Blocker[] = [];

  if (decisionBlocked) {
    blockers.push({
      id: "decision-blocked",
      severity: "critical",
      category: "Decision Engine",
      message: "Decision Engine está BLOCKED",
      resolution: "Dividir alterações em PRs menores conforme stabilization-plan",
    });
  }
  if (!guardian.healthy) {
    blockers.push({
      id: "guardian-unhealthy",
      severity: "critical",
      category: "Guardian",
      message: `Guardian unhealthy (${guardian.errors} erros)`,
      resolution: "Executar domain-guardian-runner.ts e corrigir findings",
    });
  }
  if (migrationsPending > 0) {
    blockers.push({
      id: "migrations-pending",
      severity: "high",
      category: "Deploy",
      message: `${migrationsPending} migration(s) pendente(s) em staging`,
      resolution: "Aplicar npx prisma migrate deploy em homologação antes de PR financeiro em produção",
    });
  }
  if (currentPr) {
    for (const reason of currentPr.blockerReasons) {
      if (!blockers.some((b) => b.message === reason)) {
        blockers.push({
          id: `pr-${currentPr.id}`,
          severity: "high",
          category: "PR",
          message: reason,
          resolution: `Resolver dependências do ${currentPr.id} antes de prosseguir`,
        });
      }
    }
  }
  const blockedPr = prs.find((p) => p.status === "blocked");
  if (blockedPr && blockedPr.id !== currentPr?.id) {
    blockers.push({
      id: `pr-dep-${blockedPr.id}`,
      severity: "medium",
      category: "Dependência",
      message: `PR anterior não finalizado: ${blockedPr.dependencies.join(", ") || blockedPr.id}`,
      resolution: `Completar ${blockedPr.dependencies[0] ?? "PR anterior"} primeiro`,
    });
  }

  return blockers;
}

function determineNextAction(
  commits: CommitExecution[],
  prs: PrExecution[],
  guardian: { healthy: boolean },
  decisionBlocked: boolean,
  workingTreeClean: boolean
): ExecutionStatus["nextAction"] {
  const inProgress = commits.find((c) => c.status === "in_progress");
  if (inProgress) {
    return {
      action: `Executar Commit ${inProgress.id}`,
      type: "commit",
      detail: `${inProgress.filesPending} arquivo(s) pendente(s). Mensagem sugerida: ${inProgress.suggestedMessage}`,
      priority: 1,
    };
  }

  const readyCommit = commits.find((c) => c.status === "ready_to_open");
  if (readyCommit) {
    if (!guardian.healthy) {
      return {
        action: "Executar Guardian",
        type: "guardian",
        detail: "Commit pronto mas Guardian precisa validar antes de abrir PR",
        priority: 1,
      };
    }
    const pr = prs.find((p) => p.commitIds.includes(readyCommit.id));
    if (pr && pr.canOpenPr) {
      return {
        action: `Abrir ${pr.id}`,
        type: "open_pr",
        detail: `Todos os commits de ${pr.name} prontos para PR`,
        priority: 2,
      };
    }
  }

  const readyPr = prs.find((p) => p.status === "ready_to_open" && p.canOpenPr);
  if (readyPr) {
    return {
      action: `Abrir ${readyPr.id}`,
      type: "open_pr",
      detail: readyPr.objective,
      priority: 2,
    };
  }

  if (decisionBlocked && !workingTreeClean) {
    return {
      action: `Executar Commit ${commits.find((c) => c.status === "pending")?.id ?? "C-01"}`,
      type: "commit",
      detail: "Decision BLOCKED — avançar por commits incrementais do plano",
      priority: 1,
    };
  }

  const pendingPr = prs.find((p) => p.status === "in_progress");
  if (pendingPr) {
    const nextCommit = commits.find((c) => c.prId === pendingPr.id && c.status !== "completed");
    return {
      action: nextCommit ? `Executar Commit ${nextCommit.id}` : `Finalizar ${pendingPr.id}`,
      type: "commit",
      detail: pendingPr.objective,
      priority: 1,
    };
  }

  const allMerged = prs.every((p) => p.status === "merged");
  if (allMerged) {
    return {
      action: "Iniciar deploy de homologação",
      type: "deploy",
      detail: "Sprint 1 concluída — seguir deploymentPlan.homologation",
      priority: 3,
    };
  }

  const firstPending = commits.find((c) => c.status === "pending" || c.status === "blocked");
  return {
    action: firstPending ? `Executar Commit ${firstPending.id}` : "Revisar stabilization-plan",
    type: "review",
    detail: "Continuar execução incremental do roadmap",
    priority: 1,
  };
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function buildMarkdown(report: ExecutionStatus): string {
  const L: string[] = [];
  L.push(`# Execution Status — ${report.summary.projectName}`);
  L.push("");
  L.push(`**Gerado em:** ${report.generatedAt}`);
  L.push(`**Agente:** Execution Manager V${report.agentVersion}`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Resumo Executivo");
  L.push("");
  L.push(report.summary.executiveSummary);
  L.push("");
  L.push(`| Métrica | Valor |`);
  L.push(`|---------|-------|`);
  L.push(`| Progresso geral | ${report.summary.overallProgressPercent}% |`);
  L.push(`| Sprint atual | ${report.currentSprint.name} (${report.currentSprint.progressPercent}%) |`);
  L.push(`| PR atual | ${report.currentPR?.id ?? "—"} ${report.currentPR?.name ?? ""} |`);
  L.push(`| Commit atual | ${report.currentCommit?.id ?? "—"} ${report.currentCommit?.title ?? ""} |`);
  L.push(`| Commits | ${report.summary.commitsCompleted}/${report.summary.commitsTotal} |`);
  L.push(`| PRs | ${report.summary.prsCompleted}/${report.summary.prsTotal} |`);
  L.push(`| Deploy pronto? | ${report.summary.deployReady ? "Sim" : "Não"} |`);
  L.push(`| Próxima ação | **${report.nextAction.action}** |`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Timeline");
  L.push("");
  for (const t of report.timeline) {
    L.push(`### ${t.label}`);
    L.push(`Status: \`${t.status}\` · ${t.percent}%`);
    L.push("");
    L.push(t.bar);
    L.push("");
  }
  L.push("---");
  L.push("");
  L.push("## Bloqueadores");
  L.push("");
  if (report.blockers.length === 0) {
    L.push("_Nenhum bloqueador crítico detectado._");
  } else {
    L.push("| Severidade | Categoria | Mensagem | Resolução |");
    L.push("|------------|-----------|----------|-----------|");
    for (const b of report.blockers) {
      L.push(`| ${b.severity} | ${b.category} | ${b.message} | ${b.resolution} |`);
    }
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## PRs");
  L.push("");
  L.push("| PR | Nome | Status | Progresso | Guardian | Decision | Abrir? | Merge? | Deploy? |");
  L.push("|----|------|--------|-----------|----------|----------|--------|--------|---------|");
  for (const pr of report.prs) {
    L.push(
      `| ${pr.id} | ${pr.name} | ${pr.status} | ${pr.progressPercent}% | ${pr.guardianExecuted ? "✓" : "✗"} | ${pr.decisionEngine} | ${pr.canOpenPr ? "✓" : "✗"} | ${pr.canMerge ? "✓" : "✗"} | ${pr.canDeploy ? "✓" : "✗"} |`
    );
  }
  L.push("");
  for (const pr of report.prs) {
    L.push(`### ${pr.id} — ${pr.name}`);
    L.push(`**Objetivo:** ${pr.objective}`);
    L.push(`**Commits:** ${pr.commitIds.join(", ")} · **Arquivos:** ${pr.filesTotal}`);
    L.push(`**Dependências:** ${pr.dependencies.length ? pr.dependencies.join(", ") : "Nenhuma"}`);
    L.push(`**Revisor:** ${pr.reviewer}`);
    if (pr.blockerReasons.length) L.push(`**Bloqueios:** ${pr.blockerReasons.join("; ")}`);
    L.push("");
  }
  L.push("---");
  L.push("");
  L.push("## Commits");
  L.push("");
  L.push("| Commit | PR | Status | Arquivos | Risco | Progresso |");
  L.push("|--------|-----|--------|----------|-------|-----------|");
  for (const c of report.commits) {
    L.push(
      `| ${c.id} | ${c.prId} | ${c.status} | ${c.filesCommitted}/${c.filesTotal} | ${c.risk} | ${c.progressPercent}% |`
    );
  }
  L.push("");
  for (const c of report.commits.filter((x) => x.status === "in_progress" || x.status === "ready_to_open").slice(0, 5)) {
    L.push(`### ${c.id} — ${c.title}`);
    L.push(`**Objetivo:** ${c.objective}`);
    L.push(`**Pendente:** ${c.filesPending} arquivo(s)`);
    L.push(`**Entrada:** ${c.entryCriteria.join("; ")}`);
    L.push(`**Saída:** ${c.exitCriteria.join("; ")}`);
    L.push(`**Rollback:** ${c.rollback}`);
    L.push("");
  }
  L.push("---");
  L.push("");
  L.push("## Deploy");
  L.push("");
  L.push(`**Homologação pronta:** ${report.deploymentReadiness.homologationReady ? "Sim" : "Não"}`);
  L.push(`**Produção pronta:** ${report.deploymentReadiness.productionReady ? "Sim" : "Não"}`);
  L.push(`**Estimativa:** ${report.deploymentReadiness.estimatedWhen}`);
  L.push("");
  L.push("### Checklist homologação");
  for (const item of report.deploymentReadiness.checklist) {
    L.push(`- [ ] ${item}`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Roadmap restante");
  L.push("");
  for (const r of report.roadmap.remaining) {
    L.push(`- **${r.sprint}** — ${r.focus} (\`${r.status}\`)`);
  }
  L.push("");
  L.push("### Caminho crítico");
  for (const step of report.roadmap.criticalPath) {
    L.push(`- → ${step}`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Git");
  L.push("");
  L.push(`| Campo | Valor |`);
  L.push(`|-------|-------|`);
  L.push(`| Branch | ${report.git.branch} |`);
  L.push(`| HEAD | ${report.git.head} |`);
  L.push(`| Mensagem | ${report.git.headMessage} |`);
  L.push(`| Arquivos pendentes | ${report.git.pendingFiles} |`);
  L.push(`| Working tree limpa | ${report.git.workingTreeClean ? "Sim" : "Não"} |`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Limitações V1");
  L.push("");
  for (const lim of report.limitations) {
    L.push(`- ${lim}`);
  }
  L.push("");
  L.push("---");
  L.push("_Execution Manager — somente acompanhamento. Nenhum código foi alterado._");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const sources: Array<{ path: string; loaded: boolean }> = [];
  const mark = (rel: string, loaded: boolean) => sources.push({ path: rel, loaded });

  const stabilizationPath = path.join(GUARDIAN_DIR, "stabilization-plan.json");
  const plan = await tryReadJson<StabilizationPlan>(stabilizationPath);
  if (!plan) {
    console.error("ERRO: stabilization-plan.json não encontrado. Execute stabilization-planner.ts primeiro.");
    process.exit(1);
  }
  mark("reports/domain-guardian/stabilization-plan.json", true);

  const [
    implementationPlan,
    memory,
    latest,
    projectContext,
    ctoReport,
    evolutionReport,
    architectureDecisions,
    changeAnalysis,
    decisionMd,
    actionPlan,
    reviewChecklist,
    prReview,
  ] = await Promise.all([
    tryReadJson<Record<string, unknown>>(path.join(GUARDIAN_DIR, "implementation-plan.json")),
    tryReadJson<Record<string, unknown>>(path.join(GUARDIAN_DIR, "memory.json")),
    tryReadJson<Record<string, unknown>>(path.join(GUARDIAN_DIR, "latest.json")),
    tryReadJson<Record<string, unknown>>(path.join(GUARDIAN_DIR, "project-context.json")),
    tryReadJson<Record<string, unknown>>(path.join(GUARDIAN_DIR, "cto-report.json")),
    tryReadJson<Record<string, unknown>>(path.join(GUARDIAN_DIR, "evolution-report.json")),
    tryReadJson<Record<string, unknown>>(path.join(GUARDIAN_DIR, "architecture-decisions.json")),
    tryReadText(path.join(GUARDIAN_DIR, "change-analysis.md")),
    tryReadText(path.join(GUARDIAN_DIR, "decision.md")),
    tryReadText(path.join(GUARDIAN_DIR, "action-plan.md")),
    tryReadText(path.join(GUARDIAN_DIR, "review-checklist.md")),
    tryReadText(path.join(GUARDIAN_DIR, "pr-review.md")),
  ]);

  const sourceFiles = [
    ["implementation-plan.json", implementationPlan],
    ["memory.json", memory],
    ["latest.json", latest],
    ["project-context.json", projectContext],
    ["cto-report.json", ctoReport],
    ["evolution-report.json", evolutionReport],
    ["architecture-decisions.json", architectureDecisions],
    ["change-analysis.md", changeAnalysis],
    ["decision.md", decisionMd],
    ["action-plan.md", actionPlan],
    ["review-checklist.md", reviewChecklist],
    ["pr-review.md", prReview],
  ] as const;
  for (const [name, data] of sourceFiles) {
    sources.push({ path: `reports/domain-guardian/${name}`, loaded: data !== null });
  }

  const [gitStatus, gitDiff, gitDiffCached, gitLog, gitBranch, gitHeadFull] = await Promise.all([
    runGit(["status", "--porcelain"]),
    runGit(["diff", "--name-only"]),
    runGit(["diff", "--cached", "--name-only"]),
    runGit(["log", "--oneline", "-30"]),
    runGit(["branch", "--show-current"]),
    runGit(["log", "-1", "--format=%h %s"]),
  ]);

  const pendingSet = collectPendingFiles(gitStatus, gitDiff, gitDiffCached);
  const statusCounts = parseGitStatusCounts(gitStatus);
  const workingTreeClean = gitStatus.trim() === "";

  const guardian = parseGuardianFromLatest(latest);
  const decisionStatus = parseDecisionStatus(decisionMd, ctoReport);
  const decisionBlocked = decisionStatus === "BLOCKED";

  const cto = ctoReport as {
    summary?: { projectName?: string; verdict?: string };
    health?: { deploy?: { ready?: boolean; reason?: string } };
    currentState?: { migrationsPending?: number };
  } | null;
  const evo = evolutionReport as { deployChecklist?: { migrations?: string[] } } | null;
  const migrationsPending =
    cto?.currentState?.migrationsPending ?? evo?.deployChecklist?.migrations?.length ?? plan.summary.migrationsCount;
  const deployReady = cto?.health?.deploy?.ready === true;

  const commits = analyzeCommits(plan, pendingSet, gitLog);
  const prs = analyzePrs(plan, commits, guardian, decisionBlocked, gitLog);

  const commitsCompleted = commits.filter((c) => c.status === "completed" || c.status === "ready_to_open").length;
  const prsCompleted = prs.filter((p) => ["merged", "ready_to_open", "completed"].includes(p.status)).length;

  const allPlannedFiles = new Set<string>();
  for (const c of plan.commitPlan) for (const f of c.files) for (const v of pathVariants(f)) allPlannedFiles.add(v);
  const pendingPlanned = [...allPlannedFiles].filter((f) => fileInPending(f, pendingSet)).length;
  const committedPlanned = allPlannedFiles.size - pendingPlanned;
  const byFiles = allPlannedFiles.size > 0 ? Math.round((committedPlanned / allPlannedFiles.size) * 100) : 0;
  const byCommits = plan.commitPlan.length > 0 ? Math.round((commitsCompleted / plan.commitPlan.length) * 100) : 0;
  const byPrs = plan.pullRequestPlan.length > 0 ? Math.round((prsCompleted / plan.pullRequestPlan.length) * 100) : 0;

  const currentCommit = commits.find((c) => c.status === "in_progress") ??
    commits.find((c) => c.status === "ready_to_open") ??
    commits.find((c) => c.status === "pending" || c.status === "blocked") ??
    null;

  const currentPR = currentCommit
    ? (prs.find((p) => p.id === currentCommit.prId) ?? null)
    : (prs.find((p) => p.status === "in_progress") ?? prs.find((p) => p.status === "ready_to_open") ?? null);

  const currentSprint = detectCurrentSprint(plan, prs, deployReady);

  const implPhases = (implementationPlan as { phases?: unknown[] } | null)?.phases ?? [];
  const phasesTotal = implPhases.length || plan.pullRequestPlan.length;
  const phasesCompleted = prs.filter((p) => p.status === "merged").length;

  const blockers = buildBlockers(decisionBlocked, guardian, prs, migrationsPending, currentPR);
  const nextAction = determineNextAction(commits, prs, guardian, decisionBlocked, workingTreeClean);

  const sprint1Pct = byCommits;
  const sprints: SprintExecution[] = [
    {
      id: "sprint1",
      name: plan.roadmap.sprint1.name,
      status: sprint1Pct >= 100 ? "completed" : "in_progress",
      progressPercent: sprint1Pct,
      progressBar: progressBar(sprint1Pct),
      goals: plan.roadmap.sprint1.goals,
      deliverables: plan.roadmap.sprint1.deliverables,
      deliverablesCompleted: prsCompleted,
      deliverablesTotal: plan.pullRequestPlan.length,
    },
    {
      id: "sprint2",
      name: plan.roadmap.sprint2.name,
      status: sprint1Pct >= 100 ? "in_progress" : "pending",
      progressPercent: sprint1Pct >= 100 ? 10 : 0,
      progressBar: progressBar(sprint1Pct >= 100 ? 10 : 0),
      goals: plan.roadmap.sprint2.goals,
      deliverables: plan.roadmap.sprint2.deliverables,
      deliverablesCompleted: 0,
      deliverablesTotal: plan.roadmap.sprint2.deliverables.length,
    },
    {
      id: "sprint3",
      name: plan.roadmap.sprint3.name,
      status: "pending",
      progressPercent: 0,
      progressBar: progressBar(0),
      goals: plan.roadmap.sprint3.goals,
      deliverables: plan.roadmap.sprint3.deliverables,
      deliverablesCompleted: 0,
      deliverablesTotal: plan.roadmap.sprint3.deliverables.length,
    },
    {
      id: "sprint4",
      name: plan.roadmap.sprint4.name,
      status: "pending",
      progressPercent: 0,
      progressBar: progressBar(0),
      goals: plan.roadmap.sprint4.goals,
      deliverables: plan.roadmap.sprint4.deliverables,
      deliverablesCompleted: 0,
      deliverablesTotal: plan.roadmap.sprint4.deliverables.length,
    },
  ];

  const timeline = sprints.slice(0, 3).map((s) => ({
    label: s.name,
    status: s.status,
    bar: s.progressBar,
    percent: s.progressPercent,
  }));

  const homologationReady = prs.every((p) => p.status === "merged" || p.status === "ready_to_open");
  const productionReady = deployReady && homologationReady && !decisionBlocked && guardian.healthy;

  const executiveSummary = [
    `O projeto está na ${currentSprint.name}.`,
    `${byCommits}% dos commits planejados concluídos (${commitsCompleted}/${plan.commitPlan.length}).`,
    currentPR
      ? `Estamos no ${currentPR.id} — ${currentPR.name}.`
      : "Nenhum PR em execução ativa detectado.",
    currentCommit
      ? `Commit atual: ${currentCommit.id} (${currentCommit.filesPending} arquivo(s) pendente(s)).`
      : "",
    nextAction.type === "guardian"
      ? "Próximo passo: executar Domain Guardian antes de abrir Pull Request."
      : `Próximo passo: ${nextAction.action}.`,
    decisionBlocked ? "Decision Engine BLOCKED — avançar por PRs incrementais." : "",
    deployReady ? "CTO indica prontidão parcial para deploy." : "Deploy ainda não recomendado pelo CTO.",
  ]
    .filter(Boolean)
    .join(" ");

  const report: ExecutionStatus = {
    agentVersion: AGENT_VERSION,
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    summary: {
      projectName: plan.summary.projectName,
      headline: `Execução: ${byCommits}% · ${currentSprint.name} · ${currentPR?.id ?? "—"}`,
      executiveSummary,
      overallProgressPercent: Math.round((byCommits + byFiles) / 2),
      sprint1ProgressPercent: sprint1Pct,
      commitsCompleted,
      commitsTotal: plan.commitPlan.length,
      commitsRemaining: plan.commitPlan.length - commitsCompleted,
      prsCompleted,
      prsTotal: plan.pullRequestPlan.length,
      prsRemaining: plan.pullRequestPlan.length - prsCompleted,
      deployReady: productionReady,
      deployEstimate: productionReady
        ? "Pronto para homologação/produção após checklist"
        : `Após ${plan.pullRequestPlan.length - prsCompleted} PR(s) e validação em staging`,
    },
    currentSprint,
    currentPR: currentPR ? { id: currentPR.id, name: currentPR.name, status: currentPR.status } : null,
    currentCommit: currentCommit
      ? { id: currentCommit.id, title: currentCommit.title, status: currentCommit.status, filesPending: currentCommit.filesPending }
      : null,
    progress: {
      byCommits,
      byFiles,
      byPrs,
      phasesTotal,
      phasesCompleted,
    },
    sprints,
    prs,
    commits,
    blockers,
    nextAction,
    roadmap: {
      remaining: [
        { sprint: plan.roadmap.sprint1.name, focus: "Dividir e commitar PRs", status: sprint1Pct >= 100 ? "concluído" : "em andamento" },
        { sprint: plan.roadmap.sprint2.name, focus: "Homologação e migrations", status: sprint1Pct >= 100 ? "próximo" : "aguardando" },
        { sprint: plan.roadmap.sprint3.name, focus: "Deploy produção", status: "aguardando" },
        { sprint: "Monitoramento", focus: "Webhooks Asaas 24h", status: "aguardando" },
      ],
      criticalPath: plan.criticalPath,
    },
    deploymentReadiness: {
      homologationReady,
      productionReady,
      migrationsPending,
      checklist: plan.deploymentPlan.homologation.checklist,
      blockers: blockers.filter((b) => b.category === "Deploy" || b.category === "Decision Engine").map((b) => b.message),
      estimatedWhen: productionReady ? "Imediato após checklist" : plan.summary.workRemainingBeforeDeploy,
    },
    guardian: {
      status: guardian.status,
      errors: guardian.errors,
      warnings: guardian.warnings,
      lastRun: guardian.lastRun,
      healthy: guardian.healthy,
    },
    decision: {
      status: decisionStatus,
      blocked: decisionBlocked,
      source: decisionMd ? "decision.md" : "cto-report.json",
    },
    git: {
      branch: gitBranch || "unknown",
      head: gitHeadFull.split(" ")[0] ?? "",
      headMessage: gitHeadFull.split(" ").slice(1).join(" ") ?? "",
      pendingFiles: pendingSet.size,
      stagedFiles: statusCounts.staged,
      modifiedFiles: statusCounts.modified,
      untrackedFiles: statusCounts.untracked,
      recentCommits: gitLog.split(/\r?\n/).filter(Boolean).slice(0, 10),
      workingTreeClean,
    },
    timeline,
    metrics: {
      totalPlannedFiles: allPlannedFiles.size,
      pendingPlannedFiles: pendingPlanned,
      committedPlannedFiles: committedPlanned,
      unplannedPendingFiles: Math.max(0, pendingSet.size - pendingPlanned),
    },
    context: {
      sourcesConsulted: sources,
      stabilizationPlanGeneratedAt: plan.generatedAt,
      stabilizationPlanVersion: plan.agentVersion,
    },
    limitations: [
      "Progresso inferido por arquivos pendentes no Git — não rastreia PRs mergeados no GitHub.",
      "Detecção de commit concluído usa working tree + git log heurístico.",
      "Sprint 2/3/4 avançam manualmente após Sprint 1 — sem integração CI/CD.",
      "Paths /app/ e src/app/ normalizados — colisões raras podem afetar contagem.",
      "Decision BLOCKED global não distingue escopo por PR na V1.",
      "Reexecute após cada commit ou merge para atualizar status.",
    ],
  };

  await mkdir(GUARDIAN_DIR, { recursive: true });
  const jsonPath = path.join(GUARDIAN_DIR, "execution-status.json");
  const mdPath = path.join(GUARDIAN_DIR, "execution-status.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  console.log("Execution Manager — Sprint tracking concluído");
  console.log(`  Projeto:        ${report.summary.projectName}`);
  console.log(`  Sprint:         ${report.currentSprint.name} (${report.currentSprint.progressPercent}%)`);
  console.log(`  PR atual:       ${report.currentPR?.id ?? "—"} ${report.currentPR?.name ?? ""}`);
  console.log(`  Commit atual:   ${report.currentCommit?.id ?? "—"}`);
  console.log(`  Progresso:      ${report.summary.overallProgressPercent}% (${report.summary.commitsCompleted}/${report.summary.commitsTotal} commits)`);
  console.log(`  Próxima ação:   ${report.nextAction.action}`);
  console.log(`  Bloqueadores:   ${report.blockers.length}`);
  console.log(`  JSON:           ${path.relative(ROOT, jsonPath)}`);
  console.log(`  Markdown:       ${path.relative(ROOT, mdPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
