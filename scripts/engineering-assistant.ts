/**
 * Engineering Assistant V1 — Transforma documentação dos agentes em backlog executável.
 *
 * Não altera regras de negócio, banco, APIs ou UI.
 * Gera backlog priorizado por VALOR (não por agente ou PR).
 *
 * Uso: node --experimental-strip-types scripts/engineering-assistant.ts
 *
 * Saída:
 *   reports/domain-guardian/engineering-backlog.json
 *   reports/domain-guardian/engineering-backlog.md
 *
 * Exit code: sempre 0 (agente informativo).
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const GUARDIAN_DIR = path.join(ROOT, "reports/domain-guardian");
const HUMAN_DIR = path.join(ROOT, "reports/human");

const AGENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category =
  | "Correção"
  | "Arquitetura"
  | "Refatoração"
  | "Performance"
  | "Segurança"
  | "UX"
  | "Admin"
  | "Financeiro"
  | "Deploy"
  | "Documentação";

type Priority = "Critical" | "High" | "Medium" | "Low";
type Effort = "Baixo" | "Médio" | "Alto" | "Muito Alto";
type Risk = "Baixo" | "Médio" | "Alto" | "Crítico";

type BacklogItem = {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  estimatedEffort: Effort;
  estimatedRisk: Risk;
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
  roiScore: number;
  source: string;
};

type EngineeringBacklog = {
  agentVersion: string;
  generatedAt: string;
  language: "pt-BR";
  summary: {
    projectName: string;
    headline: string;
    totalItems: number;
    executiveSummary: string;
    engineeringScore: number;
    engineeringGrade: string;
  };
  engineeringScore: {
    overall: number;
    arquitetura: number;
    qualidade: number;
    escalabilidade: number;
    manutenibilidade: number;
    financeiro: number;
    ux: number;
    admin: number;
    seguranca: number;
  };
  buckets: {
    quickWins: BacklogItem[];
    highPriority: BacklogItem[];
    majorProjects: BacklogItem[];
    futureImprovements: BacklogItem[];
    technicalDebt: BacklogItem[];
  };
  top50: BacklogItem[];
  roadmap: {
    sprint1: string[];
    sprint2: string[];
    sprint3: string[];
    sprint4: string[];
  };
  timeHorizons: {
    oneWeek: { focus: string; items: string[]; avoid: string[] };
    oneMonth: { focus: string; items: string[]; avoid: string[] };
    threeMonths: { focus: string; items: string[]; avoid: string[] };
  };
  strategicAnswers: {
    tomorrow: string[];
    notNow: string[];
    canWait: string[];
    neverRemove: string[];
  };
  roiFormula: string;
  context: { sourcesConsulted: Array<{ path: string; loaded: boolean }> };
  limitations: string[];
};

type SourceBundle = Record<string, unknown>;

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

async function tryReadJson(p: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as Record<string, unknown>;
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

// ---------------------------------------------------------------------------
// ROI & scoring
// ---------------------------------------------------------------------------

const EFFORT_NUM: Record<Effort, number> = { Baixo: 1, Médio: 2, Alto: 3, "Muito Alto": 4 };
const PRIORITY_NUM: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const RISK_NUM: Record<Risk, number> = { Baixo: 1, Médio: 2, Alto: 3, Crítico: 4 };

function calcRoi(priority: Priority, effortLevel: Effort, benefitText: string): number {
  const benefitWords = benefitText.toLowerCase();
  let benefitBoost = 0;
  if (benefitWords.includes("crítico") || benefitWords.includes("receita") || benefitWords.includes("deploy")) benefitBoost = 1;
  if (benefitWords.includes("segurança") || benefitWords.includes("idempot")) benefitBoost = Math.max(benefitBoost, 0.8);
  const benefit = PRIORITY_NUM[priority] + benefitBoost;
  const effortNum = EFFORT_NUM[effortLevel];
  return Math.min(100, Math.round((benefit * benefit * 25) / effortNum));
}

let itemSeq = 0;
function nextId(prefix: string): string {
  itemSeq++;
  return `${prefix}-${String(itemSeq).padStart(3, "0")}`;
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
}

function dedupeItems(items: BacklogItem[]): BacklogItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeItem(partial: Omit<BacklogItem, "id" | "roiScore"> & { id?: string }): BacklogItem {
  const roiScore = calcRoi(partial.priority, partial.estimatedEffort, partial.estimatedBenefit);
  return { id: partial.id ?? nextId("EB"), roiScore, ...partial };
}

// ---------------------------------------------------------------------------
// Extractors from sources
// ---------------------------------------------------------------------------

function extractFromCto(cto: Record<string, unknown> | null): BacklogItem[] {
  const priorities = (cto?.priorities as Array<Record<string, unknown>>) ?? [];
  return priorities.map((p) =>
    makeItem({
      title: String(p.title ?? "Prioridade CTO"),
      description: String(p.description ?? p.reason ?? ""),
      category: mapCategory(String(p.category ?? "Arquitetura")),
      priority: mapPriority(String(p.urgency ?? "High")),
      estimatedEffort: mapEffort(String(p.effort ?? "Alto")),
      estimatedRisk: "Alto",
      estimatedBenefit: String(p.benefit ?? p.expectedImpact ?? "Alto impacto estratégico"),
      businessImpact: String(p.expectedImpact ?? "Impacto no negócio"),
      technicalImpact: "Melhora governança e entrega",
      guardianImpact: "Validar com Guardian após implementação",
      dependencies: (p.dependencies as string[]) ?? [],
      files: [],
      entities: [],
      flows: [],
      adrs: [],
      checks: ["F1", "F4"],
      blockingItems: [],
      acceptanceCriteria: ["Guardian exit 0", "Decision não BLOCKED para escopo"],
      rollbackStrategy: "git revert + redeploy",
      recommendedTests: ["Smoke test", "Guardian", "Sandbox Asaas se financeiro"],
      source: "cto-report.json",
    })
  );
}

function extractFromExecution(exec: Record<string, unknown> | null): BacklogItem[] {
  const items: BacklogItem[] = [];
  const next = exec?.nextAction as { action?: string; detail?: string } | undefined;
  if (next?.action) {
    items.push(
      makeItem({
        title: next.action,
        description: next.detail ?? "Próxima ação do Execution Manager",
        category: "Deploy",
        priority: "Critical",
        estimatedEffort: "Médio",
        estimatedRisk: "Médio",
        estimatedBenefit: "Desbloqueia progresso da Sprint 1",
        businessImpact: "Acelera caminho para produção",
        technicalImpact: "Organiza working tree em commits incrementais",
        guardianImpact: "Guardian deve passar antes de abrir PR",
        dependencies: [],
        files: [],
        entities: [],
        flows: ["Deploy"],
        adrs: [],
        checks: ["F1", "F4", "A5", "A8"],
        blockingItems: [],
        acceptanceCriteria: ["Commit aplicado", "Working tree limpo no escopo"],
        rollbackStrategy: "git revert do commit",
        recommendedTests: ["npm run build", "domain-guardian-runner.ts"],
        source: "execution-status.json",
      })
    );
  }
  const blockers = (exec?.blockers as Array<{ message?: string; resolution?: string }>) ?? [];
  for (const b of blockers.slice(0, 5)) {
    items.push(
      makeItem({
        title: `Resolver: ${b.message}`,
        description: b.resolution ?? "Bloqueador de execução",
        category: "Correção",
        priority: "Critical",
        estimatedEffort: "Alto",
        estimatedRisk: "Alto",
        estimatedBenefit: "Remove bloqueio de deploy e merge",
        businessImpact: "Permite avançar roadmap",
        technicalImpact: "Reduz risco CRITICAL do Decision Engine",
        guardianImpact: "Reexecutar decision engine após resolver",
        dependencies: [],
        files: [],
        entities: ["Payment", "Appointment"],
        flows: [],
        adrs: [],
        checks: ["F1", "F2", "F3"],
        blockingItems: [b.message ?? ""],
        acceptanceCriteria: ["Decision não BLOCKED", "Guardian HEALTHY"],
        rollbackStrategy: "N/A — ação de desbloqueio",
        recommendedTests: ["change-analyzer", "decision engine"],
        source: "execution-status.json",
      })
    );
  }
  return items;
}

function extractFromRefactor(refactor: Record<string, unknown> | null): BacklogItem[] {
  const items: BacklogItem[] = [];
  const quickWins = (refactor?.quickWins as Array<Record<string, unknown>>) ?? [];
  for (const q of quickWins) {
    items.push(
      makeItem({
        title: String(q.description ?? q.type ?? "Quick win").slice(0, 120),
        description: `Refatoração de baixo risco: ${q.type ?? "cleanup"}`,
        category: "Refatoração",
        priority: "Low",
        estimatedEffort: "Baixo",
        estimatedRisk: "Baixo",
        estimatedBenefit: String(q.expectedBenefit ?? "Reduz ruído e dívida incremental"),
        businessImpact: "Baixo — não afeta cliente diretamente",
        technicalImpact: "Melhora legibilidade e manutenção",
        guardianImpact: "Neutro ou positivo",
        dependencies: [],
        files: (q.files as string[]) ?? [],
        entities: (q.entities as string[]) ?? [],
        flows: [],
        adrs: (q.relatedAdrs as string[]) ?? [],
        checks: (q.guardianChecks as string[]) ?? [],
        blockingItems: [],
        acceptanceCriteria: ["Build passa", "Sem regressão em smoke"],
        rollbackStrategy: "git revert",
        recommendedTests: ["npm run build"],
        source: "refactor-report.json",
      })
    );
  }
  const top = (refactor?.topOpportunities as Array<Record<string, unknown>>) ?? [];
  for (const t of top.slice(0, 25)) {
    const isLarge = String(t.type ?? "").includes("large");
    items.push(
      makeItem({
        title: isLarge
          ? `Dividir arquivo monolítico: ${((t.files as string[]) ?? [])[0] ?? "—"}`
          : String(t.description ?? t.type ?? "Oportunidade").slice(0, 100),
        description: String(t.impact ?? t.description ?? ""),
        category: mapCategoryFromDomain(String(t.domain ?? "")),
        priority: mapSeverityPriority(String(t.severity ?? "MEDIUM")),
        estimatedEffort: isLarge ? "Muito Alto" : "Alto",
        estimatedRisk: mapRisk(String(t.risk ?? "Médio")),
        estimatedBenefit: String(t.expectedBenefit ?? "Reduz dívida e risco de regressão"),
        businessImpact: String(t.domain) === "Financeiro" ? "Afeta receita e checkout" : "Melhora operação admin",
        technicalImpact: "Reduz complexidade e acoplamento",
        guardianImpact: "Reexecutar checks do domínio após refatoração",
        dependencies: (t.dependencies as string[]) ?? [],
        files: (t.files as string[]) ?? [],
        entities: (t.entities as string[]) ?? [],
        flows: (t.flows as string[]) ?? [],
        adrs: (t.relatedAdrs as string[]) ?? [],
        checks: (t.guardianChecks as string[]) ?? [],
        blockingItems: [],
        acceptanceCriteria: ["Arquivo < 500 linhas ou módulos extraídos", "Guardian exit 0"],
        rollbackStrategy: String(t.rollback ?? "git revert por módulo"),
        recommendedTests: ["Testes do domínio afetado", "Guardian"],
        source: "refactor-report.json",
      })
    );
  }
  return items;
}

function extractFromStabilization(stab: Record<string, unknown> | null): BacklogItem[] {
  const items: BacklogItem[] = [];
  const deliverables = (stab?.roadmap as Record<string, { deliverables?: string[] }>)?.sprint1?.deliverables ?? [];
  const valueMap: Record<string, { category: Category; priority: Priority; entities: string[]; checks: string[] }> = {
    "Documentação e Guardian (baseline)": { category: "Documentação", priority: "High", entities: [], checks: ["F1", "F4"] },
    "Schema e migrations": { category: "Deploy", priority: "Critical", entities: ["Payment", "Appointment"], checks: ["F4", "A8"] },
    "Pagamentos e webhook": { category: "Financeiro", priority: "Critical", entities: ["Payment"], checks: ["F1", "F2", "F3"] },
    "Cupons e ownership": { category: "Financeiro", priority: "High", entities: ["Coupon"], checks: ["C1", "X1"] },
    "Agendamentos e arquivamento": { category: "Admin", priority: "High", entities: ["Appointment"], checks: ["A5", "A9"] },
    "Minha Conta e autenticação": { category: "UX", priority: "Medium", entities: ["User"], checks: ["A7", "A8"] },
    "Painel administrativo": { category: "Admin", priority: "Medium", entities: [], checks: ["A5"] },
    "Simulação admin": { category: "Admin", priority: "Medium", entities: ["Payment"], checks: ["S4"] },
    "Agentes IA e infraestrutura": { category: "Arquitetura", priority: "Low", entities: [], checks: [] },
  };
  for (const d of deliverables) {
    const meta = valueMap[d] ?? { category: "Correção" as Category, priority: "Medium" as Priority, entities: [], checks: [] };
    items.push(
      makeItem({
        title: `Estabilizar: ${d}`,
        description: `Entregar valor de negócio: ${d} — sem merge monolítico`,
        category: meta.category,
        priority: meta.priority,
        estimatedEffort: meta.priority === "Critical" ? "Muito Alto" : "Alto",
        estimatedRisk: meta.category === "Financeiro" ? "Crítico" : "Alto",
        estimatedBenefit: "Reduz risco de deploy e habilita produção incremental",
        businessImpact: "Cliente e admin operam com sistema estável",
        technicalImpact: "Commits incrementais com Guardian",
        guardianImpact: "Obrigatório exit 0 antes de merge",
        dependencies: [],
        files: [],
        entities: meta.entities,
        flows: [d],
        adrs: [],
        checks: meta.checks,
        blockingItems: ["Decision BLOCKED até escopo dividido"],
        acceptanceCriteria: ["Guardian exit 0", "npm run build", "Testes sandbox se financeiro"],
        rollbackStrategy: "git revert merge + redeploy",
        recommendedTests: ["Smoke", "Guardian", "Checkout sandbox"],
        source: "stabilization-plan.json",
      })
    );
  }
  const homolog = (stab?.deploymentPlan as { homologation?: { checklist?: string[] } })?.homologation?.checklist ?? [];
  for (const step of homolog.slice(0, 6)) {
    items.push(
      makeItem({
        title: step,
        description: "Item do checklist de homologação",
        category: "Deploy",
        priority: "High",
        estimatedEffort: "Médio",
        estimatedRisk: "Médio",
        estimatedBenefit: "Valida sistema antes de produção",
        businessImpact: "Confiança do proprietário no go-live",
        technicalImpact: "Ambiente staging validado",
        guardianImpact: "Guardian após cada merge em staging",
        dependencies: ["Estabilização Sprint 1"],
        files: [],
        entities: [],
        flows: ["Deploy"],
        adrs: [],
        checks: ["F1", "F4"],
        blockingItems: [],
        acceptanceCriteria: [step],
        rollbackStrategy: "Reverter deploy staging",
        recommendedTests: ["Smoke completo"],
        source: "stabilization-plan.json",
      })
    );
  }
  return items;
}

function extractFromHuman(human: Record<string, unknown> | null): BacklogItem[] {
  const changes = (human?.changes as Array<Record<string, unknown>>) ?? [];
  return changes.map((c) =>
    makeItem({
      title: String(c.title ?? "Melhoria"),
      description: String(c.whatChanged ?? c.howItWorksNow ?? ""),
      category: (c.categories as string[])?.includes("Financeiro") ? "Financeiro" : "Correção",
      priority: (c.status as string) === "implementado" ? "Medium" : "High",
      estimatedEffort: "Alto",
      estimatedRisk: "Alto",
      estimatedBenefit: ((c.benefits as string[]) ?? []).join("; ") || "Melhoria validada",
      businessImpact: String(c.userImpact ?? ""),
      technicalImpact: String(c.adminImpact ?? ""),
      guardianImpact: "Manter HEALTHY após alterações",
      dependencies: [],
      files: (c.files as string[]) ?? [],
      entities: (c.entities as string[]) ?? [],
      flows: (c.flows as string[]) ?? [],
      adrs: [],
      checks: ["F1", "F4", "C1"],
      blockingItems: [],
      acceptanceCriteria: ["Benefícios listados verificados em homologação"],
      rollbackStrategy: "git revert",
      recommendedTests: ((c.risks as string[]) ?? []).map((r) => `Validar: ${r}`),
      source: "human/project-report.json",
    })
  );
}

function extractFromImplementation(impl: Record<string, unknown> | null): BacklogItem[] {
  const phases = (impl?.phases as Array<Record<string, unknown>>) ?? [];
  return phases.map((ph) =>
    makeItem({
      title: String(ph.title ?? ph.id ?? "Fase"),
      description: String(ph.objective ?? ""),
      category: "Arquitetura",
      priority: "Low",
      estimatedEffort: mapEffort(String(ph.estimatedComplexity ?? "Alto")),
      estimatedRisk: ((ph.risks as Array<{ level?: string }>) ?? [])[0]?.level === "Crítico" ? "Crítico" : "Alto",
      estimatedBenefit: "Feature futura — arquivamento administrativo de pagamentos",
      businessImpact: "Admin pode arquivar pagamentos sem perder histórico",
      technicalImpact: String(ph.objective ?? ""),
      guardianImpact: "ADR-013 + checks F1-F8",
      dependencies: (ph.dependencies as string[]) ?? ["Sprint 1 concluída"],
      files: (ph.files as string[]) ?? [],
      entities: ["Payment"],
      flows: ["Admin pagamentos"],
      adrs: ["ADR-013"],
      checks: ["F1", "F4", "F8"],
      blockingItems: ["Deploy produção estável"],
      acceptanceCriteria: (ph.exitCriteria as string[]) ?? [],
      rollbackStrategy: ((ph.rollbackNotes as string[]) ?? []).join("; ") || "git revert",
      recommendedTests: ["Guardian", "Smoke admin pagamentos"],
      source: "implementation-plan.json",
    })
  );
}

function extractFromHealth(health: Record<string, unknown> | null): BacklogItem[] {
  const recs = (health?.recommendations as string[]) ?? [];
  const growth = health?.growth as {
    deservesRefactor?: string[];
    deservesFreeze?: string[];
    canReceiveFeatures?: string[];
  };
  const items: BacklogItem[] = recs.map((r) =>
    makeItem({
      title: r.slice(0, 100),
      description: "Recomendação do Code Health Agent",
      category: r.includes("Financeiro") ? "Financeiro" : r.includes("Guardian") ? "Arquitetura" : "Refatoração",
      priority: "Medium",
      estimatedEffort: "Médio",
      estimatedRisk: "Médio",
      estimatedBenefit: "Melhora score de saúde do código",
      businessImpact: "Indireto — reduz risco futuro",
      technicalImpact: r,
      guardianImpact: "Positivo",
      dependencies: [],
      files: [],
      entities: [],
      flows: [],
      adrs: [],
      checks: [],
      blockingItems: [],
      acceptanceCriteria: ["code-health score melhora na próxima execução"],
      rollbackStrategy: "git revert",
      recommendedTests: ["code-health-agent.ts"],
      source: "code-health.json",
    })
  );
  for (const mod of growth?.deservesFreeze ?? []) {
    items.push(
      makeItem({
        title: `Congelar domínio ${mod} até estabilização`,
        description: "Não adicionar features em domínio crítico durante Sprint 1",
        category: "Financeiro",
        priority: "Critical",
        estimatedEffort: "Baixo",
        estimatedRisk: "Baixo",
        estimatedBenefit: "Evita regressão em área de receita",
        businessImpact: "Protege checkout e webhooks",
        technicalImpact: "Permite foco em estabilização",
        guardianImpact: "Mantém HEALTHY",
        dependencies: [],
        files: [],
        entities: [mod],
        flows: [],
        adrs: [],
        checks: ["F1", "F2", "F3"],
        blockingItems: [],
        acceptanceCriteria: ["Nenhuma feature nova no domínio até PR mergeado"],
        rollbackStrategy: "N/A",
        recommendedTests: [],
        source: "code-health.json",
      })
    );
  }
  return items;
}

function extractFromDecision(decisionMd: string | null): BacklogItem[] {
  if (!decisionMd || !decisionMd.includes("BLOCKED")) return [];
  const reasons: string[] = [];
  const block = decisionMd.match(/### Bloqueio[\s\S]*?(?=###|$)/);
  if (block) {
    block[0].split("\n").filter((l) => l.startsWith("- ")).forEach((l) => reasons.push(l.slice(2)));
  }
  return reasons.slice(0, 4).map((r) =>
    makeItem({
      title: `Desbloquear: ${r.slice(0, 80)}`,
      description: r,
      category: "Correção",
      priority: "Critical",
      estimatedEffort: "Alto",
      estimatedRisk: "Crítico",
      estimatedBenefit: "Libera merge e deploy incremental",
      businessImpact: "Desbloqueia go-live",
      technicalImpact: "Reduz escopo CRITICAL do diff",
      guardianImpact: "Decision APPROVED ou REVIEW_REQUIRED",
      dependencies: [],
      files: [],
      entities: ["Payment", "Appointment", "Coupon"],
      flows: ["Checkout", "Webhook"],
      adrs: [],
      checks: ["F1", "F2", "F3", "F6", "F8", "C1", "X1"],
      blockingItems: ["Decision BLOCKED"],
      acceptanceCriteria: ["change-analyzer risco reduzido", "PRs < 50 arquivos"],
      rollbackStrategy: "N/A",
      recommendedTests: ["domain-decision-engine.ts", "change-analyzer"],
      source: "decision.md",
    })
  );
}

function extractFromAdrs(adrs: Record<string, unknown> | null): BacklogItem[] {
  const decisions = (adrs?.decisions as Array<Record<string, unknown>>) ?? [];
  return decisions
    .filter((d) => String(d.status ?? "").toLowerCase().includes("propos"))
    .map((d) =>
      makeItem({
        title: `Implementar ${d.id}: ${d.title}`,
        description: String(d.summary ?? d.context ?? ""),
        category: "Arquitetura",
        priority: "Low",
        estimatedEffort: "Alto",
        estimatedRisk: "Médio",
        estimatedBenefit: "Formaliza decisão arquitetural pendente",
        businessImpact: "Baixo até implementado",
        technicalImpact: String(d.consequences ?? ""),
        guardianImpact: "Alinhar invariantes",
        dependencies: [],
        files: (d.files as string[]) ?? [],
        entities: [],
        flows: [],
        adrs: [String(d.id ?? "")],
        checks: [],
        blockingItems: [],
        acceptanceCriteria: [`ADR ${d.id} marcado como Accepted`],
        rollbackStrategy: "git revert",
        recommendedTests: ["Guardian"],
        source: "architecture-decisions.json",
      })
    );
}

function mapCategory(s: string): Category {
  const m: Record<string, Category> = {
    Qualidade: "Correção",
    Financeiro: "Financeiro",
    Deploy: "Deploy",
    Arquitetura: "Arquitetura",
    Segurança: "Segurança",
    Admin: "Admin",
  };
  return m[s] ?? "Correção";
}

function mapCategoryFromDomain(d: string): Category {
  if (d === "Financeiro" || d === "Webhook") return "Financeiro";
  if (d === "Admin" || d === "Appointment") return "Admin";
  if (d === "MinhaConta") return "UX";
  if (d === "Guardian" || d === "Scripts") return "Arquitetura";
  return "Refatoração";
}

function mapPriority(u: string): Priority {
  if (/imediata|critical|crítico/i.test(u)) return "Critical";
  if (/alta|high/i.test(u)) return "High";
  if (/baixa|low/i.test(u)) return "Low";
  return "Medium";
}

function mapSeverityPriority(s: string): Priority {
  if (s === "CRITICAL") return "Critical";
  if (s === "HIGH") return "High";
  if (s === "LOW" || s === "INFO") return "Low";
  return "Medium";
}

function mapEffort(e: string): Effort {
  if (/muito alta|muito alto/i.test(e)) return "Muito Alto";
  if (/alta|alto/i.test(e)) return "Alto";
  if (/baixa|baixo/i.test(e)) return "Baixo";
  return "Médio";
}

function mapRisk(r: string): Risk {
  if (/crítico|critico/i.test(r)) return "Crítico";
  if (/alto/i.test(r)) return "Alto";
  if (/baixo/i.test(r)) return "Baixo";
  return "Médio";
}

function classifyBuckets(items: BacklogItem[]): EngineeringBacklog["buckets"] {
  const quickWins = items.filter(
    (i) =>
      (i.estimatedEffort === "Baixo" || i.estimatedEffort === "Médio") &&
      (i.estimatedRisk === "Baixo" || i.estimatedRisk === "Médio") &&
      i.roiScore >= 50 &&
      i.category !== "Deploy"
  );
  const technicalDebt = items.filter((i) => i.category === "Refatoração" || i.source === "refactor-report.json");
  const majorProjects = items.filter(
    (i) => i.estimatedEffort === "Muito Alto" || (i.estimatedEffort === "Alto" && i.priority === "Critical")
  );
  const futureImprovements = items.filter(
    (i) => i.priority === "Low" || i.source === "implementation-plan.json" || i.adrs.includes("ADR-013")
  );
  const highPriority = items.filter(
    (i) =>
      (i.priority === "Critical" || i.priority === "High") &&
      !quickWins.includes(i) &&
      !futureImprovements.includes(i)
  );
  return {
    quickWins: quickWins.sort((a, b) => b.roiScore - a.roiScore).slice(0, 30),
    highPriority: highPriority.sort((a, b) => b.roiScore - a.roiScore).slice(0, 40),
    majorProjects: majorProjects.sort((a, b) => b.roiScore - a.roiScore).slice(0, 20),
    futureImprovements: futureImprovements.sort((a, b) => b.roiScore - a.roiScore).slice(0, 25),
    technicalDebt: technicalDebt.sort((a, b) => b.roiScore - a.roiScore).slice(0, 35),
  };
}

function buildEngineeringScores(sources: SourceBundle): EngineeringBacklog["engineeringScore"] {
  const cto = sources.cto as { scores?: Record<string, { score?: number }> } | null;
  const health = sources.health as {
    scores?: Record<string, number>;
    engineeringScore?: { overall?: number };
    modules?: Array<{ id?: string; healthScore?: number }>;
  } | null;
  const refactor = sources.refactor as { summary?: { technicalDebtScore?: number } } | null;
  const debt = refactor?.summary?.technicalDebtScore ?? 100;
  const financeModule = health?.modules?.find((m) => m.id === "Financeiro");

  return {
    overall: health?.engineeringScore?.overall ?? cto?.scores?.overall?.score ?? 50,
    arquitetura: health?.scores?.arquitetura ?? cto?.scores?.architecture?.score ?? 80,
    qualidade: health?.scores?.qualidade ?? cto?.scores?.quality?.score ?? 50,
    escalabilidade: health?.scores?.escalabilidade ?? cto?.scores?.scalability?.score ?? 45,
    manutenibilidade: health?.scores?.manutenibilidade ?? Math.max(0, 100 - debt * 0.5),
    financeiro: financeModule?.healthScore ?? Math.max(0, 100 - debt * 0.7),
    ux: 40,
    admin: 35,
    seguranca: cto?.scores?.security?.score ?? 90,
  };
}

function buildMarkdown(report: EngineeringBacklog): string {
  const L: string[] = [];
  L.push(`# Engineering Backlog — ${report.summary.projectName}`);
  L.push("");
  L.push(`**Gerado em:** ${report.generatedAt}`);
  L.push(`**Engineering Score:** ${report.engineeringScore.overall}/100`);
  L.push("");
  L.push("## Resumo Executivo");
  L.push(report.summary.executiveSummary);
  L.push("");
  L.push("## O que faria amanhã?");
  report.strategicAnswers.tomorrow.forEach((t) => L.push(`- ${t}`));
  L.push("");
  L.push("## O que NÃO faria agora?");
  report.strategicAnswers.notNow.forEach((t) => L.push(`- ${t}`));
  L.push("");
  L.push("## Engineering Score");
  L.push("| Dimensão | Score |");
  L.push("|----------|-------|");
  for (const [k, v] of Object.entries(report.engineeringScore)) {
    L.push(`| ${k} | ${v} |`);
  }
  L.push("");
  L.push("## Top 20 Melhorias (ROI)");
  L.push("| # | ROI | Prioridade | Título | Categoria |");
  L.push("|---|-----|------------|--------|-----------|");
  report.top50.slice(0, 20).forEach((item, i) => {
    L.push(`| ${i + 1} | ${item.roiScore} | ${item.priority} | ${item.title.slice(0, 50)} | ${item.category} |`);
  });
  L.push("");
  L.push("## Quick Wins");
  report.buckets.quickWins.slice(0, 10).forEach((i) => L.push(`- [ ] **${i.title}** (ROI ${i.roiScore})`));
  L.push("");
  L.push("## Alta Prioridade");
  report.buckets.highPriority.slice(0, 10).forEach((i) => L.push(`- [ ] **${i.title}**`));
  L.push("");
  L.push("## Uma semana");
  L.push(report.timeHorizons.oneWeek.focus);
  report.timeHorizons.oneWeek.items.forEach((i) => L.push(`- ${i}`));
  L.push("");
  L.push("## Um mês");
  L.push(report.timeHorizons.oneMonth.focus);
  report.timeHorizons.oneMonth.items.forEach((i) => L.push(`- ${i}`));
  L.push("");
  L.push("## Três meses");
  L.push(report.timeHorizons.threeMonths.focus);
  report.timeHorizons.threeMonths.items.forEach((i) => L.push(`- ${i}`));
  L.push("");
  L.push("## Limitações V1");
  report.limitations.forEach((l) => L.push(`- ${l}`));
  L.push("");
  L.push("---");
  L.push("_Engineering Assistant — somente backlog. Nenhum código foi alterado._");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const sources: Array<{ path: string; loaded: boolean }> = [];
  const files: Array<{ rel: string; isJson: boolean }> = [
    { rel: "reports/domain-guardian/project-context.json", isJson: true },
    { rel: "reports/domain-guardian/project-knowledge-graph.json", isJson: true },
    { rel: "reports/domain-guardian/architecture-decisions.json", isJson: true },
    { rel: "reports/domain-guardian/decision.md", isJson: false },
    { rel: "reports/domain-guardian/execution-status.json", isJson: true },
    { rel: "reports/domain-guardian/implementation-plan.json", isJson: true },
    { rel: "reports/domain-guardian/stabilization-plan.json", isJson: true },
    { rel: "reports/domain-guardian/refactor-report.json", isJson: true },
    { rel: "reports/domain-guardian/code-health.json", isJson: true },
    { rel: "reports/domain-guardian/memory.json", isJson: true },
    { rel: "reports/domain-guardian/advisor.md", isJson: false },
    { rel: "reports/domain-guardian/issues.md", isJson: false },
    { rel: "reports/domain-guardian/action-plan.md", isJson: false },
    { rel: "reports/domain-guardian/cto-report.json", isJson: true },
    { rel: "reports/human/project-report.json", isJson: true },
    { rel: "reports/domain-guardian/latest.json", isJson: true },
  ];

  const loaded = await Promise.all(
    files.map(async ({ rel, isJson }) => {
      const actual = path.join(ROOT, rel);
      const data = isJson ? await tryReadJson(actual) : await tryReadText(actual);
      sources.push({ path: rel, loaded: data !== null });
      return { rel, data };
    })
  );

  const get = (name: string) => loaded.find((l) => l.rel.includes(name))?.data ?? null;

  const projectContext = get("project-context") as Record<string, unknown> | null;
  const knowledgeGraph = get("knowledge-graph") as Record<string, unknown> | null;
  const architectureDecisions = get("architecture-decisions") as Record<string, unknown> | null;
  const decisionMd = get("decision.md") as string | null;
  const executionStatus = get("execution-status") as Record<string, unknown> | null;
  const implementationPlan = get("implementation-plan") as Record<string, unknown> | null;
  const stabilizationPlan = get("stabilization-plan") as Record<string, unknown> | null;
  const refactorReport = get("refactor-report") as Record<string, unknown> | null;
  const codeHealth = get("code-health") as Record<string, unknown> | null;
  const memory = get("memory.json") as Record<string, unknown> | null;
  const ctoReport = get("cto-report") as Record<string, unknown> | null;
  const humanReport = get("project-report") as Record<string, unknown> | null;
  const latest = get("latest.json") as Record<string, unknown> | null;

  const bundle: SourceBundle = {
    cto: ctoReport,
    exec: executionStatus,
    refactor: refactorReport,
    stab: stabilizationPlan,
    human: humanReport,
    impl: implementationPlan,
    health: codeHealth,
  };

  let allItems: BacklogItem[] = [
    ...extractFromCto(ctoReport),
    ...extractFromExecution(executionStatus),
    ...extractFromRefactor(refactorReport),
    ...extractFromStabilization(stabilizationPlan),
    ...extractFromHuman(humanReport),
    ...extractFromImplementation(implementationPlan),
    ...extractFromHealth(codeHealth),
    ...extractFromDecision(decisionMd as string | null),
    ...extractFromAdrs(architectureDecisions),
  ];

  allItems = dedupeItems(allItems);
  allItems.sort((a, b) => b.roiScore - a.roiScore);

  const buckets = classifyBuckets(allItems);
  const top50 = allItems.slice(0, 50);
  const engScores = buildEngineeringScores(bundle);

  const projectName =
    (projectContext as { projectName?: string } | null)?.projectName ??
    (ctoReport as { summary?: { projectName?: string } } | null)?.summary?.projectName ??
    "THouse";

  const tomorrow = top50
    .filter((i) => i.priority === "Critical" && i.estimatedEffort !== "Muito Alto")
    .slice(0, 5)
    .map((i) => i.title);
  if (tomorrow.length === 0) tomorrow.push(...top50.slice(0, 3).map((i) => i.title));

  const notNow = [
    "Refatorar agendamento/page.tsx (2393 linhas) antes de estabilizar",
    "Implementar arquivamento de pagamentos (ADR-013) antes do deploy",
    "Merge monolítico de 173 arquivos",
    ...(codeHealth as { growth?: { deservesFreeze?: string[] } })?.growth?.deservesFreeze?.map((m) => `Novas features em ${m}`) ?? [],
  ];

  const report: EngineeringBacklog = {
    agentVersion: AGENT_VERSION,
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    summary: {
      projectName,
      headline: `${allItems.length} itens · Engineering Score ${engScores.overall}/100`,
      totalItems: allItems.length,
      executiveSummary: [
        `Backlog executável com ${allItems.length} itens priorizados por valor.`,
        `${buckets.quickWins.length} quick wins, ${buckets.highPriority.length} alta prioridade.`,
        `Decision BLOCKED — foco em estabilização incremental antes de refatorações grandes.`,
        `ROI calculado como (prioridade² × 25) / esforço.`,
        `Amanhã: ${tomorrow[0] ?? "Executar próximo commit do plano"}.`,
      ].join(" "),
      engineeringScore: engScores.overall,
      engineeringGrade: engScores.overall >= 80 ? "B" : engScores.overall >= 60 ? "C" : "E",
    },
    engineeringScore: engScores,
    buckets,
    top50,
    roadmap: {
      sprint1: buckets.highPriority.filter((i) => i.category !== "Deploy").slice(0, 8).map((i) => i.title),
      sprint2: [
        "Deploy homologação",
        "Migrations staging",
        "Testes sandbox Asaas",
        ...buckets.highPriority.filter((i) => i.category === "Deploy").slice(0, 4).map((i) => i.title),
      ],
      sprint3: ["Deploy produção incremental", "Monitoramento 24h", "Guardian em produção"],
      sprint4: buckets.futureImprovements.slice(0, 6).map((i) => i.title),
    },
    timeHorizons: {
      oneWeek: {
        focus: "Estabilização mínima viável — commits C-01 a C-03, Guardian, desbloquear parcialmente",
        items: tomorrow,
        avoid: notNow.slice(0, 3),
      },
      oneMonth: {
        focus: "Completar Sprint 1 (9 entregas de valor), homologação, migrations",
        items: buckets.highPriority.slice(0, 12).map((i) => i.title),
        avoid: ["Refatorações > 800 linhas", "Features ADR-013"],
      },
      threeMonths: {
        focus: "Produção estável + redução de dívida técnica + features pós-deploy",
        items: [
          ...buckets.majorProjects.slice(0, 5).map((i) => i.title),
          ...buckets.futureImprovements.slice(0, 3).map((i) => i.title),
        ],
        avoid: ["Reescrever domínio financeiro do zero"],
      },
    },
    strategicAnswers: {
      tomorrow,
      notNow,
      canWait: buckets.futureImprovements.slice(0, 8).map((i) => i.title),
      neverRemove: [
        "Domain Guardian (checks F1-F8, A5-A9, C1, X1)",
        "Webhook idempotente Asaas",
        "Invariantes em docs/ai/domain-invariants.md",
        "Soft-archive (adminArchivedAt) — nunca purge físico",
        "Pipeline de agentes read-only",
        "ADRs aceitos (ADR-001 a ADR-015)",
      ],
    },
    roiFormula: "roiScore = min(100, (prioridadeNum² × 25) / esforçoNum) — maior ROI = mais valor por unidade de esforço",
    context: { sourcesConsulted: sources },
    limitations: [
      "Itens sintetizados de relatórios — podem sobrepor semanticamente",
      "ROI heurístico — não substitui estimativa humana em horas",
      "Não rastreia status done/in-progress — regenerar após cada sprint",
      "Buckets podem classificar mesmo item em múltiplas categorias",
      "Depende de agentes upstream terem sido executados",
    ],
  };

  await mkdir(GUARDIAN_DIR, { recursive: true });
  const jsonPath = path.join(GUARDIAN_DIR, "engineering-backlog.json");
  const mdPath = path.join(GUARDIAN_DIR, "engineering-backlog.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  console.log("Engineering Assistant — backlog gerado");
  console.log(`  Projeto:       ${report.summary.projectName}`);
  console.log(`  Itens:         ${report.summary.totalItems}`);
  console.log(`  Quick wins:    ${report.buckets.quickWins.length}`);
  console.log(`  Alta prior.:   ${report.buckets.highPriority.length}`);
  console.log(`  Eng. Score:    ${report.engineeringScore.overall}/100`);
  console.log(`  Top ROI:       ${top50[0]?.title?.slice(0, 50) ?? "—"} (${top50[0]?.roiScore ?? 0})`);
  console.log(`  Amanhã:        ${tomorrow[0] ?? "—"}`);
  console.log(`  JSON:          ${path.relative(ROOT, jsonPath)}`);
  console.log(`  Markdown:      ${path.relative(ROOT, mdPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
