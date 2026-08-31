/**
 * Domain Decision Engine — classifica mudanças em APPROVED | REVIEW_REQUIRED | BLOCKED.
 *
 * Uso: node --experimental-strip-types scripts/domain-decision-engine.ts
 *
 * Entrada (somente leitura):
 *   reports/domain-guardian/change-analysis.md
 *   reports/domain-guardian/review-checklist.md
 *   reports/domain-guardian/latest.json
 *   reports/domain-guardian/advisor.md
 *   docs/ai/domain-map.md
 *   docs/ai/domain-invariants.md
 *
 * Saída: reports/domain-guardian/decision.md
 *
 * Exit code: 0 = APPROVED | REVIEW_REQUIRED · 1 = BLOCKED
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const CHANGE_ANALYSIS_PATH = path.join(REPORTS_DIR, "change-analysis.md");
const REVIEW_CHECKLIST_PATH = path.join(REPORTS_DIR, "review-checklist.md");
const LATEST_JSON_PATH = path.join(REPORTS_DIR, "latest.json");
const ADVISOR_PATH = path.join(REPORTS_DIR, "advisor.md");
const DOMAIN_MAP_PATH = path.join(ROOT, "docs/ai/domain-map.md");
const DOMAIN_INVARIANTS_PATH = path.join(ROOT, "docs/ai/domain-invariants.md");
const OUTPUT_PATH = path.join(REPORTS_DIR, "decision.md");

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Decision = "APPROVED" | "REVIEW_REQUIRED" | "BLOCKED";
type ReviewScope = "SMOKE" | "NORMAL" | "FULL";

type GuardianReport = {
  generatedAt: string;
  executionMs: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
    checks: number;
  };
  results: Array<{
    code: string;
    severity: string;
    scanned: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    findings: Array<{ id: string; severity: string; message: string }>;
  }>;
};

type ChangeAnalysisSummary = {
  branch: string;
  head: string;
  commitMessage: string;
  overallRisk: RiskLevel;
  entities: string[];
  flows: string[];
  invariants: string[];
  guardianChecks: string[];
  changedFiles: string[];
  schemaTouched: boolean;
};

type ReviewChecklistSummary = {
  scope: ReviewScope;
  overallRisk: RiskLevel;
  mandatoryTests: string[];
  highRiskFileCount: number;
};

type AdvisorSummary = {
  status: string;
  errors: number;
  warnings: number;
  info: number;
  activeChecks: Array<{ code: string; severity: string; message: string }>;
};

type DecisionContext = {
  change: ChangeAnalysisSummary;
  review: ReviewChecklistSummary;
  guardian: GuardianReport;
  advisor: AdvisorSummary;
  criticalInvariantIds: Set<string>;
};

const FINANCIAL_ENTITIES = new Set([
  "Payment",
  "PaymentMetadata",
  "Coupon",
  "UserPlan",
]);

const DEFAULT_CRITICAL_INVARIANTS = new Set([
  "F1", "F2", "F3", "F6", "F8",
  "M1",
  "A1", "A2",
  "C1", "C4",
  "P3", "P5",
  "X1", "X2", "X4",
]);

async function readRequired(filePath: string, label: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    throw new Error(`${label} não encontrado: ${filePath}`);
  }
}

function parseBulletSection(content: string, header: string): string[] {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `${escaped}\\s*\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\*\\*|\\r?\\n---|\\r?\\n## |$)`
  );
  const match = content.match(regex);
  if (!match) return [];

  const items: string[] = [];
  for (const line of match[1].split(/\r?\n/)) {
    const bullet = line.match(/^- (.+)$/);
    if (bullet) items.push(bullet[1].trim());
  }
  return items;
}

function parseInvariantIds(items: string[]): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    for (const token of item.match(/\b[A-Z]\d+\b/g) ?? []) {
      ids.add(token);
    }
  }
  return [...ids].sort();
}

function parseChangeAnalysis(content: string): ChangeAnalysisSummary {
  const overallRisk =
    (content.match(/\*\*Risco geral:\*\*\s*(LOW|MEDIUM|HIGH|CRITICAL)/)?.[1] as RiskLevel) ??
    "LOW";
  const branch = content.match(/\*\*Branch:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const head = content.match(/\*\*HEAD:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const commitMessage = content.match(/\*\*Mensagem:\*\*\s*(.+)/)?.[1]?.trim() ?? "";

  const entities = parseBulletSection(content, "**Entidades impactadas:**");
  const flows = parseBulletSection(content, "**Fluxos impactados:**");
  const invariants = parseInvariantIds(parseBulletSection(content, "**Invariantes impactados:**"));
  const guardianChecks = parseInvariantIds(
    parseBulletSection(content, "**Checks Guardian relacionados:**")
  );

  const fileLines = parseBulletSection(content, "**Arquivos alterados:**");
  const changedFiles = fileLines
    .map((line) => line.match(/^`([^`]+)`/)?.[1])
    .filter((f): f is string => Boolean(f));

  const schemaTouched = changedFiles.some((f) =>
    /prisma\/schema\.prisma$/i.test(f.replace(/\\/g, "/"))
  );

  return {
    branch,
    head,
    commitMessage,
    overallRisk,
    entities,
    flows,
    invariants,
    guardianChecks,
    changedFiles,
    schemaTouched,
  };
}

function parseReviewChecklist(content: string): ReviewChecklistSummary {
  const scope =
    (content.match(/\*\*Escopo de revisão:\*\*\s*(SMOKE|NORMAL|FULL)/)?.[1] as ReviewScope) ??
    "SMOKE";
  const overallRisk =
    (content.match(/\*\*Risco \(Change Analyzer\):\*\*\s*(LOW|MEDIUM|HIGH|CRITICAL)/)?.[1] as RiskLevel) ??
    "LOW";

  const mandatoryTests: string[] = [];
  const sections = content.split(/^### /m).slice(1);
  for (const section of sections) {
    const testsMatch = section.match(
      /\*\*Testes obrigatórios:\*\*\s*\r?\n\r?\n([\s\S]*?)(?=\r?\n\*\*|$)/
    );
    if (!testsMatch) continue;
    for (const line of testsMatch[1].split(/\r?\n/)) {
      const bullet = line.match(/^- (.+)$/);
      if (bullet && bullet[1] !== "(nenhum)") {
        mandatoryTests.push(bullet[1].trim());
      }
    }
  }

  const highRiskMatch = content.match(
    /\* Arquivos HIGH\/CRITICAL:\s*(\d+)/
  );
  const highRiskFileCount = highRiskMatch ? Number(highRiskMatch[1]) : 0;

  return { scope, overallRisk, mandatoryTests, highRiskFileCount };
}

function parseGuardianReport(content: string): GuardianReport {
  return JSON.parse(content) as GuardianReport;
}

function parseAdvisor(content: string): AdvisorSummary {
  const status = content.match(/\*\*Status final:\*\*\s*\r?\n\r?\n(\w+)/)?.[1] ?? "UNKNOWN";
  const errors = Number(content.match(/\* Errors:\s*(\d+)/)?.[1] ?? "0");
  const warnings = Number(content.match(/\* Warnings:\s*(\d+)/)?.[1] ?? "0");
  const info = Number(content.match(/\* Info:\s*(\d+)/)?.[1] ?? "0");

  const activeChecks: AdvisorSummary["activeChecks"] = [];
  const checksSection = content.match(/## Checks com ocorrências([\s\S]*?)(?:\n---|$)/);
  if (checksSection) {
    for (const line of checksSection[1].split("\n")) {
      const match = line.match(/^- \*\*([A-Z]\d+)\*\* \((\w+)\)/);
      if (match) {
        activeChecks.push({
          code: match[1],
          severity: match[2],
          message: line.replace(/^- /, "").trim(),
        });
      }
    }
  }

  return { status, errors, warnings, info, activeChecks };
}

function parseCriticalInvariants(content: string): Set<string> {
  const critical = new Set(DEFAULT_CRITICAL_INVARIANTS);
  for (const line of content.split("\n")) {
    const match = line.match(/^\|\s*\*\*([A-Z]\d+)\*\*\s*\|[^|]+\|\s*CRÍTICO\s*\|/i);
    if (match) critical.add(match[1]);
  }
  return critical;
}

function affectedCriticalInvariants(
  invariants: string[],
  criticalSet: Set<string>
): string[] {
  return invariants.filter((id) => criticalSet.has(id)).sort();
}

function hasFinancialEntities(entities: string[]): boolean {
  return entities.some((e) => FINANCIAL_ENTITIES.has(e));
}

function schemaPaymentAppointmentCombo(change: ChangeAnalysisSummary): boolean {
  const entitySet = new Set(change.entities);
  return (
    change.schemaTouched &&
    entitySet.has("Payment") &&
    entitySet.has("Appointment")
  );
}

type DecisionResult = {
  decision: Decision;
  blockedReasons: string[];
  reviewReasons: string[];
  approvedReasons: string[];
};

function computeDecision(ctx: DecisionContext): DecisionResult {
  const { change, guardian, criticalInvariantIds } = ctx;
  const blockedReasons: string[] = [];
  const reviewReasons: string[] = [];
  const approvedReasons: string[] = [];

  const criticalTouched = affectedCriticalInvariants(
    change.invariants,
    criticalInvariantIds
  );

  if (change.overallRisk === "CRITICAL") {
    blockedReasons.push(`Risco geral **CRITICAL** (Change Analyzer).`);
  }

  if (guardian.summary.errors > 0) {
    blockedReasons.push(
      `Domain Guardian reportou **${guardian.summary.errors}** error(s) em \`latest.json\`.`
    );
  }

  if (criticalTouched.length > 0) {
    blockedReasons.push(
      `Invariantes críticos afetados: ${criticalTouched.join(", ")}.`
    );
  }

  if (schemaPaymentAppointmentCombo(change)) {
    blockedReasons.push(
      "Alteração toca `prisma/schema.prisma` com entidades **Payment** e **Appointment** simultaneamente."
    );
  }

  if (blockedReasons.length > 0) {
    return { decision: "BLOCKED", blockedReasons, reviewReasons, approvedReasons };
  }

  if (change.overallRisk === "HIGH") {
    reviewReasons.push(`Risco geral **HIGH** (Change Analyzer).`);
  }

  if (guardian.summary.warnings > 0) {
    reviewReasons.push(
      `Domain Guardian reportou **${guardian.summary.warnings}** warning(s).`
    );
  }

  if (hasFinancialEntities(change.entities)) {
    const financial = change.entities.filter((e) => FINANCIAL_ENTITIES.has(e));
    reviewReasons.push(
      `Entidades financeiras afetadas: ${financial.join(", ")}.`
    );
  }

  if (reviewReasons.length > 0) {
    return { decision: "REVIEW_REQUIRED", blockedReasons, reviewReasons, approvedReasons };
  }

  if (change.overallRisk === "LOW" || change.overallRisk === "MEDIUM") {
    approvedReasons.push(`Risco geral **${change.overallRisk}**.`);
  }

  if (guardian.summary.errors === 0) {
    approvedReasons.push("Domain Guardian sem errors.");
  }

  if (criticalTouched.length === 0) {
    approvedReasons.push("Nenhum invariante crítico afetado.");
  }

  return { decision: "APPROVED", blockedReasons, reviewReasons, approvedReasons };
}

function relevantGuardianChecks(
  change: ChangeAnalysisSummary,
  guardian: GuardianReport
): Array<{ code: string; severity: string; detail: string }> {
  const related = new Set(change.guardianChecks);
  const checks: Array<{ code: string; severity: string; detail: string }> = [];

  for (const result of guardian.results) {
    const isRelated = related.has(result.code);
    const hasIssue =
      result.errorCount > 0 || result.warningCount > 0 || result.infoCount > 0;
    if (!isRelated && !hasIssue) continue;

    let detail = `${result.severity} — errors: ${result.errorCount}, warnings: ${result.warningCount}, info: ${result.infoCount}`;
    if (result.findings.length > 0) {
      detail += ` — ${result.findings[0].message}`;
    }
    checks.push({ code: result.code, severity: result.severity, detail });
  }

  return checks.sort((a, b) => a.code.localeCompare(b.code));
}

function nextSteps(
  decision: Decision,
  ctx: DecisionContext,
  result: DecisionResult
): string[] {
  const steps: string[] = [];

  if (decision === "BLOCKED") {
    steps.push("Não fazer merge até resolver os motivos de bloqueio.");
    if (ctx.guardian.summary.errors > 0) {
      steps.push("Corrigir findings ERROR do Domain Guardian e reexecutar `domain-guardian-runner.ts`.");
    }
    if (result.blockedReasons.some((r) => r.includes("CRITICAL"))) {
      steps.push("Reduzir escopo do diff ou dividir em PRs menores (split-to-prs).");
    }
    if (result.blockedReasons.some((r) => r.includes("schema"))) {
      steps.push("Revisar migration Prisma com foco em Payment ↔ Appointment (F4, A2, X2).");
    }
    steps.push("Reexecutar pipeline: change-analyzer → review-engine → decision-engine.");
    return steps;
  }

  if (decision === "REVIEW_REQUIRED") {
    steps.push("Executar testes obrigatórios de `review-checklist.md`.");
    if (ctx.review.scope === "FULL") {
      steps.push("Rodar Domain Guardian antes do merge (`domain-guardian-runner.ts`).");
    }
    if (ctx.guardian.summary.warnings > 0) {
      steps.push("Revisar warnings em `advisor.md` e justificar ou corrigir.");
    }
    steps.push("Anexar checklist preenchido ao PR.");
    steps.push("Reexecutar decision-engine após correções.");
    return steps;
  }

  steps.push("Merge permitido com smoke tests mínimos.");
  steps.push("Opcional: rodar Domain Guardian em CI para baseline.");
  return steps;
}

function formatBullets(items: string[]): string {
  if (items.length === 0) return "- (nenhum)";
  return items.map((item) => `- ${item}`).join("\n");
}

function buildDecisionMarkdown(params: {
  ctx: DecisionContext;
  result: DecisionResult;
  generatedAt: string;
}): string {
  const { ctx, result, generatedAt } = params;
  const { change, review, guardian, advisor } = ctx;
  const guardianChecks = relevantGuardianChecks(change, guardian);
  const criticalTouched = affectedCriticalInvariants(
    change.invariants,
    ctx.criticalInvariantIds
  );
  const steps = nextSteps(result.decision, ctx, result);

  const decisionEmoji =
    result.decision === "APPROVED"
      ? "✅"
      : result.decision === "REVIEW_REQUIRED"
        ? "⚠️"
        : "🛑";

  const lines: string[] = [
    "# Domain Decision",
    "",
    `**Gerado em:** ${generatedAt}`,
    `**Branch:** ${change.branch}`,
    `**HEAD:** ${change.head}`,
    `**Mensagem:** ${change.commitMessage}`,
    "",
    "---",
    "",
    "## 1. Decisão final",
    "",
    `${decisionEmoji} **${result.decision}**`,
    "",
    `| Sinal | Valor |`,
    `|-------|-------|`,
    `| Risco (Change Analyzer) | ${change.overallRisk} |`,
    `| Escopo de revisão | ${review.scope} |`,
    `| Guardian errors | ${guardian.summary.errors} |`,
    `| Guardian warnings | ${guardian.summary.warnings} |`,
    `| Advisor status | ${advisor.status} |`,
    `| Arquivos alterados | ${change.changedFiles.length} |`,
    `| Arquivos HIGH/CRITICAL | ${review.highRiskFileCount} |`,
    "",
    "---",
    "",
    "## 2. Motivos",
    "",
  ];

  if (result.blockedReasons.length > 0) {
    lines.push("### Bloqueio", "", formatBullets(result.blockedReasons), "");
  }
  if (result.reviewReasons.length > 0) {
    lines.push("### Revisão necessária", "", formatBullets(result.reviewReasons), "");
  }
  if (result.approvedReasons.length > 0) {
    lines.push("### Aprovação", "", formatBullets(result.approvedReasons), "");
  }
  if (
    result.blockedReasons.length === 0 &&
    result.reviewReasons.length === 0 &&
    result.approvedReasons.length === 0
  ) {
    lines.push("- Critérios padrão satisfeitos.", "");
  }

  lines.push(
    "---",
    "",
    "## 3. Entidades afetadas",
    "",
    formatBullets(change.entities.length > 0 ? change.entities : ["(nenhuma detectada)"]),
    "",
    "**Fluxos impactados:**",
    "",
    formatBullets(change.flows.slice(0, 15)),
    change.flows.length > 15 ? `\n- … e mais ${change.flows.length - 15} fluxo(s)` : "",
    "",
    "---",
    "",
    "## 4. Invariantes afetados",
    "",
    `**Total no diff:** ${change.invariants.length}`,
    "",
    formatBullets(change.invariants.length > 0 ? change.invariants : ["(nenhum)"]),
    "",
    "**Invariantes críticos tocados:**",
    "",
    formatBullets(criticalTouched.length > 0 ? criticalTouched : ["(nenhum)"]),
    "",
    "---",
    "",
    "## 5. Checks Guardian relevantes",
    "",
  );

  if (guardianChecks.length === 0) {
    lines.push("- (nenhum check relacionado ou com ocorrências)", "");
  } else {
    for (const check of guardianChecks) {
      lines.push(`- **${check.code}** — ${check.detail}`);
    }
    lines.push("");
  }

  if (advisor.activeChecks.length > 0) {
    lines.push("**Advisor (checks com ocorrências):**", "");
    for (const item of advisor.activeChecks) {
      lines.push(`- ${item.message}`);
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "## 6. Testes obrigatórios",
    "",
    `Escopo **${review.scope}** — ${review.mandatoryTests.length} teste(s) obrigatório(s) no checklist.`,
    "",
  );

  const testsToShow = review.mandatoryTests.slice(0, 25);
  lines.push(formatBullets(testsToShow));
  if (review.mandatoryTests.length > 25) {
    lines.push(
      "",
      `- … e mais ${review.mandatoryTests.length - 25} teste(s) em \`review-checklist.md\``
    );
  }

  lines.push(
    "",
    "---",
    "",
    "## 7. Próximos passos",
    "",
    formatBullets(steps),
    "",
    "---",
    "",
    "## Critérios aplicados",
    "",
    "| Decisão | Condição |",
    "|---------|----------|",
    "| **BLOCKED** | Risco CRITICAL · Guardian errors > 0 · invariantes críticos · schema + Payment + Appointment |",
    "| **REVIEW_REQUIRED** | Risco HIGH · Guardian warnings > 0 · entidades financeiras afetadas |",
    "| **APPROVED** | Risco LOW/MEDIUM · sem errors · sem invariantes críticos · demais critérios de bloqueio/revisão ausentes |",
    "",
    "_Motor somente leitura — nenhuma alteração de banco, API ou regra de negócio._",
    "_Fontes: change-analysis.md, review-checklist.md, latest.json, advisor.md, domain-map.md, domain-invariants.md_"
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const [
    changeAnalysisRaw,
    reviewChecklistRaw,
    latestJsonRaw,
    advisorRaw,
    domainMapRaw,
    invariantsRaw,
  ] = await Promise.all([
    readRequired(CHANGE_ANALYSIS_PATH, "change-analysis.md"),
    readRequired(REVIEW_CHECKLIST_PATH, "review-checklist.md"),
    readRequired(LATEST_JSON_PATH, "latest.json"),
    readRequired(ADVISOR_PATH, "advisor.md"),
    readRequired(DOMAIN_MAP_PATH, "domain-map.md"),
    readRequired(DOMAIN_INVARIANTS_PATH, "domain-invariants.md"),
  ]);

  void domainMapRaw;

  const change = parseChangeAnalysis(changeAnalysisRaw);
  const review = parseReviewChecklist(reviewChecklistRaw);
  const guardian = parseGuardianReport(latestJsonRaw);
  const advisor = parseAdvisor(advisorRaw);
  const criticalInvariantIds = parseCriticalInvariants(invariantsRaw);

  const ctx: DecisionContext = {
    change,
    review,
    guardian,
    advisor,
    criticalInvariantIds,
  };

  const result = computeDecision(ctx);
  const generatedAt = new Date().toISOString();
  const markdown = buildDecisionMarkdown({ ctx, result, generatedAt });

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, markdown, "utf8");

  console.log(`Decision gerada: ${OUTPUT_PATH}`);
  console.log(`Decisão: ${result.decision}`);
  console.log(`Risco: ${change.overallRisk}`);
  console.log(`Guardian: ${guardian.summary.errors} errors, ${guardian.summary.warnings} warnings`);
  console.log("");

  if (result.decision === "BLOCKED") {
    console.log("Motivos de bloqueio:");
    for (const reason of result.blockedReasons) {
      console.log(`  - ${reason}`);
    }
    process.exitCode = 1;
  } else {
    if (result.reviewReasons.length > 0) {
      console.log("Motivos de revisão:");
      for (const reason of result.reviewReasons) {
        console.log(`  - ${reason}`);
      }
    }
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error(
    "domain_decision_engine_error:",
    err instanceof Error ? err.message : err
  );
  process.exitCode = 1;
});
