/**
 * Implementation Executor Agent V1 — Plano de implementação para um item do backlog.
 *
 * Não altera código, banco, APIs ou UI.
 * Transforma um item do engineering-backlog em plano executável.
 *
 * Uso:
 *   node --experimental-strip-types scripts/implementation-executor-agent.ts --item=EB-024
 *   node --experimental-strip-types scripts/implementation-executor-agent.ts --item=ENG-024
 *
 * Saída:
 *   reports/domain-guardian/execution-plan-<BACKLOG_ID>.json
 *   reports/domain-guardian/execution-plan-<BACKLOG_ID>.md
 *
 * Exit code: 0 sucesso, 1 item não encontrado ou backlog ausente.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const GUARDIAN_DIR = path.join(ROOT, "reports/domain-guardian");
const DOCS_DIR = path.join(ROOT, "docs/ai");

const AGENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BacklogItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  estimatedEffort: string;
  estimatedRisk: string;
  estimatedBenefit: string;
  businessImpact: string;
  technicalImpact: string;
  guardianImpact: string;
  dependencies: string[];
  files: string[];
  entities: string[];
  flows: string[];
  adrs: string[];
  checks: string[];
  blockingItems: string[];
  acceptanceCriteria: string[];
  rollbackStrategy: string;
  recommendedTests: string[];
  roiScore?: number;
  source?: string;
};

type PlanStep = {
  step: number;
  title: string;
  objective: string;
  files: string[];
  risk: string;
  rollback: string;
  completionCriteria: string[];
};

type ExecutionPlan = {
  agentVersion: string;
  generatedAt: string;
  language: "pt-BR";
  backlogItemId: string;
  summary: {
    executiveSummary: string;
    objective: string;
    problemSolved: string;
    motivation: string;
    expectedImpact: string;
    projectName: string;
    category: string;
    priority: string;
    roiScore: number;
  };
  files: {
    required: string[];
    optional: string[];
    sensitive: string[];
    forbidden: string[];
  };
  dependencies: {
    order: string[];
    critical: string[];
    optional: string[];
  };
  steps: PlanStep[];
  checklists: {
    technical: string[];
    functional: string[];
    guardian: string[];
    qa: string[];
    owner: string[];
  };
  architecture: {
    adrs: Array<{ id: string; title: string; relevance: string }>;
    invariants: string[];
    guardianChecks: string[];
  };
  testingPlan: {
    smoke: string[];
    integration: string[];
    financeiro: string[];
    admin: string[];
    minhaConta: string[];
    webhook: string[];
    deploy: string[];
    rollback: string[];
  };
  riskAnalysis: {
    whatCanBreak: string[];
    validateFirst: string[];
    neverModify: string[];
    worstConsequence: string;
  };
  context: {
    sourcesConsulted: Array<{ path: string; loaded: boolean }>;
    backlogGeneratedAt: string | null;
    relatedExecutionStatus: string | null;
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

function parseItemArg(argv: string[]): string {
  for (const arg of argv) {
    const m = arg.match(/^--item=(.+)$/);
    if (m) return normalizeItemId(m[1].trim());
  }
  return "";
}

function normalizeItemId(id: string): string {
  const upper = id.toUpperCase();
  if (upper.startsWith("ENG-")) return "EB-" + upper.slice(4);
  if (upper.startsWith("EB-")) return upper;
  return upper;
}

function collectAllBacklogItems(backlog: Record<string, unknown>): BacklogItem[] {
  const items: BacklogItem[] = [];
  const seen = new Set<string>();
  const add = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      const item = raw as BacklogItem;
      if (item?.id && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  };
  add(backlog.top50);
  const buckets = backlog.buckets as Record<string, unknown> | undefined;
  if (buckets) {
    for (const key of Object.keys(buckets)) add(buckets[key]);
  }
  return items;
}

function findBacklogItem(backlog: Record<string, unknown>, itemId: string): BacklogItem | null {
  return collectAllBacklogItems(backlog).find((i) => i.id === itemId) ?? null;
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS = [/webhook/i, /payment/i, /pagamento/i, /asaas/i, /schema\.prisma/i, /process-payment/i];
const FORBIDDEN_ALWAYS = [
  "Invariantes F1-F8 sem revisão",
  "Purge físico de Payment/Appointment arquivados",
  "Remoção de idempotência do webhook Asaas",
  "Alteração de ownership de cupom sem Guardian C1/X1",
];

function classifyFiles(files: string[]): ExecutionPlan["files"] {
  const required: string[] = [];
  const optional: string[] = [];
  const sensitive: string[] = [];
  for (const f of files) {
    if (SENSITIVE_PATTERNS.some((p) => p.test(f))) sensitive.push(f);
    else if (f.includes("test") || f.includes("docs/")) optional.push(f);
    else required.push(f);
  }
  return {
    required,
    optional,
    sensitive,
    forbidden: [...FORBIDDEN_ALWAYS],
  };
}

function enrichFilesFromKnowledgeGraph(
  item: BacklogItem,
  kg: Record<string, unknown> | null
): string[] {
  const files = new Set(item.files);
  // Só enriquece via KG quando o backlog não lista paths — evita inflar escopo
  if (item.files.length === 0) {
    const entities = (kg?.entities as Array<{ name?: string; files?: string[]; criticalFiles?: string[] }>) ?? [];
    for (const ent of item.entities) {
      const match = entities.find((e) => e.name === ent);
      if (match) {
        for (const f of match.criticalFiles ?? match.files?.slice(0, 5) ?? []) {
          if (f && !f.includes("reports/")) files.add(f);
        }
      }
    }
  }
  if (files.size === 0 && item.category === "Correção") {
    files.add("reports/domain-guardian/decision.md");
    files.add("scripts/domain-change-analyzer.ts");
    files.add("scripts/domain-decision-engine.ts");
  }
  if (files.size === 0 && item.category === "Deploy") {
    files.add("prisma/schema.prisma");
    files.add("prisma/migrations/");
  }
  return [...files];
}

function resolveAdrs(
  item: BacklogItem,
  adrsDoc: Record<string, unknown> | null
): Array<{ id: string; title: string; relevance: string }> {
  const decisions = (adrsDoc?.decisions as Array<{ id?: string; adrId?: string; title?: string; summary?: string }>) ?? [];
  const ids = new Set(item.adrs);
  const categoryAdrMap: Record<string, string[]> = {
    Financeiro: ["ADR-002", "ADR-003", "ADR-008", "ADR-009"],
    Deploy: ["ADR-014"],
    Refatoração: ["ADR-011"],
    Arquitetura: ["ADR-011", "ADR-012", "ADR-015"],
    Admin: ["ADR-004", "ADR-005", "ADR-006"],
    UX: ["ADR-005", "ADR-006"],
    Documentação: ["ADR-001", "ADR-011"],
    Correção: ["ADR-001", "ADR-014"],
  };
  for (const id of categoryAdrMap[item.category] ?? []) ids.add(id);

  return [...ids]
    .map((id) => {
      const d = decisions.find((x) => x.id === id || x.adrId === id);
      return {
        id,
        title: d?.title ?? id,
        relevance: d?.summary?.slice(0, 120) ?? `ADR aplicável à categoria ${item.category}`,
      };
    })
    .slice(0, 8);
}

function extractInvariants(
  item: BacklogItem,
  invariantsMd: string | null
): string[] {
  const found: string[] = [];
  const checks = item.checks.length > 0 ? item.checks : defaultChecksForCategory(item.category);
  if (!invariantsMd) {
    return checks.map((c) => `Invariante ${c} deve permanecer válido`);
  }
  for (const check of checks) {
    const re = new RegExp(`${check}[^\\n]*`, "gi");
    const m = invariantsMd.match(re);
    if (m) found.push(m[0].trim().slice(0, 200));
    else found.push(`${check}: manter conforme docs/ai/domain-invariants.md`);
  }
  if (item.entities.includes("Payment")) {
    found.push("F1-F8: integridade financeira e idempotência");
  }
  if (item.entities.includes("Appointment")) {
    found.push("A5/A8/A9: arquivamento soft, queries operacionais");
  }
  return [...new Set(found)].slice(0, 15);
}

function defaultChecksForCategory(category: string): string[] {
  const map: Record<string, string[]> = {
    Financeiro: ["F1", "F2", "F3", "F4", "F6", "F8"],
    Deploy: ["F4", "A8"],
    Refatoração: ["F1", "F4"],
    Admin: ["A5", "A9"],
    UX: ["A7", "A8"],
    Correção: ["F1", "F4", "C1"],
    Documentação: ["F1", "F4"],
    Arquitetura: ["F1", "F4", "A5"],
  };
  return map[category] ?? ["F1", "F4"];
}

function buildSteps(item: BacklogItem, allFiles: string[]): PlanStep[] {
  const steps: PlanStep[] = [];
  const risk = item.estimatedRisk;
  const rb = item.rollbackStrategy;

  steps.push({
    step: 1,
    title: "Preparação e leitura de contexto",
    objective: "Confirmar escopo, ADRs e invariantes antes de qualquer alteração",
    files: ["docs/ai/domain-invariants.md", "docs/ai/domain-map.md", ...allFiles.slice(0, 3)],
    risk: "Baixo",
    rollback: "N/A — somente leitura",
    completionCriteria: ["ADR e invariantes revisados", "Escopo alinhado ao item do backlog"],
  });

  if (item.blockingItems.length > 0 || item.category === "Correção") {
    steps.push({
      step: 2,
      title: "Desbloquear dependências",
      objective: "Resolver bloqueios: " + (item.blockingItems.join("; ") || item.description),
      files: item.dependencies.length ? [] : ["scripts/domain-change-analyzer.ts", "scripts/domain-decision-engine.ts"],
      risk: "Médio",
      rollback: "Reverter organização de commits",
      completionCriteria: ["Decision não BLOCKED para escopo reduzido", "PR < 50 arquivos"],
    });
  }

  const implStep = steps.length + 1;
  steps.push({
    step: implStep,
    title: "Implementação do escopo",
    objective: item.description,
    files: allFiles.filter((f) => !f.endsWith("/")),
    risk,
    rollback: rb,
    completionCriteria: item.acceptanceCriteria.length
      ? item.acceptanceCriteria
      : ["Código compila", "Escopo do item concluído"],
  });

  if (item.category === "Deploy" || item.files.some((f) => f.includes("prisma"))) {
    steps.push({
      step: implStep + 1,
      title: "Migrations e schema (staging)",
      objective: "Aplicar migrations em homologação — nunca direto em produção sem validação",
      files: ["prisma/schema.prisma", "prisma/migrations/"],
      risk: "Crítico",
      rollback: "Migration reversa manual em janela controlada",
      completionCriteria: ["npx prisma migrate deploy (staging)", "npx prisma generate", "Smoke pós-migration"],
    });
  }

  steps.push({
    step: steps.length + 1,
    title: "Validação Guardian e Decision",
    objective: item.guardianImpact,
    files: ["scripts/domain-guardian-runner.ts", "scripts/domain-decision-engine.ts"],
    risk: "Baixo",
    rollback: "git revert se Guardian falhar",
    completionCriteria: ["domain-guardian-runner.ts exit 0", "Decision APPROVED ou REVIEW_REQUIRED"],
  });

  steps.push({
    step: steps.length + 1,
    title: "Testes e revisão",
    objective: "Executar plano de testes e checklist do proprietário",
    files: [],
    risk: "Baixo",
    rollback: rb,
    completionCriteria: [...item.recommendedTests, "Revisão humana aprovada"],
  });

  return steps.map((s, i) => ({ ...s, step: i + 1 }));
}

function buildTestingPlan(item: BacklogItem, category: string): ExecutionPlan["testingPlan"] {
  const base = item.recommendedTests;
  const isFinance = category === "Financeiro" || item.entities.includes("Payment");
  const isWebhook = item.flows.some((f) => /webhook/i.test(f)) || item.files.some((f) => /webhook/i.test(f));
  const isAdmin = category === "Admin" || item.files.some((f) => /admin/i.test(f));
  const isConta = category === "UX" || item.files.some((f) => /minha-conta|meus-dados|conta/i.test(f));

  return {
    smoke: ["npm run build", "Aplicação inicia", "Login admin", ...base.filter((t) => /smoke/i.test(t))],
    integration: [
      "domain-guardian-runner.ts exit 0",
      "domain-decision-engine.ts",
      ...base.filter((t) => /guardian|integration/i.test(t)),
    ],
    financeiro: isFinance
      ? ["Checkout sandbox agendamento", "Webhook PAYMENT_RECEIVED idempotente", "Reembolso escolher-reembolso"]
      : ["N/A — escopo não financeiro"],
    admin: isAdmin ? ["Navegar painel admin", "Filtros e ações do escopo"] : ["Smoke admin login"],
    minhaConta: isConta ? ["Login cliente", "Listar agendamentos/cupons inalterados"] : ["N/A"],
    webhook: isWebhook
      ? ["Simular PAYMENT_RECEIVED duplicado", "Verificar idempotência", "Fila Asaas"]
      : ["N/A"],
    deploy: category === "Deploy" ? ["migrate deploy staging", "Smoke pós-deploy", "Variáveis env"] : ["Preview Vercel"],
    rollback: [item.rollbackStrategy, "git revert merge commit", "Redeploy versão anterior", "Guardian pós-rollback"],
  };
}

function buildRiskAnalysis(item: BacklogItem, category: string): ExecutionPlan["riskAnalysis"] {
  const whatCanBreak: string[] = [];
  if (category === "Financeiro" || item.entities.includes("Payment")) {
    whatCanBreak.push("Cobrança duplicada", "Webhook processado duas vezes", "Cupom dessincronizado");
  }
  if (item.entities.includes("Appointment")) {
    whatCanBreak.push("Agendamentos duplicados", "Disponibilidade incorreta", "Arquivados visíveis no checkout");
  }
  if (category === "Deploy") {
    whatCanBreak.push("Migration irreversível", "Downtime", "Schema drift produção/staging");
  }
  if (whatCanBreak.length === 0) {
    whatCanBreak.push("Regressão em build", "Decision BLOCKED persistente");
  }

  const validateFirst = [
    "Guardian exit 0 no estado atual",
    ...item.checks.slice(0, 3).map((c) => `Check ${c} OK`),
    ...(category === "Financeiro" ? ["Sandbox Asaas antes de produção"] : []),
  ];

  const neverModify = [
    ...FORBIDDEN_ALWAYS,
    ...(item.category !== "Refatoração" ? ["Regras de negócio não relacionadas ao item"] : []),
  ];

  let worst = "Regressão localizada reversível com git revert";
  if (category === "Financeiro" && item.priority === "Critical") {
    worst = "Cobrança duplicada ou perda de sincronização pagamento→agendamento em produção";
  }
  if (category === "Deploy") {
    worst = "Migration corrompida em produção exigindo restore de backup";
  }

  return { whatCanBreak, validateFirst, neverModify, worstConsequence: worst };
}

function buildChecklists(item: BacklogItem, steps: PlanStep[]): ExecutionPlan["checklists"] {
  return {
    technical: [
      "npm run build sem erros",
      "Nenhum arquivo fora do escopo alterado",
      "Commits atômicos com Conventional Commits",
      ...item.acceptanceCriteria.slice(0, 3),
    ],
    functional: [
      ...item.flows.slice(0, 3).map((f) => `Fluxo ${f} validado`),
      item.businessImpact ? `Impacto negócio: ${item.businessImpact.slice(0, 80)}` : "Smoke funcional",
    ],
    guardian: [
      "node --experimental-strip-types scripts/domain-guardian-runner.ts",
      "node --experimental-strip-types scripts/domain-decision-engine.ts",
      ...item.checks.map((c) => `Check ${c} sem erros`),
    ],
    qa: [
      ...item.recommendedTests,
      "Teste manual em homologação",
      "Regressão em fluxos adjacentes",
    ],
    owner: [
      "Validar impacto visível no admin ou Minha Conta",
      "Aprovar merge após checklist completo",
      "Confirmar que item do backlog está resolvido",
    ],
  };
}

function buildDependencies(item: BacklogItem, exec: Record<string, unknown> | null): ExecutionPlan["dependencies"] {
  const critical: string[] = [...item.blockingItems];
  const execBlockers = (exec?.blockers as Array<{ message?: string }>) ?? [];
  for (const b of execBlockers.slice(0, 3)) {
    if (b.message) critical.push(b.message);
  }
  if (item.dependencies.length) critical.push(...item.dependencies);

  const order = [
    "Revisar ADRs e invariantes",
    ...(critical.length ? ["Resolver bloqueios críticos"] : []),
    "Implementar escopo do item",
    "Guardian + Decision",
    "Testes + revisão proprietário",
    ...(item.category === "Deploy" ? ["Homologação antes de produção"] : []),
  ];

  const optional =
    item.priority === "Low"
      ? ["Refatorações adjacentes", "Documentação extra"]
      : ["Paralelizar com agentes read-only"];

  return {
    order,
    critical: [...new Set(critical.map((c) => c.trim()).filter(Boolean))],
    optional,
  };
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function buildMarkdown(plan: ExecutionPlan): string {
  const L: string[] = [];
  const s = plan.summary;
  L.push(`# Execution Plan — ${plan.backlogItemId}`);
  L.push("");
  L.push(`**Gerado em:** ${plan.generatedAt}`);
  L.push(`**Item:** ${s.objective}`);
  L.push("");
  L.push("## Resumo Executivo");
  L.push(s.executiveSummary);
  L.push("");
  L.push("| Campo | Valor |");
  L.push("|-------|-------|");
  L.push(`| Objetivo | ${s.objective} |`);
  L.push(`| Problema | ${s.problemSolved} |`);
  L.push(`| Motivação | ${s.motivation} |`);
  L.push(`| Impacto | ${s.expectedImpact} |`);
  L.push(`| Prioridade | ${s.priority} |`);
  L.push(`| ROI | ${s.roiScore} |`);
  L.push("");
  L.push("## Arquivos");
  L.push("### Obrigatórios");
  plan.files.required.forEach((f) => L.push(`- ${f}`));
  L.push("### Sensíveis");
  plan.files.sensitive.forEach((f) => L.push(`- ⚠️ ${f}`));
  L.push("### Proibidos modificar");
  plan.files.forbidden.forEach((f) => L.push(`- 🚫 ${f}`));
  L.push("");
  L.push("## Plano passo a passo");
  for (const step of plan.steps) {
    L.push(`### Passo ${step.step}: ${step.title}`);
    L.push(`**Objetivo:** ${step.objective}`);
    L.push(`**Risco:** ${step.risk} · **Rollback:** ${step.rollback}`);
    L.push("**Arquivos:** " + (step.files.length ? step.files.join(", ") : "—"));
    L.push("**Conclusão:**");
    step.completionCriteria.forEach((c) => L.push(`- [ ] ${c}`));
    L.push("");
  }
  L.push("## ADRs");
  plan.architecture.adrs.forEach((a) => L.push(`- **${a.id}** ${a.title}`));
  L.push("");
  L.push("## Invariantes");
  plan.architecture.invariants.forEach((i) => L.push(`- ${i}`));
  L.push("");
  L.push("## Guardian Checks");
  plan.architecture.guardianChecks.forEach((c) => L.push(`- ${c}`));
  L.push("");
  L.push("## Análise de risco");
  L.push("### O que pode quebrar?");
  plan.riskAnalysis.whatCanBreak.forEach((x) => L.push(`- ${x}`));
  L.push("### Validar primeiro");
  plan.riskAnalysis.validateFirst.forEach((x) => L.push(`- ${x}`));
  L.push("### Nunca modificar");
  plan.riskAnalysis.neverModify.forEach((x) => L.push(`- ${x}`));
  L.push(`### Pior consequência: ${plan.riskAnalysis.worstConsequence}`);
  L.push("");
  L.push("## Checklist Guardian");
  plan.checklists.guardian.forEach((c) => L.push(`- [ ] ${c}`));
  L.push("");
  L.push("## Limitações V1");
  plan.limitations.forEach((l) => L.push(`- ${l}`));
  L.push("");
  L.push("---");
  L.push("_Implementation Executor — somente plano. Nenhum código foi alterado._");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const itemId = parseItemArg(process.argv.slice(2));
  if (!itemId) {
    console.error("Uso: node --experimental-strip-types scripts/implementation-executor-agent.ts --item=EB-024");
    process.exit(1);
  }

  const sources: Array<{ path: string; loaded: boolean }> = [];
  const load = async (rel: string, isJson = true) => {
    const actual = path.join(ROOT, rel);
    const data = isJson ? await tryReadJson(actual) : await tryReadText(actual);
    sources.push({ path: rel, loaded: data !== null });
    return data;
  };

  const backlog = (await load("reports/domain-guardian/engineering-backlog.json")) as Record<string, unknown> | null;
  if (!backlog) {
    console.error("ERRO: engineering-backlog.json não encontrado. Execute engineering-assistant.ts primeiro.");
    process.exit(1);
  }

  const item = findBacklogItem(backlog, itemId);
  if (!item) {
    console.error(`ERRO: Item ${itemId} não encontrado no backlog. IDs usam prefixo EB- (ex.: EB-024).`);
    process.exit(1);
  }

  const [
    knowledgeGraph,
    projectContext,
    architectureDecisions,
    decisionMd,
    executionStatus,
    implementationPlan,
    reviewChecklist,
    actionPlan,
    advisorMd,
    latest,
    domainMap,
    domainDeps,
    domainInv,
  ] = await Promise.all([
    load("reports/domain-guardian/project-knowledge-graph.json"),
    load("reports/domain-guardian/project-context.json"),
    load("reports/domain-guardian/architecture-decisions.json"),
    load("reports/domain-guardian/decision.md", false),
    load("reports/domain-guardian/execution-status.json"),
    load("reports/domain-guardian/implementation-plan.json"),
    load("reports/domain-guardian/review-checklist.md", false),
    load("reports/domain-guardian/action-plan.md", false),
    load("reports/domain-guardian/advisor.md", false),
    load("reports/domain-guardian/latest.json"),
    load("docs/ai/domain-map.md", false),
    load("docs/ai/domain-dependencies.md", false),
    load("docs/ai/domain-invariants.md", false),
  ]);

  const allFiles = enrichFilesFromKnowledgeGraph(item, knowledgeGraph as Record<string, unknown> | null);
  const fileGroups = classifyFiles(allFiles);
  const adrs = resolveAdrs(item, architectureDecisions as Record<string, unknown> | null);
  const invariants = extractInvariants(item, domainInv as string | null);
  const checks =
    item.checks.length > 0 ? item.checks : defaultChecksForCategory(item.category);
  const steps = buildSteps(item, allFiles);
  const deps = buildDependencies(item, executionStatus as Record<string, unknown> | null);
  const testing = buildTestingPlan(item, item.category);
  const risk = buildRiskAnalysis(item, item.category);
  const checklists = buildChecklists(item, steps);

  const projectName =
    (projectContext as { projectName?: string } | null)?.projectName ??
    (backlog.summary as { projectName?: string })?.projectName ??
    "THouse";

  const execSummary = (executionStatus as { nextAction?: { action?: string } })?.nextAction?.action;

  const plan: ExecutionPlan = {
    agentVersion: AGENT_VERSION,
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    backlogItemId: itemId,
    summary: {
      executiveSummary: [
        `Plano de implementação para ${itemId}: ${item.title}.`,
        `Categoria ${item.category}, prioridade ${item.priority}, ROI ${item.roiScore ?? "—"}.`,
        item.description,
        execSummary ? `Contexto de execução: ${execSummary}.` : "",
        "Somente planejamento — nenhum código será alterado por este agente.",
      ]
        .filter(Boolean)
        .join(" "),
      objective: item.title,
      problemSolved: item.description,
      motivation: item.estimatedBenefit,
      expectedImpact: `${item.businessImpact} · ${item.technicalImpact}`,
      projectName,
      category: item.category,
      priority: item.priority,
      roiScore: item.roiScore ?? 0,
    },
    files: fileGroups,
    dependencies: deps,
    steps,
    checklists,
    architecture: {
      adrs,
      invariants,
      guardianChecks: checks,
    },
    testingPlan: testing,
    riskAnalysis: risk,
    context: {
      sourcesConsulted: sources,
      backlogGeneratedAt: (backlog.generatedAt as string) ?? null,
      relatedExecutionStatus: execSummary ?? null,
    },
    limitations: [
      "Plano gerado automaticamente — revisão humana obrigatória antes de implementar",
      "Arquivos inferidos do Knowledge Graph quando backlog não lista paths",
      "Passos genéricos por categoria — ajustar para item específico",
      "Não valida se arquivos existem no disco",
      "Migrations mencionadas no plano mas não executadas por este agente",
      "Alias ENG-xxx aceito como EB-xxx",
    ],
  };

  await mkdir(GUARDIAN_DIR, { recursive: true });
  const jsonPath = path.join(GUARDIAN_DIR, `execution-plan-${itemId}.json`);
  const mdPath = path.join(GUARDIAN_DIR, `execution-plan-${itemId}.md`);
  await writeFile(jsonPath, JSON.stringify(plan, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(plan), "utf8");

  console.log("Implementation Executor — plano gerado");
  console.log(`  Item:          ${itemId}`);
  console.log(`  Título:        ${item.title}`);
  console.log(`  Categoria:     ${item.category}`);
  console.log(`  Prioridade:    ${item.priority}`);
  console.log(`  Passos:        ${plan.steps.length}`);
  console.log(`  Arquivos:      ${allFiles.length}`);
  console.log(`  ADRs:          ${adrs.length}`);
  console.log(`  Checks:        ${checks.join(", ")}`);
  console.log(`  JSON:          ${path.relative(ROOT, jsonPath)}`);
  console.log(`  Markdown:      ${path.relative(ROOT, mdPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
