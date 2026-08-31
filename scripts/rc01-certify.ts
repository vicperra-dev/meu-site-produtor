/**
 * RC-01 — Customer Journey Certification CLI.
 *
 *   npm run rc:certify
 */
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

const SECTION_MAP: Array<{
  section: number;
  title: string;
  scenarioIds: string[];
  reservations?: string[];
}> = [
  {
    section: 1,
    title: "Cadastro",
    scenarioIds: ["RC01-001"],
  },
  {
    section: 2,
    title: "Compra individual",
    scenarioIds: ["RC01-002", "SRV-001", "SRV-002"],
  },
  {
    section: 3,
    title: "Pagamento (Simulation Engine)",
    scenarioIds: ["SIM-001", "SIM-002", "PAY-001"],
  },
  {
    section: 4,
    title: "Webhook e efeitos",
    scenarioIds: ["SIM-001", "SIM-003", "ADM-004", "SYNC-001"],
  },
  {
    section: 5,
    title: "Admin (aceitar, recusar, cancelar, começar, concluir, entregar)",
    scenarioIds: ["APT-001", "APT-002", "APT-003", "APT-004", "SIM-009"],
  },
  {
    section: 6,
    title: "Cliente — atualização automática",
    scenarioIds: ["SYNC-002", "USR-001", "SIM-004"],
  },
  {
    section: 7,
    title: "Entrega",
    scenarioIds: ["APT-004", "SIM-004", "SYNC-004"],
  },
  {
    section: 8,
    title: "Cupons",
    scenarioIds: [
      "CPN-001",
      "CPN-002",
      "CPN-003",
      "CPN-004",
      "RC01-003",
      "RC01-004",
      "SIM-006",
      "SIM-007",
    ],
  },
  {
    section: 9,
    title: "Planos Bronze, Prata, Ouro",
    scenarioIds: ["PLN-001", "PLN-002", "PLN-003", "PLN-004", "PLN-005", "SIM-005"],
  },
  {
    section: 10,
    title: "Reembolso",
    scenarioIds: ["SIM-008", "PAY-001", "CPN-003", "SIM-010"],
  },
  {
    section: 11,
    title: "Agenda",
    scenarioIds: ["RC01-005", "SYNC-005", "SIM-010"],
  },
  {
    section: 12,
    title: "Serviços",
    scenarioIds: ["ADM-001", "ADM-002", "ADM-003", "USR-001"],
  },
  {
    section: 13,
    title: "Permissões",
    scenarioIds: ["RC01-006"],
  },
  {
    section: 14,
    title: "Sincronização ponta a ponta",
    scenarioIds: ["SYNC-001", "SYNC-002", "SYNC-003", "SYNC-004", "SYNC-005", "SYNC-006", "SYNC-007"],
  },
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

  const sectionNum = section;
  const sectionTitle = title;

  let status: CertStatus;
  if (missing.length > 0 || failed > 0 || errors > 0) {
    status = "FAIL";
  } else if (reservations.length > 0) {
    status = "PASS COM RESSALVA";
  } else {
    status = "PASS";
  }

  return {
    section: sectionNum,
    title: sectionTitle,
    status,
    scenarios: scenarioIds,
    passed,
    failed,
    errors,
    reservations,
    evidence: missing.length ? [...evidence, `MISSING: ${missing.join(", ")}`] : evidence,
  };
}

async function main() {
  const startedAt = new Date();
  const t0 = Date.now();

  const { ExecutionCore } = await import("../src/app/lib/execution/core");
  const { RC01_IDS, TE02A_IDS, SYNC01A_IDS, SIM01_IDS } = await import(
    "../src/app/lib/test-engine"
  );
  const { runSimulationBatch } = await import("../src/app/lib/simulation");

  const teIds = [
    ...RC01_IDS,
    ...TE02A_IDS.filter((id) =>
      SECTION_MAP.some((s) => s.scenarioIds.includes(id))
    ),
    ...SYNC01A_IDS,
  ];
  const uniqueTeIds = [...new Set(teIds)];

  console.log("\n=== RC-01 Customer Journey Certification ===\n");
  console.log(`Cenários TE/RC: ${uniqueTeIds.length}`);
  console.log(`Cenários SIM: ${SIM01_IDS.length}\n`);

  const teReport = await ExecutionCore.run({
    scenarioIds: uniqueTeIds,
    suite: "rc01",
    artifactPrefix: "rc01",
    print: true,
    reportId: "RC-01-execution",
  });

  const simReport = await runSimulationBatch([...SIM01_IDS], {
    actor: null,
    cliToken: process.env.TEST_ENGINE_CLI_SECRET || null,
    artifactPrefix: "rc01-sim",
    print: true,
  });

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

  const finishedAt = new Date();
  const durationMs = Date.now() - t0;

  const flowsExecuted = outcomes.size;
  const flowsPassed = [...outcomes.values()].filter((o) => o.status === "pass").length;
  const flowsFailed = [...outcomes.values()].filter(
    (o) => o.status === "fail" || o.status === "error"
  ).length;

  const allSectionsPass = sections.every((s) => s.status === "PASS");
  const anyFail = sections.some((s) => s.status === "FAIL");
  const hasReservation = sections.some((s) => s.status === "PASS COM RESSALVA");
  const confidencePercent = allSectionsPass
    ? 95
    : anyFail
      ? Math.max(40, Math.round((flowsPassed / Math.max(flowsExecuted, 1)) * 100))
      : 88;

  const report = {
    reportId: "RC-01-customer-certification",
    mode: "CERTIFICATION",
    generatedAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    durationMs,
    durationHuman: `${Math.round(durationMs / 1000)}s`,
    language: "pt-BR",
    projectName: "THouse",
    architecture: "FROZEN_AFTER_EC_01",
    paymentProvider: "Simulation Engine (pipeline oficial) + symbolic webhook",
    verdict: {
      certification: allSectionsPass
        ? "CERTIFICADA"
        : anyFail
          ? "REPROVADA"
          : "CERTIFICADA COM RESSALVAS",
      allSectionsPass,
      commitAllowed: allSectionsPass && !hasReservation && flowsFailed === 0,
      confidencePercent,
    },
    summary: {
      flowsExecuted,
      flowsPassed,
      flowsFailed,
      sectionsTotal: sections.length,
      sectionsPass: sections.filter((s) => s.status === "PASS").length,
      sectionsPassWithReservation: sections.filter((s) => s.status === "PASS COM RESSALVA").length,
      sectionsFail: sections.filter((s) => s.status === "FAIL").length,
    },
    sections,
    scenarioResults: {
      te: teReport.summary,
      sim: simReport.summary,
    },
    bugsFound: sections
      .filter((s) => s.status === "FAIL")
      .map((s) => ({
        section: s.section,
        title: s.title,
        status: "open",
        evidence: s.evidence,
      })),
    bugsCorrected: [],
    risks: [
      {
        id: "RC01-OPS-01",
        severity: "operational",
        description: "Webhook Asaas em URL pública não exercitado nesta certificação (Simulation Engine simbólico).",
      },
      {
        id: "RC01-UX-01",
        severity: "P2",
        description: "Redirect pós-registro para /conta em vez de /minha-conta (E2E-01 H-MC-01).",
      },
      {
        id: "RC01-BLK-01",
        severity: "P2",
        description: "Blocked slots validados na UI/API pública; checkout server não rejeita slot bloqueado por si só.",
      },
      {
        id: "RC01-PLAN-01",
        severity: "P3",
        description: "Renovação automática Asaas (assinatura recorrente) não exercitada; cobertura: ativação, cupons, cancelamento e benefícios (PLN/SIM).",
      },
      {
        id: "RC01-BROWSER-01",
        severity: "scope",
        description: "Certificação via Official Pipeline Adapter + Simulation/Test Engine (não browser Playwright). Cookie HttpOnly e SSE visual dependem de smoke sandbox.",
      },
    ],
    coverage: {
      registration: "RC01-001",
      individualPurchases: "RC01-002",
      simulationPipeline: "SIM-001…SIM-010",
      synchronization: "SYNC-001…SYNC-007",
      businessRegression: "TE-02A subset + PH-01 (GL-01 baseline)",
      browserE2E: "não executado — engine + workflow + sync",
    },
  };

  const outDir = path.resolve(process.cwd(), "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "rc01-customer-certification.json");
  const mdPath = path.join(outDir, "rc01-customer-certification.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = buildMarkdown(report, sections);
  fs.writeFileSync(mdPath, md);

  console.log(`\nRelatório JSON: ${jsonPath}`);
  console.log(`Relatório MD:   ${mdPath}`);
  console.log(`\nVeredito: ${report.verdict.certification}`);
  console.log(`Confiança: ${confidencePercent}%`);
  console.log(
    `Seções: ${report.summary.sectionsPass} PASS · ${report.summary.sectionsPassWithReservation} RESSALVA · ${report.summary.sectionsFail} FAIL`
  );

  if (!(report.verdict as { commitAllowed: boolean }).commitAllowed) {
    console.log(
      "\nCommit bloqueado — exigência RC-01: todos os fluxos e seções PASS (sem ressalva)."
    );
    process.exit(anyFail ? 1 : 0);
  }
  console.log("\nTodos os fluxos PASS — commit permitido: test(rc): certify complete customer journey");
}

function buildMarkdown(
  report: {
    generatedAt: string;
    durationHuman: string;
    verdict: { certification: string; confidencePercent: number; commitAllowed: boolean };
    summary: Record<string, number>;
    risks: Array<{ id: string; severity: string; description: string }>;
    coverage: Record<string, string>;
  },
  sections: SectionResult[]
): string {
  const lines: string[] = [
    "# RC-01 — Customer Journey Certification",
    "",
    `**Gerado em:** ${report.generatedAt}`,
    `**Duração:** ${report.durationHuman}`,
    `**Arquitetura:** congelada pós EC-01`,
    `**Veredito:** **${report.verdict.certification}**`,
    `**Confiança:** **${report.verdict.confidencePercent}%**`,
    "",
    "## Resumo",
    "",
    `| Métrica | Valor |`,
    `|---------|-------|`,
    `| Fluxos executados | ${report.summary.flowsExecuted} |`,
    `| Fluxos aprovados | ${report.summary.flowsPassed} |`,
    `| Fluxos reprovados | ${report.summary.flowsFailed} |`,
    `| Seções PASS | ${report.summary.sectionsPass} |`,
    `| Seções PASS COM RESSALVA | ${report.summary.sectionsPassWithReservation} |`,
    `| Seções FAIL | ${report.summary.sectionsFail} |`,
    "",
    "## Seções da jornada",
    "",
    "| # | Seção | Status | Cenários |",
    "|---|-------|--------|----------|",
  ];

  for (const s of sections) {
    lines.push(
      `| ${s.section} | ${s.title} | ${s.status} | ${s.scenarios.join(", ")} |`
    );
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
      ? "Todos os fluxos **PASS** — commit `test(rc): certify complete customer journey` permitido (sem push)."
      : "Commit **bloqueado** até todos os fluxos PASS."
  );

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
