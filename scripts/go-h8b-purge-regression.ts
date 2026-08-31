/**
 * GO-H8B — Regressão local: dry-run + purge simulation + auditoria + reparo.
 * Usa DATABASE_URL do .env. Não toca Asaas real.
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
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

async function main() {
  const { purgeHomologationScope } = await import(
    "../src/app/lib/homologation/unified-cleanup"
  );
  const { auditDomainIntegrity } = await import(
    "../src/app/lib/domain/integrity-audit"
  );
  const { repairDomainIntegrity } = await import(
    "../src/app/lib/domain/integrity-repair"
  );
  const { prisma } = await import("../src/app/lib/prisma");

  let failed = 0;
  const assert = (cond: boolean, msg: string) => {
    if (!cond) {
      console.error("FAIL:", msg);
      failed++;
    } else console.log("PASS:", msg);
  };

  console.log("=== dry-run simulation ===");
  const dry = await purgeHomologationScope({ scope: "simulation", dryRun: true });
  console.log("roots", dry.rootPaymentIds.length, "totals", dry.totals);

  console.log("=== purge simulation ===");
  const purged = await purgeHomologationScope({ scope: "simulation", dryRun: false });
  console.log("purged totals", purged.totals);

  const paySim = await prisma.payment.count({
    where: {
      OR: [
        { provider: { equals: "SIMULATION", mode: "insensitive" } },
        { providerPaymentId: { startsWith: "sim_pay_" } },
        { asaasId: { startsWith: "sim_pay_" } },
      ],
    },
  });
  assert(paySim === 0, `zero SIMULATION payments after purge (got ${paySim})`);

  console.log("=== dry-run homologation ===");
  const dryH = await purgeHomologationScope({ scope: "homologation", dryRun: true });
  console.log("homo roots", dryH.rootPaymentIds.length);

  console.log("=== purge homologation ===");
  await purgeHomologationScope({ scope: "homologation", dryRun: false });
  const payHomo = await prisma.payment.count({
    where: {
      OR: [
        { provider: { equals: "HOMOLOGATION", mode: "insensitive" } },
        { providerPaymentId: { startsWith: "homo_pay_" } },
        { asaasId: { startsWith: "homo_pay_" } },
      ],
    },
  });
  assert(payHomo === 0, `zero HOMOLOGATION payments (got ${payHomo})`);

  console.log("=== repair + audit ===");
  const repaired = await repairDomainIntegrity();
  console.log(
    "repair actions",
    repaired.actions.length,
    "before",
    repaired.before.totalIssues,
    "after",
    repaired.after.totalIssues
  );

  const audit = await auditDomainIntegrity();
  // high severity must be zero after repair+purge lab
  const high = audit.findings.filter((f) => f.severity === "high");
  assert(high.length === 0, `zero high-severity findings (got ${high.map((h) => h.code).join(",")})`);

  console.log(failed === 0 ? "\nGO-H8B REGRESSION PASS" : `\nGO-H8B REGRESSION FAIL (${failed})`);
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
