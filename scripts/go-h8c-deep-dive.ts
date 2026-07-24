/**
 * GO-H8C — Deep dive: payment traces for apt 28 / coupon U30ULXY7
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
{
  const p = resolve(process.cwd(), ".env.local");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.*)$/);
      if (!m) continue;
      let v = m[1].trim().replace(/^["']|["']$/g, "");
      process.env.DATABASE_URL = v;
    }
  }
}

const prisma = new PrismaClient();
const USER = "79f9f28b-582c-45c8-85b8-cd3600c21747";

async function main() {
  const payments = await prisma.payment.findMany({
    where: { userId: USER },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      provider: true,
      providerPaymentId: true,
      asaasId: true,
      status: true,
      type: true,
      amount: true,
      appointmentId: true,
      appointmentIds: true,
      createdAt: true,
    },
  });

  const metas = await prisma.paymentMetadata.findMany({
    where: { userId: USER },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const coupons = await prisma.coupon.findMany({
    where: {
      OR: [{ assignedUserId: USER }, { usedBy: USER }],
    },
    orderBy: { createdAt: "asc" },
  });

  const apts = await prisma.appointment.findMany({
    where: { userId: USER },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      tipo: true,
      observacoes: true,
      createdAt: true,
      refundCouponId: true,
      cancelRefundOption: true,
    },
  });

  const sos = await prisma.serviceOrder.findMany({
    where: { userId: USER },
    orderBy: { createdAt: "asc" },
  });

  // History around coupon creation window
  const histWindow = await prisma.domainTransitionHistory.findMany({
    where: {
      createdAt: {
        gte: new Date("2026-07-24T06:00:00.000Z"),
        lte: new Date("2026-07-24T08:00:00.000Z"),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Deleted service afbed2a3 (from history) - related to apt 28 first accept cycle
  const deadServiceHist = await prisma.domainTransitionHistory.findMany({
    where: { entityId: "afbed2a3-5a79-4914-b564-894f38bcb831" },
    orderBy: { createdAt: "asc" },
  });

  // Apt 27 history - sibling remarcação chain?
  const apt27 = await prisma.appointment.findUnique({ where: { id: 27 } });
  const hist27 = await prisma.domainTransitionHistory.findMany({
    where: { entity: "appointment", entityId: "27" },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        userPayments: payments,
        userCoupons: coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.couponType,
          category: c.couponCategory,
          used: c.used,
          paymentId: c.paymentId,
          rootPaymentId: c.rootPaymentId,
          originAppointmentId: c.originAppointmentId,
          appointmentId: c.appointmentId,
          assignedUserId: c.assignedUserId,
          createdAt: c.createdAt,
        })),
        userApts: apts,
        userSOs: sos,
        metas: metas.map((m) => ({
          id: m.id,
          asaasId: m.asaasId,
          createdAt: m.createdAt,
          metaSnippet: String(m.metadata || "").slice(0, 200),
        })),
        histWindow: histWindow.map((h) => ({
          entity: h.entity,
          entityId: h.entityId,
          event: h.eventName,
          from: h.fromStatus,
          to: h.toStatus,
          reason: h.reason,
          at: h.createdAt,
        })),
        deadServiceHist,
        apt27,
        hist27,
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
