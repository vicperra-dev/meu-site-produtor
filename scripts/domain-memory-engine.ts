/**
 * Domain Memory Engine — memória histórica arquitetural do domínio THouse.
 *
 * Uso: node --experimental-strip-types scripts/domain-memory-engine.ts
 *
 * Entrada (somente leitura):
 *   reports/domain-guardian/latest.json
 *   reports/domain-guardian/summary.md
 *   reports/domain-guardian/advisor.md
 *   reports/domain-guardian/decision.md
 *   reports/domain-guardian/action-plan.md
 *   reports/domain-guardian/issues.md
 *   reports/domain-guardian/pr-review.md
 *   reports/domain-guardian/change-analysis.md (opcional — enriquece arquivos/entidades)
 *   reports/domain-guardian/YYYY-MM-DD-HH-MM.json (histórico)
 *   reports/domain-guardian/memory.json (estado anterior — acumula decisões)
 *
 * Saída:
 *   reports/domain-guardian/memory.md
 *   reports/domain-guardian/memory.json
 *
 * Exit code: sempre 0.
 */

import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const MEMORY_MD_PATH = path.join(REPORTS_DIR, "memory.md");
const MEMORY_JSON_PATH = path.join(REPORTS_DIR, "memory.json");
const TIMESTAMPED_REPORT = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;

type CheckCode =
  | "F1"
  | "F4"
  | "A5"
  | "A8"
  | "C1"
  | "C2"
  | "P2"
  | "X1"
  | "X2"
  | "S1"
  | "S2"
  | "S3"
  | "S4";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Decision = "APPROVED" | "REVIEW_REQUIRED" | "BLOCKED";

type GuardianSnapshot = {
  source: string;
  generatedAt: string;
  executionMs: number;
  errors: number;
  warnings: number;
  info: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  activeChecks: CheckCode[];
  checkDetails: Record<
    CheckCode,
    { errors: number; warnings: number; info: number; hadFinding: boolean }
  >;
};

type DecisionSnapshot = {
  generatedAt: string;
  decision: Decision;
  risk: RiskLevel;
  branch: string;
  head: string;
  entities: string[];
  criticalInvariants: string[];
  prRecommendation: string;
};

type MemoryJson = {
  version: 1;
  lastUpdated: string;
  guardianRuns: GuardianSnapshot[];
  decisionHistory: DecisionSnapshot[];
  aggregates: {
    totalGuardianRuns: number;
    totalDecisionSnapshots: number;
    checks: Record<
      CheckCode,
      {
        runsWithFinding: number;
        totalErrors: number;
        totalWarnings: number;
        totalInfo: number;
        recurrenceRate: number;
      }
    >;
    entities: Record<string, { mentions: number }>;
    files: Record<string, { citations: number; maxRisk: RiskLevel }>;
    invariants: Record<string, { mentions: number; critical: boolean }>;
    decisions: Record<Decision, number>;
    averageRisk: number;
    averageRiskLabel: RiskLevel;
    guardianHealthRate: { healthy: number; warning: number; critical: number };
  };
  unstableAreas: string[];
  architecturalRecommendations: string[];
};

const CHECK_ORDER: CheckCode[] = [
  "F1",
  "F4",
  "A5",
  "A8",
  "C1",
  "C2",
  "P2",
  "X1",
  "X2",
  "S1",
  "S2",
  "S3",
  "S4",
];

const ENTITY_ORDER = [
  "Payment",
  "PaymentMetadata",
  "Appointment",
  "Coupon",
  "UserPlan",
  "Service",
  "User",
];

const RISK_SCORE: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const SCORE_TO_RISK: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const CRITICAL_INVARIANTS = new Set([
  "F1", "F2", "F3", "F6", "F8", "M1", "A1", "A2", "C1", "C4", "P3", "P5", "X1", "X2", "X4",
]);

const CHECK_TITLES: Record<CheckCode, string> = {
  F1: "asaasId duplicado em Payment",
  F4: "Payment agendamento sem Appointment",
  A5: "Appointment ativo sem Service",
  A8: "Conflito de horário",
  C1: "Coupon.code duplicado",
  C2: "Cupom usado sem rastreabilidade",
  P2: "Plano ativo com cupons insuficientes",
  X1: "Divergência de userId",
  X2: "refundCouponId inconsistente",
  S1: "Payment simbólico fallback amount=5",
  S2: "Cupom TESTE_* sem vínculo",
  S3: "Inconsistência metadata/amount simbólico",
  S4: "Resíduo legado TESTE_AGEND_/TESTE_PAY_",
};

const ENTITY_CHECK_MAP: Record<string, CheckCode[]> = {
  Payment: ["F1", "F4", "S1", "S3", "X1"],
  PaymentMetadata: ["S1", "S3"],
  Appointment: ["F4", "A5", "A8", "X2"],
  Coupon: ["C1", "C2", "S2", "S4", "X2"],
  UserPlan: ["P2"],
  Service: ["A5"],
  User: ["X1"],
};

async function readOptional(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readRequired(filePath: string, label: string): Promise<string> {
  const content = await readOptional(filePath);
  if (!content) throw new Error(`${label} não encontrado: ${filePath}`);
  return content;
}

function emptyCheckDetails(): GuardianSnapshot["checkDetails"] {
  const details = {} as GuardianSnapshot["checkDetails"];
  for (const code of CHECK_ORDER) {
    details[code] = { errors: 0, warnings: 0, info: 0, hadFinding: false };
  }
  return details;
}

function guardianStatus(errors: number, warnings: number): GuardianSnapshot["status"] {
  if (errors > 0) return "CRITICAL";
  if (warnings > 0) return "WARNING";
  return "HEALTHY";
}

function snapshotFromGuardianJson(
  raw: string,
  source: string
): GuardianSnapshot | null {
  try {
    const report = JSON.parse(raw) as {
      generatedAt: string;
      executionMs: number;
      summary: { errors: number; warnings: number; info: number };
      results: Array<{
        code: CheckCode;
        errorCount: number;
        warningCount: number;
        infoCount: number;
        findings: unknown[];
      }>;
    };

    const checkDetails = emptyCheckDetails();
    const activeChecks: CheckCode[] = [];

    for (const code of CHECK_ORDER) {
      const result = report.results.find((r) => r.code === code);
      if (!result) continue;

      const errorCount = result.errorCount ?? 0;
      const warningCount = result.warningCount ?? 0;
      const infoCount = result.infoCount ?? 0;
      const hadFinding =
        errorCount > 0 ||
        warningCount > 0 ||
        infoCount > 0 ||
        (result.findings?.length ?? 0) > 0;

      checkDetails[code] = {
        errors: errorCount,
        warnings: warningCount,
        info: infoCount,
        hadFinding,
      };
      if (hadFinding) activeChecks.push(code);
    }

    const infoTotal = report.summary.info ?? 0;

    return {
      source,
      generatedAt: report.generatedAt,
      executionMs: report.executionMs,
      errors: report.summary.errors ?? 0,
      warnings: report.summary.warnings ?? 0,
      info: infoTotal,
      status: guardianStatus(report.summary.errors, report.summary.warnings),
      activeChecks,
      checkDetails,
    };
  } catch {
    return null;
  }
}

async function loadAllGuardianSnapshots(): Promise<GuardianSnapshot[]> {
  const entries = await readdir(REPORTS_DIR);
  const jsonFiles = entries.filter(
    (name) => name === "latest.json" || TIMESTAMPED_REPORT.test(name)
  );

  const snapshots: GuardianSnapshot[] = [];
  const seen = new Set<string>();

  for (const file of jsonFiles) {
    const raw = await readOptional(path.join(REPORTS_DIR, file));
    if (!raw) continue;
    const snap = snapshotFromGuardianJson(raw, file);
    if (!snap || seen.has(snap.generatedAt)) continue;
    seen.add(snap.generatedAt);
    snapshots.push(snap);
  }

  return snapshots.sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
  );
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

function parseDecisionSnapshot(
  decisionRaw: string,
  prReviewRaw: string | null
): DecisionSnapshot {
  const generatedAt =
    decisionRaw.match(/\*\*Gerado em:\*\*\s*(.+)/)?.[1]?.trim() ??
    new Date().toISOString();
  const decisionMatch = decisionRaw.match(
    /(?:🛑|⚠️|✅)\s*\*\*(APPROVED|REVIEW_REQUIRED|BLOCKED)\*\*/
  );
  const decision = (decisionMatch?.[1] ?? "REVIEW_REQUIRED") as Decision;
  const risk =
    (decisionRaw.match(/\| Risco \(Change Analyzer\) \| (LOW|MEDIUM|HIGH|CRITICAL) \|/)?.[1] as RiskLevel) ??
    "MEDIUM";
  const branch = decisionRaw.match(/\*\*Branch:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const head = decisionRaw.match(/\*\*HEAD:\*\*\s*(.+)/)?.[1]?.trim() ?? "";

  const entities = parseBulletSection(decisionRaw, "**Entidades afetadas:**").filter(
    (e) => !e.startsWith("(")
  );

  const criticalInvariants: string[] = [];
  const criticalSection = decisionRaw.match(
    /\*\*Invariantes críticos tocados:\*\*\s*\r?\n\r?\n([\s\S]*?)(?=\r?\n---)/
  );
  if (criticalSection) {
    for (const line of criticalSection[1].split("\n")) {
      const m = line.match(/^- ([A-Z]\d+)$/);
      if (m) criticalInvariants.push(m[1]);
    }
  }

  let prRecommendation = "UNKNOWN";
  if (prReviewRaw) {
    const rec = prReviewRaw.match(
      /## Recomendação final\s*\r?\n\r?\n[🛑⚠️✅]*\s*(APPROVE|REQUEST_REVIEW|DO_NOT_MERGE)/
    );
    if (rec) prRecommendation = rec[1];
  }

  return {
    generatedAt,
    decision,
    risk,
    branch,
    head,
    entities,
    criticalInvariants,
    prRecommendation,
  };
}

function extractFileCitations(...contents: (string | null)[]): Map<string, RiskLevel> {
  const files = new Map<string, RiskLevel>();

  const add = (filePath: string, risk: RiskLevel = "LOW") => {
    const normalized = filePath.replace(/\\/g, "/");
    const existing = files.get(normalized);
    if (!existing || RISK_SCORE[risk] > RISK_SCORE[existing]) {
      files.set(normalized, risk);
    }
  };

  for (const content of contents) {
    if (!content) continue;

    for (const line of content.split("\n")) {
      const changeMatch = line.match(/^- `([^`]+)`\s*[—-]\s*[^,]+,\s*\*\*(LOW|MEDIUM|HIGH|CRITICAL)\*\*/);
      if (changeMatch) add(changeMatch[1], changeMatch[2] as RiskLevel);

      const changeMatch2 = line.match(/^- `([^`]+)`.*\b(LOW|MEDIUM|HIGH|CRITICAL)\b/);
      if (changeMatch2) add(changeMatch2[1], changeMatch2[2] as RiskLevel);

      const backtick = line.match(/`(src\/[^`]+)`/g);
      if (backtick) {
        for (const m of backtick) add(m.slice(1, -1));
      }

      const prisma = line.match(/`(prisma\/[^`]+)`/);
      if (prisma) add(prisma[1], "CRITICAL");

      const criticalLine = line.match(/^- (.+?) \((HIGH|CRITICAL)\)/);
      if (criticalLine && criticalLine[1].includes("/")) {
        add(criticalLine[1].replace(/^`|`$/g, ""), criticalLine[2] as RiskLevel);
      }
    }
  }

  return files;
}

function extractInvariantMentions(...contents: (string | null)[]): string[] {
  const ids = new Set<string>();
  for (const content of contents) {
    if (!content) continue;
    for (const token of content.match(/\b[A-Z]\d+\b/g) ?? []) {
      if (/^[FACPXMS]\d+$/.test(token)) ids.add(token);
    }
  }
  return [...ids].sort();
}

function mergeDecisionHistory(
  previous: DecisionSnapshot[],
  current: DecisionSnapshot
): DecisionSnapshot[] {
  const filtered = previous.filter((d) => d.generatedAt !== current.generatedAt);
  return [...filtered, current].sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
  );
}

function computeAggregates(params: {
  guardianRuns: GuardianSnapshot[];
  decisionHistory: DecisionSnapshot[];
  fileCitations: Map<string, RiskLevel>;
  invariantIds: string[];
}): MemoryJson["aggregates"] {
  const { guardianRuns, decisionHistory, fileCitations, invariantIds } = params;
  const totalRuns = guardianRuns.length || 1;

  const checks = {} as MemoryJson["aggregates"]["checks"];
  for (const code of CHECK_ORDER) {
    let runsWithFinding = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfo = 0;

    for (const run of guardianRuns) {
      const detail = run.checkDetails[code];
      if (detail.hadFinding) runsWithFinding++;
      totalErrors += detail.errors;
      totalWarnings += detail.warnings;
      totalInfo += detail.info;
    }

    checks[code] = {
      runsWithFinding,
      totalErrors,
      totalWarnings,
      totalInfo,
      recurrenceRate: Math.round((runsWithFinding / totalRuns) * 1000) / 1000,
    };
  }

  const entities: Record<string, { mentions: number }> = {};
  for (const entity of ENTITY_ORDER) entities[entity] = { mentions: 0 };

  for (const snap of decisionHistory) {
    for (const entity of snap.entities) {
      if (entities[entity]) entities[entity].mentions++;
      else entities[entity] = { mentions: 1 };
    }
  }

  for (const run of guardianRuns) {
    for (const code of run.activeChecks) {
      for (const [entity, codes] of Object.entries(ENTITY_CHECK_MAP)) {
        if (codes.includes(code)) {
          entities[entity] = { mentions: (entities[entity]?.mentions ?? 0) + 1 };
        }
      }
    }
  }

  const files: Record<string, { citations: number; maxRisk: RiskLevel }> = {};
  for (const [filePath, risk] of fileCitations) {
    files[filePath] = {
      citations: (files[filePath]?.citations ?? 0) + 1,
      maxRisk: files[filePath]
        ? RISK_SCORE[risk] > RISK_SCORE[files[filePath].maxRisk]
          ? risk
          : files[filePath].maxRisk
        : risk,
    };
  }

  const invariants: Record<string, { mentions: number; critical: boolean }> = {};
  for (const id of invariantIds) {
    invariants[id] = {
      mentions: (invariants[id]?.mentions ?? 0) + 1,
      critical: CRITICAL_INVARIANTS.has(id),
    };
  }
  for (const snap of decisionHistory) {
    for (const id of snap.criticalInvariants) {
      invariants[id] = {
        mentions: (invariants[id]?.mentions ?? 0) + 1,
        critical: true,
      };
    }
  }

  const decisions: Record<Decision, number> = {
    APPROVED: 0,
    REVIEW_REQUIRED: 0,
    BLOCKED: 0,
  };
  for (const snap of decisionHistory) {
    decisions[snap.decision]++;
  }

  const riskScores = decisionHistory.map((d) => RISK_SCORE[d.risk]);
  const averageRisk =
    riskScores.length > 0
      ? Math.round((riskScores.reduce((a, b) => a + b, 0) / riskScores.length) * 100) / 100
      : 0;
  const averageRiskLabel =
    SCORE_TO_RISK[Math.min(3, Math.max(0, Math.round(averageRisk) - 1))] ?? "LOW";

  const guardianHealthRate = { healthy: 0, warning: 0, critical: 0 };
  for (const run of guardianRuns) {
    guardianHealthRate[run.status.toLowerCase() as keyof typeof guardianHealthRate]++;
  }

  return {
    totalGuardianRuns: guardianRuns.length,
    totalDecisionSnapshots: decisionHistory.length,
    checks,
    entities,
    files,
    invariants,
    decisions,
    averageRisk,
    averageRiskLabel,
    guardianHealthRate,
  };
}

function buildUnstableAreas(aggregates: MemoryJson["aggregates"]): string[] {
  const areas: string[] = [];

  const topChecks = CHECK_ORDER.filter((c) => aggregates.checks[c].runsWithFinding > 0)
    .sort(
      (a, b) =>
        aggregates.checks[b].runsWithFinding - aggregates.checks[a].runsWithFinding
    )
    .slice(0, 5);

  for (const code of topChecks) {
    const stat = aggregates.checks[code];
    areas.push(
      `Check **${code}** (${CHECK_TITLES[code]}): finding em ${stat.runsWithFinding}/${aggregates.totalGuardianRuns} execuções (${Math.round(stat.recurrenceRate * 100)}%)`
    );
  }

  const topEntities = ENTITY_ORDER.filter((e) => (aggregates.entities[e]?.mentions ?? 0) > 0)
    .sort((a, b) => aggregates.entities[b].mentions - aggregates.entities[a].mentions)
    .slice(0, 3);

  for (const entity of topEntities) {
    areas.push(
      `Entidade **${entity}**: ${aggregates.entities[entity].mentions} menção(ões) em decisões/checks`
    );
  }

  if (aggregates.decisions.BLOCKED > 0) {
    areas.push(
      `Decision Engine **BLOCKED** em ${aggregates.decisions.BLOCKED}/${aggregates.totalDecisionSnapshots} snapshot(s)`
    );
  }

  const topFiles = Object.entries(aggregates.files)
    .sort((a, b) => b[1].citations - a[1].citations)
    .slice(0, 3);

  for (const [file, stat] of topFiles) {
    if (stat.maxRisk === "HIGH" || stat.maxRisk === "CRITICAL") {
      areas.push(`Arquivo sensível: \`${file}\` (${stat.citations} citação(ões), risco ${stat.maxRisk})`);
    }
  }

  if (areas.length === 0) {
    areas.push("Nenhuma área instável detectada no histórico disponível — Guardian estável.");
  }

  return areas;
}

function buildRecommendations(
  aggregates: MemoryJson["aggregates"],
  guardianRuns: GuardianSnapshot[]
): string[] {
  const recs: string[] = [];

  if (aggregates.checks.S4.runsWithFinding > 0 && aggregates.checks.S4.totalInfo > 0) {
    recs.push(
      "Finalizar migração de simulação (S4): vincular ou eliminar cupons legados TESTE_AGEND_/TESTE_PAY_ antes de remover helpers @legacy."
    );
  }

  if (aggregates.checks.S1.runsWithFinding > 0 || aggregates.checks.S3.runsWithFinding > 0) {
    recs.push(
      "Priorizar backfill de metadata simbólica (A1-final): zerar S1/S3 antes de remover dependsOnLegacyAmountFallback."
    );
  }

  if (aggregates.decisions.BLOCKED / Math.max(aggregates.totalDecisionSnapshots, 1) > 0.5) {
    recs.push(
      "Alta frequência de BLOCKED: adotar PRs menores (split-to-prs) e rodar change-analyzer antes de abrir PR."
    );
  }

  if ((aggregates.entities.Payment?.mentions ?? 0) >= 2) {
    recs.push(
      "Payment é entidade recorrente: manter idempotência webhook (F1/F3) e vínculo appointment (F4) em toda revisão."
    );
  }

  if ((aggregates.entities.Appointment?.mentions ?? 0) >= 2) {
    recs.push(
      "Appointment instável no histórico: revisar conflito de horário (A8) e trilha de reembolso (A2/X2) em mudanças de schema."
    );
  }

  const lastRun = guardianRuns[guardianRuns.length - 1];
  if (lastRun && lastRun.status === "HEALTHY" && aggregates.averageRiskLabel === "CRITICAL") {
    recs.push(
      "Divergência banco saudável vs diff CRITICAL: separar gate de dados (Guardian) do gate de merge (Decision Engine)."
    );
  }

  if (recs.length === 0) {
    recs.push("Manter auditoria semanal do Guardian e documentação em docs/ai/ atualizada.");
    recs.push("Integrar memory.json ao Advisor para priorizar playbooks de checks recorrentes.");
  }

  return recs;
}

function sortByCount<T extends string>(
  record: Record<T, { mentions?: number; citations?: number; runsWithFinding?: number }>,
  field: "mentions" | "citations" | "runsWithFinding"
): Array<[T, number]> {
  return (Object.entries(record) as Array<[T, (typeof record)[T]]>)
    .map(([key, val]) => [key, (val as Record<string, number>)[field] ?? 0] as [T, number])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
}

function buildMemoryMarkdown(memory: MemoryJson): string {
  const { aggregates, guardianRuns, decisionHistory } = memory;

  const lines: string[] = [
    "# Domain Memory",
    "",
    `**Última atualização:** ${memory.lastUpdated}`,
    `**Execuções Guardian no histórico:** ${aggregates.totalGuardianRuns}`,
    `**Snapshots de decisão:** ${aggregates.totalDecisionSnapshots}`,
    "",
    "## Resumo histórico",
    "",
    `| Métrica | Valor |`,
    `|--------|-------|`,
    `| Risco médio histórico | ${aggregates.averageRisk} (${aggregates.averageRiskLabel}) |`,
    `| Guardian HEALTHY | ${aggregates.guardianHealthRate.healthy} execução(ões) |`,
    `| Guardian WARNING | ${aggregates.guardianHealthRate.warning} execução(ões) |`,
    `| Guardian CRITICAL | ${aggregates.guardianHealthRate.critical} execução(ões) |`,
    `| APPROVED | ${aggregates.decisions.APPROVED} |`,
    `| REVIEW_REQUIRED | ${aggregates.decisions.REVIEW_REQUIRED} |`,
    `| BLOCKED | ${aggregates.decisions.BLOCKED} |`,
    "",
    "## Checks mais recorrentes",
    "",
  ];

  const checkRanking = CHECK_ORDER.map((code) => [
    code,
    aggregates.checks[code].runsWithFinding,
    aggregates.checks[code].recurrenceRate,
  ] as const)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (checkRanking.length === 0) {
    lines.push("_Nenhum check com finding no histórico — todos OK nas execuções registradas._");
  } else {
    for (const [code, count, rate] of checkRanking) {
      const stat = aggregates.checks[code];
      lines.push(
        `- **${code}** — ${CHECK_TITLES[code]}: ${count}/${aggregates.totalGuardianRuns} execuções (${Math.round(rate * 100)}%) · ${stat.totalErrors}E / ${stat.totalWarnings}W / ${stat.totalInfo}I`
      );
    }
  }

  lines.push("", "## Entidades mais impactadas", "");
  const entityRanking = sortByCount(aggregates.entities, "mentions");
  if (entityRanking.length === 0) {
    lines.push("- (sem dados de entidade no histórico)");
  } else {
    for (const [entity, count] of entityRanking) {
      lines.push(`- **${entity}**: ${count} menção(ões)`);
    }
  }

  lines.push("", "## Arquivos mais sensíveis", "");
  const fileRanking = Object.entries(aggregates.files)
    .sort((a, b) => {
      const riskDiff = RISK_SCORE[b[1].maxRisk] - RISK_SCORE[a[1].maxRisk];
      return riskDiff !== 0 ? riskDiff : b[1].citations - a[1].citations;
    })
    .slice(0, 20);

  if (fileRanking.length === 0) {
    lines.push("- (nenhum arquivo citado nos relatórios atuais)");
  } else {
    for (const [file, stat] of fileRanking) {
      lines.push(`- \`${file}\` — ${stat.citations} citação(ões), risco máx. **${stat.maxRisk}**`);
    }
  }

  lines.push("", "## Invariantes mais afetados", "");
  const invRanking = Object.entries(aggregates.invariants)
    .sort((a, b) => b[1].mentions - a[1].mentions)
    .slice(0, 20);

  if (invRanking.length === 0) {
    lines.push("- (nenhum invariante registrado)");
  } else {
    for (const [id, stat] of invRanking) {
      lines.push(
        `- **${id}** — ${stat.mentions} menção(ões)${stat.critical ? " · CRÍTICO" : ""}`
      );
    }
  }

  lines.push("", "## Histórico de decisões", "");
  if (decisionHistory.length === 0) {
    lines.push("- (nenhum snapshot)");
  } else {
    for (const snap of decisionHistory) {
      lines.push(
        `- ${snap.generatedAt} — **${snap.decision}** (risco ${snap.risk}) · ${snap.branch}@${snap.head} · PR: ${snap.prRecommendation}`
      );
    }
  }

  lines.push("", "## Histórico Guardian (execuções)", "");
  for (const run of guardianRuns) {
    lines.push(
      `- ${run.generatedAt} — ${run.status} (${run.errors}E/${run.warnings}W/${run.info}I) · ${run.source}${run.activeChecks.length ? ` · checks: ${run.activeChecks.join(", ")}` : ""}`
    );
  }

  lines.push("", "## Áreas mais instáveis", "");
  for (const area of memory.unstableAreas) {
    lines.push(`- ${area}`);
  }

  lines.push("", "## Recomendações arquiteturais", "");
  for (const rec of memory.architecturalRecommendations) {
    lines.push(`- ${rec}`);
  }

  lines.push(
    "",
    "---",
    "",
    "_Memória somente leitura — nenhuma correção ou issue foi criada._",
    "_Consumir `memory.json` para integração programática com Advisor, Decision Engine e Planner._"
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const [
    decisionRaw,
    prReviewRaw,
    advisorRaw,
    actionPlanRaw,
    issuesRaw,
    summaryRaw,
    changeAnalysisRaw,
    previousMemoryRaw,
  ] = await Promise.all([
    readRequired(path.join(REPORTS_DIR, "decision.md"), "decision.md"),
    readOptional(path.join(REPORTS_DIR, "pr-review.md")),
    readRequired(path.join(REPORTS_DIR, "advisor.md"), "advisor.md"),
    readRequired(path.join(REPORTS_DIR, "action-plan.md"), "action-plan.md"),
    readRequired(path.join(REPORTS_DIR, "issues.md"), "issues.md"),
    readRequired(path.join(REPORTS_DIR, "summary.md"), "summary.md"),
    readOptional(path.join(REPORTS_DIR, "change-analysis.md")),
    readOptional(MEMORY_JSON_PATH),
  ]);

  void actionPlanRaw;
  void issuesRaw;
  void summaryRaw;

  const guardianRuns = await loadAllGuardianSnapshots();

  const currentDecision = parseDecisionSnapshot(decisionRaw, prReviewRaw);
  let decisionHistory: DecisionSnapshot[] = [currentDecision];

  if (previousMemoryRaw) {
    try {
      const prev = JSON.parse(previousMemoryRaw) as MemoryJson;
      if (Array.isArray(prev.decisionHistory)) {
        decisionHistory = mergeDecisionHistory(prev.decisionHistory, currentDecision);
      }
    } catch {
      // ignora memory.json inválido
    }
  }

  const fileCitations = extractFileCitations(
    decisionRaw,
    prReviewRaw,
    advisorRaw,
    changeAnalysisRaw
  );

  const invariantIds = extractInvariantMentions(
    decisionRaw,
    prReviewRaw,
    changeAnalysisRaw
  );

  const aggregates = computeAggregates({
    guardianRuns,
    decisionHistory,
    fileCitations,
    invariantIds,
  });

  const unstableAreas = buildUnstableAreas(aggregates);
  const architecturalRecommendations = buildRecommendations(aggregates, guardianRuns);

  const memory: MemoryJson = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    guardianRuns,
    decisionHistory,
    aggregates,
    unstableAreas,
    architecturalRecommendations,
  };

  const markdown = buildMemoryMarkdown(memory);

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(MEMORY_MD_PATH, markdown, "utf8");
  await writeFile(MEMORY_JSON_PATH, `${JSON.stringify(memory, null, 2)}\n`, "utf8");

  console.log(`Memory gerada: ${MEMORY_MD_PATH}`);
  console.log(`JSON: ${MEMORY_JSON_PATH}`);
  console.log(`Guardian runs: ${guardianRuns.length}`);
  console.log(`Decision snapshots: ${decisionHistory.length}`);
  console.log(`Risco médio: ${aggregates.averageRisk} (${aggregates.averageRiskLabel})`);
  console.log(
    `Decisões: APPROVED=${aggregates.decisions.APPROVED} REVIEW=${aggregates.decisions.REVIEW_REQUIRED} BLOCKED=${aggregates.decisions.BLOCKED}`
  );

  const topCheck = CHECK_ORDER.map((c) => [c, aggregates.checks[c].runsWithFinding] as const)
    .sort((a, b) => b[1] - a[1])[0];
  if (topCheck && topCheck[1] > 0) {
    console.log(`Check mais recorrente: ${topCheck[0]} (${topCheck[1]} execuções)`);
  }

  process.exitCode = 0;
}

main().catch((err) => {
  console.error("domain_memory_engine_error:", err instanceof Error ? err.message : err);
  process.exitCode = 0;
});
