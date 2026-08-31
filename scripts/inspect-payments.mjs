/**
 * inspect-payments.mjs — diagnóstico READ ONLY de Payment / PaymentMetadata.
 *
 * Não executa INSERT, UPDATE, DELETE, CREATE, ALTER nem DROP.
 * Apenas consulta e imprime relatório em stdout.
 *
 * Uso:
 *   node scripts/inspect-payments.mjs
 *   node scripts/inspect-payments.mjs --email user@example.com
 *   node scripts/inspect-payments.mjs --limit 20
 *   node scripts/inspect-payments.mjs --recent
 */
import { PrismaClient } from "@prisma/client";

const SYMBOLIC_BRL = 5;

const prisma = new PrismaClient();

function parseArgs(argv) {
  const opts = {
    email: process.env.INSPECT_PAYMENTS_EMAIL || null,
    limit: 10,
    recent: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--email" && argv[i + 1]) {
      opts.email = argv[++i];
    } else if (arg === "--limit" && argv[i + 1]) {
      opts.limit = Math.max(1, parseInt(argv[++i], 10) || 10);
    } else if (arg === "--recent") {
      opts.recent = true;
    }
  }
  return opts;
}

function parseMetadata(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function inferModoFromMetadata(metadata) {
  if (!metadata) return "desconhecido";
  if (metadata.symbolicAgendamento === true || metadata.symbolicPlano === true) return "teste";
  if (metadata.isTest === true || metadata.isTestPayment === true) return "teste";
  return "real";
}

function summarizePayment(p, metadataSample) {
  const modoMeta = inferModoFromMetadata(metadataSample);
  const amountSymbolic = p.amount === SYMBOLIC_BRL;
  return {
    id: p.id,
    userId: p.userId,
    amount: p.amount,
    type: p.type,
    status: p.status,
    asaasId: p.asaasId,
    appointmentId: p.appointmentId,
    planId: p.planId,
    paymentMethod: p.paymentMethod,
    createdAt: p.createdAt,
    flags: {
      amountSymbolic,
      modoMetadata: modoMeta,
      hasAsaasId: Boolean(p.asaasId),
    },
  };
}

async function loadMetadataForUser(userId, limit) {
  const rows = await prisma.paymentMetadata.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, asaasId: true, metadata: true, createdAt: true, expiresAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    asaasId: row.asaasId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    parsed: parseMetadata(row.metadata),
  }));
}

async function diagnoseUser(email, limit) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, nomeArtistico: true },
  });
  if (!user) {
    return { found: false, email };
  }

  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const metadataRows = await loadMetadataForUser(user.id, limit);

  const metadataByAsaas = new Map();
  for (const row of metadataRows) {
    if (row.asaasId && !metadataByAsaas.has(row.asaasId)) {
      metadataByAsaas.set(row.asaasId, row.parsed);
    }
  }

  const paymentSummaries = payments.map((p) => {
    const meta =
      (p.asaasId && metadataByAsaas.get(p.asaasId)) ||
      metadataRows.find((m) => m.parsed?.tipo === p.type)?.parsed ||
      null;
    return summarizePayment(p, meta);
  });

  const orphanMetadata = metadataRows.filter((row) => {
    if (!row.asaasId) return true;
    return !payments.some((p) => p.asaasId === row.asaasId);
  });

  return {
    found: true,
    user,
    payments: paymentSummaries,
    metadataSamples: metadataRows.map((row) => ({
      id: row.id,
      asaasId: row.asaasId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      tipo: row.parsed?.tipo ?? null,
      symbolicAgendamento: row.parsed?.symbolicAgendamento ?? null,
      symbolicPlano: row.parsed?.symbolicPlano ?? null,
      chargedAmount: row.parsed?.chargedAmount ?? null,
    })),
    diagnostics: {
      paymentCount: payments.length,
      metadataCount: metadataRows.length,
      symbolicPayments: paymentSummaries.filter((p) => p.flags.amountSymbolic).length,
      orphanMetadataRows: orphanMetadata.length,
      approvedCount: payments.filter((p) => p.status === "approved").length,
    },
  };
}

async function diagnoseRecent(limit) {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { email: true, nomeArtistico: true } },
    },
  });

  const userIds = [...new Set(payments.map((p) => p.userId))];
  const metadataRows =
    userIds.length > 0
      ? await prisma.paymentMetadata.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: "desc" },
          select: { userId: true, asaasId: true, metadata: true, createdAt: true },
        })
      : [];

  const metadataByUserAsaas = new Map();
  for (const row of metadataRows) {
    const key = `${row.userId}:${row.asaasId || ""}`;
    if (!metadataByUserAsaas.has(key)) {
      metadataByUserAsaas.set(key, parseMetadata(row.metadata));
    }
  }

  return payments.map((p) => {
    const meta =
      metadataByUserAsaas.get(`${p.userId}:${p.asaasId || ""}`) ||
      metadataRows.find((m) => m.userId === p.userId)?.metadata;
    const parsed = typeof meta === "string" ? parseMetadata(meta) : meta;
    return {
      ...summarizePayment(p, parsed),
      userEmail: p.user.email,
      userName: p.user.nomeArtistico,
    };
  });
}

async function main() {
  const opts = parseArgs(process.argv);

  console.log("=== inspect-payments (READ ONLY) ===");
  console.log({ mode: opts.recent ? "recent" : "by-email", email: opts.email, limit: opts.limit });

  if (opts.recent) {
    const rows = await diagnoseRecent(opts.limit);
    console.log("\n--- Pagamentos recentes ---");
    console.log(JSON.stringify(rows, null, 2));
    console.log("\n--- Resumo ---");
    console.log({
      total: rows.length,
      symbolic: rows.filter((r) => r.flags.amountSymbolic).length,
      approved: rows.filter((r) => r.status === "approved").length,
    });
    return;
  }

  const email = opts.email || "vicperra@gmail.com";
  const report = await diagnoseUser(email, opts.limit);

  if (!report.found) {
    console.log(`Usuário não encontrado: ${email}`);
    return;
  }

  console.log("\n--- Usuário ---");
  console.log(report.user);
  console.log("\n--- Pagamentos ---");
  console.log(JSON.stringify(report.payments, null, 2));
  console.log("\n--- PaymentMetadata (amostras) ---");
  console.log(JSON.stringify(report.metadataSamples, null, 2));
  console.log("\n--- Diagnóstico ---");
  console.log(report.diagnostics);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
