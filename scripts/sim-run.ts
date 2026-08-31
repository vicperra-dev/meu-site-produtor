/**
 * SIM-01 — CLI do Simulation Engine.
 *
 *   npm run sim:list
 *   npm run sim:run -- --id SIM-001
 *   npm run sim:batch
 *   npm run sim:cleanup -- --email user@homolog.test
 *   npm run sim:report -- --file reports/...
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
  const engine = get("--engine") === "sim02" ? "sim02" : "sim01";

  const {
    describeSimulationRegistry,
    runSimulation,
    runSimulationBatch,
    runAllSimulations,
    SIM01_IDS,
  } = await import("../src/app/lib/simulation");
  const { cleanupSimulationUser } = await import("../src/app/lib/simulation/cleanup");
  const { prisma } = await import("../src/app/lib/prisma");

  if (has("--list") || (args.length === 0 && !has("--cleanup") && !has("--report"))) {
    console.log(JSON.stringify({ simulations: describeSimulationRegistry() }, null, 2));
    return;
  }

  const token = get("--token") || process.env.SIM_ENGINE_CLI_SECRET || process.env.TEST_ENGINE_CLI_SECRET || null;
  const actorEmail = get("--admin-email");
  const actor = actorEmail ? { role: "ADMIN", email: actorEmail } : null;

  if (has("--cleanup")) {
    const email = get("--email");
    const userId = get("--user-id");
    if (!email && !userId) {
      console.error("Informe --email ou --user-id");
      process.exit(1);
    }
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
      : await prisma.user.findUnique({ where: { email: email! }, select: { id: true, email: true } });
    if (!user) {
      console.error("Usuário não encontrado");
      process.exit(1);
    }
    if (!/@homolog\.test$/i.test(user.email)) {
      console.error("Cleanup recusado: somente @homolog.test");
      process.exit(1);
    }
    const deleted = await cleanupSimulationUser(user.id);
    console.log(JSON.stringify({ ok: true, userId: user.id, email: user.email, deleted }, null, 2));
    return;
  }

  if (has("--report")) {
    const file = get("--file") || "reports/domain-guardian/sim01-last-run.json";
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) {
      console.error(`Arquivo não encontrado: ${full}`);
      process.exit(1);
    }
    const report = JSON.parse(fs.readFileSync(full, "utf8"));
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (has("--batch")) {
    const outFile = path.resolve(
      process.cwd(),
      engine === "sim02"
        ? "reports/domain-guardian/sim02-last-run.json"
        : "reports/domain-guardian/sim01-last-run.json"
    );
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const report = await runAllSimulations({
      actor,
      cliToken: token,
      artifactPrefix: engine,
      engine: engine as "sim01" | "sim02",
      print: true,
    });
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
    const fail = report.summary.failed + report.summary.errors;
    process.exit(fail > 0 ? 1 : 0);
  }

  const id = get("--id");
  if (!id) {
    console.error("Use --id SIM-001 ou --batch");
    process.exit(1);
  }

  if (!SIM01_IDS.includes(id as any)) {
    console.error(`ID inválido: ${id}. Válidos: ${SIM01_IDS.join(", ")}`);
    process.exit(1);
  }

  const report = await runSimulation(id as any, {
    actor,
    cliToken: token,
    artifactPrefix: engine,
    engine: engine as "sim01" | "sim02",
    print: true,
  });
  const fail = report.summary.failed + report.summary.errors;
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
