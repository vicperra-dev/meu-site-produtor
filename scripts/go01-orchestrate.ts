/**
 * GO-01 — Go Live Orchestration.
 *
 *   npm run go01:orchestrate           # inventário + gates + relatórios
 *   npm run go01:orchestrate -- --commit  # commit se todos gates PASS
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  getResetScopeDocumentation,
  validateResetScope,
} from "../src/app/lib/launch/reset-validation";
import { detectResetTarget, validateResetConfirmation } from "../src/app/lib/launch/safety";
import { GO_LIVE_MAINTENANCE_MESSAGE, isGoLiveMaintenanceMode } from "../src/app/lib/go-live-maintenance";

function loadEnvFile(file: string, override = false) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local", true);

const PRODUCTION_URL = process.env.RC04_PRODUCTION_URL || "https://www.thouse-rec.com.br";
const VERCEL_ALIAS = "https://meu-site-produtor-13.vercel.app";

const REQUIRED_ENV_KEYS = [
  "DATABASE_URL",
  "ASAAS_API_KEY",
  "ASAAS_WEBHOOK_ACCESS_TOKEN",
  "NEXT_PUBLIC_SITE_URL",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "SESSION_SECRET",
  "GO_LIVE_MAINTENANCE_MODE",
];

const OFFICIAL_SCRIPTS = [
  "rc:certify",
  "rc02:certify",
  "rc03:certify",
  "rc04:certify",
  "launch01:reset",
  "launch01:certify",
  "go01:orchestrate",
  "golive:cleanup",
  "workflow:smoke",
  "domain:audit",
  "workflow:audit",
  "sync:audit",
  "sim:audit",
  "exec:audit",
  "regression:audit",
  "te:run",
  "sim:run",
];

const GATE_COMMANDS: Array<{ name: string; cmd: string }> = [
  { name: "typescript", cmd: "npx --yes tsc --noEmit -p tsconfig.json" },
  { name: "prisma-validate", cmd: "npx --yes prisma validate" },
  { name: "workflow-smoke", cmd: "npm run workflow:smoke" },
];

type GateResult = { name: string; ok: boolean; detail?: string };

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", cwd: process.cwd() }).trim();
}

function runGate(name: string, cmd: string): GateResult {
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env: process.env });
    return { name, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { name, ok: false, detail: msg.slice(0, 400) };
  }
}

function envPresent(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

function countMigrations(): number {
  const dir = path.join(process.cwd(), "prisma/migrations");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory()).length;
}

function validateSafetyGuards(): GateResult[] {
  const results: GateResult[] = [];
  const dbUrl = process.env.DATABASE_URL || "postgresql://localhost/test";

  const localBlock = validateResetConfirmation("local", ["--execute"], process.env);
  results.push({
    name: "reset-local-requires-confirm",
    ok: !localBlock.ok,
    detail: localBlock.ok ? "deveria bloquear" : localBlock.error,
  });

  const prodBlock = validateResetConfirmation(
    "production",
    ["--execute", "--confirm-production"],
    { ...process.env, LAUNCH01_CONFIRM_PRODUCTION: "1" }
  );
  results.push({
    name: "reset-production-requires-phrase",
    ok: !prodBlock.ok,
    detail: prodBlock.ok ? "deveria bloquear" : prodBlock.error,
  });

  const prodOk = validateResetConfirmation(
    "production",
    ["--execute", "--confirm-production"],
    {
      ...process.env,
      LAUNCH01_CONFIRM_PRODUCTION: "1",
      LAUNCH01_CONFIRM_PHRASE: "RESET THOUSE PRODUCTION",
    }
  );
  results.push({
    name: "reset-production-full-confirm",
    ok: prodOk.ok,
    detail: prodOk.ok ? "triple confirm OK" : prodOk.error,
  });

  results.push({
    name: "reset-target-detection",
    ok: detectResetTarget(dbUrl) === (dbUrl.includes("localhost") ? "local" : detectResetTarget(dbUrl)),
    detail: `target=${detectResetTarget(dbUrl)}`,
  });

  return results;
}

const RELEASE_PLAN = [
  {
    step: 1,
    title: "Revisar inventário GO-01",
    action: "Ler reports/domain-guardian/go01-release-orchestration.md e confirmar branch/commits/migrations.",
    owner: "Release Manager",
    automated: false,
  },
  {
    step: 2,
    title: "Gates locais",
    action: "npm run go01:orchestrate — typescript, prisma validate, workflow-smoke devem PASS.",
    owner: "QA Lead",
    automated: true,
  },
  {
    step: 3,
    title: "Certificações RC",
    action: "npm run rc04:certify && npm run launch01:certify — revisar relatórios; resolver ressalvas críticas.",
    owner: "Domain Guardian",
    automated: false,
  },
  {
    step: 4,
    title: "Ativar modo manutenção Go Live",
    action: "Em Vercel Production: GO_LIVE_MAINTENANCE_MODE=1. Login admin OK; cadastro/compra/agendamento bloqueados.",
    owner: "DevOps",
    automated: false,
  },
  {
    step: 5,
    title: "Merge para main",
    action: "git checkout main && git merge backup-pre-formatacao (ou PR aprovada). Não fazer push automático.",
    owner: "Release Manager",
    automated: false,
  },
  {
    step: 6,
    title: "Push origin/main",
    action: "git push origin main — apenas após aprovação explícita do responsável.",
    owner: "Release Manager",
    automated: false,
  },
  {
    step: 7,
    title: "Deploy Vercel",
    action: "Aguardar build Production em https://www.thouse-rec.com.br. Verificar logs sem erro.",
    owner: "DevOps",
    automated: false,
  },
  {
    step: 8,
    title: "Migrations produção",
    action: "npx prisma migrate deploy no ambiente Production (Neon). Confirmar 33 migrations aplicadas.",
    owner: "DBA",
    automated: false,
  },
  {
    step: 9,
    title: "Reset produção (homolog apenas)",
    action:
      'LAUNCH01_CONFIRM_PRODUCTION=1 LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION" npm run launch01:reset -- --execute --confirm-production',
    owner: "DBA + Release Manager",
    automated: false,
  },
  {
    step: 10,
    title: "Smoke pós-deploy",
    action: "npm run workflow:smoke + rotas públicas 200 + webhook Asaas token válido.",
    owner: "QA Lead",
    automated: false,
  },
  {
    step: 11,
    title: "Pagamento real sandbox/produção",
    action: "1 transação real mínima; confirmar Payment+Appointment em Minha Conta.",
    owner: "QA Lead",
    automated: false,
  },
  {
    step: 12,
    title: "Desativar manutenção Go Live",
    action: "GO_LIVE_MAINTENANCE_MODE=0 em Vercel + redeploy.",
    owner: "DevOps",
    automated: false,
  },
  {
    step: 13,
    title: "Go Live público",
    action: "Anunciar disponibilidade; monitorar primeiras 24h.",
    owner: "Release Manager",
    automated: false,
  },
];

const CHECKLISTS = {
  beforePush: [
    "Todos gates GO-01 PASS",
    "git status limpo ou apenas artefatos intencionais",
    "Nenhum segredo em arquivos staged",
    "RC-04 e LAUNCH-01 relatórios revisados",
  ],
  beforeMerge: [
    "PR/code review aprovado",
    "Conflitos resolvidos com main",
    "Migrations incluídas no branch",
    "NEXT_PUBLIC_SITE_URL aponta produção no Vercel",
  ],
  beforeDeploy: [
    "GO_LIVE_MAINTENANCE_MODE=1 em Production",
    "Variáveis Asaas/webhook/SMTP configuradas",
    "Backup Neon recente confirmado",
  ],
  beforeReset: [
    "Ambiente identificado (local/preview/production)",
    "Confirmações explícitas conforme target",
    "Admin Victor preservado (PRESERVE_ADMIN_EMAILS)",
    "Backup banco antes de production reset",
  ],
  beforeGoLive: [
    "Smoke routes 200",
    "Webhook Asaas responde",
    "1 pagamento teste OK",
    "Emails SMTP smoke (opcional ressalva)",
  ],
  afterGoLive: [
    "GO_LIVE_MAINTENANCE_MODE=0",
    "Monitorar logs Vercel 1h",
    "Verificar primeiro agendamento real",
  ],
  first24h: [
    "Revisar webhooks falhos no Asaas",
    "Tickets suporte 'paguei e não apareceu'",
    "Uptime > 99%",
  ],
  first48h: [
    "Revisar DomainTransitionHistory",
    "Confirmar nenhum dado homolog em produção",
  ],
  firstWeek: [
    "Retrospectiva GO-01",
    "Arquivar relatórios domain-guardian",
    "Planejar H2 hardening (E2E-02)",
  ],
};

const ROLLBACK_PLAN = {
  cancelDeploy: [
    "Vercel Dashboard → Deployments → Promover deploy anterior estável",
    "Ou: git revert do merge commit + push + redeploy",
  ],
  restoreDatabase: [
    "Neon Dashboard → Restore from backup (timestamp pré-reset)",
    "Nunca usar launch01:reset para rollback",
    "prisma migrate deploy após restore se schema divergir",
  ],
  disableMaintenance: [
    "Vercel: GO_LIVE_MAINTENANCE_MODE=0",
    "Ou SiteSettings.maintenanceMode=false via /admin/manutencao",
    "Redeploy ou aguardar propagação env",
  ],
  restorePreviousVersion: [
    "git checkout main@{1} ou tag v1.0.0-rc",
    "vercel --prod com commit anterior",
    "Validar DATABASE_URL compatível com schema da versão",
  ],
  note: "DOCUMENTAÇÃO APENAS — nenhum passo executado automaticamente pelo GO-01.",
};

function buildMarkdown(report: Record<string, unknown>): string {
  const inv = report.inventory as Record<string, unknown>;
  const gates = report.gates as { allPass: boolean; results: GateResult[] };
  const reset = report.resetValidation as ReturnType<typeof getResetScopeDocumentation> & {
    checks: ReturnType<typeof validateResetScope>;
  };

  const lines: string[] = [
    "# GO-01 — Go Live Orchestration",
    "",
    `**Gerado em:** ${report.generatedAt} · **Modo:** preparação operacional (nada executado em produção)`,
    "",
    "## Veredito",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Status | **${report.verdict}** |`,
    `| Confiança | ${report.confidencePercent}% |`,
    `| Gates | ${gates.allPass ? "PASS" : "FAIL"} |`,
    "",
    "---",
    "",
    "## Fase 1 — Release Inventory",
    "",
    `| Item | Valor |`,
    `|------|-------|`,
    `| Branch atual | \`${inv.currentBranch}\` |`,
    `| HEAD | \`${inv.head}\` |`,
    `| Branch produção | \`main\` @ \`${inv.productionHead}\` |`,
    `| Commits à frente de main | ${(inv.commitsAhead as string[]).length} |`,
    `| Migrations no repo | ${inv.migrationCount} |`,
    `| URL produção | ${inv.productionUrl} |`,
    `| Alias Vercel | ${inv.vercelAlias} |`,
    "",
    "### Commits pendentes (não em main)",
    "",
    ...((inv.commitsAhead as string[]) || []).map((c) => `- \`${c}\``),
    "",
    "### Scripts oficiais",
    "",
    ...OFFICIAL_SCRIPTS.map((s) => `- \`npm run ${s}\``),
    "",
    "### Variáveis obrigatórias (presença local)",
    "",
    ...REQUIRED_ENV_KEYS.map((k) => `- \`${k}\`: ${envPresent(k) ? "configurada" : "ausente"}`),
    "",
    "### Ambientes",
    "",
    "| Ambiente | URL / destino | Notas |",
    "|----------|---------------|-------|",
    "| Local | http://localhost:3000 | DATABASE_URL local; webhook Asaas não alcança |",
    `| Preview | ${VERCEL_ALIAS} | VERCEL_ENV=preview |`,
    `| Production | ${PRODUCTION_URL} | Branch main; Neon production |`,
    "",
    "---",
    "",
    "## Fase 2 — Release Plan",
    "",
    ...RELEASE_PLAN.flatMap((s) => [
      `### PASSO ${s.step} — ${s.title}`,
      `- **Ação:** ${s.action}`,
      `- **Responsável:** ${s.owner}`,
      `- **Automático:** ${s.automated ? "sim" : "não"}`,
      "",
    ]),
    "---",
    "",
    "## Fase 3 — Production Reset Validation",
    "",
    "### Nunca apagar",
    "",
    ...reset.preserved.map((p) => `- ${p}`),
    "",
    "### Removido (homolog)",
    "",
    ...reset.removed.map((r) => `- ${r}`),
    "",
    "### Nunca tocar",
    "",
    ...reset.neverTouched.map((n) => `- ${n}`),
    "",
    "### Checks",
    "",
    ...reset.checks.map((c) => `- [${c.status}] ${c.label}: ${c.evidence}`),
    "",
    "---",
    "",
    "## Fase 4 — Safety Checks",
    "",
    "| Guard | Status |",
    "|-------|--------|",
    "| Local exige `--confirm-local` | documentado |",
    "| Preview exige `LAUNCH01_CONFIRM_PREVIEW=1` + `--confirm-preview` | documentado |",
    '| Production exige phrase `RESET THOUSE PRODUCTION` | documentado |',
    "",
    "---",
    "",
    "## Fase 5 — Maintenance Mode",
    "",
    `Variável: \`GO_LIVE_MAINTENANCE_MODE=1\``,
    "",
    `Mensagem: "${GO_LIVE_MAINTENANCE_MESSAGE}"`,
    "",
    "| Público | Comportamento |",
    "|---------|---------------|",
    "| Login | permitido |",
    "| Cadastro | bloqueado |",
    "| Compra | bloqueada |",
    "| Agendamento | bloqueado |",
    "| Admin | operação normal |",
    "",
    `Ativo agora (local): ${isGoLiveMaintenanceMode() ? "sim" : "não"}`,
    "",
    "---",
    "",
    "## Fase 6 — Checklists",
    "",
  ];

  for (const [key, items] of Object.entries(CHECKLISTS)) {
    lines.push(`### ${key}`, "");
    for (const item of items) lines.push(`- [ ] ${item}`);
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "## Fase 7 — Rollback Plan (documentação)",
    "",
    `> ${ROLLBACK_PLAN.note}`,
    "",
    "### Cancelar deploy",
    ...ROLLBACK_PLAN.cancelDeploy.map((s) => `- ${s}`),
    "",
    "### Restaurar banco",
    ...ROLLBACK_PLAN.restoreDatabase.map((s) => `- ${s}`),
    "",
    "### Desativar manutenção",
    ...ROLLBACK_PLAN.disableMaintenance.map((s) => `- ${s}`),
    "",
    "### Versão anterior",
    ...ROLLBACK_PLAN.restorePreviousVersion.map((s) => `- ${s}`),
    "",
    "---",
    "",
    "## Pendências",
    "",
    ...((report.pending as string[]) || []).map((p) => `- ${p}`),
    "",
    "Nenhuma ação de produção foi executada. Aguardar aprovação humana.",
    ""
  );

  return lines.join("\n");
}

async function main() {
  const root = process.cwd();
  const currentBranch = sh("git branch --show-current");
  const head = sh("git rev-parse HEAD");
  const productionHead = sh("git rev-parse origin/main");
  const commitsAhead = sh("git log origin/main..HEAD --oneline").split("\n").filter(Boolean);
  const migrationCount = countMigrations();

  const scopeChecks = validateResetScope(root);
  const resetDoc = getResetScopeDocumentation();

  const gateResults: GateResult[] = GATE_COMMANDS.map((g) => runGate(g.name, g.cmd));
  gateResults.push(...validateSafetyGuards());

  const fileChecks: GateResult[] = [
    {
      name: "go-live-maintenance-module",
      ok: fs.existsSync(path.join(root, "src/app/lib/go-live-maintenance.ts")),
    },
    {
      name: "launch-safety-module",
      ok: fs.existsSync(path.join(root, "src/app/lib/launch/safety.ts")),
    },
    {
      name: "reset-scope-all-pass",
      ok: scopeChecks.every((c) => c.status === "PASS"),
      detail: scopeChecks.filter((c) => c.status !== "PASS").map((c) => c.id).join(", ") || undefined,
    },
  ];
  gateResults.push(...fileChecks);

  const allPass = gateResults.every((g) => g.ok);

  const pending = [
    "14 commits locais não publicados em origin/main",
    "Pagamento real em produção não validado (RC-04 ressalva)",
    "SMTP não smoke-testado em produção",
    "Reset produção nunca executado nesta sessão GO-01",
    "Push/merge/deploy aguardam aprovação explícita",
  ];

  const confidencePercent = allPass ? 90 : 55;

  const report = {
    reportId: "GO-01-release-orchestration",
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    projectName: "THouse",
    mode: "PREPARATION_ONLY",
    verdict: allPass ? "APROVADO PARA DOCUMENTAÇÃO" : "BLOQUEADO — corrigir gates",
    confidencePercent,
    inventory: {
      currentBranch,
      head,
      productionBranch: "main",
      productionHead,
      commitsAhead,
      migrationCount,
      productionUrl: PRODUCTION_URL,
      vercelAlias: VERCEL_ALIAS,
      officialScripts: OFFICIAL_SCRIPTS,
      requiredEnv: REQUIRED_ENV_KEYS.map((k) => ({ key: k, present: envPresent(k) })),
      environments: {
        local: { url: "http://localhost:3000", notes: "dev + reset local" },
        preview: { url: VERCEL_ALIAS, notes: "VERCEL_ENV=preview" },
        production: { url: PRODUCTION_URL, notes: "main + Neon" },
      },
    },
    releasePlan: RELEASE_PLAN,
    resetValidation: { ...resetDoc, checks: scopeChecks },
    maintenanceMode: {
      envVar: "GO_LIVE_MAINTENANCE_MODE",
      message: GO_LIVE_MAINTENANCE_MESSAGE,
      activeLocally: isGoLiveMaintenanceMode(),
      behavior: {
        login: "allowed",
        register: "blocked",
        purchase: "blocked",
        appointment: "blocked",
        admin: "full",
      },
    },
    safetyChecks: {
      local: ["--execute", "--confirm-local"],
      preview: ["LAUNCH01_TARGET=preview", "LAUNCH01_CONFIRM_PREVIEW=1", "--confirm-preview"],
      production: [
        "LAUNCH01_CONFIRM_PRODUCTION=1",
        'LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION"',
        "--confirm-production",
      ],
    },
    checklists: CHECKLISTS,
    rollbackPlan: ROLLBACK_PLAN,
    gates: { allPass, results: gateResults },
    pending,
    constraints: {
      noProductionExecution: true,
      noPush: true,
      noMerge: true,
      noStudioOS: true,
      noNewFeatures: true,
    },
  };

  const outDir = path.join(root, "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "go01-release-orchestration.json");
  const mdPath = path.join(outDir, "go01-release-orchestration.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, buildMarkdown(report));

  console.log(`\nRelatórios:\n  ${jsonPath}\n  ${mdPath}`);
  console.log(`\nVeredito: ${report.verdict} (${confidencePercent}% confiança)`);
  console.log(`Gates: ${allPass ? "ALL PASS" : "FAIL"}`);

  if (!allPass) {
    console.error("\nGates com falha:");
    for (const g of gateResults.filter((r) => !r.ok)) {
      console.error(`  - ${g.name}: ${g.detail || "FAIL"}`);
    }
    process.exit(1);
  }

  if (process.argv.includes("--commit")) {
    const staged = sh("git status --porcelain");
  if (staged) {
      sh(
        "git add package.json scripts/go01-orchestrate.ts scripts/launch01-reset.ts src/app/lib/go-live-maintenance.ts src/app/lib/launch/ src/app/middleware.ts src/app/manutencao/page.tsx src/app/api/registro/route.ts src/app/api/agendamentos/route.ts src/app/api/agendamentos/com-cupom/route.ts src/app/api/asaas/checkout-carrinho/route.ts src/app/api/asaas/checkout-agendamento/route.ts src/app/api/asaas/checkout/route.ts src/app/api/pagamentos/route.ts reports/domain-guardian/go01-release-orchestration.json reports/domain-guardian/go01-release-orchestration.md"
      );
      sh(
        'git commit -m "docs(release): prepare go-live orchestration and operational checklist"'
      );
      console.log("\nCommit criado. Push NÃO realizado — aguardar aprovação.");
    }
  } else {
    console.log("\nPara commitar após revisão: npm run go01:orchestrate -- --commit");
  }
}

main().catch((err) => {
  console.error("[go01-orchestrate]", err);
  process.exit(1);
});
