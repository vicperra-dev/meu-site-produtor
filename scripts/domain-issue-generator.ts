/**
 * Domain Issue Generator — transforma findings do Guardian em issues estruturadas.
 *
 * Uso: node --experimental-strip-types scripts/domain-issue-generator.ts
 *
 * Entrada (somente leitura):
 *   reports/domain-guardian/latest.json
 *   reports/domain-guardian/advisor.md
 *   reports/domain-guardian/decision.md
 *   reports/domain-guardian/action-plan.md
 *   docs/ai/domain-map.md
 *   docs/ai/domain-invariants.md
 *   docs/ai/domain-risks.md
 *
 * Saída: reports/domain-guardian/issues.md
 *
 * Exit code: sempre 0 (nunca bloqueia pipeline).
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const LATEST_JSON_PATH = path.join(REPORTS_DIR, "latest.json");
const ADVISOR_PATH = path.join(REPORTS_DIR, "advisor.md");
const DECISION_PATH = path.join(REPORTS_DIR, "decision.md");
const ACTION_PLAN_PATH = path.join(REPORTS_DIR, "action-plan.md");
const DOMAIN_MAP_PATH = path.join(ROOT, "docs/ai/domain-map.md");
const DOMAIN_INVARIANTS_PATH = path.join(ROOT, "docs/ai/domain-invariants.md");
const DOMAIN_RISKS_PATH = path.join(ROOT, "docs/ai/domain-risks.md");
const OUTPUT_PATH = path.join(REPORTS_DIR, "issues.md");

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

type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type FindingSeverity = "ERROR" | "WARN" | "INFO";

type JsonCheckResult = {
  code: CheckCode;
  severity: string;
  scanned: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  findings: Array<{ id: string; severity: FindingSeverity; message: string }>;
};

type GuardianReport = {
  generatedAt: string;
  executionMs: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
    checks: number;
  };
  results: JsonCheckResult[];
};

type CheckMeta = {
  title: string;
  impacto: string;
  arquivosSuspeitos: string[];
  invariants: string[];
  passos: string[];
  criterioEncerramento: string;
  entidades: string[];
  baseSeverity: IssueSeverity;
  riskTier: 1 | 2 | 3 | 4 | null;
};

type AdvisorCheckInfo = {
  criticidade: string;
  impacto: string;
  arquivosSuspeitos: string[];
  acaoSugerida: string;
};

type GeneratedIssue = {
  id: string;
  checkCode: CheckCode;
  title: string;
  severity: IssueSeverity;
  description: string;
  occurrences: string[];
  files: string[];
  invariants: string[];
  correctionPlan: string[];
  closureCriteria: string;
  labels: string[];
  export: {
    github: { title: string; body: string; labels: string[] };
    jira: { summary: string; description: string; priority: string; labels: string[] };
    linear: { title: string; description: string; priority: number; labels: string[] };
  };
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

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const CHECK_META: Record<CheckCode, CheckMeta> = {
  F1: {
    title: "asaasId duplicado em Payment",
    impacto:
      "Dois ou mais pagamentos compartilham o mesmo asaasId. Risco de reconciliação financeira incorreta e efeitos de webhook no registro errado.",
    arquivosSuspeitos: [
      "src/app/api/webhooks/asaas/route.ts",
      "src/app/lib/process-payment-webhook.ts",
      "src/app/lib/asaas-agendamento-reconcile.ts",
    ],
    invariants: ["F1", "F2", "F3"],
    passos: [
      "Listar payments com asaasId duplicado",
      "Preservar Payment canônico e validar efeitos (appointment, cupons)",
      "Corrigir idempotência no webhook se race condition confirmada",
      "Reexecutar Guardian check F1",
    ],
    criterioEncerramento:
      "Um único Payment por asaasId; check F1 OK com 0 errors no Guardian.",
    entidades: ["Payment", "PaymentMetadata"],
    baseSeverity: "CRITICAL",
    riskTier: 1,
  },
  F4: {
    title: "Payment de agendamento aprovado sem Appointment válido",
    impacto:
      "Pagamento aprovado sem agendamento visível — cliente pagou e não vê sessão; reembolso sem alvo.",
    arquivosSuspeitos: [
      "src/app/lib/process-payment-webhook.ts",
      "src/app/api/webhooks/asaas/route.ts",
      "src/app/lib/asaas-agendamento-payment-effects.ts",
      "src/app/lib/asaas-agendamento-reconcile.ts",
    ],
    invariants: ["F4", "M3", "X3"],
    passos: [
      "Localizar Payment approved agendamento com appointmentId(s) inválido(s)",
      "Verificar PaymentMetadata e logs do webhook",
      "Reprocessar pagamento admin ou reconciliar ownership",
      "Confirmar visibilidade em Minha Conta",
    ],
    criterioEncerramento:
      "Todo Payment agendamento approved com Appointment resolvível; check F4 OK.",
    entidades: ["Payment", "PaymentMetadata", "Appointment"],
    baseSeverity: "CRITICAL",
    riskTier: 1,
  },
  A5: {
    title: "Appointment ativo sem Service vinculado",
    impacto:
      "Agendamento aceito/confirmado sem serviços — entrega operacional incompleta no admin.",
    arquivosSuspeitos: [
      "src/app/lib/asaas-agendamento-payment-effects.ts",
      "src/app/lib/asaas-agendamento-reconcile.ts",
      "src/app/api/admin/reprocessar-pagamento-teste/route.ts",
    ],
    invariants: ["A5", "A6"],
    passos: [
      "Listar appointments ativos sem Service (query A5)",
      "Verificar metadata de itens do checkout",
      "Backfill admin ou reprocessar pagamento",
      "Validar reconcileAppointmentWithServices",
    ],
    criterioEncerramento:
      "Cada Appointment ativo com cobrança real tem ≥1 Service; check A5 OK.",
    entidades: ["Appointment", "Service", "Payment"],
    baseSeverity: "HIGH",
    riskTier: 2,
  },
  A8: {
    title: "Conflito de horário entre agendamentos",
    impacto:
      "Double booking — dois agendamentos não cancelados no mesmo slot.",
    arquivosSuspeitos: [
      "src/app/api/asaas/checkout-agendamento/route.ts",
      "src/app/api/agendamentos/route.ts",
      "src/app/api/agendamentos/disponibilidade/route.ts",
    ],
    invariants: ["A8"],
    passos: [
      "Identificar pares sobrepostos (query A8)",
      "Cancelar ou remarcar um dos agendamentos",
      "Revisar validação de conflito no checkout",
      "Testar disponibilidade no slot liberado",
    ],
    criterioEncerramento:
      "Nenhuma sobreposição entre agendamentos não cancelados; check A8 OK.",
    entidades: ["Appointment"],
    baseSeverity: "HIGH",
    riskTier: 2,
  },
  C1: {
    title: "Coupon.code duplicado",
    impacto:
      "Códigos de cupom não únicos — resgate e auditoria podem afetar registro errado.",
    arquivosSuspeitos: [
      "src/app/lib/agendamento-payment-coupons.ts",
      "src/app/lib/plan-coupons.ts",
      "src/app/lib/simulation-coupon-codes.ts",
    ],
    invariants: ["C1"],
    passos: [
      "Listar códigos duplicados",
      "Renumerar cupom mais recente não consumido",
      "Investigar race na geração de código",
    ],
    criterioEncerramento: "Cada code único globalmente; check C1 OK.",
    entidades: ["Coupon"],
    baseSeverity: "CRITICAL",
    riskTier: 1,
  },
  C2: {
    title: "Cupom usado sem rastreabilidade",
    impacto:
      "Cupom used=true sem usedBy/appointmentId — ownership e auditoria comprometidos.",
    arquivosSuspeitos: [
      "src/app/lib/coupon-stale-appointment.ts",
      "src/app/api/meus-dados/route.ts",
      "src/app/lib/coupon-booking-rules.ts",
    ],
    invariants: ["C2", "X1"],
    passos: [
      "Listar cupons usados sem rastreio",
      "Reparar usedBy/appointmentId com base no fluxo",
      "Aplicar normalizeStaleCouponAppointmentLink se aplicável",
    ],
    criterioEncerramento:
      "Todo cupom used com rastreabilidade resolvível; check C2 OK.",
    entidades: ["Coupon", "Appointment"],
    baseSeverity: "HIGH",
    riskTier: 2,
  },
  P2: {
    title: "Plano ativo com cupons abaixo do esperado",
    impacto:
      "Cliente com plano ativo sem quantidade prevista de cupons de serviço.",
    arquivosSuspeitos: [
      "src/app/lib/asaas-plano-payment-effects.ts",
      "src/app/lib/plan-coupons.ts",
      "src/app/api/webhooks/asaas/route.ts",
    ],
    invariants: ["P2", "F5", "C4"],
    passos: [
      "Comparar contagem de cupons com catálogo do planId",
      "Localizar Payment plano na janela de criação",
      "Reprocessar pagamento plano ou gerar cupons faltantes",
    ],
    criterioEncerramento:
      "UserPlan ativo com cupons conforme catálogo; check P2 OK.",
    entidades: ["UserPlan", "Coupon", "Payment"],
    baseSeverity: "HIGH",
    riskTier: 2,
  },
  X1: {
    title: "Divergência de userId entre entidades relacionadas",
    impacto:
      "Payment, Appointment ou Coupon de usuários diferentes no mesmo fluxo — risco de vazamento entre contas.",
    arquivosSuspeitos: [
      "src/app/lib/coupon-account-ownership.ts",
      "src/app/lib/coupon-visibility.ts",
      "src/app/api/meus-dados/route.ts",
    ],
    invariants: ["X1", "A1", "C4"],
    passos: [
      "Identificar tríade com userId divergente",
      "Corrigir ownership no registro afetado",
      "Rastrear fluxo que criou o vínculo incorreto",
      "Validar Minha Conta antes de reexpor",
    ],
    criterioEncerramento:
      "Mesmo userId em todo o fluxo; check X1 OK.",
    entidades: ["Payment", "Appointment", "Coupon", "User"],
    baseSeverity: "CRITICAL",
    riskTier: 1,
  },
  X2: {
    title: "refundCouponId inconsistente com Appointment/Coupon",
    impacto:
      "Tríade de remarcação quebrada — reembolso/remarcação pode falhar.",
    arquivosSuspeitos: [
      "src/app/lib/appointment-refund-payment.ts",
      "src/app/api/agendamentos/escolher-reembolso/route.ts",
      "src/app/lib/coupon-refund.ts",
    ],
    invariants: ["X2", "C3", "A2"],
    passos: [
      "Listar refundCouponId órfãos ou com userId divergente",
      "Restaurar cupom ou limpar ponte com confirmação",
      "Evitar delete físico de cupom em trilha ativa",
    ],
    criterioEncerramento:
      "Appointment.refundCouponId → Coupon válido com mesmo userId; check X2 OK.",
    entidades: ["Appointment", "Coupon"],
    baseSeverity: "CRITICAL",
    riskTier: 1,
  },
  S1: {
    title: "Payment simbólico dependente de fallback amount=5",
    impacto:
      "Classificação de simulação via fallback legado — bloqueia remoção definitiva do amount=5.",
    arquivosSuspeitos: [
      "src/app/lib/symbolic-payment.ts",
      "src/app/lib/symbolic-payment-resolve.ts",
      "src/app/api/asaas/checkout-agendamento/route.ts",
    ],
    invariants: ["M1", "C7", "X5"],
    passos: [
      "Listar payments com dependsOnLegacyAmountFallback",
      "Backfill metadata simbólica",
      "Monitorar até S1 zerar em produção",
    ],
    criterioEncerramento:
      "S1 = 0; payments simbólicos classificados por metadata.",
    entidades: ["Payment", "PaymentMetadata"],
    baseSeverity: "MEDIUM",
    riskTier: 3,
  },
  S2: {
    title: "Cupom TESTE_* sem vínculo de simulação",
    impacto:
      "Cupom de simulação não aparece em Minha Conta nem é reconhecido no admin.",
    arquivosSuspeitos: [
      "src/app/lib/simulation-coupon-user-link.ts",
      "src/app/api/meus-dados/vincular-cupons-teste/route.ts",
      "src/app/lib/simulation-coupon.ts",
    ],
    invariants: ["C7", "X5"],
    passos: [
      "Listar TESTE_* sem assignedUserId/paymentId",
      "POST vincular-cupons-teste ou associar via admin",
      "Confirmar visibilidade em Minha Conta",
    ],
    criterioEncerramento: "Cupons TESTE_* vinculados explicitamente; check S2 OK.",
    entidades: ["Coupon", "User"],
    baseSeverity: "MEDIUM",
    riskTier: 3,
  },
  S3: {
    title: "Inconsistência metadata/amount em pagamento simbólico",
    impacto:
      "Payment simbólico com amount divergente da metadata — risco de classificação incorreta.",
    arquivosSuspeitos: [
      "src/app/lib/symbolic-payment.ts",
      "src/app/lib/plan-payment-simulation.ts",
      "src/app/api/admin/reprocessar-pagamento-teste/route.ts",
    ],
    invariants: ["M1", "C7", "X5"],
    passos: [
      "Cruzar Payment.amount com flags em PaymentMetadata",
      "Alinhar metadata e amount ao valor simbólico",
      "Eliminar dependência exclusiva de fallback",
    ],
    criterioEncerramento: "S3 zerado; metadata e amount coerentes.",
    entidades: ["Payment", "PaymentMetadata"],
    baseSeverity: "MEDIUM",
    riskTier: 3,
  },
  S4: {
    title: "Resíduo legado TESTE_AGEND_* / TESTE_PAY_*",
    impacto:
      "Cupons com prefixos legados — indicador de migração de simulação incompleta.",
    arquivosSuspeitos: [
      "src/app/lib/simulation-coupon-codes.ts",
      "src/app/lib/simulation-coupon-user-link.ts",
      "src/app/api/meus-dados/vincular-cupons-teste/route.ts",
    ],
    invariants: ["C7", "X5"],
    passos: [
      "Contar cupons com prefixos legados",
      "Vincular ou arquivar resíduos restantes",
      "Monitorar tendência até contagem zero",
    ],
    criterioEncerramento:
      "Contagem de prefixos legados = 0 ou vinculados; S4 sem WARN/ERROR.",
    entidades: ["Coupon"],
    baseSeverity: "LOW",
    riskTier: 4,
  },
};

async function readRequired(filePath: string, label: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    throw new Error(`${label} não encontrado: ${filePath}`);
  }
}

function formatDatePtBr(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function isActiveCheck(result: JsonCheckResult): boolean {
  return result.errorCount > 0 || result.warningCount > 0;
}

function parseAdvisorByCheck(content: string): Map<CheckCode, AdvisorCheckInfo> {
  const map = new Map<CheckCode, AdvisorCheckInfo>();

  for (const code of CHECK_ORDER) {
    const section = content.match(
      new RegExp(`## ${code} —[\\s\\S]*?(?=\\n## [A-Z]\\d|$)`)
    );
    if (!section) continue;

    const block = section[0];
    const criticidade =
      block.match(/\*\*Criticidade:\*\*\s*\r?\n\r?\n([^\n]+)/)?.[1]?.trim() ?? "";
    const impacto =
      block.match(/\*\*Impacto:\*\*\s*\r?\n\r?\n([\s\S]*?)(?=\r?\n\*\*Causa)/)?.[1]?.trim() ??
      "";
    const acaoSugerida =
      block.match(/\*\*Ação sugerida:\*\*\s*\r?\n\r?\n([\s\S]*?)(?=\r?\n---|$)/)?.[1]?.trim() ??
      "";

    const arquivos: string[] = [];
    const filesBlock = block.match(
      /\*\*Arquivos suspeitos:\*\*\s*\r?\n([\s\S]*?)(?=\r?\n\*\*Ação)/
    );
    if (filesBlock) {
      for (const line of filesBlock[1].split("\n")) {
        const m = line.match(/`([^`]+)`/);
        if (m) arquivos.push(m[1]);
      }
    }

    map.set(code, { criticidade, impacto, arquivosSuspeitos: arquivos, acaoSugerida });
  }

  return map;
}

function parseInvariantClassifications(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const m = line.match(/^\|\s*\*\*([A-Z]\d+)\*\*\s*\|[^|]+\|\s*([^|]+)\|/);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
}

function criticidadeToSeverity(criticidade: string): IssueSeverity | null {
  if (/CRÍTIC/i.test(criticidade)) return "CRITICAL";
  if (/ALTA/i.test(criticidade)) return "HIGH";
  if (/MÉDI/i.test(criticidade)) return "MEDIUM";
  if (/BAIXA/i.test(criticidade)) return "LOW";
  return null;
}

function maxSeverity(a: IssueSeverity, b: IssueSeverity): IssueSeverity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

function bumpForFinding(
  severity: IssueSeverity,
  result: JsonCheckResult
): IssueSeverity {
  let s = severity;
  if (result.errorCount > 0) {
    s = maxSeverity(s, "HIGH");
    if (result.findings.some((f) => f.severity === "ERROR")) {
      s = maxSeverity(s, "CRITICAL");
    }
  }
  if (result.warningCount > 0) {
    s = maxSeverity(s, "MEDIUM");
  }
  return s;
}

function bumpForInvariants(
  severity: IssueSeverity,
  invariants: string[],
  classifications: Map<string, string>
): IssueSeverity {
  let s = severity;
  for (const id of invariants) {
    const cls = classifications.get(id) ?? "";
    if (/CRÍTICO/i.test(cls)) s = maxSeverity(s, "CRITICAL");
    else if (/ALTO/i.test(cls)) s = maxSeverity(s, "HIGH");
    else if (/MÉDIO/i.test(cls)) s = maxSeverity(s, "MEDIUM");
  }
  return s;
}

function bumpForRiskTier(severity: IssueSeverity, tier: number | null): IssueSeverity {
  if (tier === 1) return maxSeverity(severity, "CRITICAL");
  if (tier === 2) return maxSeverity(severity, "HIGH");
  if (tier === 3) return maxSeverity(severity, "MEDIUM");
  return severity;
}

function resolveSeverity(
  code: CheckCode,
  result: JsonCheckResult,
  advisor: AdvisorCheckInfo | undefined,
  classifications: Map<string, string>
): IssueSeverity {
  const meta = CHECK_META[code];
  let severity = meta.baseSeverity;

  const fromAdvisor = advisor?.criticidade
    ? criticidadeToSeverity(advisor.criticidade)
    : null;
  if (fromAdvisor) severity = maxSeverity(severity, fromAdvisor);

  severity = bumpForInvariants(severity, meta.invariants, classifications);
  severity = bumpForRiskTier(severity, meta.riskTier);
  severity = bumpForFinding(severity, result);

  return severity;
}

function enrichFilesFromDomainMap(
  code: CheckCode,
  baseFiles: string[],
  advisorFiles: string[],
  domainMapRaw: string
): string[] {
  const set = new Set([...baseFiles, ...advisorFiles]);
  const entities = CHECK_META[code].entidades;

  for (const entity of entities) {
    const section = domainMapRaw.match(
      new RegExp(`## ${entity}[\\s\\S]*?(?=\\n## |$)`)
    );
    if (!section) continue;
    const filesMatch = section[0].match(
      /\*\*Arquivos principais:\*\*\s*\r?\n([\s\S]*?)(?=\r?\n\*\*|$)/
    );
    if (!filesMatch) continue;
    for (const line of filesMatch[1].split("\n")) {
      const m = line.match(/`([^`]+)`/);
      if (m) set.add(m[1]);
    }
  }

  return [...set].slice(0, 15);
}

function parseNextAudit(actionPlanRaw: string): string {
  const match = actionPlanRaw.match(
    /### Próxima auditoria recomendada\s*\r?\n\r?\n([\s\S]*?)(?=\r?\n###|\r?\n---|$)/
  );
  if (match) return match[1].trim();
  const alt = actionPlanRaw.match(
    /## Próxima auditoria recomendada\s*\r?\n\r?\n([\s\S]*?)(?=\r?\n---|$)/
  );
  return alt?.[1]?.trim() ?? "Semanal em produção; diária após deploy em áreas financeiras.";
}

function parseDecisionStatus(content: string): string {
  const m = content.match(
    /(?:🛑|⚠️|✅)\s*\*\*(APPROVED|REVIEW_REQUIRED|BLOCKED)\*\*/
  );
  return m?.[1] ?? "UNKNOWN";
}

function buildIssueBody(issue: GeneratedIssue): string {
  return [
    `## Domain Guardian — ${issue.checkCode}`,
    "",
    issue.description,
    "",
    "### Ocorrências",
    ...issue.occurrences.map((o) => `- ${o}`),
    "",
    "### Arquivos suspeitos",
    ...issue.files.map((f) => `- \`${f}\``),
    "",
    "### Invariantes",
    issue.invariants.join(", "),
    "",
    "### Plano de correção",
    ...issue.correctionPlan.map((s, i) => `${i + 1}. ${s}`),
    "",
    "### Critério de encerramento",
    issue.closureCriteria,
    "",
    "_Gerado por domain-issue-generator.ts — somente leitura._",
  ].join("\n");
}

function jiraPriority(severity: IssueSeverity): string {
  if (severity === "CRITICAL") return "Highest";
  if (severity === "HIGH") return "High";
  if (severity === "MEDIUM") return "Medium";
  return "Low";
}

function linearPriority(severity: IssueSeverity): number {
  if (severity === "CRITICAL") return 1;
  if (severity === "HIGH") return 2;
  if (severity === "MEDIUM") return 3;
  return 4;
}

function generateIssue(
  index: number,
  result: JsonCheckResult,
  advisorMap: Map<CheckCode, AdvisorCheckInfo>,
  classifications: Map<string, string>,
  domainMapRaw: string
): GeneratedIssue {
  const code = result.code;
  const meta = CHECK_META[code];
  const advisor = advisorMap.get(code);
  const severity = resolveSeverity(code, result, advisor, classifications);

  const occurrences =
    result.findings.length > 0
      ? result.findings.map((f) => `${f.severity}: ${f.message}`)
      : [`${result.severity} — ${result.errorCount} error(s), ${result.warningCount} warning(s)`];

  const files = enrichFilesFromDomainMap(
    code,
    meta.arquivosSuspeitos,
    advisor?.arquivosSuspeitos ?? [],
    domainMapRaw
  );

  const impacto = advisor?.impacto || meta.impacto;
  const passos = [
    ...meta.passos,
    ...(advisor?.acaoSugerida ? [advisor.acaoSugerida] : []),
  ];

  const title = `[Guardian ${code}] ${meta.title}`;
  const description = impacto;
  const labels = [
    "domain-guardian",
    `check-${code}`,
    `severity-${severity.toLowerCase()}`,
    ...meta.entidades.map((e) => `entity-${e.toLowerCase()}`),
  ];

  const body = buildIssueBody({
    id: `DG-${code}-${index}`,
    checkCode: code,
    title,
    severity,
    description,
    occurrences,
    files,
    invariants: meta.invariants,
    correctionPlan: passos,
    closureCriteria: meta.criterioEncerramento,
    labels,
    export: {
      github: { title: "", body: "", labels: [] },
      jira: { summary: "", description: "", priority: "", labels: [] },
      linear: { title: "", description: "", priority: 0, labels: [] },
    },
  });

  return {
    id: `DG-${code}-${String(index).padStart(3, "0")}`,
    checkCode: code,
    title,
    severity,
    description,
    occurrences,
    files,
    invariants: meta.invariants,
    correctionPlan: passos,
    closureCriteria: meta.criterioEncerramento,
    labels,
    export: {
      github: { title, body, labels },
      jira: {
        summary: title,
        description: body,
        priority: jiraPriority(severity),
        labels,
      },
      linear: {
        title,
        description: body,
        priority: linearPriority(severity),
        labels,
      },
    },
  };
}

function buildIssuesMarkdown(params: {
  report: GuardianReport;
  issues: GeneratedIssue[];
  decisionStatus: string;
  nextAudit: string;
  generatedAt: string;
}): string {
  const { report, issues, decisionStatus, nextAudit, generatedAt } = params;
  const guardianStatus =
    report.summary.errors > 0
      ? "CRITICAL"
      : report.summary.warnings > 0
        ? "WARNING"
        : "HEALTHY";

  const lines: string[] = [
    "# Domain Issues",
    "",
    `**Gerado em:** ${generatedAt}`,
    `**Guardian:** ${guardianStatus} (${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info)`,
    `**Decision Engine:** ${decisionStatus}`,
    `**Total de issues:** ${issues.length}`,
    "",
  ];

  if (issues.length === 0) {
    lines.push(
      "## Sistema saudável",
      "",
      "Nenhuma issue aberta pelo Domain Guardian.",
      "",
      "Guardian sem errors ou warnings nos checks F1–S4.",
      "",
      "### Próxima auditoria recomendada",
      "",
      nextAudit,
      "",
      "---",
      "",
      "## Export (integração futura)",
      "",
      "```json",
      JSON.stringify(
        {
          version: 1,
          generatedAt,
          provider: "local",
          issues: [],
        },
        null,
        2
      ),
      "```",
      "",
      "_Issue Generator somente leitura — nenhuma issue foi criada em GitHub/Jira/Linear._",
      "_Fontes: latest.json, advisor.md, decision.md, action-plan.md, domain-map.md, domain-invariants.md, domain-risks.md_"
    );
    return `${lines.join("\n")}\n`;
  }

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    lines.push(
      "---",
      "",
      `## Issue ${i + 1}`,
      "",
      "### Título",
      "",
      issue.title,
      "",
      "### Severidade",
      "",
      issue.severity,
      "",
      "### Descrição",
      "",
      issue.description,
      "",
      "### Ocorrências detectadas",
      ""
    );
    for (const occ of issue.occurrences) {
      lines.push(`- ${occ}`);
    }
    lines.push(
      "",
      "### Arquivos afetados",
      ""
    );
    for (const file of issue.files) {
      lines.push(`- \`${file}\``);
    }
    lines.push("", "### Invariantes", "", issue.invariants.join(", "), "");
    lines.push("### Plano de correção", "");
    issue.correctionPlan.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step}`);
    });
    lines.push("", "### Critério de encerramento", "", issue.closureCriteria, "");
  }

  lines.push(
    "---",
    "",
    "## Export (integração futura)",
    "",
    "Estrutura preparada para criação automática em GitHub Issues, Jira e Linear.",
    "",
    "```json",
    JSON.stringify(
      {
        version: 1,
        generatedAt,
        provider: "local",
        github: { enabled: false, repository: null },
        jira: { enabled: false, project: null },
        linear: { enabled: false, teamId: null },
        issues: issues.map((issue) => ({
          id: issue.id,
          checkCode: issue.checkCode,
          title: issue.title,
          severity: issue.severity,
          labels: issue.labels,
          invariants: issue.invariants,
          files: issue.files,
          occurrences: issue.occurrences,
          closureCriteria: issue.closureCriteria,
          export: issue.export,
        })),
      },
      null,
      2
    ),
    "```",
    "",
    "_Issue Generator somente leitura — nenhuma issue foi criada externamente nesta fase._",
    "_Fontes: latest.json, advisor.md, decision.md, action-plan.md, domain-map.md, domain-invariants.md, domain-risks.md_"
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const [
    latestRaw,
    advisorRaw,
    decisionRaw,
    actionPlanRaw,
    domainMapRaw,
    invariantsRaw,
    risksRaw,
  ] = await Promise.all([
    readRequired(LATEST_JSON_PATH, "latest.json"),
    readRequired(ADVISOR_PATH, "advisor.md"),
    readRequired(DECISION_PATH, "decision.md"),
    readRequired(ACTION_PLAN_PATH, "action-plan.md"),
    readRequired(DOMAIN_MAP_PATH, "domain-map.md"),
    readRequired(DOMAIN_INVARIANTS_PATH, "domain-invariants.md"),
    readRequired(DOMAIN_RISKS_PATH, "domain-risks.md"),
  ]);

  void risksRaw;

  const report = JSON.parse(latestRaw) as GuardianReport;
  const advisorMap = parseAdvisorByCheck(advisorRaw);
  const classifications = parseInvariantClassifications(invariantsRaw);
  const decisionStatus = parseDecisionStatus(decisionRaw);
  const nextAudit = parseNextAudit(actionPlanRaw);

  const activeResults = CHECK_ORDER.map(
    (code) => report.results.find((r) => r.code === code)!
  ).filter(isActiveCheck);

  const issues = activeResults.map((result, index) =>
    generateIssue(index + 1, result, advisorMap, classifications, domainMapRaw)
  );

  issues.sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );

  const generatedAt = new Date().toISOString();
  const markdown = buildIssuesMarkdown({
    report,
    issues,
    decisionStatus,
    nextAudit,
    generatedAt,
  });

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, markdown, "utf8");

  console.log(`Issues geradas: ${OUTPUT_PATH}`);
  console.log(`Guardian: ${report.summary.errors} errors, ${report.summary.warnings} warnings`);
  console.log(`Issues abertas: ${issues.length}`);
  console.log(`Decision: ${decisionStatus}`);

  if (issues.length === 0) {
    console.log("");
    console.log("Sistema saudável — nenhuma issue aberta pelo Domain Guardian.");
  } else {
    for (const issue of issues) {
      console.log(`  - [${issue.severity}] ${issue.title}`);
    }
  }

  process.exitCode = 0;
}

main().catch((err) => {
  console.error(
    "domain_issue_generator_error:",
    err instanceof Error ? err.message : err
  );
  process.exitCode = 0;
});
