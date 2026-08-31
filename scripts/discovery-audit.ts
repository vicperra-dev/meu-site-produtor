/**
 * EC-01 — Discovery Audit (cenários auto-descobertos).
 */

import fs from "fs";
import path from "path";
import {
  discoverBatches,
  discoverAllScenarios,
  discoverModulePaths,
  discoverPlatformModules,
  discoverSuites,
} from "../src/app/lib/execution/discovery";

const ROOT = path.resolve(__dirname, "..");

function walkScenarios(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkScenarios(full, acc);
    else if (/\.(ts)$/.test(entry.name) && (entry.name.includes("batch") || entry.name.startsWith("te-")))
      acc.push(full.replace(/\\/g, "/"));
  }
  return acc;
}

async function main() {
  const issues: { type: string; severity: "error" | "warning"; message: string }[] = [];

  const batches = discoverBatches();
  const scenarios = discoverAllScenarios();
  const modulePaths = discoverModulePaths();
  const platform = discoverPlatformModules();
  const suites = discoverSuites();

  if (batches.length < 5) {
    issues.push({ type: "insufficient_batches", severity: "error", message: `esperava ≥5 batches, got ${batches.length}` });
  }
  if (!suites.includes("sim02")) {
    issues.push({ type: "missing_sim02_suite", severity: "error", message: "suite sim02 ausente no discovery" });
  }
  if (!platform.workflows.length || !platform.execution.length || !platform.assertions.length) {
    issues.push({
      type: "incomplete_platform_discovery",
      severity: "error",
      message: "discovery de workflows/execution/assertions incompleto",
    });
  }

  const simBatch = batches.find((b) => b.suite === "sim01");
  if (!simBatch || simBatch.scenarioIds.length < 10) {
    issues.push({ type: "sim_batch", severity: "error", message: "SIM batch incompleto" });
  }

  const te02a = batches.find((b) => b.suite === "te02a");
  if (!te02a || te02a.scenarioIds.length < 20) {
    issues.push({ type: "te02a_batch", severity: "error", message: "TE02A batch incompleto" });
  }

  const fsScenarios = [
    ...walkScenarios(path.join(ROOT, "src/app/lib/test-engine/scenarios")),
    ...walkScenarios(path.join(ROOT, "src/app/lib/simulation/scenarios")),
  ].map((p) => p.replace(ROOT.replace(/\\/g, "/") + "/", ""));

  for (const f of fsScenarios) {
    if (f.includes("stubs")) continue;
    const covered = modulePaths.some((m) => f.endsWith(m.replace("src/app/lib/", "").split("/").pop() || ""));
    if (!covered && f.includes("batch")) {
      issues.push({ type: "unregistered_batch", severity: "warning", message: `${f} pode não estar no discovery` });
    }
  }

  const dupIds = scenarios.map((s) => s.id);
  const unique = new Set(dupIds);
  if (unique.size !== dupIds.length) {
    issues.push({ type: "duplicate_ids", severity: "error", message: "IDs duplicados no discovery" });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const report = {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    batches: batches.length,
    scenarios: scenarios.length,
    suites,
    modulePaths,
    platformModules: platform,
    issues,
    counts: { errors: errors.length, warnings: issues.filter((i) => i.severity === "warning").length },
  };

  const outDir = path.join(ROOT, "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "ec01-discovery-audit-latest.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(report.ok ? "\n[discovery-audit] PASS" : "\n[discovery-audit] FAIL");
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
