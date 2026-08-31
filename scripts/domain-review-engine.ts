/**
 * Domain Review Engine — checklist de testes e regressão a partir do Change Analyzer.
 *
 * Uso: node --experimental-strip-types scripts/domain-review-engine.ts
 *
 * Entrada:
 *   reports/domain-guardian/change-analysis.md
 *   docs/ai/domain-map.md
 *   docs/ai/domain-dependencies.md
 *
 * Saída: reports/domain-guardian/review-checklist.md
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const CHANGE_ANALYSIS_PATH = path.join(REPORTS_DIR, "change-analysis.md");
const DOMAIN_MAP_PATH = path.join(ROOT, "docs/ai/domain-map.md");
const DOMAIN_DEPENDENCIES_PATH = path.join(ROOT, "docs/ai/domain-dependencies.md");
const OUTPUT_PATH = path.join(REPORTS_DIR, "review-checklist.md");

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ReviewScope = "SMOKE" | "NORMAL" | "FULL";

type EntityPlaybook = {
  mandatory: string[];
  recommended: string[];
  extended: string[];
  regressionAreas: string[];
  invariants: string[];
  guardianChecks: string[];
};

type EntityProfile = {
  name: string;
  flows: string[];
  invariants: string[];
  guardianChecks: string[];
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
  highRiskFiles: string[];
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

const ENTITY_PLAYBOOK: Record<string, EntityPlaybook> = {
  Payment: {
    mandatory: [
      "Webhook PAYMENT_RECEIVED cria Payment approved com asaasId único (F1/F3)",
      "Pagamento agendamento aprovado vincula appointmentId ou appointmentIds (F4)",
      "Pagamento plano aprovado materializa UserPlan na janela esperada (F5)",
      "Classificação simbólico vs real por metadata (symbolicAgendamento/symbolicPlano)",
      "Idempotência: segundo webhook para mesmo asaasId não duplica Payment",
    ],
    recommended: [
      "Webhook PAYMENT_REFUNDED sincroniza refundAsaasStatus nas entidades corretas (F7)",
      "Reembolso outbound resolve Payment.asaasId correto (F6)",
      "Admin delete bloqueado para Payment approved real (F8)",
      "Reprocessamento admin (agendamento/plano teste)",
      "Listagem em Minha Conta e Admin Pagamentos",
    ],
    extended: [
      "Carrinho multi-appointment: appointmentIds ⊆ appointments criados (X3)",
      "Reconcile pós-webhook (`asaas-agendamento-reconcile`)",
      "Pagamento simbólico sem fallback amount=5 (S1/S3 zerados)",
      "Domain Guardian: F1, F4, S1, S3",
    ],
    regressionAreas: [
      "Webhook Asaas",
      "Minha Conta — pagamentos",
      "Admin Pagamentos",
      "Checkout agendamento/plano",
      "Reembolso outbound/inbound",
    ],
    invariants: ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "X1", "X3", "X5"],
    guardianChecks: ["F1", "F4", "S1", "S3"],
  },
  PaymentMetadata: {
    mandatory: [
      "Checkout cria PaymentMetadata antes do POST Asaas (M1)",
      "asaasId preenchido após sucesso do checkout (M2)",
      "Webhook resolve metadata válida (expiresAt não expirado — M3)",
      "Flags simbólicas presentes quando checkout de teste",
    ],
    recommended: [
      "Metadata expirada: webhook falha de forma controlada",
      "Reprocessamento admin grava metadata coerente",
      "externalReference limitado a userId",
    ],
    extended: [
      "Backfill metadata em payments históricos (migração A1)",
      "Domain Guardian: S1, S3",
    ],
    regressionAreas: [
      "Checkout agendamento",
      "Checkout plano",
      "Webhook (resolução de itens)",
      "Reprocessamento admin",
    ],
    invariants: ["M1", "M2", "M3", "M4"],
    guardianChecks: ["S1", "S3"],
  },
  Appointment: {
    mandatory: [
      "Criação pós-pagamento com userId correto (A1)",
      "Agendamento visível em Minha Conta após pagamento",
      "Cancelamento com opção reembolso ou cupom (A3)",
      "Conflito de horário bloqueado no checkout (A8)",
      "Reembolso direto exige Payment approved vinculado (A2)",
    ],
    recommended: [
      "Ocultar agendamento (`userHiddenAt`) não altera status financeiro (A7)",
      "Sync status com Service (`reconcileAppointmentWithServices`)",
      "Aceite/recusa admin",
      "Remarcação via cupom de reembolso",
    ],
    extended: [
      "Carrinho com múltiplos appointments",
      "Restaurar visibilidade reembolso pendente",
      "Domain Guardian: F4, A5, A8, X2",
    ],
    regressionAreas: [
      "Minha Conta — agendamentos",
      "Admin Agendamentos",
      "Agenda / checkout",
      "Reembolso e remarcação",
    ],
    invariants: ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "F4", "X1", "X2", "X3"],
    guardianChecks: ["F4", "A5", "A8", "X1", "X2"],
  },
  Coupon: {
    mandatory: [
      "Criar cupom (geração pós-pagamento / plano)",
      "Resgatar cupom no checkout ou agendamento com cupom",
      "Reembolso direto de cupom avulso",
      "Remarcação via cupom de reembolso (refundCouponId)",
      "Cupom ocultado pelo usuário (`userRemovedAt`) some de Minha Conta",
    ],
    recommended: [
      "Código único global (C1) — sem colisão",
      "Cupom usado com rastreabilidade usedBy/appointmentId (C2)",
      "Cupom de plano bloqueado quando plano cancelado/reembolso (C5)",
      "Vinculação simulação (`vincular-cupons-teste`, assignedUserId)",
      "Liberação admin só para cupons de simulação",
    ],
    extended: [
      "Cupons TESTE_* sem vínculo (S2)",
      "Legado TESTE_AGEND_/TESTE_PAY_ (S4)",
      "Stale link repair (`coupon-stale-appointment`)",
      "Domain Guardian: C1, C2, S2, S4",
    ],
    regressionAreas: [
      "Minha Conta — cupons",
      "Reembolso",
      "Admin Cupons",
      "Checkout com cupom",
      "Simulação / TESTE_*",
    ],
    invariants: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "X1", "X2", "X5"],
    guardianChecks: ["C1", "C2", "S2", "S4"],
  },
  UserPlan: {
    mandatory: [
      "Criação de plano pós-pagamento approved",
      "Geração inicial de cupons conforme catálogo do plano (P2)",
      "Plano ativo visível em Minha Conta",
      "Solicitar reembolso bloqueia cupons não usados (P3)",
    ],
    recommended: [
      "Inativação admin (`adminInactiveAt`) bloqueia cupons (P4)",
      "Ocultar plano (`userHiddenAt`) na Minha Conta",
      "Cancelamento de assinatura Asaas coerente (P6)",
      "Delete físico bloqueado com histórico (P5)",
    ],
    extended: [
      "Reembolso proporcional por cupons não usados",
      "Plano teste / simbólico",
      "Domain Guardian: P2",
    ],
    regressionAreas: [
      "Minha Conta — planos",
      "Admin Planos",
      "Checkout plano",
      "Reembolso de plano",
    ],
    invariants: ["P1", "P2", "P3", "P4", "P5", "P6", "F5", "C4", "C5", "X1"],
    guardianChecks: ["P2"],
  },
  Service: {
    mandatory: [
      "Criação de Service por item pós-checkout agendamento",
      "Vínculo Service.appointmentId correto",
      "Agendamento ativo com ≥1 Service quando cobrança real (A5)",
    ],
    recommended: [
      "Sync status Appointment ↔ Service",
      "Conclusão com entrega de áudio",
      "Aceite/recusa de serviço no admin",
    ],
    extended: [
      "Backfill admin de serviços faltantes",
      "Domain Guardian: A5",
    ],
    regressionAreas: [
      "Admin Serviços",
      "Minha Conta — agendamentos vinculados",
      "Entrega de áudio",
    ],
    invariants: ["A5", "A6"],
    guardianChecks: ["A5"],
  },
  User: {
    mandatory: [
      "Login e sessão autenticada",
      "Ownership: Payment/Appointment/Coupon do mesmo userId no fluxo (X1)",
      "Minha Conta agrega entidades do usuário logado",
    ],
    recommended: [
      "Associação manual de cupom (`assignedUserId`) pelo admin",
      "Exclusão de conta (cascade — verificar impacto em histórico)",
      "Bloqueio de usuário (`blocked`)",
      "Simulação admin (`canUseSymbolicSimulation`)",
    ],
    extended: [
      "Cross-entity ownership divergente (Guardian X1)",
      "LGPD / AccountDeletionLog",
    ],
    regressionAreas: [
      "Autenticação",
      "Minha Conta",
      "Ownership cross-entity",
      "Admin Usuários",
    ],
    invariants: ["A1", "C4", "X1", "X4"],
    guardianChecks: ["X1"],
  },
};

const TRIAGE_SYMPTOMS: Array<{ symptom: string; entities: string[]; flows: string[] }> = [
  {
    symptom: "Paguei e não vejo agendamento",
    entities: ["Payment", "PaymentMetadata", "Appointment"],
    flows: ["Checkout agendamento", "Webhook"],
  },
  {
    symptom: "Plano sem cupons",
    entities: ["Payment", "UserPlan", "Coupon"],
    flows: ["Checkout plano", "Webhook"],
  },
  {
    symptom: "Cupom de remarcação sumiu",
    entities: ["Appointment", "Coupon"],
    flows: ["Remarcação"],
  },
  {
    symptom: "Cupom teste não aparece",
    entities: ["Coupon", "Payment", "User"],
    flows: ["Simulação", "Minha Conta"],
  },
  {
    symptom: "Reembolso não atualizou",
    entities: ["Payment", "Appointment", "Coupon", "UserPlan"],
    flows: ["Reembolso"],
  },
  {
    symptom: "Dois clientes no mesmo horário",
    entities: ["Appointment"],
    flows: ["Checkout", "Conflito de horário"],
  },
];

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

function parseChangeAnalysis(content: string): ChangeAnalysisSummary {
  const overallRisk =
    (content.match(/\*\*Risco geral:\*\*\s*(LOW|MEDIUM|HIGH|CRITICAL)/)?.[1] as RiskLevel) ??
    "LOW";
  const branch = content.match(/\*\*Branch:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const head = content.match(/\*\*HEAD:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const commitMessage = content.match(/\*\*Mensagem:\*\*\s*(.+)/)?.[1]?.trim() ?? "";

  const entities = parseBulletSection(content, "**Entidades impactadas:**").filter((e) =>
    ENTITY_ORDER.includes(e as (typeof ENTITY_ORDER)[number])
  );
  const flows = parseBulletSection(content, "**Fluxos impactados:**");
  const invariants = parseBulletSection(content, "**Invariantes impactados:**");
  const guardianChecks = parseBulletSection(content, "**Checks Guardian relacionados:**");

  const highRiskFiles: string[] = [];
  const fileLines = parseBulletSection(content, "**Arquivos alterados:**");
  for (const line of fileLines) {
    const match = line.match(/^`([^`]+)`.*\b(HIGH|CRITICAL)\b/);
    if (match) highRiskFiles.push(match[1]);
  }

  return {
    branch,
    head,
    commitMessage,
    overallRisk,
    entities: entities.length > 0 ? entities : [...ENTITY_ORDER],
    flows,
    invariants,
    guardianChecks,
    highRiskFiles,
  };
}

function parseListSection(section: string, label: string): string[] {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\*\\*|\\r?\\n---|\\r?\\n## |$)`);
  const match = section.match(regex);
  if (!match) return [];

  const items: string[] = [];
  for (const line of match[1].split(/\r?\n/)) {
    const bullet = line.match(/^- (.+)$/);
    if (bullet) items.push(bullet[1].trim().replace(/^`(.+)`$/, "$1"));
  }
  return items;
}

function parseInvariantTokens(raw: string): string[] {
  const tokens = new Set<string>();
  for (const range of raw.match(/[A-Z]\d+(?:\s*[–-]\s*[A-Z]\d+)?/g) ?? []) {
    const span = range.match(/^([A-Z])(\d+)\s*[–-]\s*\1(\d+)$/);
    if (span) {
      for (let i = Number(span[2]); i <= Number(span[3]); i++) tokens.add(`${span[1]}${i}`);
      continue;
    }
    if (/^[A-Z]\d+$/.test(range)) tokens.add(range);
  }
  return [...tokens];
}

function parseDomainMap(content: string): Map<string, EntityProfile> {
  const map = new Map<string, EntityProfile>();
  const sections = content.split(/^## /m).slice(1);

  for (const block of sections) {
    const nameMatch = block.match(/^([A-Za-z]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (name === "Matriz" || name === "Referência") continue;

    map.set(name, {
      name,
      flows: parseListSection(block, "Fluxos de negócio impactados"),
      invariants: parseInvariantTokens(
        block.match(/\*\*Invariantes relacionados:\*\*\s*(.+)/)?.[1] ?? ""
      ),
      guardianChecks: [
        ...new Set(
          (block.match(/\*\*Guardian:\*\*\s*(.+)/)?.[1] ?? "").match(/[FACPXS]\d+/g) ?? []
        ),
      ],
    });
  }
  return map;
}

function parseDependencyRegressions(content: string): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const entity of ENTITY_ORDER) {
    const sectionRegex = new RegExp(
      `### ${entity}[\\s\\S]*?\\*\\*Se quebrar:\\*\\*\\s*([\\s\\S]*?)(?=\\r?\\n\\r?\\n\\*\\*|$)`,
      "i"
    );
    const altRegex = new RegExp(
      `### ${entity} →[\\s\\S]*?\\*\\*Se quebrar:\\*\\*\\s*([\\s\\S]*?)(?=\\r?\\n\\r?\\n\\*\\*|$)`,
      "i"
    );

    let impact = "";
    const direct = content.match(sectionRegex);
    const chain = content.match(altRegex);
    if (direct) impact = direct[1].trim();
    else if (chain) impact = chain[1].trim();

    if (impact) {
      map.set(entity, [impact.replace(/\s+/g, " ")]);
    }
  }

  const triage = content.match(/## Como usar em triagem([\s\S]*?)(?:\n---|$)/);
  if (triage) {
    for (const line of triage[1].split("\n")) {
      const row = line.match(/^\| (.+?) \| (.+?) \|/);
      if (!row || row[1].includes("Sintoma")) continue;
      const symptom = row[1].trim();
      const chain = row[2].trim();
      for (const entity of ENTITY_ORDER) {
        if (!chain.includes(entity)) continue;
        const list = map.get(entity) ?? [];
        list.push(`Sintoma: ${symptom}`);
        map.set(entity, list);
      }
    }
  }

  return map;
}

function resolveReviewScope(risk: RiskLevel): ReviewScope {
  if (risk === "CRITICAL") return "FULL";
  if (risk === "HIGH") return "FULL";
  if (risk === "MEDIUM") return "NORMAL";
  return "SMOKE";
}

function intersectFlows(entityFlows: string[], changedFlows: string[]): string[] {
  if (changedFlows.length === 0) return entityFlows;

  const matched = entityFlows.filter((flow) =>
    changedFlows.some(
      (changed) =>
        changed.toLowerCase().includes(flow.toLowerCase()) ||
        flow.toLowerCase().includes(changed.toLowerCase())
    )
  );

  if (matched.length > 0) return matched;

  const keywordHits = changedFlows.filter((changed) => {
    const lower = changed.toLowerCase();
    return entityFlows.some((flow) => {
      const words = flow.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      return words.some((w) => lower.includes(w));
    });
  });

  return keywordHits.length > 0 ? [...new Set([...matched, ...keywordHits])] : entityFlows.slice(0, 6);
}

function selectTests(
  playbook: EntityPlaybook,
  scope: ReviewScope
): { mandatory: string[]; recommended: string[]; extended: string[] } {
  if (scope === "SMOKE") {
    return {
      mandatory: playbook.mandatory.slice(0, 3),
      recommended: [],
      extended: [],
    };
  }
  if (scope === "NORMAL") {
    return {
      mandatory: playbook.mandatory,
      recommended: playbook.recommended,
      extended: [],
    };
  }
  return {
    mandatory: playbook.mandatory,
    recommended: playbook.recommended,
    extended: playbook.extended,
  };
}

function mergeInvariants(
  playbook: EntityPlaybook,
  mapProfile: EntityProfile | undefined,
  _changedInvariants: string[]
): string[] {
  return [...new Set([...playbook.invariants, ...(mapProfile?.invariants ?? [])])].sort();
}

function mergeGuardianChecks(
  playbook: EntityPlaybook,
  mapProfile: EntityProfile | undefined,
  changedChecks: string[]
): string[] {
  const entitySet = new Set([...playbook.guardianChecks, ...(mapProfile?.guardianChecks ?? [])]);
  for (const check of changedChecks) {
    if (entitySet.has(check)) entitySet.add(check);
  }
  return [...entitySet].sort();
}

function formatBullets(items: string[]): string {
  if (items.length === 0) return "- (nenhum)";
  return items.map((item) => `- ${item}`).join("\n");
}

function buildChecklistMarkdown(params: {
  summary: ChangeAnalysisSummary;
  scope: ReviewScope;
  domainMap: Map<string, EntityProfile>;
  dependencyRegressions: Map<string, string[]>;
}): string {
  const { summary, scope, domainMap, dependencyRegressions } = params;

  const impactedEntities = ENTITY_ORDER.filter((name) => summary.entities.includes(name));

  const lines: string[] = [
    "# Domain Review Checklist",
    "",
    `**Branch:** ${summary.branch}`,
    `**HEAD:** ${summary.head}`,
    `**Risco (Change Analyzer):** ${summary.overallRisk}`,
    `**Escopo de revisão:** ${scope}`,
    `**Mensagem do commit:** ${summary.commitMessage}`,
    "",
    "## Instruções",
    "",
    scopeInstructions(scope),
    "",
    "---",
    "",
    "## Resumo",
    "",
    `* Entidades impactadas: ${impactedEntities.length}`,
    `* Arquivos HIGH/CRITICAL: ${summary.highRiskFiles.length}`,
    `* Invariantes no diff: ${summary.invariants.length}`,
    `* Checks Guardian relacionados: ${summary.guardianChecks.join(", ") || "(nenhum)"}`,
    "",
    "### Arquivos de maior risco",
    "",
    formatBullets(summary.highRiskFiles.slice(0, 20)),
    summary.highRiskFiles.length > 20
      ? `\n- … e mais ${summary.highRiskFiles.length - 20} arquivo(s)`
      : "",
    "",
    "---",
    "",
    "## Checklist por entidade",
    "",
  ];

  for (const entityName of impactedEntities) {
    const playbook = ENTITY_PLAYBOOK[entityName];
    const mapProfile = domainMap.get(entityName);
    if (!playbook) continue;

    const flows = intersectFlows(
      mapProfile?.flows ?? playbook.regressionAreas,
      summary.flows
    );
    const tests = selectTests(playbook, scope);
    const invariants = mergeInvariants(playbook, mapProfile, summary.invariants);
    const guardianChecks = mergeGuardianChecks(
      playbook,
      mapProfile,
      summary.guardianChecks
    );

    const regressions = [
      ...new Set([
        ...playbook.regressionAreas,
        ...(dependencyRegressions.get(entityName) ?? []),
      ]),
    ];

    lines.push(
      `### ${entityName}`,
      "",
      "**Fluxos afetados:**",
      "",
      formatBullets(flows),
      "",
      "**Testes obrigatórios:**",
      "",
      formatBullets(tests.mandatory),
      ""
    );

    if (tests.recommended.length > 0) {
      lines.push("**Testes recomendados:**", "", formatBullets(tests.recommended), "");
    }

    if (tests.extended.length > 0) {
      lines.push("**Testes estendidos (FULL):**", "", formatBullets(tests.extended), "");
    }

    lines.push(
      "**Invariantes que devem continuar válidos:**",
      "",
      formatBullets(invariants),
      "",
      "**Checks Guardian:**",
      "",
      formatBullets(guardianChecks),
      "",
      "**Possíveis regressões:**",
      "",
      formatBullets(regressions),
      "",
      "---",
      ""
    );
  }

  lines.push("## Matriz de sintomas (triagem rápida)", "");

  const relevantTriages = TRIAGE_SYMPTOMS.filter((item) =>
    item.entities.some((e) =>
      impactedEntities.includes(e as (typeof ENTITY_ORDER)[number])
    )
  );

  if (relevantTriages.length === 0) {
    lines.push("_Nenhum sintoma de triagem específico para as entidades deste diff._");
  } else {
    for (const item of relevantTriages) {
      lines.push(`- **${item.symptom}** → ${item.entities.join(", ")} (${item.flows.join(", ")})`);
    }
  }

  lines.push(
    "",
    "## Pós-revisão",
    "",
    postReviewSteps(scope),
    "",
    "_Checklist gerado automaticamente — validar manualmente antes de merge/release._",
    "_Fontes: change-analysis.md, domain-map.md, domain-dependencies.md_"
  );

  return `${lines.join("\n")}\n`;
}

function scopeInstructions(scope: ReviewScope): string {
  if (scope === "SMOKE") {
    return [
      "Escopo **SMOKE** (risco LOW): executar apenas testes obrigatórios mínimos por entidade.",
      "Adequado para mudanças em docs, tooling ou ajustes cosméticos sem impacto de domínio.",
    ].join("\n");
  }
  if (scope === "NORMAL") {
    return [
      "Escopo **NORMAL** (risco MEDIUM): executar testes obrigatórios + recomendados.",
      "Rodar Domain Guardian se tocar Payment, Coupon ou webhook.",
    ].join("\n");
  }
  return [
    "Escopo **FULL** (risco HIGH/CRITICAL): executar obrigatórios + recomendados + estendidos.",
    "Obrigatório: `node --experimental-strip-types scripts/domain-guardian-runner.ts` antes do merge.",
    "Revisar `advisor.md` para playbook de incidentes.",
  ].join("\n");
}

function postReviewSteps(scope: ReviewScope): string {
  const steps = [
    "- [ ] Testes obrigatórios executados para cada entidade impactada",
  ];
  if (scope !== "SMOKE") {
    steps.push("- [ ] Testes recomendados revisados (executar ou justificar skip)");
  }
  if (scope === "FULL") {
    steps.push("- [ ] Domain Guardian runner executado (latest.json sem ERROR)");
    steps.push("- [ ] advisor.md revisado para checks ativos");
    steps.push("- [ ] Testes estendidos / cenários de borda validados");
  }
  steps.push("- [ ] Nenhuma regressão em Minha Conta para fluxo principal");
  steps.push("- [ ] PR aprovado com checklist anexado");
  return steps.join("\n");
}

async function main() {
  let changeAnalysisRaw: string;
  try {
    changeAnalysisRaw = await readFile(CHANGE_ANALYSIS_PATH, "utf8");
  } catch {
    console.error(
      "domain_review_engine_error: change-analysis.md não encontrado. Execute domain-change-analyzer.ts primeiro."
    );
    process.exitCode = 1;
    return;
  }

  const [domainMapRaw, dependenciesRaw] = await Promise.all([
    readFile(DOMAIN_MAP_PATH, "utf8"),
    readFile(DOMAIN_DEPENDENCIES_PATH, "utf8"),
  ]);

  const summary = parseChangeAnalysis(changeAnalysisRaw);
  const domainMap = parseDomainMap(domainMapRaw);
  const dependencyRegressions = parseDependencyRegressions(dependenciesRaw);
  const scope = resolveReviewScope(summary.overallRisk);

  const markdown = buildChecklistMarkdown({
    summary,
    scope,
    domainMap,
    dependencyRegressions,
  });

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, markdown, "utf8");

  console.log(`Review checklist gerado: ${OUTPUT_PATH}`);
  console.log(`Escopo: ${scope} (risco ${summary.overallRisk})`);
  console.log(`Entidades: ${summary.entities.join(", ")}`);
  console.log("");
  console.log(markdown);

  if (scope === "FULL") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(
    "domain_review_engine_error:",
    err instanceof Error ? err.message : err
  );
  process.exitCode = 1;
});
