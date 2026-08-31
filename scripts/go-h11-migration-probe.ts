import fs from "fs";
import { PrismaClient } from "@prisma/client";

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

async function main() {
  const prisma = new PrismaClient();
  try {
    const userPlan = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='UserPlan' AND column_name='lastBenefitCycleAt'`
    );
    const subscription = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='Subscription' AND column_name IN ('cyclesRemaining','failureCount','gracePeriodEndsAt','rootPaymentId','lastFailureAt') ORDER BY column_name`
    );
    const out = {
      h10b_lastBenefitCycleAt: userPlan.length > 0,
      h10c_subscription_cols: subscription.map((c) => c.column_name),
      h10c_ready: subscription.length >= 5,
    };
    fs.mkdirSync("reports/domain-guardian/go-h11", { recursive: true });
    fs.writeFileSync(
      "reports/domain-guardian/go-h11/migration-probe.json",
      JSON.stringify(out, null, 2)
    );
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
