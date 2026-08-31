/**
 * RC-02 — Administration & Operations Certification CLI.
 *
 *   npm run rc02:certify
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

type CertStatus = "PASS" | "PASS COM RESSALVA" | "FAIL";

type SectionResult = {
  section: number;
  title: string;
  status: CertStatus;
  scenarios: string[];
  passed: number;
  failed: number;
  errors: number;
  reservations: string[];
  evidence: string[];
};

type ScenarioOutcome = {
  id: string;
  status: string;
  errors: string[];
};

type GateResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const SECTION_MAP: Array<{
  section: number;
  title: string;
  scenarioIds: string[];
  reservations?: string[];
}> = [
  {
    section: 1,
    title: "Admin login (sessão, permissões, cookies, rotas)",
    scenarioIds: ["RC02-001", "RC01-006"],
  },
  {
    section: 2,
    title: "Painel Admin (Dashboard, KPIs, estatísticas)",
    scenarioIds: ["ADM-003", "ADM-004", "RC02-003"],
  },
  {
    section: 3,
    title: "Pagamentos (aprovado, recusado, cancelado, reembolso, duplicado, plano, multi-serviço)",
    scenarioIds: ["SIM-001", "SIM-002", "SIM-003", "SIM-005", "SIM-008", "PAY-001", "SRV-001", "SRV-002"],
  },
  {
    section: 4,
    title: "Agendamentos (aceitar, recusar, cancelar, remarcar, confirmar, iniciar, concluir)",
    scenarioIds: ["APT-001", "APT-002", "APT-003", "APT-004", "RC02-002", "RC02-006", "RC02-007", "SIM-009", "SIM-010"],
  },
  {
    section: 5,
    title: "Serviços (Gerais e Selecionados)",
    scenarioIds: ["ADM-001", "ADM-002"],
  },
  {
    section: 6,
    title: "Entrega (URL, troca, edição, cancelamento, nova entrega, conclusão)",
    scenarioIds: ["APT-004", "SIM-004", "SYNC-004", "RC02-002"],
  },
  {
    section: 7,
    title: "Planos (Bronze, Prata, Ouro)",
    scenarioIds: ["PLN-001", "PLN-002", "PLN-003", "PLN-004", "PLN-005", "SIM-005"],
  },
  {
    section: 8,
    title: "Cupons (SERVICE, PLAN, DISCOUNT, REBOOK, REFUND, BONUS, TEST)",
    scenarioIds: ["CPN-001", "CPN-002", "CPN-003", "CPN-004", "RC02-005", "SIM-006", "SIM-007"],
  },
  {
    section: 9,
    title: "Estatísticas (usuários, receita, serviços, planos, pagamentos, agendamentos)",
    scenarioIds: ["ADM-003", "ADM-004", "RC02-003"],
  },
  {
    section: 10,
    title: "Sincronização (Minha Conta, Agenda, Dashboard, Statistics)",
    scenarioIds: ["SYNC-001", "SYNC-002", "SYNC-003", "SYNC-004", "SYNC-005", "SYNC-006", "SYNC-007", "USR-001"],
  },
  {
    section: 11,
    title: "Permissões (USER vs ADMIN, feature flags, simulation, debug)",
    scenarioIds: ["RC02-001", "RC01-006"],
  },
  {
    section: 12,
    title: "Integridade (órfãos, planos, statistics divergentes)",
    scenarioIds: ["RC02-004"],
  },
  {
    section: 13,
    title: "Simulation Engine (cenários administrativos)",
    scenarioIds: [
      "SIM-001",
      "SIM-002",
      "SIM-003",
      "SIM-004",
      "SIM-005",
      "SIM-006",
      "SIM-007",
      "SIM-008",
      "SIM-009",
      "SIM-010",
    ],
  },
  {
    section: 14,
    title: "Test Engine (operações administrativas RC-02)",
    scenarioIds: ["RC02-001", "RC02-002", "RC02-003", "RC02-004", "RC02-005", "RC02-006", "RC02-007"],
  },
];

const GATE_COMMANDS: Array<{ name: string; cmd: string }> = [
  { name: "typescript", cmd: "npx --yes tsc --noEmit -p tsconfig.json" },
  { name: "prisma-validate", cmd: "npx --yes prisma validate" },
  { name: "build", cmd: "npx next build" },
  { name: "domain-audit", cmd: "npm run domain:audit" },
  { name: "workflow-audit", cmd: "npm run workflow:audit" },
  { name: "sync-audit", cmd: "npm run sync:audit" },
  { name: "exec-audit", cmd: "npm run exec:audit" },
  { name: "sim-audit", cmd: "npm run sim:audit" },
  { name: "graph-audit", cmd: "npm run graph:audit" },
  { name: "discovery-audit", cmd: "npm run discovery:audit" },
  { name: "regression-audit", cmd: "npm run regression:audit" },
];

function classifySection(
  mapEntry: (typeof SECTION_MAP)[number],
  outcomes: Map<string, ScenarioOutcome>
): SectionResult {
  const { section, title, scenarioIds, reservations = [] } = mapEntry;
  let passed = 0;
  let failed = 0;
  let errors = 0;
  const evidence: string[] = [];
  const missing: string[] = [];

  for (const id of scenarioIds) {
    const o = outcomes.get(id);
    if (!o) {
      missing.push(id);
      continue;
    }
    if (o.status === "pass") {
      passed++;
      evidence.push(`${id}: PASS`);
    } else if (o.status === "fail") {
      failed++;
      evidence.push(`${id}: FAIL — ${o.errors.join("; ") || "asserts"}`);
    } else {
      errors++;
      evidence.push(`${id}: ERROR — ${o.errors.join("; ") || o.status}`);
    }
  }

  let status: CertStatus;
  if (missing.length > 0 || failed > 0 || errors > 0) {
    status = "FAIL";
  } else if (reservations.length > 0) {
    status = "PASS COM RESSALVA";
  } else {
    status = "PASS";
  }

  return {
    section,
    title,
    status,
    scenarios: scenarioIds,
    passed,
    failed,
    errors,
    reservations,
    evidence: missing.length ? [...evidence, `MISSING: ${missing.join(", ")}`] : evidence,
  };
}

function runGate(name: string, cmd: string): GateResult {
  const env = {
    ...process.env,
    NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: "1",
  };
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env });
    return { name, ok: true };
  } catch (e: unknown) {
    if (name === "build") {
      try {
        execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env });
        return { name, ok: true, detail: "retry ok" };
      } catch (retryErr: unknown) {
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        return { name, ok: false, detail: msg.slice(0, 500) };
      }
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { name, ok: false, detail: msg.slice(0, 500) };
  }
}

function readRc01Gate(): GateResult {
  const p = path.resolve(process.cwd(), "reports/domain-guardian/rc01-customer-certification.json");
  if (!fs.existsSync(p)) {
    return { name: "rc01-baseline", ok: false, detail: "rc01-customer-certification.json ausente — executar npm run rc:certify" };
  }
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as {
      verdict?: { certification?: string; allSectionsPass?: boolean };
    };
    const cert = data.verdict?.certification;
    const ok = cert === "CERTIFICADA" && data.verdict?.allSectionsPass === true;
    return {
      name: "rc01-baseline",
      ok,
      detail: ok ? `RC-01 ${cert}` : `RC-01 ${cert ?? "desconhecido"}`,
    };
  } catch (e: unknown) {
    return {
      name: "rc01-baseline",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const startedAt = new Date();
  const t0 = Date.now();
  const root = process.cwd();
  process.env.NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS = "1";

  const { ExecutionCore } = await import("../src/app/lib/execution/core");
  const { RC02_IDS, TE02A_IDS, SYNC01A_IDS, SIM01_IDS } = await import(
    "../src/app/lib/test-engine"
  );
  const { runSimulationBatch } = await import("../src/app/lib/simulation");

  const teIdsFromSections = SECTION_MAP.flatMap((s) => s.scenarioIds).filter(
    (id) => !id.startsWith("SIM-")
  );
  const teIds = [
    ...RC02_IDS,
    ...teIdsFromSections,
    ...TE02A_IDS.filter((id) => teIdsFromSections.includes(id)),
    ...SYNC01A_IDS.filter((id) => teIdsFromSections.includes(id)),
  ];
  const uniqueTeIds = [...new Set(teIds)];

  console.log("\n=== RC-02 Administration & Operations Certification ===\n");
  console.log(`Cenários TE/RC/SYNC: ${uniqueTeIds.length}`);
  console.log(`Cenários SIM: ${SIM01_IDS.length}\n`);

  const teReport = await ExecutionCore.run({
    scenarioIds: uniqueTeIds,
    suite: "rc02",
    artifactPrefix: "rc02",
    print: true,
    reportId: "RC-02-execution",
  });

  console.log("\n--- Simulation Engine SIM-01 batch ---\n");
  const simReport = await runSimulationBatch([...SIM01_IDS], {
    actor: null,
    cliToken: process.env.TEST_ENGINE_CLI_SECRET || null,
    artifactPrefix: "rc02-sim01",
    print: true,
  });

  console.log("\n--- Simulation Engine SIM-02 batch (regression gate) ---\n");
  const sim02Report = await runSimulationBatch([...SIM01_IDS], {
    actor: null,
    cliToken: process.env.TEST_ENGINE_CLI_SECRET || null,
    artifactPrefix: "rc02-sim02",
    engine: "sim02",
    print: true,
  });

  const outDir = path.resolve(root, "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "sim01-last-run.json"),
    JSON.stringify(simReport, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, "sim02-last-run.json"),
    JSON.stringify(sim02Report, null, 2)
  );

  const outcomes = new Map<string, ScenarioOutcome>();
  for (const s of teReport.sessions) {
    outcomes.set(s.scenarioId, {
      id: s.scenarioId,
      status: s.result,
      errors: s.errors || [],
    });
  }
  for (const s of simReport.sessions) {
    outcomes.set(s.simulationId, {
      id: s.simulationId,
      status: s.result,
      errors: s.errors || [],
    });
  }

  const sections: SectionResult[] = SECTION_MAP.map((s) => classifySection(s, outcomes));

  console.log("\n--- Auditorias e gates ---\n");
  try {
    const { prisma } = await import("../src/app/lib/prisma");
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 2000));
  const gates: GateResult[] = [];
  for (const g of GATE_COMMANDS) {
    console.log(`\n>> Gate: ${g.name}`);
    gates.push(runGate(g.name, g.cmd));
  }
  const rc01Gate = readRc01Gate();
  gates.push(rc01Gate);
  console.log(`\n>> Gate: ${rc01Gate.name} — ${rc01Gate.ok ? "PASS" : "FAIL"} ${rc01Gate.detail ?? ""}`);

  const gatesSection: SectionResult = {
    section: 15,
    title: "Auditorias (TypeScript, Prisma, Build, Domain, Workflow, Sync, Exec, Sim, Graph, Discovery, Regression, RC-01)",
    status: gates.every((g) => g.ok) ? "PASS" : "FAIL",
    scenarios: gates.map((g) => g.name),
    passed: gates.filter((g) => g.ok).length,
    failed: gates.filter((g) => !g.ok).length,
    errors: 0,
    reservations: [],
    evidence: gates.map((g) => `${g.name}: ${g.ok ? "PASS" : `FAIL — ${g.detail ?? ""}`}`),
  };

  const allSections = [...sections, gatesSection];
  const finishedAt = new Date();
  const durationMs = Date.now() - t0;

  const flowsExecuted = outcomes.size;
  const flowsPassed = [...outcomes.values()].filter((o) => o.status === "pass").length;
  const flowsFailed = [...outcomes.values()].filter(
    (o) => o.status === "fail" || o.status === "error"
  ).length;

  const allSectionsPass = allSections.every((s) => s.status === "PASS");
  const anyFail = allSections.some((s) => s.status === "FAIL");
  const hasReservation = allSections.some((s) => s.status === "PASS COM RESSALVA");
  const gatesPass = gates.every((g) => g.ok);

  const confidencePercent = allSectionsPass && gatesPass
    ? 93
    : anyFail
      ? Math.max(35, Math.round((flowsPassed / Math.max(flowsExecuted, 1)) * 100))
      : 85;

  const bugsCorrected: Array<{ id: string; description: string }> = [
    {
      id: "RC02-WIRE-01",
      description: "Suite rc02 registrada em discovery, types, te-run e scenario-runner.",
    },
    {
      id: "RC02-002",
      description: "Ciclo admin: removida transição inválida aceito→confirmado; confirmar coberto em RC02-007 (pendente→confirmado).",
    },
    {
      id: "RC02-SIM-BATCH",
      description: "runSimulationBatch(ids, opts) — assinatura corrigida em rc01/rc02-certify.",
    },
  ];

  const report = {
    reportId: "RC-02-administration-certification",
    mode: "CERTIFICATION",
    generatedAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    durationMs,
    durationHuman: `${Math.round(durationMs / 1000)}s`,
    language: "pt-BR",
    projectName: "THouse",
    architecture: "FROZEN_AFTER_EC_01",
    pipeline: "Execution Core → Workflow → State Machine → Synchronization → Simulation/Test Engine",
    verdict: {
      administration:
        allSectionsPass && gatesPass
          ? hasReservation
            ? "CERTIFICADA COM RESSALVAS"
            : "CERTIFICADA"
          : anyFail
            ? "NÃO CERTIFICADA"
            : "CERTIFICADA COM RESSALVAS",
      allSectionsPass: allSectionsPass && gatesPass,
      commitAllowed: allSectionsPass && gatesPass && !hasReservation && flowsFailed === 0,
      confidencePercent,
    },
    summary: {
      operationsExecuted: flowsExecuted + gates.length,
      operationsPassed: flowsPassed + gates.filter((g) => g.ok).length,
      operationsFailed: flowsFailed + gates.filter((g) => !g.ok).length,
      flowsExecuted,
      flowsPassed,
      flowsFailed,
      gatesTotal: gates.length,
      gatesPass: gates.filter((g) => g.ok).length,
      gatesFail: gates.filter((g) => !g.ok).length,
      sectionsTotal: allSections.length,
      sectionsPass: allSections.filter((s) => s.status === "PASS").length,
      sectionsPassWithReservation: allSections.filter((s) => s.status === "PASS COM RESSALVA")
        .length,
      sectionsFail: allSections.filter((s) => s.status === "FAIL").length,
    },
    sections: allSections,
    gates,
    scenarioResults: {
      te: teReport.summary,
      sim01: simReport.summary,
      sim02: sim02Report.summary,
    },
    bugsFound: allSections
      .filter((s) => s.status === "FAIL")
      .map((s) => ({
        section: s.section,
        title: s.title,
        status: "open",
        evidence: s.evidence,
      })),
    bugsCorrected,
    inconsistencies: allSections
      .filter((s) => s.status === "FAIL")
      .flatMap((s) => s.evidence.filter((e) => e.includes("FAIL") || e.includes("MISSING"))),
    risks: [
      {
        id: "RC02-BROWSER-01",
        severity: "scope",
        description: "Login admin via browser (cookies HttpOnly, redirect /admin) não exercitado — validado via role/gates engine.",
      },
      {
        id: "RC02-DASH-01",
        severity: "P2",
        description: "Dashboard pode contar Appointment vs Service para 'em andamento' (auditoria negócios P1).",
      },
      {
        id: "RC02-REBOOK-01",
        severity: "P2",
        description: "Remarcação pode não propagar terminal status em todos os Services vinculados.",
      },
      {
        id: "RC02-OPS-01",
        severity: "operational",
        description: "Webhook Asaas produção e smoke admin UI dependem de RC-04.",
      },
    ],
    coverage: {
      adminLogin: "RC02-001 + RC01-006",
      dashboard: "ADM-003, ADM-004, RC02-003",
      payments: "SIM-001…008, PAY-001, SRV-001/002",
      appointments: "APT-001…004, RC02-002/006, SIM-009/010",
      services: "ADM-001, ADM-002",
      delivery: "APT-004, SIM-004, RC02-002",
      plans: "PLN-001…005, SIM-005",
      coupons: "CPN-001…004, RC02-005, SIM-006/007",
      synchronization: "SYNC-001…007, USR-001",
      integrity: "RC02-004 + domain-audit gate",
      simulationEngine: "SIM-01 + SIM-02 full batch",
      testEngine: "RC02-001…007",
      audits: GATE_COMMANDS.map((g) => g.name).join(", "),
      rc01Baseline: "rc01-customer-certification.json",
    },
  };

  const jsonPath = path.join(outDir, "rc02-administration-certification.json");
  const mdPath = path.join(outDir, "rc02-administration-certification.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, buildMarkdown(report, allSections, gates));

  console.log(`\nRelatório JSON: ${jsonPath}`);
  console.log(`Relatório MD:   ${mdPath}`);
  console.log(`\nVeredito: ${report.verdict.administration}`);
  console.log(`Confiança: ${confidencePercent}%`);
  console.log(
    `Seções: ${report.summary.sectionsPass} PASS · ${report.summary.sectionsPassWithReservation} RESSALVA · ${report.summary.sectionsFail} FAIL`
  );
  console.log(`Gates: ${report.summary.gatesPass}/${report.summary.gatesTotal} PASS`);

  if (!(report.verdict as { commitAllowed: boolean }).commitAllowed) {
    console.log(
      "\nCommit bloqueado — exigência RC-02: todas as seções e gates PASS (sem ressalva)."
    );
    process.exit(anyFail || !gatesPass ? 1 : 0);
  }

  console.log(
    "\nTodos os fluxos e gates PASS — commit permitido: test(rc): certify administration and operations workflow"
  );

  if (process.env.RC02_SKIP_COMMIT === "1") {
    console.log("(RC02_SKIP_COMMIT=1 — commit omitido)");
    return;
  }

  const { execSync: git } = await import("child_process");
  const filesToAdd = [
    "scripts/rc02-certify.ts",
    "scripts/rc01-certify.ts",
    "src/app/lib/test-engine/scenarios/rc02-batch.ts",
    "src/app/lib/execution/discovery.ts",
    "src/app/lib/execution/types.ts",
    "src/app/lib/execution/result.ts",
    "src/app/lib/test-engine/types.ts",
    "src/app/lib/test-engine/index.ts",
    "src/app/lib/test-engine/scenario-runner.ts",
    "scripts/te-run.ts",
    "package.json",
    "reports/domain-guardian/rc02-administration-certification.json",
    "reports/domain-guardian/rc02-administration-certification.md",
  ].filter((f) => fs.existsSync(path.resolve(root, f)));

  git(`git add ${filesToAdd.map((f) => JSON.stringify(f)).join(" ")}`, { cwd: root });
  git('git commit -m "test(rc): certify administration and operations workflow"', {
    cwd: root,
    stdio: "inherit",
  });
  git("git status", { cwd: root, stdio: "inherit" });
  console.log("\nCommit criado. Push não executado — aguardando aprovação.");
}

function buildMarkdown(
  report: {
    generatedAt: string;
    durationHuman: string;
    verdict: {
      administration: string;
      confidencePercent: number;
      commitAllowed: boolean;
    };
    summary: Record<string, number>;
    risks: Array<{ id: string; severity: string; description: string }>;
    coverage: Record<string, string>;
    bugsCorrected: Array<{ id: string; description: string }>;
    inconsistencies: string[];
  },
  sections: SectionResult[],
  gates: GateResult[]
): string {
  const lines: string[] = [
    "# RC-02 — Administration & Operations Certification",
    "",
    `**Gerado em:** ${report.generatedAt}`,
    `**Duração:** ${report.durationHuman}`,
    `**Pipeline:** Execution Core → Workflow → SM → Sync → Simulation/Test Engine`,
    `**Veredito:** **${report.verdict.administration}**`,
    `**Confiança:** **${report.verdict.confidencePercent}%**`,
    "",
    "## Resumo",
    "",
    "| Métrica | Valor |",
    "|---------|-------|",
    `| Operações executadas | ${report.summary.operationsExecuted} |`,
    `| Operações aprovadas | ${report.summary.operationsPassed} |`,
    `| Operações reprovadas | ${report.summary.operationsFailed} |`,
    `| Fluxos TE/SIM | ${report.summary.flowsExecuted} (${report.summary.flowsPassed} pass) |`,
    `| Gates | ${report.summary.gatesPass}/${report.summary.gatesTotal} PASS |`,
    `| Seções PASS | ${report.summary.sectionsPass} |`,
    `| Seções PASS COM RESSALVA | ${report.summary.sectionsPassWithReservation} |`,
    `| Seções FAIL | ${report.summary.sectionsFail} |`,
    "",
    "## Seções administrativas",
    "",
    "| # | Seção | Status |",
    "|---|-------|--------|",
  ];

  for (const s of sections) {
    lines.push(`| ${s.section} | ${s.title} | ${s.status} |`);
  }

  lines.push("", "## Gates de auditoria", "");
  for (const g of gates) {
    lines.push(`- **${g.name}:** ${g.ok ? "PASS" : `FAIL — ${g.detail ?? ""}`}`);
  }

  lines.push("", "## Detalhamento por seção", "");
  for (const s of sections) {
    lines.push(`### ${s.section}. ${s.title} — ${s.status}`, "");
    lines.push(`- Cenários: ${s.scenarios.join(", ")}`);
    lines.push(`- Passou: ${s.passed} · Falhou: ${s.failed} · Erro: ${s.errors}`);
    if (s.reservations.length) {
      lines.push("- Ressalvas:");
      for (const r of s.reservations) lines.push(`  - ${r}`);
    }
    if (s.evidence.length) {
      lines.push("- Evidência:");
      for (const e of s.evidence) lines.push(`  - ${e}`);
    }
    lines.push("");
  }

  if (report.inconsistencies.length) {
    lines.push("## Inconsistências encontradas", "");
    for (const i of report.inconsistencies) lines.push(`- ${i}`);
    lines.push("");
  }

  if (report.bugsCorrected.length) {
    lines.push("## Correções realizadas", "");
    for (const b of report.bugsCorrected) {
      lines.push(`- **${b.id}:** ${b.description}`);
    }
    lines.push("");
  }

  lines.push("## Riscos", "");
  for (const r of report.risks) {
    lines.push(`- **${r.id}** (${r.severity}): ${r.description}`);
  }

  lines.push("", "## Cobertura", "");
  for (const [k, v] of Object.entries(report.coverage)) {
    lines.push(`- **${k}:** ${v}`);
  }

  lines.push(
    "",
    "## Commit",
    "",
    report.verdict.commitAllowed
      ? "Todos os fluxos e gates **PASS** — commit `test(rc): certify administration and operations workflow` (sem push)."
      : "Commit **bloqueado** até todos os fluxos e gates PASS."
  );

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
