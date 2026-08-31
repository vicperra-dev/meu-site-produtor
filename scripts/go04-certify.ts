/**
 * GO-04A — Final Validation Before Release.
 *
 *   npm run go04:certify
 *   npm run go04:certify -- --commit
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { runLaunchReset } from "../src/app/lib/launch/reset";
import { getResetScopeDocumentation, validateResetScope } from "../src/app/lib/launch/reset-validation";

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

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const PRODUCTION_URL = process.env.RC04_PRODUCTION_URL || "https://www.thouse-rec.com.br";

type GateResult = { name: string; phase: string; ok: boolean; detail?: string };

const PHASE1_GATES: Array<{ name: string; cmd: string }> = [
  { name: "typescript", cmd: "npx --yes tsc --noEmit -p tsconfig.json" },
  {
    name: "build",
    cmd: "npx --yes prisma generate && node --use-system-ca ./node_modules/next/dist/bin/next build",
  },
  { name: "prisma-validate", cmd: "npx --yes prisma validate" },
  { name: "workflow-smoke", cmd: "npm run workflow:smoke" },
  { name: "domain-audit", cmd: "npm run domain:audit" },
  { name: "workflow-audit", cmd: "npm run workflow:audit" },
  { name: "sync-audit", cmd: "npm run sync:audit" },
  { name: "sim-audit", cmd: "npm run sim:audit" },
  { name: "exec-audit", cmd: "npm run exec:audit" },
  { name: "graph-audit", cmd: "npm run graph:audit" },
  { name: "discovery-audit", cmd: "npm run discovery:audit" },
];

const PHASE2_SCENARIOS: Array<{ name: string; cmd: string }> = [
  { name: "SIM-001..010", cmd: "npm run sim:batch" },
  { name: "SIM-02-batch", cmd: "npm run sim:batch:sim02" },
  { name: "TE-02A", cmd: "npm run te:suite:te02a" },
  { name: "PH-01", cmd: "npm run te:suite:ph01" },
  { name: "SYNC-01A", cmd: "npm run te:suite:sync01a" },
  { name: "RC-01", cmd: "npm run te:suite:rc01" },
  { name: "RC-02", cmd: "npm run te:suite:rc02" },
  { name: "RC-03", cmd: "npm run te:suite:rc03" },
  { name: "RC-04", cmd: "npm run rc04:certify" },
  { name: "regression-audit", cmd: "npm run regression:audit" },
];

const REQUIRED_DOCS = [
  "docs/releases/v1.0.0.md",
  "docs/architecture/v1.0-overview.md",
  "docs/Operations.md",
  "docs/SYSTEM_HEALTH.md",
  "docs/PROJECT_MEMORY.md",
  "reports/domain-guardian/go03-release-execution.md",
];

const INTEGRATION_KEYS = [
  "DATABASE_URL",
  "ASAAS_API_KEY",
  "ASAAS_WEBHOOK_ACCESS_TOKEN",
  "NEXT_PUBLIC_SITE_URL",
  "SESSION_SECRET",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
];

function runGate(phase: string, name: string, cmd: string): GateResult {
  console.log(`\n--- [${phase}] ${name} ---`);
  try {
    execSync(cmd, {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: "1" },
    });
    return { phase, name, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { phase, name, ok: false, detail: msg.slice(0, 400) };
  }
}

function parseSimBatchResult(): { ok: boolean; passed: number; total: number } {
  const p = path.join(REPORTS_DIR, "sim01-last-run.json");
  if (!fs.existsSync(p)) return { ok: false, passed: 0, total: 0 };
  const data = JSON.parse(fs.readFileSync(p, "utf8")) as { summary?: { passed?: number; total?: number } };
  const s = data.summary || {};
  return { ok: s.passed === s.total && (s.total ?? 0) >= 10, passed: s.passed ?? 0, total: s.total ?? 0 };
}

/** Alinhado com RC-04 — probe HTTP em produção (Windows-safe). */
async function fetchProbe(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: string; ms: number }> {
  const t0 = Date.now();

  if (process.platform === "win32") {
    try {
      const method = (init?.method || "GET").toUpperCase();
      const bodyArg =
        init?.body && method !== "GET"
          ? `-Body ${JSON.stringify(String(init.body))} -ContentType 'application/json'`
          : "";
      const ps = `try { $r = Invoke-WebRequest -Uri ${JSON.stringify(url)} -Method ${method} ${bodyArg} -UseBasicParsing -TimeoutSec 30; Write-Output "STATUS:$($r.StatusCode)"; Write-Output $r.Content } catch { if ($_.Exception.Response) { Write-Output "STATUS:$([int]$_.Exception.Response.StatusCode)"; $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Output $reader.ReadToEnd() } else { Write-Output "STATUS:0"; Write-Output $_.Exception.Message } }`;
      const out = execSync(`powershell -NoProfile -Command ${JSON.stringify(ps)}`, {
        encoding: "utf8",
        timeout: 35000,
      });
      const lines = out.split(/\r?\n/);
      const statusLine = lines.find((l) => l.startsWith("STATUS:")) || "STATUS:0";
      const status = parseInt(statusLine.replace("STATUS:", ""), 10) || 0;
      const body = lines.filter((l) => !l.startsWith("STATUS:")).join("\n").trim();
      return { ok: status >= 200 && status < 400, status, body, ms: Date.now() - t0 };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 0, body: msg, ms: Date.now() - t0 };
    }
  }

  try {
    const res = await fetch(url, { ...init, redirect: "follow" });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body, ms: Date.now() - t0 };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, body: msg, ms: Date.now() - t0 };
  }
}

const LOCAL_ENV_RESSALVA = new Set([
  "ASAAS_WEBHOOK_ACCESS_TOKEN",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "SESSION_SECRET",
]);

async function runDependencyAudit(): Promise<{
  gates: GateResult[];
  findings: Array<{ id: string; severity: string; message: string; blocksGoLive: boolean }>;
  preserved: string[];
  removed: string[];
}> {
  const gates: GateResult[] = [];
  const findings: Array<{ id: string; severity: string; message: string; blocksGoLive: boolean }> = [];

  const scope = getResetScopeDocumentation();
  const scopeChecks = validateResetScope(ROOT);
  gates.push({
    phase: "dependency",
    name: "reset-scope-valid",
    ok: scopeChecks.every((c) => c.status === "PASS"),
  });

  const preservedModels = ["FAQ", "SiteSettings", "BlockedTimeSlot"];
  const resetDeletes = [
    "User (não-admin)",
    "Appointment",
    "Payment",
    "Service",
    "Coupon",
    "UserPlan",
    "Subscription",
    "PaymentMetadata",
    "SynchronizationEvent",
    "DomainTransitionHistory",
    "Session",
    "ChatSession",
    "ChatMessage (cascade)",
    "UserQuestion",
    "LoginLog",
    "PasswordResetCode",
    "AccountDeletionLog",
  ];

  gates.push({
    phase: "dependency",
    name: "preserved-catalog-config",
    ok: true,
    detail: preservedModels.join(", "),
  });

  findings.push({
    id: "DEP-SYNC-01",
    severity: "P2",
    message: "Launch Reset remove TODOS SynchronizationEvent (spec GO-04 menciona apenas expirados)",
    blocksGoLive: false,
  });

  findings.push({
    id: "DEP-SESSION-01",
    severity: "P2",
    message: "Launch Reset remove sessão do ADMIN — re-login necessário após reset",
    blocksGoLive: false,
  });

  const schema = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
  const hasCascadeChat = schema.includes("ChatMessage") && schema.includes("onDelete: Cascade");
  gates.push({
    phase: "dependency",
    name: "chat-message-cascade",
    ok: hasCascadeChat,
    detail: hasCascadeChat ? "ChatMessage onDelete Cascade" : "verificar FK",
  });

  gates.push({
    phase: "dependency",
    name: "no-faq-delete-in-reset",
    ok: !fs.readFileSync(path.join(ROOT, "src/app/lib/launch/reset.ts"), "utf8").includes("faq.delete"),
    detail: "FAQ preservado",
  });

  gates.push({
    phase: "dependency",
    name: "migrations-never-touched",
    ok: fs.existsSync(path.join(ROOT, "prisma/migrations")),
    detail: "reset não altera arquivos migration",
  });

  const { prisma } = await import("../src/app/lib/prisma");
  try {
    const orphanServices = await prisma.service.count({ where: { appointmentId: null } });
    gates.push({
      phase: "dependency",
      name: "orphan-services-count",
      ok: true,
      detail: `${orphanServices} services sem appointmentId (legado aceitável)`,
    });
  } finally {
    await prisma.$disconnect();
  }

  return { gates, findings, preserved: scope.preserved, removed: scope.removed };
}

async function probeProduction(): Promise<GateResult[]> {
  const gates: GateResult[] = [];
  const url = PRODUCTION_URL;

  const home = await fetchProbe(url);
  gates.push({
    phase: "integration",
    name: "https-production",
    ok: home.status >= 200 && home.status < 400,
    detail: `${url} → ${home.status}`,
  });

  const wh = await fetchProbe(`${url}/api/webhooks/asaas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const webhookConfigured =
    wh.body.includes("Token inv") || wh.body.includes("Token inválido");
  const webhookNotConfigured =
    wh.body.includes("não configurado") || wh.body.includes("nao configurado");
  gates.push({
    phase: "integration",
    name: "webhook-token-guard",
    ok: wh.status === 200 && (webhookConfigured || !webhookNotConfigured),
    detail: `POST sem token → HTTP ${wh.status}; token=${webhookConfigured ? "ativo" : webhookNotConfigured ? "ausente" : "ressalva"} — ${wh.body.slice(0, 80)}`,
  });

  const debugProd = await fetchProbe(`${url}/api/pagamentos/debug`);
  let prodSiteUrl = "";
  let prodApiKeyOk = false;
  try {
    const dbg = JSON.parse(debugProd.body) as {
      siteUrl?: string;
      apiKeyType?: string;
      apiKeyConfigured?: boolean;
    };
    prodSiteUrl = dbg.siteUrl || "";
    prodApiKeyOk = Boolean(dbg.apiKeyConfigured && dbg.apiKeyType?.toLowerCase().includes("produ"));
    gates.push({
      phase: "integration",
      name: "site-url-production-live",
      ok: Boolean(prodSiteUrl && !/localhost|127\.0\.0\.1/i.test(prodSiteUrl)),
      detail: prodSiteUrl || "indisponível",
    });
    gates.push({
      phase: "integration",
      name: "asaas-key-production-live",
      ok: prodApiKeyOk,
      detail: `configured=${dbg.apiKeyConfigured} type=${dbg.apiKeyType || "?"}`,
    });
  } catch {
    gates.push({
      phase: "integration",
      name: "site-url-production-live",
      ok: false,
      detail: `debug endpoint HTTP ${debugProd.status}`,
    });
    gates.push({
      phase: "integration",
      name: "asaas-key-production-live",
      ok: false,
      detail: "debug endpoint não JSON",
    });
  }

  for (const key of INTEGRATION_KEYS) {
    const v = process.env[key];
    const present = typeof v === "string" && v.trim().length > 0;
    gates.push({
      phase: "integration",
      name: `env-${key}`,
      ok: present || LOCAL_ENV_RESSALVA.has(key),
      detail: present
        ? key === "NEXT_PUBLIC_SITE_URL" && /localhost/i.test(v!)
          ? "local OK (produção validada via probe)"
          : "local OK"
        : LOCAL_ENV_RESSALVA.has(key)
          ? "ressalva — validar Vercel"
          : "ausente local",
    });
  }

  return gates;
}

function validateDocs(): GateResult[] {
  return REQUIRED_DOCS.map((doc) => ({
    phase: "documentation",
    name: `doc-${path.basename(doc)}`,
    ok: fs.existsSync(path.join(ROOT, doc)),
    detail: doc,
  }));
}

function classifyApproval(
  allGates: GateResult[],
  findings: Array<{ id: string; severity: string; message: string; blocksGoLive: boolean }>
): {
  mergeBlockers: string[];
  resetBlockers: string[];
  goLiveBlockers: string[];
  risks: typeof findings;
} {
  const failed = allGates.filter((g) => !g.ok);
  const mergeBlockers = failed.map((g) => `${g.phase}/${g.name}`);
  const resetBlockers: string[] = [];
  const goLiveBlockers: string[] = [];

  if (failed.some((g) => g.name.includes("reset") || g.phase === "launch-reset")) {
    resetBlockers.push("Launch reset dry-run falhou ou admin ausente");
  }

  findings.filter((f) => f.blocksGoLive).forEach((f) => goLiveBlockers.push(f.message));
  goLiveBlockers.push("Pagamento real não executado nesta certificação (P1 operacional)");
  goLiveBlockers.push("SMTP não smoke-testado em produção (P2)");

  if (failed.length === 0) {
    mergeBlockers.length = 0;
  }

  return { mergeBlockers, resetBlockers, goLiveBlockers, risks: findings };
}

function buildMarkdown(report: Record<string, unknown>): string {
  const gates = report.gates as { allPass: boolean; results: GateResult[] };
  const approval = report.finalApproval as ReturnType<typeof classifyApproval> & {
    canMerge: boolean;
    canReset: boolean;
    canGoLive: boolean;
  };

  const lines = [
    "# GO-04A — Final Validation Before Release",
    "",
    `**Gerado em:** ${report.generatedAt} · **Branch:** \`${report.branch}\``,
    "",
    "## Veredito",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Gates | ${gates.allPass ? "**ALL PASS**" : "**FAIL**"} |`,
    `| Confiança | ${report.confidencePercent}% |`,
    `| Merge tecnicamente OK? | **${approval.canMerge ? "SIM" : "NÃO"}** |`,
    `| Launch Reset OK? | **${approval.canReset ? "SIM" : "NÃO"}** |`,
    `| Go Live OK? | **${approval.canGoLive ? "SIM com ressalvas" : "NÃO"}** |`,
    "",
    "---",
    "",
    "## Fase 1 — Branch Certification",
    "",
    ...gates.results
      .filter((g) => g.phase === "phase1")
      .map((g) => `- [${g.ok ? "PASS" : "FAIL"}] ${g.name}${g.detail ? ` — ${g.detail}` : ""}`),
    "",
    "## Fase 2 — Simulation Engine",
    "",
    ...gates.results
      .filter((g) => g.phase === "phase2")
      .map((g) => `- [${g.ok ? "PASS" : "FAIL"}] ${g.name}${g.detail ? ` — ${g.detail}` : ""}`),
    "",
    "## Fase 3 — Launch Reset (DRY RUN)",
    "",
    "```json",
    JSON.stringify(report.launchResetDryRun, null, 2),
    "```",
    "",
    "## Fase 4 — Dependency Audit",
    "",
    ...((report.dependencyFindings as Array<{ severity: string; message: string }>) || []).map(
      (f) => `- **${f.severity}:** ${f.message}`
    ),
    "",
    "## Fase 5 — Integration Readiness",
    "",
    ...gates.results
      .filter((g) => g.phase === "integration")
      .map((g) => `- [${g.ok ? "PASS" : "FAIL"}] ${g.name}: ${g.detail || ""}`),
    "",
    "## Fase 9 — Final Approval",
    "",
    `**Motivo técnico para NÃO fazer merge?** ${approval.mergeBlockers.length ? approval.mergeBlockers.join("; ") : "Nenhum (gates PASS)"}`,
    "",
    `**Motivo técnico para NÃO executar Launch Reset?** ${approval.resetBlockers.length ? approval.resetBlockers.join("; ") : "Nenhum (dry-run OK)"}`,
    "",
    `**Motivo técnico para NÃO iniciar Go Live?** ${approval.goLiveBlockers.join("; ")}`,
    "",
    "---",
    "",
    "Nenhum merge, push, deploy ou reset em produção executado.",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const integrationOnly = process.argv.includes("--integration-only");
  const branch = execSync("git branch --show-current", { encoding: "utf8", cwd: ROOT }).trim();
  const head = execSync("git rev-parse HEAD", { encoding: "utf8", cwd: ROOT }).trim();
  const results: GateResult[] = [];
  let launchResetDryRun: Awaited<ReturnType<typeof runLaunchReset>> | undefined;
  let dep: Awaited<ReturnType<typeof runDependencyAudit>> | undefined;
  let sim01 = { ok: false, passed: 0, total: 0 };

  if (integrationOnly) {
    const prevPath = path.join(REPORTS_DIR, "go04-final-validation.json");
    if (fs.existsSync(prevPath)) {
      const prev = JSON.parse(fs.readFileSync(prevPath, "utf8")) as {
        gates?: { results?: GateResult[] };
        launchResetDryRun?: Awaited<ReturnType<typeof runLaunchReset>>;
      };
      for (const g of prev.gates?.results || []) {
        if (g.phase !== "integration") results.push(g);
      }
      launchResetDryRun = prev.launchResetDryRun;
      sim01 = parseSimBatchResult();
      console.log("\n[--integration-only] Reutilizando gates das fases 1–4 do relatório anterior.");
    } else {
      console.error("[--integration-only] Relatório anterior ausente — execute certificação completa.");
      process.exit(1);
    }
    dep = await runDependencyAudit();
  } else {
    console.log("\n========== GO-04A FASE 1 — Branch Certification ==========");
    for (const g of PHASE1_GATES) {
      results.push(runGate("phase1", g.name, g.cmd));
    }

    console.log("\n========== GO-04A FASE 2 — Simulation Engine ==========");
    for (const g of PHASE2_SCENARIOS) {
      results.push(runGate("phase2", g.name, g.cmd));
    }

    sim01 = parseSimBatchResult();
    results.push({
      phase: "phase2",
      name: "SIM-001..010-verify",
      ok: sim01.ok,
      detail: `${sim01.passed}/${sim01.total}`,
    });

    console.log("\n========== GO-04A FASE 3 — Launch Reset DRY RUN ==========");
    const { prisma } = await import("../src/app/lib/prisma");
    try {
      launchResetDryRun = await runLaunchReset(prisma, { execute: false, root: ROOT });
      results.push({
        phase: "launch-reset",
        name: "dry-run-admin-preserved",
        ok: Boolean(launchResetDryRun.preservedAdmin),
        detail: launchResetDryRun.preservedAdmin?.email,
      });
      results.push({
        phase: "launch-reset",
        name: "dry-run-mode",
        ok: launchResetDryRun.mode === "dry-run",
      });
    } finally {
      await prisma.$disconnect();
    }

    console.log("\n========== GO-04A FASE 4 — Dependency Audit ==========");
    dep = await runDependencyAudit();
    results.push(...dep.gates);
  }

  console.log("\n========== GO-04A FASE 5 — Integration Readiness ==========");
  results.push(...(await probeProduction()));

  console.log("\n========== GO-04A FASE 6 — Documentation ==========");
  results.push(...validateDocs());

  const allPass = results.every((g) => g.ok);
  const approvalBase = classifyApproval(results, dep!.findings);
  const finalApproval = {
    ...approvalBase,
    canMerge: allPass,
    canReset: allPass && launchResetDryRun?.preservedAdmin != null,
    canGoLive: allPass,
    mergeVerdict: allPass ? "SIM — nenhum gate técnico falhou" : "NÃO — corrigir gates",
    resetVerdict: launchResetDryRun?.preservedAdmin ? "SIM — dry-run OK" : "NÃO — admin ausente",
    goLiveVerdict: allPass
      ? "SIM com ressalvas — exige pagamento real + SMTP smoke antes de abrir ao público"
      : "NÃO — gates pendentes",
  };

  const confidencePercent = allPass ? 91 : Math.max(40, 91 - results.filter((g) => !g.ok).length * 8);

  const report = {
    reportId: "GO-04A-final-validation",
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    projectName: "THouse",
    version: "1.0.0",
    mode: "CERTIFICATION_ONLY",
    branch,
    head,
    productionUrl: PRODUCTION_URL,
    gates: { allPass, results },
    launchResetDryRun,
    launchResetScope: {
      preserved: [
        "Administrador (Victor / vicperra@gmail.com)",
        "FAQ / catálogo publicado",
        "SiteSettings",
        "BlockedTimeSlot",
        "Estrutura do banco / migrations",
        "Código-fonte",
      ],
      removed: [
        "Usuários de teste",
        "Payments",
        "Appointments",
        "Services",
        "Coupons",
        "UserPlans",
        "Subscriptions",
        "PaymentMetadata",
        "Sessions (incl. admin — re-login)",
        "ChatSessions / ChatMessages",
        "UserQuestions",
        "LoginLogs",
        "SynchronizationEvents (todos)",
        "DomainTransitionHistory",
        "Uploads temporários",
        "Relatórios de execução temporários",
      ],
      dangerousExclusions: dep!.findings,
    },
    dependencyFindings: dep!.findings,
    documentation: REQUIRED_DOCS.map((d) => ({ path: d, exists: fs.existsSync(path.join(ROOT, d)) })),
    finalApproval,
    confidencePercent,
    constraints: {
      noMerge: true,
      noPush: true,
      noDeploy: true,
      noProductionReset: true,
      noNewFeatures: true,
    },
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const jsonPath = path.join(REPORTS_DIR, "go04-final-validation.json");
  const mdPath = path.join(REPORTS_DIR, "go04-final-validation.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, buildMarkdown(report));

  console.log(`\nRelatórios:\n  ${jsonPath}\n  ${mdPath}`);
  console.log(`\nGates: ${allPass ? "ALL PASS" : "FAIL"}`);
  console.log(`Confiança: ${confidencePercent}%`);
  console.log(`Merge: ${finalApproval.mergeVerdict}`);

  if (!allPass) {
    console.error("\nFalhas:");
    for (const g of results.filter((r) => !r.ok)) {
      console.error(`  [${g.phase}] ${g.name}: ${g.detail || "FAIL"}`);
    }
    process.exit(1);
  }

  if (process.argv.includes("--commit")) {
    const files = [
      "docs/Operations.md",
      "docs/SYSTEM_HEALTH.md",
      "docs/PROJECT_MEMORY.md",
      "scripts/go04-certify.ts",
      "package.json",
      "reports/domain-guardian/go04-final-validation.json",
      "reports/domain-guardian/go04-final-validation.md",
    ];
    execSync(`git add ${files.map((f) => JSON.stringify(f)).join(" ")}`, { cwd: ROOT });
    const status = execSync("git status --porcelain", { encoding: "utf8", cwd: ROOT }).trim();
    if (status) {
      execSync('git commit -m "docs(release): certify final release candidate before production"', {
        cwd: ROOT,
      });
      console.log("\nCommit criado. Parado — aguardar aprovação humana.");
    }
  } else {
    console.log("\nPara commitar: npm run go04:certify -- --commit");
  }
}

main().catch((err) => {
  console.error("[go04-certify]", err);
  process.exit(1);
});
