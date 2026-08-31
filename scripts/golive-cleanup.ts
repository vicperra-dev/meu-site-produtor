/**
 * GL-01 — limpeza segura antes do go-live.
 * Escopo destrutivo limitado a @homolog.test e órfãos técnicos sem usuário.
 */
import fs from "fs";
import path from "path";

function loadEnvFile(file: string, override = false) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const separator = text.indexOf("=");
    if (separator < 0) continue;
    const key = text.slice(0, separator).trim();
    let value = text.slice(separator + 1).trim();
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
  const { prisma } = await import("../src/app/lib/prisma");
  const { cleanupTeUserArtifacts } = await import(
    "../src/app/lib/test-engine/te02a-helpers"
  );

  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@homolog.test", mode: "insensitive" } },
    select: { id: true, email: true, role: true },
  });
  const deleted: Record<string, number> = {};
  for (const user of users) {
    if (user.role === "ADMIN") continue;
    const result = await cleanupTeUserArtifacts(user.id);
    for (const [key, count] of Object.entries(result.deleted)) {
      deleted[key] = (deleted[key] || 0) + count;
    }
  }

  const realUsers = await prisma.user.findMany({ select: { id: true } });
  const realUserIds = realUsers.map((user) => user.id);
  deleted.orphanSynchronizationEvents = (
    await prisma.synchronizationEvent.deleteMany({
      where: {
        userId: {
          not: null,
          notIn: realUserIds.length ? realUserIds : ["__none__"],
        },
      },
    })
  ).count;
  deleted.expiredUnlinkedPaymentMetadata = (
    await prisma.paymentMetadata.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        asaasId: null,
      },
    })
  ).count;
  deleted.orphanTestCoupons = (
    await prisma.coupon.deleteMany({
      where: {
        assignedUserId: null,
        appointmentId: null,
        paymentId: null,
        userPlanId: null,
        OR: [
          { code: { startsWith: "TE" } },
          { code: { startsWith: "SIM" } },
          { code: { startsWith: "PH" } },
          { code: { startsWith: "GL" } },
          { code: { startsWith: "TESTE_" } },
        ],
      },
    })
  ).count;

  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  let temporaryUploads = 0;
  if (fs.existsSync(uploadsRoot)) {
    for (const folder of ["tmp", "temp", "homolog"]) {
      const target = path.join(uploadsRoot, folder);
      if (!fs.existsSync(target)) continue;
      for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        fs.unlinkSync(path.join(target, entry.name));
        temporaryUploads++;
      }
    }
  }
  deleted.temporaryUploads = temporaryUploads;

  console.log(
    JSON.stringify(
      {
        reportId: "GL-01-cleanup",
        executedAt: new Date().toISOString(),
        safety: "Somente @homolog.test, órfãos técnicos e pastas tmp/temp/homolog",
        testUsersFound: users.length,
        deleted,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("[golive-cleanup]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/app/lib/prisma");
    await prisma.$disconnect();
  });
