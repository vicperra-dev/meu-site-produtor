/**
 * GO-H11 — dump integrity audit against DATABASE_URL (.env.local preferred).
 */
import fs from "fs";
import path from "path";

function loadEnvFile(filePath: string, override = false) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local", true);

async function main() {
  const { auditDomainIntegrity } = await import("../src/app/lib/domain/integrity-audit");
  const report = await auditDomainIntegrity();
  const outDir = path.join("reports", "domain-guardian", "go-h11");
  fs.mkdirSync(outDir, { recursive: true });

  const findings = report.findings ?? [];
  const by = (s: string) => findings.filter((f) => f.severity === s);
  const summary = {
    ok: report.ok,
    highCount: report.highCount,
    mediumCount: report.mediumCount,
    infoCount: report.infoCount,
    high: by("high").map((f) => ({ code: f.code, label: f.label, count: f.count })),
    medium: by("medium").map((f) => ({ code: f.code, label: f.label, count: f.count })),
    info: by("info").map((f) => ({ code: f.code, label: f.label, count: f.count })),
  };

  fs.writeFileSync(path.join(outDir, "integrity.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, "integrity-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
