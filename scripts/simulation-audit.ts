/**
 * SIM-01 — Simulation Audit
 */

import fs from "fs";
import path from "path";
import { describeSimulationRegistry } from "../src/app/lib/simulation/registry";
import { SIM01_IDS } from "../src/app/lib/simulation/scenarios/sim01-batch";
import { SIM_PIPELINE } from "../src/app/lib/simulation/pipeline";

const ROOT = path.resolve(__dirname, "..");

type Issue = {
  type: string;
  severity: "error" | "warning";
  message: string;
};

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function rel(p: string) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

async function main() {
  const issues: Issue[] = [];

  const runnerPath = path.join(ROOT, "src/app/lib/simulation/runner.ts");
  const pipelinePath = path.join(ROOT, "src/app/lib/simulation/pipeline.ts");
  const scenariosPath = path.join(ROOT, "src/app/lib/simulation/scenarios/sim01-batch.ts");

  if (!fs.existsSync(runnerPath)) issues.push({ type: "missing_runner", severity: "error", message: "runner.ts ausente" });
  if (!fs.existsSync(pipelinePath)) issues.push({ type: "missing_pipeline", severity: "error", message: "pipeline.ts ausente" });
  if (!fs.existsSync(scenariosPath)) issues.push({ type: "missing_scenarios", severity: "error", message: "sim01-batch.ts ausente" });

  const registry = describeSimulationRegistry();
  if (registry.length < 10) {
    issues.push({
      type: "insufficient_scenarios",
      severity: "error",
      message: `esperava ≥10 cenários, got ${registry.length}`,
    });
  }

  for (const id of SIM01_IDS) {
    if (!registry.find((r) => r.id === id)) {
      issues.push({ type: "missing_sim", severity: "error", message: `Cenário ${id} não registrado` });
    }
  }

  const scenarioText = fs.readFileSync(scenariosPath, "utf8");
  const forbidden = [
    "prisma.payment.create",
    "prisma.appointment.create",
    "prisma.service.create",
    "window.location.reload",
  ];
  for (const f of forbidden) {
    if (scenarioText.includes(f)) {
      issues.push({
        type: "forbidden_direct_create",
        severity: "error",
        message: `${f} encontrado em sim01-batch (pipeline paralelo proibido)`,
      });
    }
  }

  // coupon.create is allowed for coupon setup in SIM-006/007 (not payment path) - only warn if in SIM-001..005
  if (/SIM-00[1-5][\s\S]*?prisma\.coupon\.create/.test(scenarioText)) {
    issues.push({
      type: "coupon_create_in_payment_sim",
      severity: "warning",
      message: "prisma.coupon.create em sim de pagamento — revisar",
    });
  }

  const pipelineText = fs.readFileSync(pipelinePath, "utf8");
  if (!pipelineText.includes("processPaymentWebhook")) {
    issues.push({
      type: "pipeline_not_official",
      severity: "error",
      message: "pipeline não delega processPaymentWebhook",
    });
  }

  const simFiles = walk(path.join(ROOT, "src/app/lib/simulation"));
  for (const file of simFiles) {
    const t = fs.readFileSync(file, "utf8");
    if (t.includes("prisma.payment.create") || t.includes("prisma.appointment.create")) {
      issues.push({
        type: "forbidden_create",
        severity: "error",
        message: `create direto em ${rel(file)}`,
      });
    }
  }

  const permissionsPath = path.join(ROOT, "src/app/lib/simulation/permissions.ts");
  const permText = fs.readFileSync(permissionsPath, "utf8");
  if (!permText.includes("Production")) {
    issues.push({ type: "missing_prod_block", severity: "error", message: "bloqueio production ausente" });
  }

  const cliPath = path.join(ROOT, "scripts/sim-run.ts");
  if (!fs.existsSync(cliPath)) {
    issues.push({ type: "missing_cli", severity: "error", message: "scripts/sim-run.ts ausente" });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const report = {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    pipeline: SIM_PIPELINE,
    scenarios: registry.length,
    simIds: SIM01_IDS,
    issues,
    counts: {
      errors: errors.length,
      warnings: issues.filter((i) => i.severity === "warning").length,
    },
  };

  const outDir = path.join(ROOT, "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "sim01-simulation-audit-latest.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(report.ok ? "\n[simulation-audit] PASS" : "\n[simulation-audit] FAIL");
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
