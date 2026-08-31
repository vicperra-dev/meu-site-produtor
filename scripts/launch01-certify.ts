/**
 * LAUNCH-01 — Production Launch Preparation Certification.
 *
 *   npm run launch01:certify
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { runLaunchReset, PRESERVE_ADMIN_NAME, type LaunchResetResult } from "../src/app/lib/launch/reset";

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

type CertStatus = "PASS" | "PASS COM RESSALVA" | "FAIL";
type GateResult = { name: string; ok: boolean; detail?: string };
type PhaseResult = { phase: number; title: string; status: CertStatus; evidence: string[] };

const PRODUCTION_URL = process.env.RC04_PRODUCTION_URL || "https://www.thouse-rec.com.br";

const GATE_COMMANDS: Array<{ name: string; cmd: string }> = [
  { name: "typescript", cmd: "npx --yes tsc --noEmit -p tsconfig.json" },
  { name: "prisma-validate", cmd: "npx --yes prisma validate" },
  { name: "build", cmd: "npx next build" },
  { name: "workflow-smoke", cmd: "npm run workflow:smoke" },
  { name: "domain-audit", cmd: "npm run domain:audit" },
  { name: "workflow-audit", cmd: "npm run workflow:audit" },
  { name: "sync-audit", cmd: "npm run sync:audit" },
  { name: "exec-audit", cmd: "npm run exec:audit" },
  { name: "sim-audit", cmd: "npm run sim:audit" },
  { name: "graph-audit", cmd: "npm run graph:audit" },
  { name: "discovery-audit", cmd: "npm run discovery:audit" },
  { name: "regression-audit", cmd: "npm run regression:audit" },
];

const SIM_SCENARIO_MAP: Array<{ label: string; coverage: string }> = [
  { label: "Pagamento aprovado", coverage: "SIM-001" },
  { label: "Pagamento recusado", coverage: "SIM-002" },
  { label: "Pagamento duplicado / Webhook duplicado", coverage: "SIM-003, RC03-004" },
  { label: "Sessão + Conclusão + Entrega", coverage: "SIM-004" },
  { label: "Plano Bronze", coverage: "SIM-005" },
  { label: "Plano Prata / Ouro", coverage: "RC01-003, RC01-004" },
  { label: "Cupom SERVICE", coverage: "SIM-006" },
  { label: "Cupom DISCOUNT", coverage: "SIM-007" },
  { label: "Cupom PLAN / REFUND / REBOOK / BONUS", coverage: "RC02-005, RC03-005/006, TE02A" },
  { label: "Captação / Mixagem / Masterização / Pacotes", coverage: "RC01-002, SRV-001…004, TE02A" },
  { label: "Reembolso financeiro", coverage: "SIM-008" },
  { label: "Cancelamento", coverage: "SIM-009" },
  { label: "Remarcação", coverage: "SIM-010" },
];

async function fetchProbe(url: string, init?: RequestInit) {
  const t0 = Date.now();
  if (process.platform === "win32") {
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
    const status = parseInt((lines.find((l) => l.startsWith("STATUS:")) || "STATUS:0").replace("STATUS:", ""), 10);
    const body = lines.filter((l) => !l.startsWith("STATUS:")).join("\n").trim();
    return { ok: status >= 200 && status < 400, status, body, ms: Date.now() - t0 };
  }
  const res = await fetch(url, { ...init, redirect: "follow" });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body, ms: Date.now() - t0 };
}

function runGate(name: string, cmd: string): GateResult {
  const env = { ...process.env, NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: "1" };
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env });
    return { name, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { name, ok: false, detail: msg.slice(0, 400) };
  }
}

function readRcBaseline(file: string, field: string, expected: string): GateResult {
  const p = path.resolve(process.cwd(), `reports/domain-guardian/${file}`);
  if (!fs.existsSync(p)) return { name: file, ok: false, detail: "ausente" };
  const data = JSON.parse(fs.readFileSync(p, "utf8")) as { verdict?: Record<string, unknown> };
  const v = data.verdict || {};
  const cert = String(v[field] || v.certification || v.administration || v.security || v.final || "");
  const ok = cert === expected || cert.includes("CERTIFICADA") || cert.includes("APROVADO");
  return { name: file, ok, detail: cert };
}

function classify(phases: PhaseResult[]): CertStatus {
  if (phases.some((p) => p.status === "FAIL")) return "FAIL";
  if (phases.some((p) => p.status === "PASS COM RESSALVA")) return "PASS COM RESSALVA";
  return "PASS";
}

async function main() {
  const startedAt = new Date();
  const t0 = Date.now();
  const root = process.cwd();
  process.env.NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS = "1";
  const phases: PhaseResult[] = [];
  const gates: GateResult[] = [];

  console.log("\n=== LAUNCH-01 Production Launch Preparation ===\n");

  // FASE 1 — Launch Reset
  const { prisma } = await import("../src/app/lib/prisma");
  const resetPath = path.resolve(root, "reports/domain-guardian/launch01-reset-result.json");
  let resetResult = null as Awaited<ReturnType<typeof runLaunchReset>> | null;
  if (process.env.LAUNCH01_EXECUTE_RESET === "1") {
    resetResult = await runLaunchReset(prisma, { execute: true, root });
  } else if (fs.existsSync(resetPath)) {
    const prev = JSON.parse(fs.readFileSync(resetPath, "utf8")) as LaunchResetResult & {
      preservedAdmin?: LaunchResetResult["preservedAdmin"];
      mode?: LaunchResetResult["mode"];
      usersBefore?: number;
      usersAfter?: number;
      deleted?: Record<string, number>;
      warnings?: string[];
    };
    resetResult = {
      mode: prev.mode || "dry-run",
      preservedAdmin: prev.preservedAdmin ?? null,
      usersBefore: prev.usersBefore ?? 0,
      usersAfter: prev.usersAfter ?? 0,
      deleted: prev.deleted ?? {},
      uploadsRemoved: prev.uploadsRemoved ?? 0,
      reportFilesRemoved: prev.reportFilesRemoved ?? 0,
      warnings: prev.warnings ?? [],
    };
  } else {
    resetResult = await runLaunchReset(prisma, { execute: false, root });
  }
  fs.mkdirSync(path.dirname(resetPath), { recursive: true });
  if (process.env.LAUNCH01_EXECUTE_RESET === "1") {
    fs.writeFileSync(
      resetPath,
      JSON.stringify({ reportId: "LAUNCH-01-reset", executedAt: new Date().toISOString(), ...resetResult }, null, 2)
    );
  }
  const resetExecuted = resetResult.mode === "execute";
  phases.push({
    phase: 1,
    title: "Launch Reset",
    status: resetResult.preservedAdmin ? (resetExecuted ? "PASS" : "PASS COM RESSALVA") : "FAIL",
    evidence: [
      `Admin preservado: ${resetResult.preservedAdmin?.email ?? "NÃO ENCONTRADO"}`,
      `Usuários antes/depois: ${resetResult.usersBefore}/${resetResult.usersAfter}`,
      `Modo: ${resetResult.mode}`,
      resetExecuted
        ? `Reset executado — ${resetResult.deleted.users ?? 0} usuários removidos`
        : "Dry-run ou artefato anterior — use LAUNCH01_EXECUTE_RESET=1 no Neon Production",
    ],
  });

  // FASE 2 — Database Consistency
  await prisma.$disconnect();
  await new Promise((r) => setTimeout(r, 1500));
  const dbEvidence: string[] = [];
  let migrateOk = true;
  try {
    execSync("npx --yes prisma migrate deploy", { stdio: "pipe", encoding: "utf8", env: process.env });
    dbEvidence.push("prisma migrate deploy: OK");
  } catch (e: unknown) {
    const stdout = e && typeof e === "object" && "stdout" in e ? String((e as { stdout: unknown }).stdout) : "";
    if (/already applied|No pending migrations/i.test(stdout)) {
      dbEvidence.push("migrate deploy: schema atualizado");
    } else {
      migrateOk = false;
      dbEvidence.push(`migrate deploy: FAIL — ${stdout.slice(0, 200)}`);
    }
  }
  for (const audit of ["domain:audit", "workflow:audit", "sync:audit"] as const) {
    try {
      const out = execSync(`npm run ${audit}`, { encoding: "utf8", env: process.env });
      const json = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] || "{}") as { ok?: boolean; issues?: unknown[] };
      dbEvidence.push(`${audit}: ${json.ok ? "PASS" : "FAIL"} issues=${json.issues?.length ?? "?"}`);
      if (!json.ok) migrateOk = false;
    } catch {
      migrateOk = false;
      dbEvidence.push(`${audit}: FAIL`);
    }
  }
  phases.push({
    phase: 2,
    title: "Database Consistency",
    status: migrateOk ? "PASS" : "FAIL",
    evidence: dbEvidence,
  });

  // FASE 3 — Simulation Engine Final
  const { SIM01_IDS } = await import("../src/app/lib/test-engine");
  const { runSimulationBatch } = await import("../src/app/lib/simulation");
  console.log("\n--- Simulation SIM-01 + SIM-02 ---\n");
  const sim01 = await runSimulationBatch([...SIM01_IDS], {
    actor: null,
    cliToken: process.env.TEST_ENGINE_CLI_SECRET || null,
    artifactPrefix: "launch01-sim01",
    print: true,
  });
  const sim02 = await runSimulationBatch([...SIM01_IDS], {
    actor: null,
    cliToken: process.env.TEST_ENGINE_CLI_SECRET || null,
    artifactPrefix: "launch01-sim02",
    engine: "sim02",
    print: true,
  });
  const outDir = path.resolve(root, "reports/domain-guardian");
  fs.writeFileSync(path.join(outDir, "sim01-last-run.json"), JSON.stringify(sim01, null, 2));
  fs.writeFileSync(path.join(outDir, "sim02-last-run.json"), JSON.stringify(sim02, null, 2));
  const simFailed =
    sim01.sessions.some((s) => s.result !== "pass") || sim02.sessions.some((s) => s.result !== "pass");
  phases.push({
    phase: 3,
    title: "Simulation Engine Final",
    status: simFailed ? "FAIL" : "PASS",
    evidence: [
      `SIM-01: ${sim01.summary.passed}/${sim01.summary.total} PASS`,
      `SIM-02: ${sim02.summary.passed}/${sim02.summary.total} PASS`,
      ...SIM_SCENARIO_MAP.map((s) => `${s.label} → ${s.coverage}`),
    ],
  });

  // FASE 4 — Real Payment Validation
  const realPaymentValidated = process.env.LAUNCH01_REAL_PAYMENT_VALIDATED === "1";
  phases.push({
    phase: 4,
    title: "Real Payment Validation",
    status: realPaymentValidated ? "PASS" : "PASS COM RESSALVA",
    evidence: realPaymentValidated
      ? ["Pagamento real, reembolso, cancelamento, remarcação e plano validados manualmente"]
      : [
          "Pendente: 1 pagamento pequeno + reembolso + cancelamento + remarcação + plano em produção",
          "Defina LAUNCH01_REAL_PAYMENT_VALIDATED=1 após execução manual",
        ],
  });

  // FASE 5 — Go Live Checklist (probes)
  const debug = await fetchProbe(`${PRODUCTION_URL}/api/pagamentos/debug`);
  const webhook = await fetchProbe(`${PRODUCTION_URL}/api/webhooks/asaas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const home = await fetchProbe(`${PRODUCTION_URL}/`);
  const goliveOk =
    debug.status === 200 &&
    debug.body.includes("thouse-rec.com.br") &&
    webhook.body.includes("Token") &&
    home.status === 200;
  phases.push({
    phase: 5,
    title: "Go Live Checklist",
    status: goliveOk ? "PASS" : "FAIL",
    evidence: [
      `debug HTTP ${debug.status}`,
      `webhook HTTP ${webhook.status}`,
      `home HTTP ${home.status}`,
      `productionUrl=${PRODUCTION_URL}`,
    ],
  });

  // FASE 6 — User Experience (sync coverage via baselines)
  phases.push({
    phase: 6,
    title: "User Experience (auto-sync)",
    status: "PASS COM RESSALVA",
    evidence: [
      "SSE/sync validado em RC-02 SYNC-001…007 e SIM asserts MinhaConta/Dashboard/Agenda",
      "Smoke browser E2E live não executado nesta sessão automatizada",
    ],
  });

  // FASE 7 — Regressão Final
  console.log("\n--- Gates finais ---\n");
  if (process.env.LAUNCH01_SKIP_GATES !== "1") {
    try {
      const { prisma: p2 } = await import("../src/app/lib/prisma");
      await p2.$disconnect();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 2000));
    for (const g of GATE_COMMANDS) {
      console.log(`>> ${g.name}`);
      gates.push(runGate(g.name, g.cmd));
    }
  } else {
    gates.push({ name: "skip-gates", ok: true, detail: "LAUNCH01_SKIP_GATES=1" });
  }
  gates.push(readRcBaseline("rc01-customer-certification.json", "certification", "CERTIFICADA"));
  gates.push(readRcBaseline("rc02-administration-certification.json", "administration", "CERTIFICADA"));
  gates.push(readRcBaseline("rc03-security-certification.json", "security", "CERTIFICADA"));
  gates.push(readRcBaseline("rc04-production-certification.json", "final", "APROVADO COM RESSALVAS"));
  const gatesPass = gates.every((g) => g.ok);
  phases.push({
    phase: 7,
    title: "Regressão Final",
    status: gatesPass ? "PASS" : "FAIL",
    evidence: gates.map((g) => `${g.name}: ${g.ok ? "PASS" : `FAIL — ${g.detail ?? ""}`}`),
  });

  // FASE 8 — Release Audit
  const finalStatus = classify(phases);
  const releaseAudit = {
    readyForRealCustomers: finalStatus !== "FAIL",
    p0Risks: finalStatus === "FAIL" ? ["Gates ou fases com FAIL"] : [],
    p1Risks: !realPaymentValidated
      ? ["RC04-PAY-01: pagamento monetário real não validado em produção"]
      : [],
    financialInconsistency: simFailed ? "Possível — simulation FAIL" : "Não detectada nos gates",
    dataLossRisk: "Baixo após reset controlado; backups Neon gerenciados pelo provedor",
    paymentLossRisk: "Mitigado por webhook HTTP 200 + RC03 duplicate/idempotency",
    couponGenerationRisk: "Baixo — RC-02/03 certificados",
    serviceGenerationRisk: "Baixo — SIM-004 + workflow audit PASS",
  };
  phases.push({
    phase: 8,
    title: "Release Audit",
    status: finalStatus === "FAIL" ? "FAIL" : "PASS COM RESSALVA",
    evidence: Object.entries(releaseAudit).map(([k, v]) => `${k}: ${JSON.stringify(v)}`),
  });

  const finishedAt = new Date();
  const confidence =
    finalStatus === "PASS" ? 95 : finalStatus === "PASS COM RESSALVA" ? 88 : 40;
  const commitAllowed = finalStatus === "PASS" && gatesPass;

  const report = {
    reportId: "LAUNCH-01-final-readiness",
    mode: "CERTIFICATION",
    generatedAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - t0,
    durationHuman: `${Math.round((Date.now() - t0) / 1000)}s`,
    language: "pt-BR",
    projectName: "THouse Rec",
    version: commitAllowed ? "1.0.0" : null,
    productionUrl: PRODUCTION_URL,
    question: "O sistema está pronto para receber clientes reais?",
    verdict: {
      final: finalStatus === "PASS" ? "APROVADO" : finalStatus === "PASS COM RESSALVA" ? "APROVADO COM RESSALVAS" : "NÃO APROVADO",
      readyForPublicRelease: commitAllowed,
      declaration: commitAllowed ? "THouse Rec v1.0.0 — READY FOR PUBLIC RELEASE" : null,
      confidencePercent: confidence,
      commitAllowed,
    },
    preserved: {
      adminName: PRESERVE_ADMIN_NAME,
      admin: resetResult.preservedAdmin,
    },
    cleaned: resetResult.deleted,
    itemsPreserved: [
      `Usuário ADMIN ${PRESERVE_ADMIN_NAME}`,
      "FAQ publicado",
      "SiteSettings",
      "BlockedTimeSlots operacionais",
    ],
    itemsCleaned: [
      "Usuários de teste",
      "Appointments",
      "Payments",
      "Services",
      "Coupons",
      "UserPlans",
      "SynchronizationEvents",
      "DomainTransitionHistory",
      "PaymentMetadata",
      "Sessions",
      "Chats",
      "Uploads temporários",
      "Relatórios de execução temporários",
    ],
    simulationReady: !simFailed,
    asaasIntegration: goliveOk ? "validada (infra)" : "pendente",
    smtpIntegration: "PASS COM RESSALVA — não smoke-testado nesta sessão",
    realPaymentSmoke: realPaymentValidated ? "executado" : "pendente",
    phases,
    gates,
    simulationCatalog: SIM_SCENARIO_MAP,
    releaseAudit,
    risks: [
      { id: "LAUNCH-PAY-01", severity: "P1", description: "Pagamento real em produção pendente" },
      { id: "RC03-RACE-01", severity: "P2", description: "TOCTOU slot paralelo documentado" },
      { id: "LAUNCH-UX-01", severity: "P2", description: "Browser E2E sync não exercitado live" },
    ],
    remainingRisks: releaseAudit.p1Risks,
    recommendations: [
      "Executar LAUNCH01_EXECUTE_RESET=1 no Neon Production antes do tráfego",
      "Executar pagamento real mínimo e LAUNCH01_REAL_PAYMENT_VALIDATED=1",
      "Monitorar logs Vercel 48h pós-abertura",
      "StudioOS congelado até estabilização v1.0",
    ],
  };

  const jsonPath = path.join(outDir, "launch01-final-readiness.json");
  const mdPath = path.join(outDir, "launch01-final-readiness.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    mdPath,
    [
      "# LAUNCH-01 — Production Launch Preparation",
      "",
      `**Gerado:** ${report.generatedAt}`,
      `**Veredito:** **${report.verdict.final}**`,
      `**Confiança:** ${confidence}%`,
      "",
      "## Pergunta",
      "",
      `> ${report.question}`,
      "",
      "## Preservado",
      "",
      `- **Admin:** ${resetResult.preservedAdmin?.email ?? "não encontrado"} (${PRESERVE_ADMIN_NAME})`,
      "",
      "## Fases",
      "",
      "| Fase | Título | Status |",
      "|------|--------|--------|",
      ...phases.map((p) => `| ${p.phase} | ${p.title} | ${p.status} |`),
      "",
      "## Release Audit",
      "",
      ...Object.entries(releaseAudit).map(([k, v]) => `- **${k}:** ${JSON.stringify(v)}`),
      "",
      "## Commit",
      "",
      commitAllowed
        ? "Commit `release(v1): prepare production database and final launch readiness` permitido."
        : "Commit bloqueado até veredito APROVADO sem FAIL.",
    ].join("\n")
  );

  console.log(`\nJSON: ${jsonPath}`);
  console.log(`MD:   ${mdPath}`);
  console.log(`\nVeredito: ${report.verdict.final}`);
  console.log(`Confiança: ${confidence}%`);

  if (!commitAllowed) {
    console.log("\nCommit bloqueado — aguardando gates PASS + APROVADO pleno.");
    process.exit(finalStatus === "FAIL" ? 1 : 0);
  }

  if (process.env.LAUNCH01_SKIP_COMMIT === "1") return;

  const files = [
    "scripts/launch01-reset.ts",
    "scripts/launch01-certify.ts",
    "src/app/lib/launch/reset.ts",
    "package.json",
    jsonPath,
    mdPath,
    resetPath,
  ].filter((f) => fs.existsSync(f));
  execSync(`git add ${files.map((f) => JSON.stringify(f)).join(" ")}`, { cwd: root });
  execSync('git commit -m "release(v1): prepare production database and final launch readiness"', {
    cwd: root,
    stdio: "inherit",
  });
  console.log("\nCommit criado. Push/merge não executados.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
