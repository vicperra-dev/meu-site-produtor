/**
 * EC-01 / SIM-02 — SIM Watch (executa apenas cenários afetados).
 *
 *   npm run sim:watch -- --files src/app/lib/domain/workflow.ts
 *   npm run sim:watch -- --from-git
 *
 * Sem --files/--from-git: usa arquivos alterados no working tree (git status).
 * Nunca força batch completo se o impact analysis encontrar cenários.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (override || process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local", true);

function gitChangedFiles(): string[] {
  try {
    const out = execSync("git status --porcelain", {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[AMDRCU\?\s]{1,2}\s+/, "").replace(/\\/g, "/"))
      .filter((f) => /\.(ts|tsx)$/.test(f));
  } catch {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const { analyzeImpact } = await import("../src/app/lib/execution/impact");
  const { ExecutionCore, SIM01_IDS } = await import("../src/app/lib/execution");

  let changedFiles: string[] = [];
  const filesArg = get("--files");
  if (filesArg) {
    changedFiles = filesArg.split(",").map((f) => f.trim().replace(/\\/g, "/"));
  } else if (has("--from-git") || args.length === 0) {
    // --from-git explícito, ou invocação sem args: working tree via git status
    changedFiles = gitChangedFiles();
  }

  if (changedFiles.length === 0) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: "Nenhum arquivo alterado — sim:watch não executa batch completo.",
          tip: "Use --files path/a.ts,path/b.ts",
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const impact = analyzeImpact(changedFiles);
  const affectedSims = impact.simulationsAffected.filter((id) =>
    (SIM01_IDS as readonly string[]).includes(id)
  );
  const toRun =
    affectedSims.length > 0
      ? affectedSims
      : impact.scenariosAffected.filter((id) => (SIM01_IDS as readonly string[]).includes(id));

  if (toRun.length === 0) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: "Impact analysis não encontrou cenários SIM afetados.",
          changedFiles,
          impact,
        },
        null,
        2
      )
    );
    const outSkip = path.resolve(process.cwd(), "reports/domain-guardian/sim-watch-last-run.json");
    fs.mkdirSync(path.dirname(outSkip), { recursive: true });
    fs.writeFileSync(outSkip, JSON.stringify({ impact, skipped: true, running: [] }, null, 2));
    process.exit(0);
  }

  console.log(JSON.stringify({ changedFiles, impact, running: toRun, incremental: true }, null, 2));

  const outFile = path.resolve(process.cwd(), "reports/domain-guardian/sim-watch-last-run.json");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  const report = await ExecutionCore.run({
    scenarioIds: toRun,
    suite: "sim02",
    artifactPrefix: "sim02",
    print: true,
    reportId: "SIM-02-execution",
  });

  fs.writeFileSync(
    outFile,
    JSON.stringify({ impact, report, incremental: true, running: toRun }, null, 2),
    "utf8"
  );

  const fail = report.summary.failed + report.summary.errors;
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
