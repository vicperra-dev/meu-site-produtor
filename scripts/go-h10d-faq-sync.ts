/**
 * GO-H10D2 — Sincroniza FAQ no banco executando o upsert de prisma/seed.js.
 * Uso: npx --yes tsx --tsconfig tsconfig.json scripts/go-h10d-faq-sync.ts
 *
 * Prefere DATABASE_URL de .env.local (produção/Neon) quando existir.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

function loadEnvFile(filePath: string, override = false) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
    if (override || process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local", true);

const seed = path.join(process.cwd(), "prisma", "seed.js");
const result = spawnSync(process.execPath, [seed], {
  env: process.env,
  encoding: "utf8",
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(
  "[go-h10d-faq-sync] FAQ upsert concluído via prisma/seed.js (Asaas + planos H10)."
);
