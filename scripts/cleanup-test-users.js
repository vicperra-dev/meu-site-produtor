/**
 * HS-01 — Remove usuários de teste preservando dados reais e o admin Victor.
 *
 *   node scripts/cleanup-test-users.js           # dry-run
 *   node scripts/cleanup-test-users.js --execute # executa
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PRESERVE_EMAILS = new Set([
  "thouse.rec.tremv@gmail.com",
  "tremv03021@gmail.com",
]);

const PRESERVE_NAME = "Victor Pereira Ramos";

const TEST_EMAIL_PATTERNS = [
  /@homolog\.test$/i,
  /@example\.com$/i,
  /^ex01-/i,
  /^prodchk_/i,
  /^hs01-/i,
];

function isTestEmail(email) {
  return TEST_EMAIL_PATTERNS.some((re) => re.test(email));
}

async function hasRealPayments(userId) {
  const payments = await prisma.payment.findMany({
    where: { userId, status: "approved" },
    select: { amount: true, type: true },
  });
  return payments.some((p) => {
    if (p.type === "plano" || p.type === "agendamento") {
      return Math.abs(p.amount - 5) > 0.01;
    }
    return true;
  });
}

async function main() {
  const execute = process.argv.includes("--execute");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nomeCompleto: true,
      role: true,
      _count: { select: { appointments: true, payments: true, services: true } },
    },
  });

  const toRemove = [];
  const skipped = [];

  for (const u of users) {
    if (u.role === "ADMIN") {
      skipped.push({ email: u.email, reason: "ADMIN" });
      continue;
    }
    if (PRESERVE_EMAILS.has(u.email.toLowerCase())) {
      skipped.push({ email: u.email, reason: "email preservado" });
      continue;
    }
    if (u.nomeCompleto.trim() === PRESERVE_NAME) {
      skipped.push({ email: u.email, reason: "nome preservado" });
      continue;
    }
    if (!isTestEmail(u.email)) {
      skipped.push({ email: u.email, reason: "email não parece teste" });
      continue;
    }
    if (await hasRealPayments(u.id)) {
      skipped.push({ email: u.email, reason: "pagamentos reais detectados" });
      continue;
    }
    toRemove.push(u);
  }

  const report = {
    mode: execute ? "execute" : "dry-run",
    totalUsers: users.length,
    candidates: toRemove.length,
    skipped: skipped.length,
    removed: [],
    skippedSample: skipped.slice(0, 20),
    candidatesList: toRemove.map((u) => u.email),
  };

  console.log(JSON.stringify(report, null, 2));

  if (!execute) {
    console.log("\nDry-run apenas. Use --execute para remover.");
    return;
  }

  for (const u of toRemove) {
    await prisma.user.delete({ where: { id: u.id } });
    report.removed.push(u.email);
  }

  console.log(
    JSON.stringify(
      { ...report, message: `${report.removed.length} usuário(s) de teste removido(s).` },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
