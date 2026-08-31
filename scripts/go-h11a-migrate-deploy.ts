/**
 * GO-H11A — Apply pending Prisma migrations to DATABASE_URL (.env.local preferred).
 */
import fs from "fs";
import { spawnSync } from "child_process";

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

const url = process.env.DATABASE_URL || "";
console.log("[go-h11a-migrate] DATABASE_URL host hint:", url.replace(/:[^:@/]+@/, ":***@").slice(0, 80));

const result = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy"],
  { env: process.env, encoding: "utf8", shell: true }
);
process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
