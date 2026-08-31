/**
 * GO-02 — Release Assembly.
 *
 *   npm run go02:assemble           # cleanup + gates + relatórios
 *   npm run go02:assemble -- --commit  # commit se todos gates PASS
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

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

/** Artefatos de execução — removidos na Fase 2 (não são documentação final). */
const EPHEMERAL_REPORT_PATTERNS = [
  /-audit-latest\.json$/,
  /-last-run\.json$/,
  /^latest\.json$/,
  /^execution-status\.(json|md)$/,
  /^execution-plan-EB-\d+\.(json|md)$/,
  /^2026-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
];

const OFFICIAL_NPM_SCRIPTS = [
  "dev",
  "build",
  "start",
  "lint",
  "postinstall",
  "seed",
  "te:list",
  "te:run",
  "te:suite:te02a",
  "te:suite:sync01a",
  "te:suite:ph01",
  "te:suite:rc01",
  "rc:certify",
  "rc02:certify",
  "rc03:certify",
  "rc04:certify",
  "te:suite:rc02",
  "te:suite:rc03",
  "domain:audit",
  "workflow:audit",
  "workflow:smoke",
  "sync:audit",
  "sim:list",
  "sim:run",
  "sim:batch",
  "sim:cleanup",
  "sim:report",
  "sim:audit",
  "sim:watch",
  "sim:batch:sim02",
  "exec:audit",
  "graph:audit",
  "discovery:audit",
  "regression:audit",
  "golive:cleanup",
  "launch01:reset",
  "launch01:certify",
  "go01:orchestrate",
  "go02:assemble",
  "migrate:postgresql",
];

const GATE_COMMANDS: Array<{ name: string; cmd: string }> = [
  { name: "typescript", cmd: "npx --yes tsc --noEmit -p tsconfig.json" },
  { name: "prisma-validate", cmd: "npx --yes prisma validate" },
  { name: "build", cmd: "npx --yes prisma generate && node --use-system-ca ./node_modules/next/dist/bin/next build" },
  { name: "workflow-smoke", cmd: "npm run workflow:smoke" },
  { name: "domain-audit", cmd: "npm run domain:audit" },
  { name: "workflow-audit", cmd: "npm run workflow:audit" },
  { name: "sync-audit", cmd: "npm run sync:audit" },
  { name: "sim-audit", cmd: "npm run sim:audit" },
  { name: "exec-audit", cmd: "npm run exec:audit" },
  { name: "graph-audit", cmd: "npm run graph:audit" },
  { name: "discovery-audit", cmd: "npm run discovery:audit" },
  { name: "sim-batch", cmd: "npm run sim:batch" },
  { name: "sim-batch-sim02", cmd: "npm run sim:batch:sim02" },
  { name: "regression-audit", cmd: "npm run regression:audit" },
];

const REQUIRED_ENV = [
  "DATABASE_URL",
  "ASAAS_API_KEY",
  "ASAAS_WEBHOOK_ACCESS_TOKEN",
  "NEXT_PUBLIC_SITE_URL",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "SESSION_SECRET",
  "GO_LIVE_MAINTENANCE_MODE",
];

const FINAL_DOC_REPORTS = [
  "go01-release-orchestration.md",
  "go01-release-orchestration.json",
  "go02-release-assembly.md",
  "go02-release-assembly.json",
  "rc01-customer-certification.md",
  "rc02-administration-certification.md",
  "rc03-security-certification.md",
  "rc04-production-certification.md",
  "launch01-final-readiness.md",
  "e2e01-customer-journey.md",
  "e2e02-hardening-plan.md",
  "te01c-official-test-catalog.md",
];

type GateResult = { name: string; ok: boolean; detail?: string };
type CleanupItem = { path: string; reason: string };

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", cwd: ROOT }).trim();
}

function runGate(name: string, cmd: string): GateResult {
  try {
    execSync(cmd, {
      stdio: "inherit",
      cwd: ROOT,
      env: {
        ...process.env,
        NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: "1",
      },
    });
    return { name, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { name, ok: false, detail: msg.slice(0, 500) };
  }
}

function listMigrations(): string[] {
  const dir = path.join(ROOT, "prisma/migrations");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory())
    .sort();
}

function isEphemeralReport(filename: string): boolean {
  return EPHEMERAL_REPORT_PATTERNS.some((re) => re.test(filename));
}

function runCleanup(): CleanupItem[] {
  const removed: CleanupItem[] = [];

  if (fs.existsSync(REPORTS_DIR)) {
    for (const file of fs.readdirSync(REPORTS_DIR)) {
      if (!isEphemeralReport(file)) continue;
      const full = path.join(REPORTS_DIR, file);
      if (!fs.existsSync(full)) continue;
      fs.unlinkSync(full);
      removed.push({ path: `reports/domain-guardian/${file}`, reason: "artefato de execução temporário" });
    }
  }

  const gitignorePath = path.join(ROOT, ".gitignore");
  const gitignoreAdditions = [
    "",
    "# GO-02 — artefatos regeneráveis (não versionar)",
    "reports/domain-guardian/*-audit-latest.json",
    "reports/domain-guardian/*-last-run.json",
    "reports/domain-guardian/latest.json",
    "reports/domain-guardian/execution-status.json",
    "reports/domain-guardian/execution-status.md",
    "reports/domain-guardian/execution-plan-EB-*.json",
    "reports/domain-guardian/execution-plan-EB-*.md",
    "reports/domain-guardian/2026-*.json",
  ];
  let gitignore = fs.readFileSync(gitignorePath, "utf8");
  if (!gitignore.includes("GO-02 — artefatos regeneráveis")) {
    fs.writeFileSync(gitignorePath, gitignore + gitignoreAdditions.join("\n") + "\n");
    removed.push({ path: ".gitignore", reason: "ignorar artefatos efêmeros futuros" });
  }

  for (const folder of ["public/uploads/tmp", "public/uploads/temp", "public/uploads/homolog"]) {
    const full = path.join(ROOT, folder);
    if (!fs.existsSync(full)) continue;
    for (const entry of fs.readdirSync(full)) {
      const p = path.join(full, entry);
      if (fs.statSync(p).isFile()) {
        fs.unlinkSync(p);
        removed.push({ path: `${folder}/${entry}`, reason: "upload homolog temporário" });
      }
    }
  }

  return removed;
}

function parseDiffNameStatus(): {
  modified: string[];
  added: string[];
  deleted: string[];
  renamed: string[];
} {
  const out = sh("git diff origin/main...HEAD --name-status");
  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  const renamed: string[] = [];
  for (const line of out.split("\n").filter(Boolean)) {
    const [status, ...rest] = line.split("\t");
    const file = rest[rest.length - 1];
    if (status.startsWith("R")) renamed.push(file);
    else if (status === "M") modified.push(file);
    else if (status === "A") added.push(file);
    else if (status === "D") deleted.push(file);
  }
  return { modified, added, deleted, renamed };
}

function validateMigrations(): GateResult[] {
  const migrations = listMigrations();
  const results: GateResult[] = [];

  results.push({
    name: "migration-count",
    ok: migrations.length >= 30,
    detail: `${migrations.length} migrations`,
  });

  const required = [
    "20260712120000_hs01_cpf_unique_service_appointment",
    "20260713210000_hs03b_domain_transition_log",
    "20260713220000_hs03b_domain_transition_history",
    "20260714220000_sync01a_synchronization_event",
  ];
  for (const id of required) {
    results.push({
      name: `migration-${id}`,
      ok: migrations.includes(id),
      detail: migrations.includes(id) ? "presente" : "ausente",
    });
  }

  const orderOk = migrations.every((m, i, arr) => i === 0 || arr[i - 1] <= m);
  results.push({
    name: "migration-chronological-order",
    ok: orderOk,
    detail: orderOk ? "ordem lexicográfica OK" : "ordem inválida",
  });

  for (const id of migrations) {
    const sqlPath = path.join(ROOT, "prisma/migrations", id, "migration.sql");
    results.push({
      name: `migration-sql-${id.slice(0, 8)}`,
      ok: fs.existsSync(sqlPath),
      detail: fs.existsSync(sqlPath) ? "OK" : "migration.sql ausente",
    });
  }

  results.push({
    name: "migration-rollback-note",
    ok: true,
    detail: "Rollback = Neon PITR restore; prisma migrate não suporta down automático",
  });

  return results;
}

function validatePackage(): GateResult[] {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const results: GateResult[] = [];

  for (const script of OFFICIAL_NPM_SCRIPTS) {
    results.push({
      name: `npm-script-${script}`,
      ok: Boolean(pkg.scripts[script]),
      detail: pkg.scripts[script] ? "definido" : "ausente",
    });
  }

  const scriptFiles = OFFICIAL_NPM_SCRIPTS.filter((s) => s.includes(":") || s === "seed")
    .map((s) => {
      const cmd = pkg.scripts[s] || "";
      const m = cmd.match(/scripts\/[\w-]+\.(ts|js)/);
      return m ? m[0] : null;
    })
    .filter(Boolean) as string[];

  for (const sf of [...new Set(scriptFiles)]) {
    results.push({
      name: `script-file-${path.basename(sf)}`,
      ok: fs.existsSync(path.join(ROOT, sf)),
      detail: fs.existsSync(path.join(ROOT, sf)) ? "existe" : "ausente",
    });
  }

  results.push({
    name: "deps-prisma",
    ok: Boolean(pkg.dependencies["@prisma/client"]),
    detail: "@prisma/client",
  });
  results.push({
    name: "deps-next",
    ok: Boolean(pkg.dependencies["next"]),
    detail: "next",
  });

  return results;
}

function buildManifest(commits: string[], migrations: string[]) {
  return {
    version: "1.0.0-rc",
    releaseBranch: "backup-pre-formatacao",
    productionBranch: "main",
    generatedAt: new Date().toISOString(),
    commitsIncluded: commits,
    commitCount: commits.length,
    migrations: migrations.map((id) => ({
      id,
      path: `prisma/migrations/${id}/migration.sql`,
    })),
    migrationCount: migrations.length,
    scripts: OFFICIAL_NPM_SCRIPTS.map((name) => ({ name, npm: `npm run ${name}` })),
    dependencies: {
      runtime: Object.keys(
        JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).dependencies
      ),
    },
    requiredEnv: REQUIRED_ENV,
    breakingChanges: [
      "User.cpf agora @unique — duplicatas existentes bloqueiam migration HS-01",
      "Coupon.couponType canônico expandido (plano|agendamento|reembolso|desconto|remarcacao|test|bonus)",
      "Novas tabelas DomainTransitionHistory e SynchronizationEvent",
      "launch01:reset exige confirmações explícitas (--confirm-local/preview/production)",
      "GO_LIVE_MAINTENANCE_MODE bloqueia cadastro/compra/agendamento para não-admin",
    ],
    fixes: [
      "GL-01 auto-login pós-registro",
      "HS-01 Service.appointmentId FK + CPF unique",
      "HS-03B state machine + DomainTransitionHistory",
      "SYNC-01A outbox SynchronizationEvent",
      "RC-01/02/03 jornada, admin e segurança certificados",
      "GO-01 orquestração go-live + modo manutenção",
    ],
    features: [
      "Test Engine (TE-01B/02A)",
      "Simulation Engine (SIM-01/02)",
      "Synchronization Engine (SYNC-01A)",
      "Execution Core (EC-01)",
      "Domain audits + certification pipeline (RC-01…04)",
      "Launch reset com preservação ADMIN",
    ],
    pending: [
      "Push origin/main (15 commits locais)",
      "Deploy Vercel Production",
      "prisma migrate deploy em Neon",
      "Reset homolog produção (triple-confirm)",
      "Pagamento real smoke em produção",
      "SMTP smoke test",
      "GO_LIVE_MAINTENANCE_MODE ativar/desativar no deploy",
    ],
    finalDocumentation: FINAL_DOC_REPORTS,
  };
}

function buildMarkdown(report: Record<string, unknown>): string {
  const manifest = report.manifest as ReturnType<typeof buildManifest>;
  const diff = report.releaseDiff as ReturnType<typeof parseDiffNameStatus>;
  const gates = report.gates as { allPass: boolean; results: GateResult[] };
  const cleanup = report.cleanup as CleanupItem[];
  const readiness = report.readiness as { ready: boolean; verdict: string; justification: string };

  const lines = [
    "# GO-02 — Release Assembly",
    "",
    `**Gerado em:** ${report.generatedAt} · **Versão:** ${manifest.version}`,
    "",
    "## Veredito",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Release Readiness | **${readiness.verdict}** |`,
    `| Pronta para substituir main? | **${readiness.ready ? "SIM" : "NÃO"}** |`,
    `| Gates finais | ${gates.allPass ? "ALL PASS" : "FAIL"} |`,
    `| Confiança | ${report.confidencePercent}% |`,
    "",
    `### Justificativa`,
    "",
    readiness.justification,
    "",
    "---",
    "",
    "## Fase 1 — Release Review",
    "",
    `| Item | Valor |`,
    `|------|-------|`,
    `| Branch release | \`${manifest.releaseBranch}\` |`,
    `| Base produção | \`${manifest.productionBranch}\` |`,
    `| Commits incluídos | ${manifest.commitCount} |`,
    `| Arquivos alterados vs main | ${diff.modified.length} modificados, ${diff.added.length} novos, ${diff.deleted.length} removidos |`,
    "",
    "### Commits",
    "",
    ...manifest.commitsIncluded.map((c) => `- \`${c}\``),
    "",
    "---",
    "",
    "## Fase 2 — Repository Cleanup",
    "",
    `Itens removidos/ajustados: **${cleanup.length}**`,
    "",
    ...cleanup.slice(0, 40).map((c) => `- \`${c.path}\` — ${c.reason}`),
    ...(cleanup.length > 40 ? [`- … e mais ${cleanup.length - 40}`] : []),
    "",
    "---",
    "",
    "## Fase 3 — Release Manifest",
    "",
    "### Migrations (${manifest.migrationCount})",
    "",
    ...manifest.migrations.map((m) => `- \`${m.id}\``),
    "",
    "### Breaking changes",
    "",
    ...manifest.breakingChanges.map((b) => `- ${b}`),
    "",
    "### Correções",
    "",
    ...manifest.fixes.map((f) => `- ${f}`),
    "",
    "### Novidades",
    "",
    ...manifest.features.map((f) => `- ${f}`),
    "",
    "### Pendências operacionais",
    "",
    ...manifest.pending.map((p) => `- ${p}`),
    "",
    "---",
    "",
    "## Fase 4 — Release Diff (main → release)",
    "",
    `| Tipo | Quantidade |`,
    `|------|------------|`,
    `| Modificados | ${diff.modified.length} |`,
    `| Novos | ${diff.added.length} |`,
    `| Removidos | ${diff.deleted.length} |`,
    `| Renomeados | ${diff.renamed.length} |`,
    "",
    "---",
    "",
    "## Fase 5 — Migration Check",
    "",
    ...((report.migrationCheck as GateResult[]) || []).map(
      (g) => `- [${g.ok ? "PASS" : "FAIL"}] **${g.name}**: ${g.detail || ""}`
    ),
    "",
    "---",
    "",
    "## Fase 6 — Package Validation",
    "",
    ...((report.packageCheck as GateResult[]) || [])
      .filter((g) => !g.ok)
      .slice(0, 20)
      .map((g) => `- [FAIL] ${g.name}: ${g.detail}`),
    "",
    `Scripts oficiais validados: ${((report.packageCheck as GateResult[]) || []).filter((g) => g.name.startsWith("npm-script-")).every((g) => g.ok) ? "PASS" : "verificar falhas"}`,
    "",
    "---",
    "",
    "## Fase 7 — Final Gates",
    "",
    ...gates.results.map((g) => `- [${g.ok ? "PASS" : "FAIL"}] ${g.name}${g.detail ? `: ${g.detail.slice(0, 120)}` : ""}`),
    "",
    "---",
    "",
    "## Fase 8 — Release Readiness",
    "",
    `**${readiness.ready ? "SIM" : "NÃO"}** — ${readiness.justification}`,
    "",
    "Nenhum merge, push ou deploy executado. Aguardar aprovação humana.",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const releaseBranch = sh("git branch --show-current");
  const head = sh("git rev-parse HEAD");
  const mainHead = sh("git rev-parse origin/main");
  const commits = sh("git log origin/main..HEAD --oneline").split("\n").filter(Boolean);
  const migrations = listMigrations();

  const releaseDiff = parseDiffNameStatus();
  const migrationCheck = validateMigrations();
  const packageCheck = validatePackage();
  let cleanup: CleanupItem[] = [];

  console.log("\n[GO-02] Fase 7 — Final gates…");
  const gateResults: GateResult[] = [];
  for (const g of GATE_COMMANDS) {
    console.log(`\n--- gate: ${g.name} ---`);
    gateResults.push(runGate(g.name, g.cmd));
  }

  const structuralGates = [...migrationCheck, ...packageCheck];
  const allGates = [...gateResults, ...structuralGates];
  const allPass = allGates.every((g) => g.ok);

  if (allPass) {
    console.log("\n[GO-02] Fase 2 — Repository cleanup (pós-gates)…");
    cleanup = runCleanup();
    for (const item of cleanup) {
      console.log(`  removido: ${item.path}`);
    }
  } else {
    console.log("\n[GO-02] Cleanup ignorado — gates com falha.");
  }

  const manifest = buildManifest(commits, migrations);

  const technicalReady = allPass && migrationCheck.every((m) => m.ok);
  const readiness = {
    ready: technicalReady,
    verdict: technicalReady ? "APROVADO — candidata v1.0" : "BLOQUEADO — corrigir gates",
    justification: technicalReady
      ? "Todos os gates técnicos (TypeScript, build, Prisma, auditorias) passaram. A branch consolida 15 commits de hardening, certificação RC e GO-01. Pendências restantes são operacionais (push, deploy, pagamento real, reset produção) documentadas em GO-01 — não bloqueiam substituição técnica da main após revisão humana."
      : `Gates com falha: ${allGates.filter((g) => !g.ok).map((g) => g.name).join(", ")}. Corrigir antes de substituir main.`,
  };

  const confidencePercent = allPass ? (technicalReady ? 92 : 70) : 45;

  const report = {
    reportId: "GO-02-release-assembly",
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    projectName: "THouse",
    version: "1.0.0-rc",
    mode: "ASSEMBLY_ONLY",
    confidencePercent,
    inventory: {
      releaseBranch,
      head,
      mainHead,
      productionUrl: PRODUCTION_URL,
      commitsAhead: commits.length,
    },
    cleanup,
    manifest,
    releaseDiff: {
      ...releaseDiff,
      summary: {
        modified: releaseDiff.modified.length,
        added: releaseDiff.added.length,
        deleted: releaseDiff.deleted.length,
        renamed: releaseDiff.renamed.length,
      },
    },
    migrationCheck,
    packageCheck,
    gates: { allPass, results: gateResults },
    readiness,
    constraints: {
      noMerge: true,
      noPush: true,
      noDeploy: true,
      noNewFeatures: true,
    },
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const jsonPath = path.join(REPORTS_DIR, "go02-release-assembly.json");
  const mdPath = path.join(REPORTS_DIR, "go02-release-assembly.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, buildMarkdown(report));

  console.log(`\nRelatórios:\n  ${jsonPath}\n  ${mdPath}`);
  console.log(`\nReadiness: ${readiness.ready ? "SIM" : "NÃO"} — ${readiness.verdict}`);
  console.log(`Gates: ${allPass ? "ALL PASS" : "FAIL"}`);

  if (!allPass) {
    console.error("\nFalhas:");
    for (const g of allGates.filter((r) => !r.ok)) {
      console.error(`  - ${g.name}: ${g.detail || "FAIL"}`);
    }
    process.exit(1);
  }

  if (process.argv.includes("--commit")) {
    const filesToStage = [
      ".gitignore",
      "package.json",
      "scripts/go02-assemble.ts",
      "scripts/launch01-certify.ts",
      "scripts/rc04-certify.ts",
      "scripts/launch01-reset.ts",
      "src/app/lib/execution/permissions.ts",
      "src/app/lib/test-engine/scenarios/rc03-batch.ts",
      "prisma/migrations/20260713220000_hs03b_domain_transition_history/",
      "prisma/migrations/20260714220000_sync01a_synchronization_event/migration.sql",
      "reports/domain-guardian/go02-release-assembly.json",
      "reports/domain-guardian/go02-release-assembly.md",
      "reports/domain-guardian/rc04-production-certification.json",
      "reports/domain-guardian/rc04-production-certification.md",
      "reports/domain-guardian/launch01-final-readiness.json",
      "reports/domain-guardian/launch01-final-readiness.md",
      "reports/domain-guardian/launch01-reset-result.json",
      "reports/domain-guardian/te01c-official-test-catalog.json",
      "reports/domain-guardian/te01c-official-test-catalog.md",
    ];
    for (const item of cleanup) {
      if (item.path !== ".gitignore") filesToStage.push(item.path);
    }
    sh(`git add ${filesToStage.map((f) => JSON.stringify(f)).join(" ")}`);
    try {
      sh("git add -u reports/domain-guardian/");
    } catch {
      /* noop */
    }
    try {
      sh("git add -u public/uploads/");
    } catch {
      /* noop */
    }
    const status = sh("git status --porcelain");
    if (status) {
      sh('git commit -m "docs(release): assemble v1.0 release candidate"');
      console.log("\nCommit criado. Merge/push/deploy NÃO realizados.");
    }
  } else {
    console.log("\nPara commitar: npm run go02:assemble -- --commit");
  }
}

main().catch((err) => {
  console.error("[go02-assemble]", err);
  process.exit(1);
});
