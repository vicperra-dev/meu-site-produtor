/**
 * GO-03 — Release Execution (runbook + consistency gates).
 *
 *   npm run go03:execute           # gera docs + relatórios + gates
 *   npm run go03:execute -- --commit
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const PRODUCTION_URL = process.env.RC04_PRODUCTION_URL || "https://www.thouse-rec.com.br";

type GateResult = { name: string; ok: boolean; detail?: string };

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", cwd: ROOT }).trim();
}

function readJson<T>(file: string): T | null {
  const full = path.join(REPORTS_DIR, file);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8")) as T;
  } catch {
    return null;
  }
}

const EXECUTION_PLAN = [
  {
    step: 1,
    title: "Ativar Maintenance Mode",
    owner: "DevOps",
    actions: [
      "Acessar Vercel → Project → Settings → Environment Variables → Production",
      "Definir GO_LIVE_MAINTENANCE_MODE=1",
      "Opcional: SiteSettings.maintenanceMode=false (GO_LIVE tem precedência para rotas bloqueadas)",
      "Salvar e aguardar redeploy automático OU disparar redeploy manual",
      "Validar: visitante em /registro redireciona para /manutencao?mode=golive",
      "Validar: admin logado acessa /admin normalmente",
    ],
    rollback: "GO_LIVE_MAINTENANCE_MODE=0 + redeploy",
  },
  {
    step: 2,
    title: "Merge",
    owner: "Release Manager",
    actions: [
      "git fetch origin",
      "git checkout main",
      "git pull origin main",
      "git merge backup-pre-formatacao --no-ff -m \"release: merge v1.0.0 candidate\"",
      "Resolver conflitos se houver (nunca aceitar perda de migrations)",
      "git log -1 --oneline (confirmar merge commit)",
    ],
    rollback: "git revert -m 1 <merge-commit-sha>",
  },
  {
    step: 3,
    title: "Push",
    owner: "Release Manager",
    actions: [
      "Confirmar aprovação humana explícita antes do push",
      "git push origin main",
      "Verificar no GitHub: branch main atualizada",
    ],
    rollback: "git revert + push (não force-push em main)",
  },
  {
    step: 4,
    title: "Deploy",
    owner: "DevOps",
    actions: [
      "Aguardar Vercel Production build (branch main)",
      "URL: https://www.thouse-rec.com.br",
      "Verificar build logs: sem erro, prisma generate OK",
      "Confirmar deployment Ready",
    ],
    rollback: "Vercel → Promote deployment anterior",
  },
  {
    step: 5,
    title: "Prisma migrate deploy",
    owner: "DBA",
    actions: [
      "Conectar DATABASE_URL de Production (Neon)",
      "npx prisma migrate deploy",
      "Confirmar 33 migrations aplicadas",
      "npx prisma migrate status → Database schema is up to date",
      "Se HS-01 falhar (CPF duplicado): resolver dados antes de continuar",
    ],
    rollback: "Neon PITR restore para timestamp pré-deploy",
  },
  {
    step: 6,
    title: "Launch Reset",
    owner: "DBA + Release Manager",
    actions: [
      "Backup Neon confirmado (PITR < 1h)",
      "LAUNCH01_CONFIRM_PRODUCTION=1",
      "LAUNCH01_CONFIRM_PHRASE=\"RESET THOUSE PRODUCTION\"",
      "npm run launch01:reset -- --execute --confirm-production",
      "Verificar launch01-reset-result.json: preservedAdmin=true",
      "Confirmar 1 usuário (Victor ADMIN) no banco",
    ],
    rollback: "Neon PITR — nunca usar reset como rollback",
  },
  {
    step: 7,
    title: "Smoke Test",
    owner: "QA Lead",
    actions: [
      "npm run workflow:smoke (local apontando prod read-only OU probes HTTP)",
      "GET https://www.thouse-rec.com.br → 200",
      "GET /login, /registro, /agendamento, /minha-conta, /admin → 200",
      "POST /api/webhooks/asaas sem token → 401 (Token inválido)",
    ],
    rollback: "Ativar maintenance + investigar",
  },
  {
    step: 8,
    title: "Pagamento real",
    owner: "QA Lead",
    actions: [
      "Admin desativa GO_LIVE temporariamente OU usa conta admin",
      "Fluxo: serviço avulso mínimo (valor simbólico se possível)",
      "Pagar no Asaas produção",
      "Aguardar webhook (até 60s)",
      "Confirmar Payment + Appointment em Minha Conta",
      "Registrar asaasId e appointmentId no checklist",
    ],
    rollback: "Reembolso manual Asaas se cobrança indevida",
  },
  {
    step: 9,
    title: "Reembolso real",
    owner: "QA Lead + Admin",
    actions: [
      "Admin cancela agendamento de teste",
      "Cliente escolhe reembolso financeiro em Minha Conta",
      "Confirmar refund no Asaas + status local",
      "Alternativa: cupom de reembolso (registrar qual fluxo testado)",
    ],
    rollback: "N/A — documentar IDs para auditoria",
  },
  {
    step: 10,
    title: "Plano real",
    owner: "QA Lead",
    actions: [
      "Comprar plano Bronze (mensal) com pagamento real",
      "Webhook cria UserPlan ativo",
      "Verificar em Minha Conta + painel admin",
    ],
    rollback: "Cancelar plano admin + reembolso se necessário",
  },
  {
    step: 11,
    title: "Desativar Maintenance Mode",
    owner: "DevOps",
    actions: [
      "Vercel: GO_LIVE_MAINTENANCE_MODE=0",
      "Redeploy Production",
      "Validar: /registro e /agendamento acessíveis",
    ],
    rollback: "GO_LIVE_MAINTENANCE_MODE=1",
  },
  {
    step: 12,
    title: "Abrir sistema",
    owner: "Release Manager",
    actions: [
      "Comunicar equipe: go-live ativo",
      "Monitorar Vercel logs primeiros 15 min",
      "Verificar primeiro acesso público sem erro 5xx",
    ],
    rollback: "Passo 11 imediato",
  },
  {
    step: 13,
    title: "Monitorar 24h",
    owner: "DevOps + QA",
    actions: [
      "Revisar webhooks falhos no painel Asaas",
      "Tickets 'paguei e não apareceu'",
      "Uptime Vercel > 99%",
      "Zero erros críticos em logs",
    ],
    rollback: "Ver Rollback Card",
  },
  {
    step: 14,
    title: "Monitorar 48h",
    owner: "Release Manager",
    actions: [
      "Retrospectiva GO-03",
      "Arquivar relatórios domain-guardian",
      "Decidir início v1.1 (ver Post-Launch Plan)",
    ],
    rollback: "N/A",
  },
];

const PRODUCTION_CHECKLIST = [
  { id: "PC-01", item: "GO_LIVE_MAINTENANCE_MODE=1 antes do merge/deploy" },
  { id: "PC-02", item: "Backup Neon recente (< 1h)" },
  { id: "PC-03", item: "Merge backup-pre-formatacao → main sem conflitos" },
  { id: "PC-04", item: "Push origin/main concluído" },
  { id: "PC-05", item: "Vercel Production build SUCCESS" },
  { id: "PC-06", item: "prisma migrate deploy — 33 migrations" },
  { id: "PC-07", item: "Launch reset — ADMIN Victor preservado" },
  { id: "PC-08", item: "Smoke routes HTTP 200" },
  { id: "PC-09", item: "Webhook Asaas token válido" },
  { id: "PC-10", item: "Pagamento real → Payment + Appointment" },
  { id: "PC-11", item: "Reembolso real testado" },
  { id: "PC-12", item: "Plano real testado" },
  { id: "PC-13", item: "GO_LIVE_MAINTENANCE_MODE=0 pós-validação" },
  { id: "PC-14", item: "NEXT_PUBLIC_SITE_URL=https://www.thouse-rec.com.br" },
  { id: "PC-15", item: "ASAAS_API_KEY produção configurada" },
  { id: "PC-16", item: "ASAAS_WEBHOOK_ACCESS_TOKEN configurado" },
  { id: "PC-17", item: "SESSION_SECRET configurado" },
  { id: "PC-18", item: "GMAIL_USER + GMAIL_APP_PASSWORD (email)" },
  { id: "PC-19", item: "Primeiro cliente real sem suporte manual" },
  { id: "PC-20", item: "24h sem incidente crítico" },
];

const ROLLBACK_CARD = {
  cancelDeploy: [
    "Vercel Dashboard → Deployments → ⋯ no deploy anterior estável → Promote to Production",
    "Alternativa: git revert do merge + push + aguardar redeploy",
  ],
  restoreDatabase: [
    "Neon Console → Branch → Restore → escolher timestamp anterior ao reset",
    "Nunca executar launch01:reset para 'desfazer' erro",
    "Após restore: verificar prisma migrate status",
  ],
  revertVersion: [
    "git checkout <sha-anterior> ou tag",
    "Vercel promote deployment correspondente",
    "Confirmar compatibilidade schema ↔ código",
  ],
  stopPayments: [
    "GO_LIVE_MAINTENANCE_MODE=1 imediato",
    "SiteSettings.maintenanceMode=true via /admin/manutencao",
    "Desativar webhook no painel Asaas (último recurso)",
  ],
  activateMaintenance: [
    "GO_LIVE_MAINTENANCE_MODE=1 em Vercel Production",
    "Redeploy",
    "Mensagem: preparativos finais para lançamento",
  ],
};

const POST_LAUNCH_PLAN = {
  first24h: [
    "Monitorar logs Vercel a cada 2h",
    "Revisar fila webhooks Asaas",
    "Responder tickets em < 2h",
    "Confirmar zero pagamentos órfãos",
  ],
  firstWeek: [
    "Daily check: agendamentos pendentes > 24h",
    "Revisar DomainTransitionHistory anomalias",
    "Coletar feedback UX (E2E-02 itens H1)",
    "Retrospectiva GO-03 documentada",
  ],
  firstMonth: [
    "Métricas: conversão registro→pagamento",
    "Taxa webhook success > 99%",
    "Planejar sprint v1.1 (E2E-02 H1)",
  ],
  criteriaV11: [
    "7 dias sem ticket crítico de pagamento",
    "Webhook estável em produção",
    "≥ 5 agendamentos reais concluídos",
    "Aprovação Release Manager",
  ],
  criteriaPortfolio: [
    "v1.0 estável ≥ 30 dias",
    "v1.1 H1 entregue",
    "Capacidade de equipe separada do operacional",
  ],
  criteriaStudioOS: [
    "v1.0 + v1.1 estáveis",
    "Domínio congelamento levantado por ADR",
    "Aprovação explícita stakeholders",
    "Não iniciar antes do fim do hardening E2E-02",
  ],
};

function validateConsistencyGates(): GateResult[] {
  const gates: GateResult[] = [];

  const go02 = readJson<{
    readiness?: { ready?: boolean; verdict?: string; justification?: string };
    gates?: { allPass?: boolean };
    version?: string;
  }>("go02-release-assembly.json");
  gates.push({
    name: "go02-report-exists",
    ok: Boolean(go02),
    detail: go02 ? go02.readiness?.verdict : "ausente",
  });
  gates.push({
    name: "go02-readiness-sim",
    ok: go02?.readiness?.ready === true,
    detail: go02?.readiness?.justification?.slice(0, 120) || "N/A",
  });
  gates.push({
    name: "go02-gates-all-pass",
    ok: go02?.gates?.allPass === true,
    detail: go02?.gates?.allPass ? "ALL PASS" : "verificar go02",
  });

  const rc04 = readJson<{
    verdict?: { final?: string; allSectionsPass?: boolean };
    summary?: { sectionsFail?: number; gatesFail?: number; gatesPass?: number };
  }>("rc04-production-certification.json");
  gates.push({
    name: "rc04-report-exists",
    ok: Boolean(rc04),
    detail: rc04?.verdict?.final,
  });
  gates.push({
    name: "rc04-no-section-fail",
    ok: (rc04?.summary?.sectionsFail ?? 1) === 0,
    detail: `sectionsFail=${rc04?.summary?.sectionsFail ?? "?"}`,
  });
  gates.push({
    name: "rc04-gates-pass",
    ok: (rc04?.summary?.gatesFail ?? 1) === 0 && (rc04?.summary?.gatesPass ?? 0) >= 16,
    detail: `gates ${rc04?.summary?.gatesPass}/${(rc04?.summary?.gatesPass ?? 0) + (rc04?.summary?.gatesFail ?? 0)}`,
  });

  const launch01 = readJson<{
    verdict?: { final?: string };
    phases?: Array<{ status: string; title: string }>;
  }>("launch01-final-readiness.json");
  gates.push({
    name: "launch01-report-exists",
    ok: Boolean(launch01),
    detail: launch01?.verdict?.final,
  });
  const launchFail = launch01?.phases?.filter((p) => p.status === "FAIL") ?? [];
  gates.push({
    name: "launch01-no-phase-fail",
    ok: launchFail.length === 0,
    detail: launchFail.length ? launchFail.map((p) => p.title).join(", ") : "OK",
  });

  const requiredDocs = [
    "docs/releases/v1.0.0.md",
    "docs/architecture/v1.0-overview.md",
  ];
  for (const doc of requiredDocs) {
    gates.push({
      name: `doc-${path.basename(doc)}`,
      ok: fs.existsSync(path.join(ROOT, doc)),
      detail: doc,
    });
  }

  try {
    execSync("npx --yes tsc --noEmit -p tsconfig.json", { stdio: "pipe", cwd: ROOT });
    gates.push({ name: "typescript-consistency", ok: true });
  } catch {
    gates.push({ name: "typescript-consistency", ok: false, detail: "tsc failed" });
  }

  return gates;
}

function buildMarkdown(report: Record<string, unknown>): string {
  const gates = report.gates as { allPass: boolean; results: GateResult[] };
  const readiness = report.readiness as { ready: boolean; verdict: string; justification: string };

  const lines = [
    "# GO-03 — Release Execution",
    "",
    `**Gerado em:** ${report.generatedAt} · **Versão:** 1.0.0`,
    "",
    "## Veredito",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Status | **${readiness.verdict}** |`,
    `| Runbook pronto | **${readiness.ready ? "SIM" : "NÃO"}** |`,
    `| Gates consistência | ${gates.allPass ? "ALL PASS" : "FAIL"} |`,
    "",
    readiness.justification,
    "",
    "---",
    "",
    "## Fase 1 — Release Notes",
    "",
    "Documento: [`docs/releases/v1.0.0.md`](../../docs/releases/v1.0.0.md)",
    "",
    "---",
    "",
    "## Fase 2 — Architecture Snapshot",
    "",
    "Documento: [`docs/architecture/v1.0-overview.md`](../../docs/architecture/v1.0-overview.md)",
    "",
    "---",
    "",
    "## Fase 3 — Release Execution Plan",
    "",
  ];

  for (const step of EXECUTION_PLAN) {
    lines.push(`### ${step.step}. ${step.title}`, "", `**Responsável:** ${step.owner}`, "");
    for (const a of step.actions) lines.push(`1. ${a}`);
    lines.push("", `**Rollback deste passo:** ${step.rollback}`, "");
  }

  lines.push("---", "", "## Fase 4 — Production Validation Checklist", "", "| ☐ | ID | Item | PASS | FAIL | Observações |", "|---|-----|------|------|------|-------------|");
  for (const c of PRODUCTION_CHECKLIST) {
    lines.push(`| ☐ | ${c.id} | ${c.item} | | | |`);
  }

  lines.push("", "---", "", "## Fase 5 — Rollback Card", "");
  for (const [key, items] of Object.entries(ROLLBACK_CARD)) {
    lines.push(`### ${key}`, "");
    for (const i of items) lines.push(`- ${i}`);
    lines.push("");
  }

  lines.push("---", "", "## Fase 6 — Post-Launch Plan", "");
  for (const [key, items] of Object.entries(POST_LAUNCH_PLAN)) {
    lines.push(`### ${key}`, "");
    for (const i of items) lines.push(`- ${i}`);
    lines.push("");
  }

  lines.push("---", "", "## Fase 7 — Gates (consistência)", "");
  for (const g of gates.results) {
    lines.push(`- [${g.ok ? "PASS" : "FAIL"}] **${g.name}**${g.detail ? `: ${g.detail}` : ""}`);
  }

  lines.push("", "---", "", "**Nenhum merge, push ou deploy executado.** Aguardar aprovação humana.", "");

  return lines.join("\n");
}

async function main() {
  const head = sh("git rev-parse HEAD");
  const branch = sh("git branch --show-current");

  const gateResults = validateConsistencyGates();
  const allPass = gateResults.every((g) => g.ok);

  const readiness = {
    ready: allPass,
    verdict: allPass ? "APROVADO — runbook pronto" : "BLOQUEADO — corrigir consistência",
    justification: allPass
      ? "GO-02, RC-04 e LAUNCH-01 consistentes. Documentação v1.0.0 e arquitetura geradas. TypeScript OK. Execução operacional (merge/push/deploy) aguarda aprovação humana passo a passo."
      : `Falhas: ${gateResults.filter((g) => !g.ok).map((g) => g.name).join(", ")}`,
  };

  const report = {
    reportId: "GO-03-release-execution",
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    projectName: "THouse",
    version: "1.0.0",
    mode: "EXECUTION_PREP_ONLY",
    branch,
    head,
    productionUrl: PRODUCTION_URL,
    releaseNotes: "docs/releases/v1.0.0.md",
    architectureSnapshot: "docs/architecture/v1.0-overview.md",
    executionPlan: EXECUTION_PLAN,
    productionChecklist: PRODUCTION_CHECKLIST.map((c) => ({
      ...c,
      pass: null,
      fail: null,
      observations: "",
    })),
    rollbackCard: ROLLBACK_CARD,
    postLaunchPlan: POST_LAUNCH_PLAN,
    gates: { allPass, results: gateResults },
    readiness,
    constraints: {
      noMerge: true,
      noPush: true,
      noDeploy: true,
      noNewFeatures: true,
      consistencyOnly: true,
    },
    upstreamReports: {
      go02: "reports/domain-guardian/go02-release-assembly.json",
      rc04: "reports/domain-guardian/rc04-production-certification.json",
      launch01: "reports/domain-guardian/launch01-final-readiness.json",
    },
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT, "docs/releases"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "docs/architecture"), { recursive: true });

  const jsonPath = path.join(REPORTS_DIR, "go03-release-execution.json");
  const mdPath = path.join(REPORTS_DIR, "go03-release-execution.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, buildMarkdown(report));

  console.log(`\nRelatórios:\n  ${jsonPath}\n  ${mdPath}`);
  console.log(`\nReadiness: ${readiness.ready ? "SIM" : "NÃO"} — ${readiness.verdict}`);

  if (!allPass) {
    console.error("\nGates com falha:");
    for (const g of gateResults.filter((r) => !r.ok)) {
      console.error(`  - ${g.name}: ${g.detail || "FAIL"}`);
    }
    process.exit(1);
  }

  if (process.argv.includes("--commit")) {
    const files = [
      "docs/releases/v1.0.0.md",
      "docs/architecture/v1.0-overview.md",
      "scripts/go03-execute.ts",
      "package.json",
      "reports/domain-guardian/go03-release-execution.json",
      "reports/domain-guardian/go03-release-execution.md",
    ];
    sh(`git add ${files.map((f) => JSON.stringify(f)).join(" ")}`);
    const status = sh("git status --porcelain");
    if (status) {
      sh('git commit -m "docs(release): prepare production execution runbook"');
      console.log("\nCommit criado. Merge/push/deploy NÃO realizados.");
    }
  } else {
    console.log("\nPara commitar: npm run go03:execute -- --commit");
  }
}

main().catch((err) => {
  console.error("[go03-execute]", err);
  process.exit(1);
});
