/**
 * Domain PR Reviewer — avalia se uma mudança possui revisão adequada antes do merge.
 *
 * Uso: node --experimental-strip-types scripts/domain-pr-reviewer.ts
 *
 * Entrada (somente leitura):
 *   reports/domain-guardian/change-analysis.md
 *   reports/domain-guardian/review-checklist.md
 *   reports/domain-guardian/decision.md
 *   reports/domain-guardian/action-plan.md
 *   docs/ai/domain-map.md
 *   docs/ai/domain-invariants.md
 *   docs/ai/domain-risks.md
 *
 * Saída: reports/domain-guardian/pr-review.md
 *
 * Exit code: sempre 0 (recomendação apenas — nunca bloqueia).
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const CHANGE_ANALYSIS_PATH = path.join(REPORTS_DIR, "change-analysis.md");
const REVIEW_CHECKLIST_PATH = path.join(REPORTS_DIR, "review-checklist.md");
const DECISION_PATH = path.join(REPORTS_DIR, "decision.md");
const ACTION_PLAN_PATH = path.join(REPORTS_DIR, "action-plan.md");
const DOMAIN_MAP_PATH = path.join(ROOT, "docs/ai/domain-map.md");
const DOMAIN_INVARIANTS_PATH = path.join(ROOT, "docs/ai/domain-invariants.md");
const DOMAIN_RISKS_PATH = path.join(ROOT, "docs/ai/domain-risks.md");
const OUTPUT_PATH = path.join(REPORTS_DIR, "pr-review.md");

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Decision = "APPROVED" | "REVIEW_REQUIRED" | "BLOCKED";
type PrRecommendation = "APPROVE" | "REQUEST_REVIEW" | "DO_NOT_MERGE";
type ReviewScope = "SMOKE" | "NORMAL" | "FULL";

type ChangedFile = {
  path: string;
  changeKind: string;
  risk: RiskLevel;
};

type EntityReview = {
  name: string;
  risks: string[];
  testsToValidate: string[];
  sensitivePoints: string[];
  criticalFiles: string[];
  invariants: string[];
  flows: string[];
};

const ENTITY_ORDER = [
  "Payment",
  "PaymentMetadata",
  "Appointment",
  "Coupon",
  "UserPlan",
  "Service",
  "User",
] as const;

const CRITICAL_INVARIANTS = new Set([
  "F1", "F2", "F3", "F6", "F8",
  "M1",
  "A1", "A2",
  "C1", "C4",
  "P3", "P5",
  "X1", "X2", "X4",
]);

const ENTITY_PATH_HINTS: Record<string, RegExp[]> = {
  Payment: [/payment/i, /webhooks\/asaas/i, /checkout/i, /asaas-/i, /symbolic-payment/i],
  PaymentMetadata: [/payment-metadata|PaymentMetadata|checkout/i],
  Appointment: [/agendamento/i, /appointment/i],
  Coupon: [/cupom|coupon/i],
  UserPlan: [/plano|user-plan|userPlan/i, /plan-coupon/i],
  Service: [/servico|service/i],
  User: [/meus-dados/i, /\/conta\//i, /\/login/i, /auth\.ts/i, /usuarios/i],
};

const ENTITY_SENSITIVE_POINTS: Record<string, string[]> = {
  Payment: [
    "Idempotência webhook por asaasId (F1/F3)",
    "Vínculo lógico appointmentId sem FK — órfão após delete (F4)",
    "Delete físico de Payment approved real bloqueado (F8)",
    "Classificação simbólico vs produção (S1/S3)",
  ],
  PaymentMetadata: [
    "Metadata deve existir antes do POST Asaas (M1)",
    "TTL expiresAt ~24h — webhook perde contexto se expirado (M3)",
    "externalReference limitado a userId",
  ],
  Appointment: [
    "Conflito de horário — recusado ainda pode bloquear slot (A8)",
    "userHiddenAt não altera status financeiro (A7)",
    "Reembolso exige Payment approved vinculado (A2)",
    "adminArchivedAt ainda não implementado — reter histórico",
  ],
  Coupon: [
    "code único global (C1)",
    "Cupom de plano bloqueado se plano cancelado/reembolso (C5)",
    "Tríade remarcação refundCouponId (X2)",
    "Simulação TESTE_* isolada de produção (C7)",
  ],
  UserPlan: [
    "adminInactiveAt bloqueia cupons não usados (P4)",
    "Delete físico bloqueado com histórico (P5)",
    "Payment ↔ UserPlan sem FK — heurística 48h (F5)",
    "Reembolso bloqueia cupons (P3)",
  ],
  Service: [
    "appointmentId SET NULL on delete — entrega órfã",
    "Sync status com Appointment (A5/A6)",
    "Backfill admin pode ser necessário pós-pagamento",
  ],
  User: [
    "Delete User cascade apaga histórico financeiro",
    "Ownership cross-entity (X1)",
    "Minha Conta agrega múltiplas entidades",
  ],
};

const ENTITY_DOMAIN_RISKS: Record<string, string[]> = {
  Payment: [
    "Duplicidade de Payment por asaasId",
    "Payment approved órfão sem Appointment (F4)",
    "Reembolso outbound com asaasId incorreto (F6)",
  ],
  PaymentMetadata: [
    "Webhook sem metadata válida — efeitos incompletos",
    "Metadata expirado sem job de limpeza",
  ],
  Appointment: [
    "Double booking em slot sobreposto",
    "Agendamento sem Service até backfill",
    "Reembolso pendente inacessível se ocultado incorretamente",
  ],
  Coupon: [
    "Código duplicado ou cupom usado sem rastreio",
    "Cupom órfão com assignedUserId null",
    "Ponte refundCouponId quebrada sem FK",
  ],
  UserPlan: [
    "Plano ativo sem cupons gerados (P2)",
    "Ambiguidade Payment ↔ UserPlan com múltiplos planos",
  ],
  Service: [
    "Service com appointmentId null após delete",
    "Entrega de áudio órfã",
  ],
  User: [
    "Cascade delete remove Payment/Appointment/UserPlan",
    "Divergência userId entre entidades do fluxo",
  ],
};

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

function parseChangeAnalysis(content: string) {
  const overallRisk =
    (content.match(/\*\*Risco geral:\*\*\s*(LOW|MEDIUM|HIGH|CRITICAL)/)?.[1] as RiskLevel) ??
    "LOW";
  const branch = content.match(/\*\*Branch:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const head = content.match(/\*\*HEAD:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const commitMessage = content.match(/\*\*Mensagem:\*\*\s*(.+)/)?.[1]?.trim() ?? "";

  const entities = parseBulletSection(content, "**Entidades impactadas:**");
  const flows = parseBulletSection(content, "**Fluxos impactados:**");
  const invariants = parseBulletSection(content, "**Invariantes impactados:**").flatMap(
    (item) => item.match(/\b[A-Z]\d+\b/g) ?? []
  );
  const uniqueInvariants = [...new Set(invariants)].sort();

  const changedFiles: ChangedFile[] = [];
  for (const line of parseBulletSection(content, "**Arquivos alterados:**")) {
    const m = line.match(/^`([^`]+)`\s*\(([^,]+),\s*(LOW|MEDIUM|HIGH|CRITICAL)\)/);
    if (m) {
      changedFiles.push({ path: m[1], changeKind: m[2], risk: m[3] as RiskLevel });
    }
  }

  const schemaTouched = changedFiles.some((f) =>
    /prisma\/schema\.prisma$/i.test(f.path)
  );

  return {
    branch,
    head,
    commitMessage,
    overallRisk,
    entities,
    flows,
    invariants: uniqueInvariants,
    changedFiles,
    schemaTouched,
  };
}

function parseReviewChecklist(content: string) {
  const scope =
    (content.match(/\*\*Escopo de revisão:\*\*\s*(SMOKE|NORMAL|FULL)/)?.[1] as ReviewScope) ??
    "SMOKE";
  const overallRisk =
    (content.match(/\*\*Risco \(Change Analyzer\):\*\*\s*(LOW|MEDIUM|HIGH|CRITICAL)/)?.[1] as RiskLevel) ??
    "LOW";
  const highRiskFileCount = Number(
    content.match(/\* Arquivos HIGH\/CRITICAL:\s*(\d+)/)?.[1] ?? "0"
  );

  const entitySections = new Map<
    string,
    { mandatory: string[]; recommended: string[]; extended: string[]; flows: string[]; invariants: string[] }
  >();

  const sections = content.split(/^### /m).slice(1);
  for (const section of sections) {
    const nameMatch = section.match(/^([A-Za-z]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (!ENTITY_ORDER.includes(name as (typeof ENTITY_ORDER)[number])) continue;

    const parseTests = (label: string) => {
      const m = section.match(
        new RegExp(
          `\\*\\*${label}:\\*\\*\\s*\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\*\\*|$)`
        )
      );
      if (!m) return [];
      return m[1]
        .split(/\r?\n/)
        .map((l) => l.match(/^- (.+)$/)?.[1]?.trim())
        .filter((t): t is string => Boolean(t) && t !== "(nenhum)");
    };

    entitySections.set(name, {
      mandatory: parseTests("Testes obrigatórios"),
      recommended: parseTests("Testes recomendados"),
      extended: parseTests("Testes estendidos \\(FULL\\)"),
      flows: parseBulletSection(section, "**Fluxos afetados:**"),
      invariants: parseBulletSection(section, "**Invariantes que devem continuar válidos:**"),
    });
  }

  const allMandatory: string[] = [];
  for (const data of entitySections.values()) {
    allMandatory.push(...data.mandatory);
  }

  return { scope, overallRisk, highRiskFileCount, entitySections, allMandatory };
}

function parseDecision(content: string) {
  const decisionMatch = content.match(
    /(?:🛑|⚠️|✅)\s*\*\*(APPROVED|REVIEW_REQUIRED|BLOCKED)\*\*/
  );
  const decision = (decisionMatch?.[1] ?? "UNKNOWN") as Decision | "UNKNOWN";

  const reasons: string[] = [];
  for (const section of ["### Bloqueio", "### Revisão necessária", "### Aprovação"]) {
    const m = content.match(
      new RegExp(`${section}\\s*\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n###|\\r?\\n---|$)`)
    );
    if (!m) continue;
    for (const line of m[1].split("\n")) {
      const bullet = line.match(/^- (.+)$/);
      if (bullet) reasons.push(bullet[1].trim());
    }
  }

  const guardianErrors = Number(
    content.match(/\| Guardian errors \| (\d+) \|/)?.[1] ?? "0"
  );
  const guardianWarnings = Number(
    content.match(/\| Guardian warnings \| (\d+) \|/)?.[1] ?? "0"
  );

  return { decision, reasons, guardianErrors, guardianWarnings };
}

function parseActionPlanStatus(content: string): string {
  const m = content.match(/\| Guardian \| (\w+) \|/);
  return m?.[1] ?? "UNKNOWN";
}

function parseDomainMapFiles(content: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const sections = content.split(/^## /m).slice(1);

  for (const block of sections) {
    const nameMatch = block.match(/^([A-Za-z]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (name === "Matriz" || name === "Referência") continue;

    const files: string[] = [];
    const filesMatch = block.match(
      /\*\*Arquivos principais:\*\*\s*\r?\n([\s\S]*?)(?=\r?\n\*\*|$)/
    );
    if (filesMatch) {
      for (const line of filesMatch[1].split("\n")) {
        const m = line.match(/`([^`]+)`/);
        if (m) files.push(m[1]);
      }
    }
    map.set(name, files);
  }
  return map;
}

function fileMatchesEntity(filePath: string, entity: string, domainFiles: string[]): boolean {
  const normalized = filePath.replace(/\\/g, "/");

  for (const domainFile of domainFiles) {
    const df = domainFile.replace(/\\/g, "/");
    if (normalized === df || normalized.endsWith(`/${df}`) || normalized.endsWith(df)) {
      return true;
    }
  }

  const hints = ENTITY_PATH_HINTS[entity] ?? [];
  return hints.some((re) => re.test(normalized));
}

function decisionToRecommendation(decision: Decision | "UNKNOWN"): PrRecommendation {
  if (decision === "BLOCKED") return "DO_NOT_MERGE";
  if (decision === "REVIEW_REQUIRED") return "REQUEST_REVIEW";
  if (decision === "APPROVED") return "APPROVE";
  return "REQUEST_REVIEW";
}

function recommendationLabel(rec: PrRecommendation): string {
  if (rec === "APPROVE") return "✅ APPROVE";
  if (rec === "REQUEST_REVIEW") return "⚠️ REQUEST_REVIEW";
  return "🛑 DO_NOT_MERGE";
}

function buildEntityReviews(params: {
  entities: string[];
  changeInvariants: string[];
  changedFiles: ChangedFile[];
  checklist: ReturnType<typeof parseReviewChecklist>;
  domainMapFiles: Map<string, string[]>;
}): EntityReview[] {
  const { entities, changeInvariants, changedFiles, checklist, domainMapFiles } = params;
  const impacted = ENTITY_ORDER.filter((e) => entities.includes(e));

  return impacted.map((name) => {
    const section = checklist.entitySections.get(name);
    const entityInvariants = section?.invariants.length
      ? section.invariants
      : changeInvariants;

    const criticalInvariantHits = entityInvariants.filter((id) =>
      CRITICAL_INVARIANTS.has(id)
    );

    const risks = [
      ...ENTITY_DOMAIN_RISKS[name],
      ...criticalInvariantHits.map((id) => `Invariante crítico ${id} no diff`),
    ];

    const testsToValidate: string[] = [...(section?.mandatory ?? [])];
    if (checklist.scope === "NORMAL" || checklist.scope === "FULL") {
      testsToValidate.push(...(section?.recommended ?? []));
    }
    if (checklist.scope === "FULL") {
      testsToValidate.push(...(section?.extended ?? []));
    }

    const sensitivePoints = [
      ...ENTITY_SENSITIVE_POINTS[name],
      ...(section?.flows ?? []).slice(0, 4).map((f) => `Fluxo afetado: ${f}`),
    ];

    const domainFiles = domainMapFiles.get(name) ?? [];
    const criticalFiles = changedFiles
      .filter(
        (f) =>
          (f.risk === "HIGH" || f.risk === "CRITICAL") &&
          fileMatchesEntity(f.path, name, domainFiles)
      )
      .map((f) => `${f.path} (${f.risk})`)
      .slice(0, 12);

    if (criticalFiles.length === 0) {
      const fallback = changedFiles
        .filter((f) => fileMatchesEntity(f.path, name, domainFiles))
        .filter((f) => f.risk === "HIGH" || f.risk === "CRITICAL")
        .map((f) => `${f.path} (${f.risk})`);
      criticalFiles.push(...fallback.slice(0, 8));
    }

    return {
      name,
      risks: [...new Set(risks)],
      testsToValidate: [...new Set(testsToValidate)],
      sensitivePoints: [...new Set(sensitivePoints)].slice(0, 8),
      criticalFiles,
      invariants: entityInvariants,
      flows: section?.flows ?? [],
    };
  });
}

function computeObservedRisks(params: {
  change: ReturnType<typeof parseChangeAnalysis>;
  decision: ReturnType<typeof parseDecision>;
  checklist: ReturnType<typeof parseReviewChecklist>;
  actionPlanStatus: string;
}): string[] {
  const { change, decision, checklist, actionPlanStatus } = params;
  const risks: string[] = [];

  risks.push(`Risco geral do diff: **${change.overallRisk}**`);
  risks.push(`Escopo de revisão: **${checklist.scope}**`);
  risks.push(`${checklist.highRiskFileCount} arquivo(s) HIGH/CRITICAL no diff`);
  risks.push(`${change.invariants.length} invariante(s) impactado(s)`);

  const criticalHit = change.invariants.filter((id) => CRITICAL_INVARIANTS.has(id));
  if (criticalHit.length > 0) {
    risks.push(`Invariantes críticos no diff: ${criticalHit.join(", ")}`);
  }

  if (change.schemaTouched) {
    risks.push("Schema Prisma alterado — migration obrigatória e revisão de FKs lógicas");
  }

  if (decision.guardianErrors > 0 || decision.guardianWarnings > 0) {
    risks.push(
      `Guardian no banco: ${decision.guardianErrors} error(s), ${decision.guardianWarnings} warning(s) (${actionPlanStatus})`
    );
  }

  for (const reason of decision.reasons) {
    risks.push(`Decision Engine: ${reason}`);
  }

  return risks;
}

function buildPrCommentBody(params: {
  recommendation: PrRecommendation;
  change: ReturnType<typeof parseChangeAnalysis>;
  decision: ReturnType<typeof parseDecision>;
  observedRisks: string[];
  entityReviews: EntityReview[];
  mandatoryTests: string[];
}): string {
  const { recommendation, change, decision, observedRisks, entityReviews, mandatoryTests } =
    params;

  const lines = [
    `## Domain PR Review — ${recommendationLabel(recommendation)}`,
    "",
    `**Branch:** ${change.branch} · **HEAD:** ${change.head}`,
    `**Decision Engine:** ${decision.decision}`,
    `**Risco:** ${change.overallRisk}`,
    "",
    "### Riscos observados",
    ...observedRisks.map((r) => `- ${r}`),
    "",
    "### Testes obrigatórios (amostra)",
    ...mandatoryTests.slice(0, 8).map((t) => `- [ ] ${t}`),
    mandatoryTests.length > 8 ? `- … e mais ${mandatoryTests.length - 8}` : "",
    "",
    "### Por entidade",
  ];

  for (const entity of entityReviews.slice(0, 4)) {
    lines.push(
      `**${entity.name}** — ${entity.criticalFiles.length} arquivo(s) crítico(s), ${entity.testsToValidate.length} teste(s) a validar`
    );
  }

  lines.push("", "_Gerado por domain-pr-reviewer.ts_");
  return lines.filter(Boolean).join("\n");
}

function buildMarkdown(params: {
  change: ReturnType<typeof parseChangeAnalysis>;
  checklist: ReturnType<typeof parseReviewChecklist>;
  decision: ReturnType<typeof parseDecision>;
  actionPlanStatus: string;
  entityReviews: EntityReview[];
  observedRisks: string[];
  recommendation: PrRecommendation;
  generatedAt: string;
}): string {
  const {
    change,
    checklist,
    decision,
    actionPlanStatus,
    entityReviews,
    observedRisks,
    recommendation,
    generatedAt,
  } = params;

  const criticalFiles = change.changedFiles
    .filter((f) => f.risk === "HIGH" || f.risk === "CRITICAL")
    .slice(0, 25);

  const lines: string[] = [
    "# Pull Request Review",
    "",
    `**Gerado em:** ${generatedAt}`,
    "",
    "## Resumo",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Branch | ${change.branch} |`,
    `| HEAD | ${change.head} |`,
    `| Mensagem | ${change.commitMessage} |`,
    `| Risco geral | ${change.overallRisk} |`,
    `| Escopo de revisão | ${checklist.scope} |`,
    `| Decision Engine | ${decision.decision} |`,
    `| Guardian (banco) | ${actionPlanStatus} |`,
    `| Arquivos alterados | ${change.changedFiles.length} |`,
    `| Arquivos HIGH/CRITICAL | ${checklist.highRiskFileCount} |`,
    `| Entidades impactadas | ${entityReviews.length} |`,
    "",
    "## Arquivos alterados",
    "",
    `Total: **${change.changedFiles.length}** · Exibindo até 30 (ordenados por risco).`,
    "",
  ];

  const sortedFiles = [...change.changedFiles].sort((a, b) => {
    const order: Record<RiskLevel, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return order[b.risk] - order[a.risk];
  });

  for (const f of sortedFiles.slice(0, 30)) {
    lines.push(`- \`${f.path}\` — ${f.changeKind}, **${f.risk}**`);
  }
  if (change.changedFiles.length > 30) {
    lines.push(`- … e mais ${change.changedFiles.length - 30} arquivo(s)`);
  }

  lines.push("", "## Entidades afetadas", "");
  for (const entity of entityReviews) {
    lines.push(`- **${entity.name}**`);
  }

  lines.push("", "## Invariantes relevantes", "");
  const criticalInv = change.invariants.filter((id) => CRITICAL_INVARIANTS.has(id));
  lines.push("**Críticos no diff:**", "");
  if (criticalInv.length === 0) lines.push("- (nenhum)");
  else criticalInv.forEach((id) => lines.push(`- ${id}`));

  lines.push("", "**Todos no diff:**", "");
  if (change.invariants.length === 0) lines.push("- (nenhum)");
  else change.invariants.forEach((id) => lines.push(`- ${id}`));

  lines.push("", "## Testes obrigatórios", "");
  lines.push(
    `Escopo **${checklist.scope}** — validar antes do merge (${checklist.allMandatory.length} obrigatório(s) no checklist).`,
    ""
  );
  for (const test of checklist.allMandatory.slice(0, 20)) {
    lines.push(`- [ ] ${test}`);
  }
  if (checklist.allMandatory.length > 20) {
    lines.push(`- … e mais ${checklist.allMandatory.length - 20} em \`review-checklist.md\``);
  }

  lines.push("", "## Riscos observados", "");
  for (const risk of observedRisks) {
    lines.push(`- ${risk}`);
  }

  lines.push("", "## Revisão por entidade", "");

  for (const entity of entityReviews) {
    lines.push(
      `### ${entity.name}`,
      "",
      "**Riscos**",
      "",
      ...(entity.risks.length ? entity.risks.map((r) => `- ${r}`) : ["- (nenhum específico)"]),
      "",
      "**Testes a validar**",
      "",
      ...(entity.testsToValidate.length
        ? entity.testsToValidate.slice(0, 10).map((t) => `- [ ] ${t}`)
        : ["- (nenhum no checklist)"]),
      ...(entity.testsToValidate.length > 10
        ? [`- … e mais ${entity.testsToValidate.length - 10}`]
        : []),
      "",
      "**Pontos sensíveis**",
      "",
      ...entity.sensitivePoints.map((p) => `- ${p}`),
      "",
      "**Arquivos críticos no diff**",
      "",
      ...(entity.criticalFiles.length
        ? entity.criticalFiles.map((f) => `- ${f}`)
        : ["- (nenhum HIGH/CRITICAL mapeado para esta entidade)"]),
      "",
      "---",
      ""
    );
  }

  lines.push(
    "## Recomendação final",
    "",
    recommendationLabel(recommendation),
    "",
    `Mapeamento Decision Engine: **${decision.decision}** → **${recommendation}**`,
    ""
  );

  if (recommendation === "DO_NOT_MERGE") {
    lines.push(
      "> Não fazer merge até resolver bloqueios do Decision Engine ou reduzir escopo do PR.",
      ""
    );
  } else if (recommendation === "REQUEST_REVIEW") {
    lines.push(
      "> Merge permitido após revisão humana e execução dos testes obrigatórios.",
      ""
    );
  } else {
    lines.push("> Merge permitido com smoke tests mínimos.", "");
  }

  if (decision.reasons.length > 0) {
    lines.push("**Motivos (Decision Engine):**", "");
    decision.reasons.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
  }

  const prComment = buildPrCommentBody({
    recommendation,
    change,
    decision,
    observedRisks,
    entityReviews,
    mandatoryTests: checklist.allMandatory,
  });

  lines.push(
    "---",
    "",
    "## Export (comentário de PR — integração futura)",
    "",
    "```markdown",
    prComment,
    "```",
    "",
    "```json",
    JSON.stringify(
      {
        version: 1,
        generatedAt,
        recommendation,
        decision: decision.decision,
        risk: change.overallRisk,
        scope: checklist.scope,
        entities: entityReviews.map((e) => e.name),
        criticalFiles: criticalFiles.map((f) => f.path),
        githubComment: { body: prComment },
      },
      null,
      2
    ),
    "```",
    "",
    "_PR Reviewer somente leitura — não bloqueia pipeline (exit 0)._",
    "_Fontes: change-analysis.md, review-checklist.md, decision.md, action-plan.md, domain-map.md, domain-invariants.md, domain-risks.md_"
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const [
    changeRaw,
    checklistRaw,
    decisionRaw,
    actionPlanRaw,
    domainMapRaw,
    invariantsRaw,
    risksRaw,
  ] = await Promise.all([
    readRequired(CHANGE_ANALYSIS_PATH, "change-analysis.md"),
    readRequired(REVIEW_CHECKLIST_PATH, "review-checklist.md"),
    readRequired(DECISION_PATH, "decision.md"),
    readRequired(ACTION_PLAN_PATH, "action-plan.md"),
    readRequired(DOMAIN_MAP_PATH, "domain-map.md"),
    readRequired(DOMAIN_INVARIANTS_PATH, "domain-invariants.md"),
    readRequired(DOMAIN_RISKS_PATH, "domain-risks.md"),
  ]);

  void invariantsRaw;
  void risksRaw;

  const change = parseChangeAnalysis(changeRaw);
  const checklist = parseReviewChecklist(checklistRaw);
  const decision = parseDecision(decisionRaw);
  const actionPlanStatus = parseActionPlanStatus(actionPlanRaw);
  const domainMapFiles = parseDomainMapFiles(domainMapRaw);

  const entityReviews = buildEntityReviews({
    entities: change.entities,
    changeInvariants: change.invariants,
    changedFiles: change.changedFiles,
    checklist,
    domainMapFiles,
  });

  const observedRisks = computeObservedRisks({
    change,
    decision,
    checklist,
    actionPlanStatus,
  });

  const recommendation = decisionToRecommendation(decision.decision);
  const generatedAt = new Date().toISOString();

  const markdown = buildMarkdown({
    change,
    checklist,
    decision,
    actionPlanStatus,
    entityReviews,
    observedRisks,
    recommendation,
    generatedAt,
  });

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, markdown, "utf8");

  console.log(`PR review gerado: ${OUTPUT_PATH}`);
  console.log(`Recomendação: ${recommendation} (Decision: ${decision.decision})`);
  console.log(`Risco: ${change.overallRisk} · Escopo: ${checklist.scope}`);
  console.log(`Entidades: ${entityReviews.length} · Arquivos: ${change.changedFiles.length}`);

  process.exitCode = 0;
}

main().catch((err) => {
  console.error("domain_pr_reviewer_error:", err instanceof Error ? err.message : err);
  process.exitCode = 0;
});
