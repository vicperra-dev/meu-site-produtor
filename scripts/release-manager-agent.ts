/**
 * Release Manager Agent V1 — Decide se uma versão do THouse pode ser publicada.
 *
 * Não altera código, banco, APIs ou UI.
 * Somente gera análise de release read-only.
 *
 * Uso:
 *   node --experimental-strip-types scripts/release-manager-agent.ts
 *
 * Saída:
 *   reports/domain-guardian/release-report.json
 *   reports/domain-guardian/release-report.md
 *
 * Exit code: sempre 0 (agente informativo).
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const GUARDIAN_DIR = path.join(ROOT, "reports/domain-guardian");

const AGENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReleaseStatus = "READY" | "READY_WITH_WARNINGS" | "NOT_READY";

type Blocker = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  resolution?: string;
};

type ReleaseReport = {
  agentVersion: string;
  generatedAt: string;
  language: "pt-BR";
  projectName: string;
  releaseStatus: ReleaseStatus;
  releaseScore: number;
  decision: {
    status: ReleaseStatus;
    reasons: string[];
    blockers: Blocker[];
    mandatoryPending: string[];
    optionalPending: string[];
  };
  checklists: {
    deploy: string[];
    database: string[];
    guardian: string[];
    financeiro: string[];
    webhook: string[];
    admin: string[];
    minhaConta: string[];
    rollback: string[];
  };
  scoreBreakdown: {
    base: number;
    adjustments: Array<{ factor: string; delta: number; detail: string }>;
    final: number;
  };
  questions: {
    whatIsMissing: string[];
    whatNeedsTesting: string[];
    pendingMigrations: string[];
    risks: string[];
    riskLevelToday: string;
    riskLevelScore: number;
  };
  plans: {
    deploy: string[];
    rollback: string[];
    monitoring24h: string[];
    monitoringWeek1: string[];
  };
  signals: {
    guardian: { status: string; errors: number; warnings: number; lastRun: string | null };
    decisionEngine: string;
    ctoDeployScore: number | null;
    codeHealthScore: number | null;
    deployReady: boolean;
    migrationsPending: number;
    pendingFiles: number;
    sprintProgressPercent: number;
    executionProgressPercent: number;
  };
  context: {
    sourcesConsulted: Array<{ path: string; loaded: boolean }>;
    headline: string;
    executiveSummary: string;
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

function parseDecisionStatus(decisionMd: string | null): string {
  if (!decisionMd) return "UNKNOWN";
  if (/🛑\s*\*\*BLOCKED\*\*/i.test(decisionMd) || /\*\*BLOCKED\*\*/i.test(decisionMd)) return "BLOCKED";
  if (/✅\s*\*\*APPROVED\*\*/i.test(decisionMd) || /\*\*APPROVED\*\*/i.test(decisionMd)) return "APPROVED";
  if (/⚠️\s*\*\*REVIEW_REQUIRED\*\*/i.test(decisionMd) || /\*\*REVIEW_REQUIRED\*\*/i.test(decisionMd)) return "REVIEW_REQUIRED";
  return "UNKNOWN";
}

function parseAdvisorStatus(advisorMd: string | null): { status: string; errors: number; warnings: number } {
  if (!advisorMd) return { status: "UNKNOWN", errors: 0, warnings: 0 };
  const statusMatch = advisorMd.match(/\*\*Status final:\*\*\s*\n+\s*(\w+)/i);
  const errorsMatch = advisorMd.match(/\* Errors: (\d+)/);
  const warningsMatch = advisorMd.match(/\* Warnings: (\d+)/);
  return {
    status: statusMatch?.[1] ?? "UNKNOWN",
    errors: parseInt(errorsMatch?.[1] ?? "0", 10),
    warnings: parseInt(warningsMatch?.[1] ?? "0", 10),
  };
}

function extractMigrations(
  evolution: Record<string, unknown> | null,
  stabilization: Record<string, unknown> | null
): string[] {
  const fromEvolution = (evolution?.deployReadiness as { migrations?: string[] })?.migrations ?? [];
  const deployPlan = stabilization?.deploymentPlan as {
    homologation?: { migrations?: string[] };
  } | undefined;
  const fromStab = deployPlan?.homologation?.migrations ?? [];
  return [...new Set([...fromEvolution, ...fromStab])];
}

function collectBlockers(
  execution: Record<string, unknown> | null,
  decisionStatus: string,
  guardianErrors: number,
  migrationsPending: number,
  deployReady: boolean,
  pendingFiles: number
): Blocker[] {
  const blockers: Blocker[] = [];
  const execBlockers = (execution?.blockers as Blocker[]) ?? [];
  for (const b of execBlockers) {
    blockers.push(b);
  }
  if (decisionStatus === "BLOCKED") {
    const exists = blockers.some((b) => b.id === "decision-blocked");
    if (!exists) {
      blockers.push({
        id: "decision-blocked",
        severity: "critical",
        category: "Decision Engine",
        message: "Decision Engine está BLOCKED",
        resolution: "Dividir alterações em PRs menores conforme stabilization-plan",
      });
    }
  }
  if (guardianErrors > 0) {
    blockers.push({
      id: "guardian-errors",
      severity: "critical",
      category: "Guardian",
      message: `${guardianErrors} erro(s) no Guardian`,
      resolution: "Corrigir findings antes de publicar",
    });
  }
  if (migrationsPending > 0 && !deployReady) {
    const exists = blockers.some((b) => b.id === "migrations-pending");
    if (!exists) {
      blockers.push({
        id: "migrations-pending",
        severity: "high",
        category: "Deploy",
        message: `${migrationsPending} migration(s) pendente(s) em staging`,
        resolution: "Aplicar npx prisma migrate deploy em homologação",
      });
    }
  }
  if (pendingFiles > 100) {
    blockers.push({
      id: "large-pending-diff",
      severity: "high",
      category: "Escopo",
      message: `${pendingFiles} arquivo(s) pendentes — escopo CRITICAL`,
      resolution: "Deploy incremental por PR conforme stabilization-plan",
    });
  }
  return dedupeBlockers(blockers);
}

function dedupeBlockers(blockers: Blocker[]): Blocker[] {
  const seen = new Set<string>();
  return blockers.filter((b) => {
    const key = `${b.id}:${b.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calcReleaseScore(params: {
  decisionStatus: string;
  guardianErrors: number;
  guardianWarnings: number;
  guardianHealthy: boolean;
  deployReady: boolean;
  migrationsPending: number;
  pendingFiles: number;
  codeHealthScore: number | null;
  ctoDeployScore: number | null;
  executionProgress: number;
  criticalBlockers: number;
}): ReleaseReport["scoreBreakdown"] {
  const adjustments: Array<{ factor: string; delta: number; detail: string }> = [];
  let score = 100;

  if (params.decisionStatus === "BLOCKED") {
    adjustments.push({ factor: "Decision BLOCKED", delta: -40, detail: "Motor de decisão bloqueia publicação" });
    score -= 40;
  } else if (params.decisionStatus === "REVIEW_REQUIRED") {
    adjustments.push({ factor: "Decision REVIEW_REQUIRED", delta: -15, detail: "Revisão humana necessária" });
    score -= 15;
  } else if (params.decisionStatus === "APPROVED") {
    adjustments.push({ factor: "Decision APPROVED", delta: 0, detail: "Decisão favorável" });
  }

  if (params.guardianErrors > 0) {
    const delta = -Math.min(35, params.guardianErrors * 15);
    adjustments.push({ factor: "Guardian errors", delta, detail: `${params.guardianErrors} erro(s)` });
    score += delta;
  } else if (params.guardianHealthy) {
    adjustments.push({ factor: "Guardian HEALTHY", delta: 10, detail: "0 erros, baseline estável" });
    score += 10;
  }

  if (params.guardianWarnings > 0) {
    const delta = -Math.min(10, params.guardianWarnings * 3);
    adjustments.push({ factor: "Guardian warnings", delta, detail: `${params.guardianWarnings} aviso(s)` });
    score += delta;
  }

  if (!params.deployReady) {
    adjustments.push({ factor: "Deploy não pronto", delta: -20, detail: "CTO/Execution indicam deployReady=false" });
    score -= 20;
  }

  if (params.migrationsPending > 0) {
    const delta = -Math.min(27, params.migrationsPending * 3);
    adjustments.push({ factor: "Migrations pendentes", delta, detail: `${params.migrationsPending} migration(s)` });
    score += delta;
  }

  if (params.pendingFiles > 100) {
    adjustments.push({ factor: "Escopo grande", delta: -15, detail: `${params.pendingFiles} arquivos pendentes` });
    score -= 15;
  } else if (params.pendingFiles > 50) {
    adjustments.push({ factor: "Escopo médio", delta: -10, detail: `${params.pendingFiles} arquivos pendentes` });
    score -= 10;
  } else if (params.pendingFiles > 20) {
    adjustments.push({ factor: "Escopo moderado", delta: -5, detail: `${params.pendingFiles} arquivos pendentes` });
    score -= 5;
  }

  if (params.codeHealthScore !== null && params.codeHealthScore < 50) {
    const delta = -Math.round((50 - params.codeHealthScore) / 2);
    adjustments.push({ factor: "Code Health baixo", delta, detail: `Score ${params.codeHealthScore}/100` });
    score += delta;
  }

  if (params.ctoDeployScore !== null && params.ctoDeployScore < 50) {
    const delta = -Math.round((50 - params.ctoDeployScore) / 3);
    adjustments.push({ factor: "CTO Deploy Score", delta, detail: `Pilar deploy ${params.ctoDeployScore}/100` });
    score += delta;
  }

  if (params.executionProgress > 0) {
    const delta = Math.round(params.executionProgress * 0.15);
    adjustments.push({ factor: "Progresso Sprint 1", delta, detail: `${params.executionProgress}% commits concluídos` });
    score += delta;
  }

  if (params.criticalBlockers > 0) {
    const delta = -params.criticalBlockers * 5;
    adjustments.push({ factor: "Bloqueadores críticos", delta, detail: `${params.criticalBlockers} bloqueador(es)` });
    score += delta;
  }

  const final = Math.max(0, Math.min(100, Math.round(score)));
  return { base: 100, adjustments, final };
}

function determineReleaseStatus(
  score: number,
  decisionStatus: string,
  guardianErrors: number,
  criticalBlockers: number,
  deployReady: boolean,
  migrationsPending: number
): ReleaseStatus {
  if (decisionStatus === "BLOCKED" || guardianErrors > 0 || criticalBlockers > 0) {
    return "NOT_READY";
  }
  if (
    decisionStatus === "APPROVED" &&
    deployReady &&
    migrationsPending === 0 &&
    score >= 80
  ) {
    return "READY";
  }
  if (score >= 55 && decisionStatus !== "BLOCKED" && guardianErrors === 0) {
    return "READY_WITH_WARNINGS";
  }
  return "NOT_READY";
}

function riskLevelLabel(score: number, decisionStatus: string, migrationsPending: number): string {
  if (decisionStatus === "BLOCKED" || score < 30) return "CRÍTICO — publicar hoje é altamente arriscado";
  if (score < 50 || migrationsPending > 0) return "ALTO — apenas homologação controlada";
  if (score < 75) return "MÉDIO — publicar com checklist completo e rollback pronto";
  return "BAIXO — publicação viável com monitoramento padrão";
}

function buildChecklists(
  stabilization: Record<string, unknown> | null,
  latest: Record<string, unknown> | null,
  migrations: string[]
): ReleaseReport["checklists"] {
  const deployPlan = stabilization?.deploymentPlan as {
    homologation?: { checklist?: string[]; guardian?: string[] };
    production?: { checklist?: string[]; rollback?: string[]; monitoring?: string[] };
  } | undefined;

  const homCheck = deployPlan?.homologation?.checklist ?? [];
  const prodCheck = deployPlan?.production?.checklist ?? [];
  const guardianFromPlan = deployPlan?.homologation?.guardian ?? [
    "node --experimental-strip-types scripts/domain-guardian-runner.ts",
    "node --experimental-strip-types scripts/domain-decision-engine.ts",
  ];

  const guardianChecks = (latest?.results as Array<{ code: string; severity: string }>) ?? [];
  const checkCodes = guardianChecks.map((r) => r.code).filter(Boolean);

  return {
    deploy: [
      ...homCheck,
      ...prodCheck,
      "Backup Neon antes de produção",
      "Deploy Vercel com variáveis validadas",
      "Smoke pós-deploy em produção",
    ],
    database: [
      "Backup completo Neon (produção)",
      ...migrations.map((m) => `Aplicar: ${m}`),
      "npx prisma migrate deploy (staging primeiro)",
      "npx prisma migrate deploy (produção)",
      "npx prisma generate",
      "Verificar drift schema vs migrations",
      "Smoke pós-migration (checkout, admin, Minha Conta)",
    ],
    guardian: [
      ...guardianFromPlan,
      ...checkCodes.map((c) => `Check ${c} sem erros`),
      "Guardian HEALTHY (0 errors)",
      "Decision APPROVED ou REVIEW_REQUIRED justificado",
      "Reexecutar após cada merge de PR",
    ],
    financeiro: [
      "Checkout agendamento sandbox Asaas",
      "Checkout plano sandbox",
      "Webhook PAYMENT_RECEIVED idempotente (duplicar evento)",
      "Reembolso escolher-reembolso",
      "Verificar F1 (asaasId único) e F4 (sincronização)",
      "Admin pagamentos — listar sem divergência",
      "Zero cobrança duplicada em 24h",
    ],
    webhook: [
      "POST /api/webhooks/asaas — payload PAYMENT_RECEIVED",
      "Idempotência: reenviar mesmo evento 2x",
      "Fila Asaas sem eventos perdidos",
      "process-payment-webhook.ts sem exceção",
      "Logs Vercel sem 5xx em /api/webhooks/asaas",
      "Reconcile pós-deploy",
    ],
    admin: [
      "Login admin",
      "Listar agendamentos (filtros, arquivamento)",
      "Listar pagamentos",
      "Aceite/recusa agendamento",
      "Simulação admin (se no escopo)",
      "Stats sem divergência vs banco",
    ],
    minhaConta: [
      "Login cliente",
      "Listar agendamentos visíveis",
      "Cupons do usuário inalterados",
      "Escolher reembolso (se aplicável)",
      "Exclusão de conta LGPD (smoke)",
      "Nenhum dado de outro usuário exposto",
    ],
    rollback: [
      ...(deployPlan?.production?.rollback ?? []),
      "Revert deploy Vercel para commit anterior",
      "git revert merge commit do PR problemático",
      "Não reverter migration sem SQL manual documentado",
      "Verificar fila webhooks Asaas pós-rollback",
      "Guardian pós-rollback exit 0 ou findings explicados",
      "Comunicar proprietário",
    ],
  };
}

function buildMonitoringPlans(stabilization: Record<string, unknown> | null): {
  monitoring24h: string[];
  monitoringWeek1: string[];
} {
  const prod = (stabilization?.deploymentPlan as { production?: { monitoring?: string[] } })?.production;
  const base = prod?.monitoring ?? [
    "Guardian diário",
    "Logs webhook /api/webhooks/asaas",
    "Admin stats sem divergência",
    "Zero erros F1/F4",
  ];

  return {
    monitoring24h: [
      "Monitorar logs Vercel a cada 2h (primeiras 24h)",
      "Verificar webhooks Asaas — zero 5xx",
      "Checkout sandbox + produção (1 transação real mínima)",
      "Guardian manual 2h após deploy",
      "Admin: contagem agendamentos/pagamentos vs baseline",
      "Alerta proprietário se F1/F4 falhar",
      ...base.slice(0, 3),
    ],
    monitoringWeek1: [
      "Guardian diário por 7 dias",
      "Revisar memory.json — tendência de checks",
      "Auditar fila webhooks Asaas (eventos pendentes)",
      "Code Health Agent reexecutar ao fim da semana",
      "Validação proprietário em admin e Minha Conta",
      "Documentar incidentes em evolution-report",
      ...base,
    ],
  };
}

function buildDeployPlan(stabilization: Record<string, unknown> | null, criticalPath: string[]): string[] {
  const hom = (stabilization?.deploymentPlan as { homologation?: { checklist?: string[] } })?.homologation?.checklist ?? [];
  const prod = (stabilization?.deploymentPlan as { production?: { checklist?: string[] } })?.production?.checklist ?? [];
  const safest = (stabilization?.summary as { safestPath?: string })?.safestPath;

  const plan: string[] = [
    "Fase 0 — Pré-requisitos: Decision desbloqueada por PR incremental",
    "Fase 1 — Homologação (staging)",
    ...hom.map((s, i) => `  ${i + 1}. ${s}`),
  ];
  if (safest) plan.push(`Caminho seguro: ${safest}`);
  if (criticalPath.length) {
    plan.push("Caminho crítico:");
    criticalPath.forEach((s, i) => plan.push(`  ${i + 1}. ${s}`));
  }
  plan.push("Fase 2 — Produção");
  prod.forEach((s, i) => plan.push(`  ${i + 1}. ${s}`));
  return plan;
}

function buildRollbackPlan(stabilization: Record<string, unknown> | null): string[] {
  const rollbackItems = (stabilization?.rollbackPlan as Array<{ prId: string; howToRevert: string[]; impact: string }>) ?? [];
  const prodRollback = (stabilization?.deploymentPlan as { production?: { rollback?: string[] } })?.production?.rollback ?? [];

  const plan: string[] = [
    "Rollback de emergência (produção):",
    ...prodRollback.map((s) => `  • ${s}`),
    "",
    "Rollback por PR:",
  ];
  for (const item of rollbackItems.slice(0, 5)) {
    plan.push(`  ${item.prId} (impacto ${item.impact}):`);
    item.howToRevert.forEach((s) => plan.push(`    - ${s}`));
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function buildMarkdown(report: ReleaseReport): string {
  const L: string[] = [];
  const statusEmoji =
    report.releaseStatus === "READY" ? "✅" : report.releaseStatus === "READY_WITH_WARNINGS" ? "⚠️" : "🛑";

  L.push("# Release Report — THouse");
  L.push("");
  L.push(`**Gerado em:** ${report.generatedAt}`);
  L.push(`**Release Score:** ${report.releaseScore}/100`);
  L.push(`**Status:** ${statusEmoji} **${report.releaseStatus}**`);
  L.push("");
  L.push("## Resumo");
  L.push(report.context.executiveSummary);
  L.push("");
  L.push("## Motivos da decisão");
  report.decision.reasons.forEach((r) => L.push(`- ${r}`));
  L.push("");
  L.push("## Bloqueadores");
  if (report.decision.blockers.length === 0) L.push("- Nenhum bloqueador crítico");
  else report.decision.blockers.forEach((b) => L.push(`- **[${b.severity}]** ${b.message}`));
  L.push("");
  L.push("## Pendências obrigatórias");
  report.decision.mandatoryPending.forEach((p) => L.push(`- [ ] ${p}`));
  L.push("");
  L.push("## Pendências opcionais");
  report.decision.optionalPending.forEach((p) => L.push(`- [ ] ${p}`));
  L.push("");
  L.push("## Release Score — breakdown");
  L.push(`Base: ${report.scoreBreakdown.base}`);
  report.scoreBreakdown.adjustments.forEach((a) => {
    L.push(`- ${a.factor}: ${a.delta >= 0 ? "+" : ""}${a.delta} (${a.detail})`);
  });
  L.push(`**Final: ${report.scoreBreakdown.final}/100**`);
  L.push("");
  L.push("## Perguntas obrigatórias");
  L.push("### O que falta para publicar?");
  report.questions.whatIsMissing.forEach((x) => L.push(`- ${x}`));
  L.push("### O que precisa ser testado?");
  report.questions.whatNeedsTesting.forEach((x) => L.push(`- ${x}`));
  L.push("### Quais migrations ainda faltam?");
  report.questions.pendingMigrations.forEach((x) => L.push(`- ${x}`));
  L.push("### Quais riscos existem?");
  report.questions.risks.forEach((x) => L.push(`- ${x}`));
  L.push(`### Quanto risco existe em publicar hoje?`);
  L.push(`${report.questions.riskLevelToday} (score de risco: ${report.questions.riskLevelScore}/100)`);
  L.push("");
  L.push("## Checklist de deploy");
  report.checklists.deploy.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Checklist de banco");
  report.checklists.database.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Checklist Guardian");
  report.checklists.guardian.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Checklist financeiro");
  report.checklists.financeiro.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Checklist webhook");
  report.checklists.webhook.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Checklist admin");
  report.checklists.admin.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Checklist Minha Conta");
  report.checklists.minhaConta.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Checklist rollback");
  report.checklists.rollback.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Plano de deploy");
  report.plans.deploy.forEach((s) => L.push(s));
  L.push("");
  L.push("## Plano de rollback");
  report.plans.rollback.forEach((s) => L.push(s));
  L.push("");
  L.push("## Monitoramento — primeiras 24h");
  report.plans.monitoring24h.forEach((s) => L.push(`- ${s}`));
  L.push("");
  L.push("## Monitoramento — primeira semana");
  report.plans.monitoringWeek1.forEach((s) => L.push(`- ${s}`));
  L.push("");
  L.push("## Limitações V1");
  report.limitations.forEach((l) => L.push(`- ${l}`));
  L.push("");
  L.push("---");
  L.push("_Release Manager Agent V1 — somente análise. Nenhum código foi alterado._");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const sources: Array<{ path: string; loaded: boolean }> = [];
  const load = async (rel: string, isJson = true) => {
    const actual = path.join(ROOT, rel);
    const data = isJson ? await tryReadJson(actual) : await tryReadText(actual);
    sources.push({ path: rel, loaded: data !== null });
    return data;
  };

  const [
    decisionMd,
    executionStatus,
    engineeringBacklog,
    ctoReport,
    latest,
    advisorMd,
    actionPlan,
    reviewChecklist,
    implementationPlan,
    stabilizationPlan,
    codeHealth,
    refactorReport,
    projectContext,
    knowledgeGraph,
    architectureDecisions,
    memory,
    evolutionReport,
  ] = await Promise.all([
    load("reports/domain-guardian/decision.md", false),
    load("reports/domain-guardian/execution-status.json"),
    load("reports/domain-guardian/engineering-backlog.json"),
    load("reports/domain-guardian/cto-report.json"),
    load("reports/domain-guardian/latest.json"),
    load("reports/domain-guardian/advisor.md", false),
    load("reports/domain-guardian/action-plan.md", false),
    load("reports/domain-guardian/review-checklist.md", false),
    load("reports/domain-guardian/implementation-plan.json"),
    load("reports/domain-guardian/stabilization-plan.json"),
    load("reports/domain-guardian/code-health.json"),
    load("reports/domain-guardian/refactor-report.json"),
    load("reports/domain-guardian/project-context.json"),
    load("reports/domain-guardian/project-knowledge-graph.json"),
    load("reports/domain-guardian/architecture-decisions.json"),
    load("reports/domain-guardian/memory.json"),
    load("reports/domain-guardian/evolution-report.json"),
  ]);

  const exec = executionStatus as Record<string, unknown> | null;
  const cto = ctoReport as Record<string, unknown> | null;
  const evolution = evolutionReport as Record<string, unknown> | null;
  const stab = stabilizationPlan as Record<string, unknown> | null;
  const health = codeHealth as Record<string, unknown> | null;
  const backlog = engineeringBacklog as Record<string, unknown> | null;

  const projectName =
    (exec?.summary as { projectName?: string })?.projectName ??
    (cto?.summary as { projectName?: string })?.projectName ??
    "THouse";

  const decisionFromExec = (exec?.decision as { status?: string })?.status;
  const decisionStatus = decisionFromExec ?? parseDecisionStatus(decisionMd as string | null);

  const guardianFromExec = exec?.guardian as { status?: string; errors?: number; warnings?: number; lastRun?: string } | undefined;
  const latestSummary = (latest as { summary?: { errors?: number; warnings?: number } })?.summary;
  const advisor = parseAdvisorStatus(advisorMd as string | null);

  const guardianErrors = guardianFromExec?.errors ?? latestSummary?.errors ?? advisor.errors;
  const guardianWarnings = guardianFromExec?.warnings ?? latestSummary?.warnings ?? advisor.warnings;
  const guardianStatus = guardianFromExec?.status ?? advisor.status;
  const guardianHealthy = guardianStatus === "HEALTHY" && guardianErrors === 0;

  const deployReady =
    (exec?.summary as { deployReady?: boolean })?.deployReady ??
    (evolution?.summary as { deployReady?: boolean })?.deployReady ??
    (cto?.health as { deploy?: { ready?: boolean } })?.deploy?.ready ??
    false;

  const migrationsPending =
    (exec?.deploymentReadiness as { migrationsPending?: number })?.migrationsPending ??
    (evolution?.summary as { migrationsPending?: number })?.migrationsPending ??
    (stab?.summary as { migrationsCount?: number })?.migrationsCount ??
    0;

  const pendingFiles =
    (evolution?.summary as { pendingFiles?: number })?.pendingFiles ??
    (stab?.summary as { totalFiles?: number })?.totalFiles ??
    0;

  const executionProgress = (exec?.summary as { overallProgressPercent?: number })?.overallProgressPercent ?? 0;
  const sprintProgress = (exec?.currentSprint as { progressPercent?: number })?.progressPercent ?? 0;

  const ctoDeployScore = (cto?.scores as { deploy?: { score?: number } })?.deploy?.score ?? null;
  const codeHealthScore = (health?.summary as { codeHealthScore?: number })?.codeHealthScore ?? null;

  const migrations = extractMigrations(evolution, stab);
  const blockers = collectBlockers(exec, decisionStatus, guardianErrors, migrationsPending, deployReady, pendingFiles);
  const criticalBlockers = blockers.filter((b) => b.severity === "critical").length;

  const scoreBreakdown = calcReleaseScore({
    decisionStatus,
    guardianErrors,
    guardianWarnings,
    guardianHealthy,
    deployReady,
    migrationsPending,
    pendingFiles,
    codeHealthScore,
    ctoDeployScore,
    executionProgress,
    criticalBlockers,
  });

  const releaseScore = scoreBreakdown.final;
  const releaseStatus = determineReleaseStatus(
    releaseScore,
    decisionStatus,
    guardianErrors,
    criticalBlockers,
    deployReady,
    migrationsPending
  );

  const reasons: string[] = [];
  if (decisionStatus === "BLOCKED") reasons.push("Decision Engine BLOCKED — escopo CRITICAL com 154+ arquivos HIGH/CRITICAL");
  if (!deployReady) reasons.push("CTO e Execution Manager indicam deployReady=false");
  if (migrationsPending > 0) reasons.push(`${migrationsPending} migration(s) não aplicadas em staging`);
  if (pendingFiles > 50) reasons.push(`${pendingFiles} arquivo(s) pendentes — deploy incremental obrigatório`);
  if (guardianHealthy) reasons.push("Guardian HEALTHY — banco e invariantes OK no último run");
  if (codeHealthScore !== null && codeHealthScore < 50) reasons.push(`Code Health ${codeHealthScore}/100 (E) — dívida técnica alta`);
  if (executionProgress === 0) reasons.push("Sprint 1 com 0% de progresso — nenhum commit planejado concluído");
  if (reasons.length === 0) reasons.push("Todos os sinais favoráveis para publicação");

  const mandatoryPending: string[] = [];
  const optionalPending: string[] = [];

  if (decisionStatus === "BLOCKED") {
    mandatoryPending.push("Desbloquear Decision Engine via PRs incrementais (stabilization-plan)");
  }
  if (migrationsPending > 0) {
    mandatoryPending.push(`Aplicar ${migrationsPending} migration(s) em staging: npx prisma migrate deploy`);
  }
  const execChecklist = (exec?.deploymentReadiness as { checklist?: string[] })?.checklist ?? [];
  mandatoryPending.push(...execChecklist.slice(0, 4));

  const nextAction = (exec?.nextAction as { action?: string })?.action;
  if (nextAction) mandatoryPending.push(nextAction);

  const topBacklog = (backlog?.top50 as Array<{ title?: string; priority?: string }>) ?? [];
  for (const item of topBacklog.filter((i) => i.priority === "Critical").slice(0, 3)) {
    mandatoryPending.push(item.title ?? "Item crítico do backlog");
  }

  optionalPending.push("Executar refactor-report itens de baixo risco após estabilização");
  optionalPending.push("Atualizar evolution-report pós-deploy");
  if ((refactorReport as { summary?: { totalIssues?: number } })?.summary?.totalIssues) {
    optionalPending.push("Endereçar dívida técnica do refactor-report (não bloqueia release incremental)");
  }

  const criticalPath = (exec?.roadmap as { criticalPath?: string[] })?.criticalPath ?? [];
  const checklists = buildChecklists(stab, latest as Record<string, unknown> | null, migrations);
  const monitoring = buildMonitoringPlans(stab);

  const risks: string[] = [];
  if (decisionStatus === "BLOCKED") risks.push("Regressão financeira em produção (Payment + Appointment no mesmo diff)");
  if (migrationsPending > 0) risks.push("Schema drift entre staging e produção");
  risks.push("Webhook Asaas processado duas vezes (F1/F4)");
  risks.push("Agendamentos arquivados visíveis no checkout (A5/A8)");
  const openRisks = (evolution?.summary as { openRisks?: number })?.openRisks;
  if (openRisks) risks.push(`${openRisks} risco(s) abertos no evolution-report`);

  const whatNeedsTesting = [
    ...checklists.financeiro.slice(0, 4),
    ...checklists.webhook.slice(0, 3),
    ...checklists.admin.slice(0, 3),
    ...checklists.minhaConta.slice(0, 3),
    "npm run build",
    "Guardian + Decision pós-merge",
  ];

  const whatIsMissing: string[] = [];
  if (decisionStatus === "BLOCKED") whatIsMissing.push("Decision APPROVED (atualmente BLOCKED)");
  if (!deployReady) whatIsMissing.push("deployReady=true em execution-status e cto-report");
  if (migrationsPending > 0) whatIsMissing.push(`${migrationsPending} migrations em staging validadas`);
  if (executionProgress < 100) {
    whatIsMissing.push(`Concluir Sprint 1 (${executionProgress}% de ${(exec?.summary as { commitsTotal?: number })?.commitsTotal ?? "?"} commits)`);
  }
  whatIsMissing.push("Homologação completa com checklist assinado pelo proprietário");

  const riskLevelScore = Math.max(0, 100 - releaseScore);
  const riskLevelToday = riskLevelLabel(releaseScore, decisionStatus, migrationsPending);

  const executiveSummary = [
    `Release ${releaseStatus} — Score ${releaseScore}/100.`,
    decisionStatus === "BLOCKED" ? "Decision BLOCKED impede publicação." : `Decision: ${decisionStatus}.`,
    guardianHealthy ? "Guardian HEALTHY." : `Guardian: ${guardianStatus}.`,
    deployReady ? "Deploy pronto." : "Deploy não recomendado.",
    migrationsPending > 0 ? `${migrationsPending} migrations pendentes.` : "Sem migrations pendentes.",
    pendingFiles > 0 ? `${pendingFiles} arquivos no diff.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const report: ReleaseReport = {
    agentVersion: AGENT_VERSION,
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    projectName,
    releaseStatus,
    releaseScore,
    decision: {
      status: releaseStatus,
      reasons,
      blockers,
      mandatoryPending: [...new Set(mandatoryPending)],
      optionalPending: [...new Set(optionalPending)],
    },
    checklists,
    scoreBreakdown,
    questions: {
      whatIsMissing,
      whatNeedsTesting: [...new Set(whatNeedsTesting)],
      pendingMigrations: migrations.length ? migrations : ["Nenhuma migration listada nos relatórios"],
      risks,
      riskLevelToday,
      riskLevelScore,
    },
    plans: {
      deploy: buildDeployPlan(stab, criticalPath),
      rollback: buildRollbackPlan(stab),
      monitoring24h: monitoring.monitoring24h,
      monitoringWeek1: monitoring.monitoringWeek1,
    },
    signals: {
      guardian: {
        status: guardianStatus ?? "UNKNOWN",
        errors: guardianErrors,
        warnings: guardianWarnings,
        lastRun: guardianFromExec?.lastRun ?? (latest as { generatedAt?: string })?.generatedAt ?? null,
      },
      decisionEngine: decisionStatus,
      ctoDeployScore,
      codeHealthScore,
      deployReady,
      migrationsPending,
      pendingFiles,
      sprintProgressPercent: sprintProgress,
      executionProgressPercent: executionProgress,
    },
    context: {
      sourcesConsulted: sources,
      headline: `${releaseStatus} · Score ${releaseScore}/100 · Decision ${decisionStatus}`,
      executiveSummary,
    },
    limitations: [
      "Análise baseada em relatórios existentes — não executa Guardian nem testes em runtime",
      "Decision status inferido de decision.md e execution-status (pode estar desatualizado)",
      "Release Score é heurístico — não substitui revisão humana do proprietário",
      "Não detecta variáveis de ambiente ausentes na Vercel",
      "Migrations listadas dos relatórios — não verifica _prisma_migrations no banco",
      "READY_WITH_WARNINGS não autoriza deploy em produção sem checklist completo",
      "Não integra CI/CD nem status real do Vercel/Neon",
    ],
  };

  await mkdir(GUARDIAN_DIR, { recursive: true });
  const jsonPath = path.join(GUARDIAN_DIR, "release-report.json");
  const mdPath = path.join(GUARDIAN_DIR, "release-report.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  console.log("Release Manager — análise gerada");
  console.log(`  Projeto:       ${projectName}`);
  console.log(`  Status:        ${releaseStatus}`);
  console.log(`  Score:         ${releaseScore}/100`);
  console.log(`  Decision:      ${decisionStatus}`);
  console.log(`  Guardian:      ${guardianStatus} (${guardianErrors} erros, ${guardianWarnings} avisos)`);
  console.log(`  Deploy ready:  ${deployReady}`);
  console.log(`  Migrations:    ${migrationsPending} pendente(s)`);
  console.log(`  Bloqueadores:  ${blockers.length}`);
  console.log(`  Risco hoje:    ${riskLevelToday}`);
  console.log(`  JSON:          ${path.relative(ROOT, jsonPath)}`);
  console.log(`  Markdown:      ${path.relative(ROOT, mdPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
