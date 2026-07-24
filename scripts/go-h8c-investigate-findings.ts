/**
 * GO-H8C — Investigação read-only dos findings específicos.
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
// Prefer .env.local for prod investigation when both exist
{
  const p = resolve(process.cwd(), ".env.local");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.*)$/);
      if (!m) continue;
      let v = m[1].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env.DATABASE_URL = v;
    }
  }
}

const prisma = new PrismaClient();
const APT_ID = 28;
const COUPON_ID = "e329cf2f-49e4-4338-979d-6416383f1eb3";

async function main() {
  const apt = await prisma.appointment.findUnique({
    where: { id: APT_ID },
    include: {
      user: { select: { id: true, email: true, nomeArtistico: true, role: true } },
      services: true,
      serviceOrders: true,
    },
  });

  const paymentsPointing = await prisma.payment.findMany({
    where: {
      OR: [
        { appointmentId: APT_ID },
        // JSON contains hard to query — fetch recent and filter
      ],
    },
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
      userId: true,
    },
    take: 50,
  });

  const allPaymentsSample = await prisma.payment.findMany({
    where: { userId: apt?.userId },
    select: {
      id: true,
      provider: true,
      providerPaymentId: true,
      asaasId: true,
      status: true,
      type: true,
      appointmentId: true,
      appointmentIds: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const paymentsWithAptInJson = allPaymentsSample.filter((p) => {
    if (p.appointmentId === APT_ID) return true;
    let raw: unknown = p.appointmentIds;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return false;
      }
    }
    return Array.isArray(raw) && raw.map(Number).includes(APT_ID);
  });

  const couponsRelated = await prisma.coupon.findMany({
    where: {
      OR: [
        { appointmentId: APT_ID },
        { originAppointmentId: APT_ID },
        { id: COUPON_ID },
      ],
    },
  });

  const coupon = await prisma.coupon.findUnique({ where: { id: COUPON_ID } });

  const sosForCoupon = coupon
    ? await prisma.serviceOrder.findMany({
        where: { OR: [{ couponId: coupon.id }, { paymentId: coupon.paymentId ?? undefined }] },
      })
    : [];

  const historyForApt = await prisma.domainTransitionHistory.findMany({
    where: {
      OR: [
        { entity: { equals: "appointment", mode: "insensitive" }, entityId: String(APT_ID) },
        { entity: { equals: "Appointment", mode: "insensitive" }, entityId: String(APT_ID) },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const historyForCoupon = await prisma.domainTransitionHistory.findMany({
    where: {
      OR: [
        { entity: { equals: "coupon", mode: "insensitive" }, entityId: COUPON_ID },
        { entity: { equals: "Coupon", mode: "insensitive" }, entityId: COUPON_ID },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const syncForApt = await prisma.synchronizationEvent.findMany({
    where: {
      OR: [
        { entity: { equals: "appointment", mode: "insensitive" }, entityId: String(APT_ID) },
        { entity: { equals: "Appointment", mode: "insensitive" }, entityId: String(APT_ID) },
      ],
    },
    orderBy: { occurredAt: "asc" },
    take: 50,
  });

  // History samples among the 23 orphans
  const histOrphans = await prisma.$queryRaw<
    Array<{ id: string; entity: string; entityId: string; eventName: string; createdAt: Date }>
  >`
    SELECT h.id, h.entity, h."entityId", h."eventName", h."createdAt"
    FROM "DomainTransitionHistory" h
    WHERE
      (LOWER(h.entity) IN ('appointment') AND NOT EXISTS (
        SELECT 1 FROM "Appointment" a WHERE a.id::text = h."entityId"
      ))
      OR (LOWER(h.entity) IN ('payment') AND NOT EXISTS (
        SELECT 1 FROM "Payment" p WHERE p.id = h."entityId"
      ))
      OR (LOWER(h.entity) IN ('service') AND NOT EXISTS (
        SELECT 1 FROM "Service" s WHERE s.id = h."entityId"
      ))
      OR (LOWER(h.entity) IN ('coupon') AND NOT EXISTS (
        SELECT 1 FROM "Coupon" c WHERE c.id = h."entityId"
      ))
      OR (LOWER(h.entity) IN ('serviceorder', 'service_order') AND NOT EXISTS (
        SELECT 1 FROM "ServiceOrder" s WHERE s.id = h."entityId"
      ))
    ORDER BY h."createdAt" ASC
    LIMIT 50
  `;

  const goH8bCommitApprox = new Date("2026-07-24T16:00:00.000Z");

  console.log(
    JSON.stringify(
      {
        appointment28: apt
          ? {
              id: apt.id,
              createdAt: apt.createdAt,
              status: apt.status,
              tipo: apt.tipo,
              observacoes: apt.observacoes,
              cancelReason: apt.cancelReason,
              cancelledAt: apt.cancelledAt,
              refundCouponId: apt.refundCouponId,
              user: apt.user,
              services: apt.services.map((s) => ({
                id: s.id,
                tipo: s.tipo,
                status: s.status,
                createdAt: s.createdAt,
              })),
              serviceOrders: apt.serviceOrders,
              createdBeforeGoH8B: apt.createdAt < goH8bCommitApprox,
            }
          : null,
        paymentsDirect: paymentsPointing,
        paymentsUserWithApt: paymentsWithAptInJson,
        couponsRelated,
        couponOrphan: coupon,
        sosForCoupon,
        historyForApt,
        historyForCoupon,
        syncForApt: syncForApt.map((s) => ({
          id: s.id,
          name: s.name,
          fromStatus: s.fromStatus,
          toStatus: s.toStatus,
          occurredAt: s.occurredAt,
          source: s.source,
        })),
        historyOrphansSample: histOrphans,
        historyOrphanCount: histOrphans.length,
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
