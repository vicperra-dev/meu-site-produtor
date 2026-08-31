/**
 * EC-01 — Execution Audit
 */

import fs from "fs";
import path from "path";
import { EXECUTION_PIPELINE } from "../src/app/lib/execution/pipeline";
import { describeExecutionRegistry } from "../src/app/lib/execution/registry";

const ROOT = path.resolve(__dirname, "..");

async function main() {
  const issues: { type: string; severity: "error" | "warning"; message: string }[] = [];

  const corePath = path.join(ROOT, "src/app/lib/execution/core.ts");
  const runnerPath = path.join(ROOT, "src/app/lib/execution/runner.ts");
  const discoveryPath = path.join(ROOT, "src/app/lib/execution/discovery.ts");

  if (!fs.existsSync(corePath)) issues.push({ type: "missing_core", severity: "error", message: "core.ts ausente" });
  if (!fs.existsSync(runnerPath)) issues.push({ type: "missing_runner", severity: "error", message: "runner.ts ausente" });
  if (!fs.existsSync(discoveryPath)) issues.push({ type: "missing_discovery", severity: "error", message: "discovery.ts ausente" });

  const scenarios = describeExecutionRegistry();
  if (scenarios.length < 40) {
    issues.push({
      type: "insufficient_scenarios",
      severity: "warning",
      message: `esperava ≥40 cenários descobertos, got ${scenarios.length}`,
    });
  }

  const teRunner = fs.readFileSync(path.join(ROOT, "src/app/lib/test-engine/scenario-runner.ts"), "utf8");
  const simRunner = fs.readFileSync(path.join(ROOT, "src/app/lib/simulation/runner.ts"), "utf8");
  if (!teRunner.includes("ExecutionCore")) {
    issues.push({ type: "te_not_migrated", severity: "error", message: "TE runner não delega ao ExecutionCore" });
  }
  if (!simRunner.includes("ExecutionCore")) {
    issues.push({ type: "sim_not_migrated", severity: "error", message: "SIM runner não delega ao ExecutionCore" });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const report = {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    pipeline: EXECUTION_PIPELINE,
    scenarios: scenarios.length,
    entryPoint: "ExecutionCore.run()",
    issues,
    counts: { errors: errors.length, warnings: issues.filter((i) => i.severity === "warning").length },
  };

  const outDir = path.join(ROOT, "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "ec01-execution-audit-latest.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(report.ok ? "\n[execution-audit] PASS" : "\n[execution-audit] FAIL");
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
