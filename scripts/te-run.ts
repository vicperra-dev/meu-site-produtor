/**
 * CLI do Test Engine (TE-01B) — sem rotas HTTP.
 *
 *   npm run te:list
 *   npm run te:run -- --id TE-S01
 *   npm run te:run -- --all
 */
import fs from "fs";
import path from "path";

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
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const {
    describeRegistry,
    runAllScenarios,
    runScenario,
    runScenarioIds,
    TE02A_IDS,
    SYNC01A_IDS,
    PH01_IDS,
  } = await import("../src/app/lib/test-engine");

  if (has("--list") || args.length === 0) {
    console.log(JSON.stringify({ scenarios: describeRegistry() }, null, 2));
    return;
  }

  const token = get("--token") || process.env.TEST_ENGINE_CLI_SECRET || null;
  const actorEmail = get("--admin-email");
  const actor = actorEmail ? { role: "ADMIN", email: actorEmail } : null;

  if (has("--suite") && get("--suite") === "te02a") {
    const report = await runScenarioIds(TE02A_IDS, {
      actor,
      cliToken: token,
      artifactPrefix: "te02a",
      reportId: "TE-02A-execution",
      print: true,
    });
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }

  if (has("--suite") && get("--suite") === "sync01a") {
    const report = await runScenarioIds(SYNC01A_IDS, {
      actor,
      cliToken: token,
      artifactPrefix: "sync01a",
      reportId: "SYNC-01A-execution",
      print: true,
    });
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }

  if (has("--suite") && get("--suite") === "ph01") {
    const report = await runScenarioIds(PH01_IDS, {
      actor,
      cliToken: token,
      artifactPrefix: "ph01",
      reportId: "PH-01-execution",
      print: true,
    });
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }

  if (has("--suite") && get("--suite") === "rc01") {
    const { RC01_IDS } = await import("../src/app/lib/test-engine/scenarios/rc01-batch");
    const report = await runScenarioIds(RC01_IDS, {
      actor,
      cliToken: token,
      artifactPrefix: "rc01",
      reportId: "RC-01-execution",
      print: true,
    });
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }

  if (has("--suite") && get("--suite") === "rc02") {
    const { RC02_IDS } = await import("../src/app/lib/test-engine/scenarios/rc02-batch");
    const report = await runScenarioIds(RC02_IDS, {
      actor,
      cliToken: token,
      artifactPrefix: "rc02",
      reportId: "RC-02-execution",
      print: true,
    });
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }

  if (has("--suite") && get("--suite") === "rc03") {
    const { RC03_IDS } = await import("../src/app/lib/test-engine/scenarios/rc03-batch");
    const report = await runScenarioIds(RC03_IDS, {
      actor,
      cliToken: token,
      artifactPrefix: "rc03",
      reportId: "RC-03-execution",
      print: true,
    });
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }

  if (has("--all")) {
    const report = await runAllScenarios({
      actor,
      cliToken: token,
      print: true,
    });
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }

  const id = get("--id");
  if (!id) {
    console.error("Use --list | --id TE-S01 | --suite te02a | --all");
    process.exit(2);
  }

  const report = await runScenario(id as any, {
    actor,
    cliToken: token,
    print: true,
  });
  const r = report.results[0];
  if (!r || r.status === "fail" || r.status === "error") process.exit(1);
  if (r.status === "skipped" && !report.gate.allowed) process.exit(2);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
