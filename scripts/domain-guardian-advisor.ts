/**
 * Domain Guardian Advisor — diagnóstico operacional a partir de latest.json.
 *
 * Uso: node --experimental-strip-types scripts/domain-guardian-advisor.ts
 */

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.resolve(SCRIPT_DIR, "../reports/domain-guardian");
const LATEST_PATH = path.join(REPORTS_DIR, "latest.json");
const ADVISOR_PATH = path.join(REPORTS_DIR, "advisor.md");

type CheckCode =
  | "F1"
  | "F4"
  | "A5"
  | "A8"
  | "A9"
  | "C1"
  | "C2"
  | "P2"
  | "X1"
  | "X2"
  | "S1"
  | "S2"
  | "S3"
  | "S4";

type FindingSeverity = "ERROR" | "WARN" | "INFO";
type CheckSeverity = "OK" | "WARN" | "ERROR" | "INFO";
type FinalStatus = "HEALTHY" | "WARNING" | "CRITICAL";

type Finding = {
  id: CheckCode;
  severity: FindingSeverity;
  message: string;
};

type JsonCheckResult = {
  code: CheckCode;
  severity: CheckSeverity;
  scanned: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  findings: Finding[];
};

type DomainGuardianReport = {
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

type CheckAdvisory = {
  title: string;
  criticidade: string;
  impacto: string;
  causaProvavel: string;
  arquivosSuspeitos: string[];
  acaoSugerida: string;
};

const CHECK_ORDER: CheckCode[] = [
  "F1",
  "F4",
  "A5",
  "A8",
  "A9",
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

const CHECK_ADVISORY: Record<CheckCode, CheckAdvisory> = {
  F1: {
    title: "asaasId duplicado em Payment",
    criticidade: "CRÍTICA",
    impacto:
      "Dois ou mais pagamentos compartilham o mesmo asaasId. Risco de reconciliação financeira incorreta, dupla contabilização ou efeitos de webhook aplicados ao registro errado.",
    causaProvavel:
      "Retry de webhook Asaas, race condition na criação de Payment ou reprocessamento manual sem idempotência.",
    arquivosSuspeitos: [
      "src/app/api/webhooks/asaas/route.ts",
      "src/app/lib/process-payment-webhook.ts",
      "src/app/lib/asaas-agendamento-reconcile.ts",
    ],
    acaoSugerida:
      "Identificar o par duplicado, preservar o Payment canônico, anular ou mesclar o duplicado e validar efeitos (appointment, cupons) antes de qualquer purge.",
  },
  F4: {
    title: "Payment de agendamento aprovado sem Appointment válido",
    criticidade: "CRÍTICA",
    impacto:
      "Pagamento aprovado pode não gerar agendamento visível para o usuário nem cupons associados ao fluxo real.",
    causaProvavel:
      "Falha em webhook, interrupção em `processAgendamentoPaymentEffects` ou ausência de `appointmentId`/`appointmentIds` após o RECEIVED.",
    arquivosSuspeitos: [
      "src/app/lib/process-payment-webhook.ts",
      "src/app/api/webhooks/asaas/route.ts",
      "src/app/lib/asaas-agendamento-payment-effects.ts",
      "src/app/lib/asaas-agendamento-reconcile.ts",
    ],
    acaoSugerida:
      "Executar reconciliação de ownership e reprocessar o pagamento (admin) com metadata válida; confirmar criação de Appointment e vínculo no Payment.",
  },
  A5: {
    title: "Appointment ativo sem Service vinculado",
    criticidade: "ALTA",
    impacto:
      "Agendamento aceito/confirmado aparece sem serviços vinculados — sessão incompleta no admin e possível falha na entrega operacional.",
    causaProvavel:
      "Efeitos pós-pagamento parciais, falha na criação de `Service` ou backfill admin não executado.",
    arquivosSuspeitos: [
      "src/app/lib/asaas-agendamento-payment-effects.ts",
      "src/app/lib/asaas-agendamento-reconcile.ts",
      "src/app/api/admin/reprocessar-pagamento-teste/route.ts",
    ],
    acaoSugerida:
      "Backfill de serviços via fluxo admin ou reprocessar pagamento; validar metadata de itens (servicos/beats) do checkout.",
  },
  A8: {
    title: "Conflito de horário entre agendamentos",
    criticidade: "ALTA",
    impacto:
      "Dois agendamentos não cancelados ocupam o mesmo slot — risco de double booking e conflito operacional na agenda.",
    causaProvavel:
      "Race entre checkouts simultâneos, validação de slot contornada ou status `recusado` ainda bloqueando slot sem política clara.",
    arquivosSuspeitos: [
      "src/app/api/asaas/checkout-agendamento/route.ts",
      "src/app/api/agendamentos/route.ts",
    ],
    acaoSugerida:
      "Remarcar ou cancelar um dos agendamentos em conflito; revisar janela de duração e regras de bloqueio de slot no checkout.",
  },
  A9: {
    title: "Arquivamento administrativo inconsistente",
    criticidade: "ALTA",
    impacto:
      "Agendamento arquivado em estado operacional ativo ou com reembolso/cancelamento ainda pendente — risco de slot fantasma ou perda de fluxo na Minha Conta.",
    causaProvavel:
      "Arquivamento manual antes da resolução do usuário ou bypass das regras de `canAdminArchiveAppointment`.",
    arquivosSuspeitos: [
      "src/app/lib/appointment-admin-archive.ts",
      "src/app/api/admin/agendamentos/archive/route.ts",
    ],
    acaoSugerida:
      "Restaurar o agendamento, concluir reembolso/remarcação com o usuário e arquivar novamente somente após elegibilidade.",
  },
  C1: {
    title: "Coupon.code duplicado",
    criticidade: "CRÍTICA",
    impacto:
      "Códigos de cupom não são únicos globalmente — consumo, resgate e auditoria podem afetar o cupom errado.",
    causaProvavel:
      "Race na alocação de código, seed manual ou migração com colisão de prefixo.",
    arquivosSuspeitos: [
      "src/app/lib/agendamento-payment-coupons.ts",
      "src/app/lib/plan-coupons.ts",
      "src/app/lib/simulation-coupon-codes.ts",
    ],
    acaoSugerida:
      "Renumerar o cupom duplicado mais recente, investigar transação de geração e impedir nova colisão antes de liberar o código ao cliente.",
  },
  C2: {
    title: "Cupom usado sem rastreabilidade",
    criticidade: "ALTA",
    impacto:
      "Cupom marcado como usado sem `usedBy`, `appointmentId` ou vínculo resolvível — ownership e auditoria comprometidos.",
    causaProvavel:
      "Update parcial no consumo, reparo manual incompleto ou falha em `repairReleasedBookingCouponsForUser`.",
    arquivosSuspeitos: [
      "src/app/lib/coupon-stale-appointment.ts",
      "src/app/api/meus-dados/route.ts",
      "src/app/lib/coupon-booking-rules.ts",
    ],
    acaoSugerida:
      "Reparar `usedBy`/`appointmentId` com base no agendamento correspondente; evitar liberar cupom sem rastreio completo.",
  },
  P2: {
    title: "Plano ativo com cupons abaixo do esperado",
    criticidade: "ALTA",
    impacto:
      "Cliente com plano ativo pode não ter recebido a quantidade de cupons prevista no catálogo do plano.",
    causaProvavel:
      "Falha em `processPlanoPaymentEffects`, webhook interrompido ou plano criado sem geração de cupons.",
    arquivosSuspeitos: [
      "src/app/lib/asaas-plano-payment-effects.ts",
      "src/app/lib/plan-coupons.ts",
      "src/app/api/webhooks/asaas/route.ts",
      "src/app/api/admin/reprocessar-pagamento-plano-teste/route.ts",
    ],
    acaoSugerida:
      "Reprocessar pagamento de plano ou gerar cupons faltantes via admin; confirmar `userPlanId` e contagem por `planId`.",
  },
  X1: {
    title: "Divergência de userId entre entidades relacionadas",
    criticidade: "CRÍTICA",
    impacto:
      "Payment, Appointment ou Coupon podem pertencer a usuários diferentes no mesmo fluxo — risco de vazamento de dados entre contas.",
    causaProvavel:
      "Vinculação incorreta em checkout, cupom de teste ou correção manual sem validar ownership.",
    arquivosSuspeitos: [
      "src/app/lib/coupon-account-ownership.ts",
      "src/app/lib/coupon-visibility.ts",
      "src/app/api/meus-dados/route.ts",
      "src/app/lib/simulation-coupon-user-link.ts",
    ],
    acaoSugerida:
      "Corrigir ownership imediatamente no registro divergente; revisar o fluxo que criou o vínculo antes de reexpor em Minha Conta.",
  },
  X2: {
    title: "refundCouponId inconsistente com Appointment/Coupon",
    criticidade: "CRÍTICA",
    impacto:
      "Tríade de remarcação quebrada — reembolso/remarcação pode falhar ou apontar para cupom de outro usuário.",
    causaProvavel:
      "Cupom de reembolso excluído, `refundCouponId` órfão ou userId do cupom diferente do agendamento origem.",
    arquivosSuspeitos: [
      "src/app/lib/appointment-refund-payment.ts",
      "src/app/api/agendamentos/escolher-reembolso/route.ts",
      "src/app/lib/coupon-refund.ts",
    ],
    acaoSugerida:
      "Restaurar cupom de reembolso ou limpar `refundCouponId` com confirmação explícita; validar tríade Appointment → Coupon → userId.",
  },
  S1: {
    title: "Payment simbólico dependente de fallback amount=5",
    criticidade: "MÉDIA",
    impacto:
      "Classificação de simulação ainda depende do valor R$ 5 sem metadata explícita — bloqueia remoção definitiva do fallback (A1-final).",
    causaProvavel:
      "Payments históricos criados antes da migração de metadata (`symbolicAgendamento`, `symbolicPlano`, `isTestPayment`).",
    arquivosSuspeitos: [
      "src/app/lib/symbolic-payment.ts",
      "src/app/lib/symbolic-payment-resolve.ts",
      "src/app/api/asaas/checkout-agendamento/route.ts",
    ],
    acaoSugerida:
      "Backfill de metadata nos payments afetados; monitorar até S1 zerar em produção antes de remover `dependsOnLegacyAmountFallback`.",
  },
  S2: {
    title: "Cupom TESTE_* sem vínculo de simulação",
    criticidade: "MÉDIA",
    impacto:
      "Cupom de simulação pode não aparecer em Minha Conta nem ser reconhecido como teste no admin.",
    causaProvavel:
      "Ausência de `assignedUserId`, `paymentId` simbólico ou vínculo de agendamento; auto-link legacy removido no A2.",
    arquivosSuspeitos: [
      "src/app/lib/simulation-coupon-user-link.ts",
      "src/app/api/meus-dados/vincular-cupons-teste/route.ts",
      "src/app/lib/simulation-coupon.ts",
    ],
    acaoSugerida:
      "Executar POST `/api/meus-dados/vincular-cupons-teste` ou associar cupons via admin com e-mail do usuário.",
  },
  S3: {
    title: "Inconsistência metadata/amount em pagamento simbólico",
    criticidade: "MÉDIA",
    impacto:
      "Payment classificado como simbólico com amount divergente ou apenas via fallback — risco de tratar pagamento real como teste (ou vice-versa).",
    causaProvavel:
      "Metadata simbólica com valor cobrado incorreto, ou classificação legada ainda ativa sem metadata coerente.",
    arquivosSuspeitos: [
      "src/app/lib/symbolic-payment.ts",
      "src/app/lib/plan-payment-simulation.ts",
      "src/app/api/admin/reprocessar-pagamento-teste/route.ts",
      "src/app/api/admin/reprocessar-pagamento-plano-teste/route.ts",
    ],
    acaoSugerida:
      "Alinhar metadata e amount ao valor simbólico esperado; eliminar dependência de fallback após backfill (ver S1).",
  },
  S4: {
    title: "Resíduo legado TESTE_AGEND_* / TESTE_PAY_*",
    criticidade: "BAIXA",
    impacto:
      "Cupons com prefixos legados ainda no banco — indicador de migração de simulação incompleta, sem impacto direto em produção se volume for zero.",
    causaProvavel:
      "Cupons gerados antes da padronização `TESTE_*` + código aleatório; não migrados ou não vinculados.",
    arquivosSuspeitos: [
      "src/app/lib/simulation-coupon-codes.ts",
      "src/app/lib/simulation-coupon-user-link.ts",
      "src/app/api/meus-dados/vincular-cupons-teste/route.ts",
    ],
    acaoSugerida:
      "Vincular ou arquivar cupons legados restantes; manter S4 em observação até contagem zero antes de remover helpers `@legacy`.",
  },
};

function formatDatePtBr(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function resolveFinalStatus(report: DomainGuardianReport): FinalStatus {
  if (report.summary.errors > 0) return "CRITICAL";
  if (report.summary.warnings > 0) return "WARNING";
  return "HEALTHY";
}

function formatCheckStatus(result: JsonCheckResult): string {
  if (result.errorCount > 0) return `${result.errorCount} erro(s)`;
  if (result.warningCount > 0) return `${result.warningCount} alerta(s)`;
  if (result.infoCount > 0) return `${result.infoCount} info`;
  return "OK";
}

function formatFindingsList(findings: Finding[]): string[] {
  if (findings.length === 0) return ["- (nenhuma ocorrência nesta execução)"];
  return findings.map((finding) => `- **${finding.severity}**: ${finding.message}`);
}

function formatCheckSection(code: CheckCode, result: JsonCheckResult): string[] {
  const advisory = CHECK_ADVISORY[code];
  const lines: string[] = [
    `## ${code} — ${advisory.title}`,
    "",
    `**Status nesta execução:** ${result.severity} (${formatCheckStatus(result)}) · ${result.scanned} registro(s) verificado(s)`,
    "",
    "**Ocorrências:**",
    "",
    ...formatFindingsList(result.findings),
    "",
    "**Criticidade:**",
    "",
    advisory.criticidade,
    "",
    "**Impacto:**",
    "",
    advisory.impacto,
    "",
    "**Causa provável:**",
    "",
    advisory.causaProvavel,
    "",
    "**Arquivos suspeitos:**",
    "",
    ...advisory.arquivosSuspeitos.map((file) => `* \`${file}\``),
    "",
    "**Ação sugerida:**",
    "",
    advisory.acaoSugerida,
    "",
  ];
  return lines;
}

function buildAdvisorMarkdown(report: DomainGuardianReport): string {
  const status = resolveFinalStatus(report);
  const resultsByCode = new Map(report.results.map((result) => [result.code, result]));

  const activeChecks = report.results.filter(
    (result) =>
      result.severity !== "OK" ||
      result.errorCount > 0 ||
      result.warningCount > 0 ||
      result.infoCount > 0
  );

  const lines: string[] = [
    "# Domain Guardian Advisor",
    "",
    formatDatePtBr(report.generatedAt),
    "",
    "**Status final:**",
    "",
    status,
    "",
    "## Resumo",
    "",
    `* Errors: ${report.summary.errors}`,
    `* Warnings: ${report.summary.warnings}`,
    `* Info: ${report.summary.info}`,
    `* Checks executados: ${report.summary.checks}`,
    `* Duração: ${report.executionMs} ms`,
    "",
    "## Checks com ocorrências",
    "",
  ];

  if (activeChecks.length === 0) {
    lines.push("- (nenhum — todos os checks OK nesta execução)");
  } else {
    for (const result of activeChecks) {
      const counts: string[] = [];
      if (result.errorCount > 0) counts.push(`${result.errorCount} erro(s)`);
      if (result.warningCount > 0) counts.push(`${result.warningCount} alerta(s)`);
      if (result.infoCount > 0) counts.push(`${result.infoCount} info`);
      lines.push(`- **${result.code}** (${result.severity}) — ${counts.join(", ")}`);
      for (const finding of result.findings) {
        lines.push(`  - ${finding.severity}: ${finding.message}`);
      }
    }
  }

  lines.push("", "---", "", "## Playbook por check", "");

  for (const code of CHECK_ORDER) {
    const result = resultsByCode.get(code);
    if (!result) continue;
    lines.push(...formatCheckSection(code, result));
    lines.push("---", "");
  }

  lines.push(
    "_Diagnóstico operacional apenas — nenhuma correção foi executada automaticamente._"
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  let report: DomainGuardianReport;
  try {
    const raw = await readFile(LATEST_PATH, "utf8");
    report = JSON.parse(raw) as DomainGuardianReport;
  } catch {
    console.error(
      "domain_guardian_advisor_error: latest.json não encontrado. Execute domain-guardian-audit.ts ou domain-guardian-runner.ts primeiro."
    );
    process.exitCode = 1;
    return;
  }

  const markdown = buildAdvisorMarkdown(report);
  await writeFile(ADVISOR_PATH, markdown, "utf8");

  console.log(`Advisor gerado: ${ADVISOR_PATH}`);
  console.log(`Status final: ${resolveFinalStatus(report)}`);
  console.log("");
  console.log(markdown);

  if (resolveFinalStatus(report) === "CRITICAL") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(
    "domain_guardian_advisor_error:",
    err instanceof Error ? err.message : err
  );
  process.exitCode = 1;
});
