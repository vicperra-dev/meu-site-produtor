/**
 * LAUNCH-01 — Fase 1: Launch Reset CLI (GO-01 safety confirmations).
 *
 *   npm run launch01:reset                              # dry-run
 *   npm run launch01:reset -- --execute --confirm-local
 *
 * Preview:
 *   LAUNCH01_TARGET=preview LAUNCH01_CONFIRM_PREVIEW=1 \
 *   npm run launch01:reset -- --execute --confirm-preview
 *
 * Production (múltiplas confirmações — nunca automático):
 *   LAUNCH01_CONFIRM_PRODUCTION=1 LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION" \
 *   npm run launch01:reset -- --execute --confirm-production
 */
import fs from "fs";
import path from "path";
import { runLaunchReset } from "../src/app/lib/launch/reset";
import { detectResetTarget, validateResetConfirmation } from "../src/app/lib/launch/safety";

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

async function main() {
  const argv = process.argv.slice(2);
  const execute = argv.includes("--execute");
  const dbUrl = process.env.DATABASE_URL || "";
  const target = detectResetTarget(dbUrl, process.env);

  const confirmation = validateResetConfirmation(target, argv, process.env);
  if (!confirmation.ok) {
    console.error(
      JSON.stringify(
        {
          error: confirmation.error,
          target,
          required: confirmation.required,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "launch01-reset-result.json");

  const { prisma } = await import("../src/app/lib/prisma");
  try {
    const result = await runLaunchReset(prisma, { execute, root: process.cwd() });
    const payload = {
      reportId: "LAUNCH-01-reset",
      executedAt: new Date().toISOString(),
      target,
      database: target === "local" ? "local" : target,
      safetyConfirmations: confirmation.ok ? "validated" : "missing",
      atomicTransaction: execute ? true : "n/a-dry-run",
      ...result,
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(JSON.stringify(payload, null, 2));
    console.log(`\nArtefato: ${outPath}`);

    if (!result.preservedAdmin) {
      process.exit(1);
    }
    if (result.warnings.length) {
      console.warn("\nAvisos:", result.warnings.join("; "));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const payload = {
      reportId: "LAUNCH-01-reset",
      executedAt: new Date().toISOString(),
      target,
      database: target === "local" ? "local" : target,
      safetyConfirmations: "validated",
      mode: execute ? "execute" : "dry-run",
      ok: false,
      error: message,
      note: "Falha durante reset — se execute=true, prisma.$transaction deve ter feito rollback completo dos deletes",
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.error(JSON.stringify(payload, null, 2));
    console.error(`\nArtefato de falha: ${outPath}`);
    throw err;
  }
}

main()
  .catch((err) => {
    console.error("[launch01-reset]", err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/app/lib/prisma");
    await prisma.$disconnect();
  });
