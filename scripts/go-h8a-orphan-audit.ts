/**
 * GO-H8A — read-only integrity probe (no mutations).
 * Evita colunas GO-H8 se a migration ainda não estiver no DB apontado pelo .env.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(file: string) {
  const p = resolve(process.cwd(), file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] != null && process.env[m[1]] !== "") continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const prisma = new PrismaClient();

async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const hasRootPaymentId = await hasColumn("Coupon", "rootPaymentId");
  const hasCouponCategory = await hasColumn("Coupon", "couponCategory");

  const [
    aptTotal,
    svcTotal,
    soTotal,
    couponTotal,
    paySim,
    payHomo,
    svcNoApt,
    soNoPayment,
    soNoApt,
    historyCount,
  ] = await Promise.all([
    prisma.appointment.count(),
    prisma.service.count(),
    prisma.serviceOrder.count(),
    prisma.coupon.count(),
    prisma.payment.count({
      where: {
        OR: [
          { provider: { equals: "SIMULATION", mode: "insensitive" } },
          { providerPaymentId: { startsWith: "sim_pay_" } },
          { asaasId: { startsWith: "sim_pay_" } },
        ],
      },
    }),
    prisma.payment.count({
      where: {
        OR: [
          { provider: { equals: "HOMOLOGATION", mode: "insensitive" } },
          { providerPaymentId: { startsWith: "homo_pay_" } },
          { asaasId: { startsWith: "homo_pay_" } },
        ],
      },
    }),
    prisma.service.count({ where: { appointmentId: null } }),
    prisma.serviceOrder.count({ where: { paymentId: null } }),
    prisma.serviceOrder.count({ where: { appointmentId: null } }),
    prisma.domainTransitionHistory.count(),
  ]);

  const svcDanglingApt = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM "Service" s
    WHERE s."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = s."appointmentId")
  `;
  const soDanglingApt = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM "ServiceOrder" s
    WHERE s."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = s."appointmentId")
  `;
  const couponDanglingApt = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM "Coupon" c
    WHERE c."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = c."appointmentId")
  `;
  const soDanglingPayment = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM "ServiceOrder" s
    WHERE s."paymentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = s."paymentId")
  `;
  const payDanglingApt = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM "Payment" p
    WHERE p."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = p."appointmentId")
  `;
  const couponDanglingPayment = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM "Coupon" c
    WHERE c."paymentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = c."paymentId")
  `;

  let couponDanglingRoot = 0;
  let couponRootOnly = 0;
  if (hasRootPaymentId) {
    const r1 = await prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM "Coupon" c
      WHERE c."rootPaymentId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = c."rootPaymentId")
    `;
    const r2 = await prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM "Coupon" c
      WHERE c."paymentId" IS NULL AND c."rootPaymentId" IS NOT NULL
    `;
    couponDanglingRoot = r1[0]?.c ?? 0;
    couponRootOnly = r2[0]?.c ?? 0;
  }

  const cancelledAptSoPhaseMismatch = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c
    FROM "Appointment" a
    JOIN "ServiceOrder" so ON so."appointmentId" = a.id
    WHERE a.status = 'cancelado'
      AND so.phase IS DISTINCT FROM 'cancelled'
  `;

  const homoMarkedApts = await prisma.appointment.findMany({
    where: {
      OR: [
        { observacoes: { contains: "[HOMOLOGATION]" } },
        { observacoes: { contains: "Pedido de Homologação" } },
        { observacoes: { contains: "[Homologação]" } },
        { observacoes: { contains: "homo_" } },
        { observacoes: { contains: "simulação homologação" } },
      ],
    },
    select: { id: true, status: true, observacoes: true },
    take: 40,
  });

  const rebookWithoutMarker = await prisma.$queryRaw<
    Array<{ id: number; status: string; obs: string | null; provider: string | null }>
  >`
    SELECT a.id, a.status, LEFT(COALESCE(a.observacoes, ''), 100) AS obs, p.provider
    FROM "Appointment" a
    JOIN "ServiceOrder" so ON so."appointmentId" = a.id
    JOIN "Payment" p ON p.id = so."paymentId"
    WHERE (
      UPPER(COALESCE(p.provider, '')) = 'HOMOLOGATION'
      OR COALESCE(p."providerPaymentId", '') LIKE 'homo_pay_%'
    )
    AND (a.observacoes IS NULL OR a.observacoes NOT ILIKE '%HOMOLOGATION%')
    LIMIT 40
  `;

  const servicesWithDeliveryNoApt = await prisma.service.count({
    where: {
      appointmentId: null,
      OR: [
        { deliveryAudioUrl: { not: null } },
        { status: { in: ["em_andamento", "aceito", "concluido"] } },
      ],
    },
  });

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        schema: { hasRootPaymentId, hasCouponCategory },
        counts: {
          aptTotal,
          svcTotal,
          soTotal,
          couponTotal,
          paySim,
          payHomo,
          svcNoApt,
          soNoPayment,
          soNoApt,
          couponRootOnly,
          historyCount,
          servicesWithDeliveryNoApt,
        },
        dangling: {
          svcDanglingApt: svcDanglingApt[0]?.c ?? 0,
          soDanglingApt: soDanglingApt[0]?.c ?? 0,
          couponDanglingApt: couponDanglingApt[0]?.c ?? 0,
          couponDanglingRoot,
          soDanglingPayment: soDanglingPayment[0]?.c ?? 0,
          payDanglingApt: payDanglingApt[0]?.c ?? 0,
          couponDanglingPayment: couponDanglingPayment[0]?.c ?? 0,
          cancelledAptSoPhaseMismatch: cancelledAptSoPhaseMismatch[0]?.c ?? 0,
        },
        homoMarkedApts: homoMarkedApts.length,
        homoMarkedSample: homoMarkedApts.slice(0, 10).map((a) => ({
          id: a.id,
          status: a.status,
          obs: (a.observacoes || "").slice(0, 120),
        })),
        rebookWithoutMarkerCount: rebookWithoutMarker.length,
        rebookWithoutMarker: rebookWithoutMarker.slice(0, 15),
      },
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
