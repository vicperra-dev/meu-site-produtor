/**
 * EC-01 — Regression Audit (TE-02A + SYNC-01A + SIM-01 + SIM-02 gates summary).
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const GUARDIAN = path.join(ROOT, "reports/domain-guardian");

type GateResult = { name: string; ok: boolean; detail?: string };

function readJson(name: string): Record<string, unknown> | null {
  const full = path.join(GUARDIAN, name);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const gates: GateResult[] = [];

  const checks = [
    "ec01-execution-audit-latest.json",
    "ec01-knowledge-graph-audit-latest.json",
    "ec01-discovery-audit-latest.json",
    "sim01-simulation-audit-latest.json",
    "sync01a-synchronization-audit-latest.json",
  ];

  for (const c of checks) {
    const data = readJson(c);
    gates.push({
      name: c.replace("-latest.json", ""),
      ok: data?.ok === true,
      detail: data ? `errors=${(data.counts as any)?.errors ?? 0}` : "arquivo ausente",
    });
  }

  const sim01 = readJson("sim01-last-run.json");
  const sim02 = readJson("sim02-last-run.json");
  if (sim01) {
    const s = sim01.summary as { passed?: number; total?: number };
    gates.push({ name: "sim01-batch", ok: s.passed === s.total && (s.total ?? 0) >= 10 });
  } else {
    gates.push({ name: "sim01-batch", ok: false, detail: "sim01-last-run.json ausente" });
  }
  if (sim02) {
    const s = sim02.summary as { passed?: number; total?: number };
    gates.push({ name: "sim02-batch", ok: s.passed === s.total && (s.total ?? 0) >= 10 });
  } else {
    gates.push({ name: "sim02-batch", ok: false, detail: "sim02-last-run.json ausente — executar sim:batch:sim02" });
  }

  const ok = gates.every((g) => g.ok);
  const report = { ok, generatedAt: new Date().toISOString(), gates };
  fs.writeFileSync(path.join(GUARDIAN, "ec01-regression-audit-latest.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(ok ? "\n[regression-audit] PASS" : "\n[regression-audit] FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
