/**
 * GO-H8C — Re-run integrity audit against Neon (.env.local).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvFile(file: string) {
  const p = resolve(process.cwd(), file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] != null && process.env[m[1]] !== "") continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");
{
  const p = resolve(process.cwd(), ".env.local");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.*)$/);
      if (!m) continue;
      process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  const { auditDomainIntegrity } = await import("../src/app/lib/domain/integrity-audit");
  const { prisma } = await import("../src/app/lib/prisma");
  const report = await auditDomainIntegrity();
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        highCount: report.highCount,
        mediumCount: report.mediumCount,
        infoCount: report.infoCount,
        historyModel: report.historyModel,
        findings: report.findings.map((f) => ({
          code: f.code,
          severity: f.severity,
          count: f.count,
        })),
      },
      null,
      2
    )
  );
  const fail = report.highCount > 0 || report.mediumCount > 0;
  console.log(fail ? "\nGO-H8C AUDIT FAIL" : "\nGO-H8C AUDIT PASS");
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
