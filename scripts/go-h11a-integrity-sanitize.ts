/**
 * GO-H11A — Probe H10 columns + deep-dive integrity highs + sanitize.
 * Flags: --probe | --investigate | --sanitize
 */
import fs from "fs";
import path from "path";
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

const OUT = path.join("reports", "domain-guardian", "go-h11a");
fs.mkdirSync(OUT, { recursive: true });

const mode = process.argv.includes("--sanitize")
  ? "sanitize"
  : process.argv.includes("--investigate")
    ? "investigate"
    : "probe";

async function probe(prisma: PrismaClient) {
  const userPlan = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='UserPlan' AND column_name='lastBenefitCycleAt'`
  );
  const subscription = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Subscription' AND column_name IN ('cyclesRemaining','failureCount','gracePeriodEndsAt','rootPaymentId','lastFailureAt') ORDER BY column_name`
  );
  const out = {
    at: new Date().toISOString(),
    h10b_lastBenefitCycleAt: userPlan.length > 0,
    h10c_subscription_cols: subscription.map((c) => c.column_name),
    h10c_ready: subscription.length >= 5,
  };
  fs.writeFileSync(path.join(OUT, "migration-probe.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  return out;
}

async function investigate(prisma: PrismaClient) {
  const couponId = "12e8943b-45fe-4c31-9f47-b2ea5d475740";
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  const aptIds = [32, 33];
  const appointments = await prisma.appointment.findMany({
    where: { id: { in: aptIds } },
    include: {
      services: { select: { id: true, status: true, tipo: true } },
    },
  });
  const paymentsForApts = await prisma.payment.findMany({
    where: {
      OR: [
        { appointmentId: { in: aptIds } },
        // appointmentIds JSON may contain them — scan recent
      ],
    },
    take: 50,
  });
  const paymentsMaybe = await prisma.payment.findMany({
    where: {
      OR: aptIds.map((id) => ({
        appointmentIds: { equals: [id] as unknown as object },
      })),
    },
    take: 20,
  });
  const couponsPointing = await prisma.coupon.findMany({
    where: { appointmentId: { in: aptIds } },
  });
  const serviceOrders = await prisma.serviceOrder.findMany({
    where: { appointmentId: { in: aptIds } },
  });
  const history = await prisma.domainTransitionHistory.findMany({
    where: {
      OR: [
        { entityId: couponId },
        { entityId: "32" },
        { entityId: "33" },
      ],
    },
    take: 30,
    orderBy: { createdAt: "desc" },
  });

  const report = {
    at: new Date().toISOString(),
    rootCauseNotes: [
      "coupon_dangling_appointment: Coupon.appointmentId apontava para Appointment inexistente — causa raiz: DELETE admin de Appointment e cleanup de órfãos apagavam o agendamento sem nullificar cupons (purgeOrderTree já fazia; esses caminhos não).",
      "appointment_without_order_or_payment: Appointments 32/33 sem Payment/ServiceOrder/Coupon — residual sem Pedido Raiz (teste/homologação ou criação incompleta).",
    ],
    coupon,
    appointments,
    paymentsForApts: paymentsForApts.length,
    paymentsMaybe: paymentsMaybe.length,
    couponsPointing,
    serviceOrders,
    historySample: history.map((h) => ({
      id: h.id,
      entity: h.entity,
      entityId: h.entityId,
      event: h.eventName,
      createdAt: h.createdAt,
    })),
  };
  fs.writeFileSync(path.join(OUT, "integrity-investigate.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, mode: "investigate", ...report }, null, 2));
  return report;
}

async function sanitize(prisma: PrismaClient) {
  const { auditDomainIntegrity } = await import(
    "../src/app/lib/domain/integrity-audit"
  );
  const beforeAudit = await auditDomainIntegrity();
  fs.writeFileSync(
    path.join(OUT, "integrity-before.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        ok: beforeAudit.ok,
        highCount: beforeAudit.highCount,
        mediumCount: beforeAudit.mediumCount,
        infoCount: beforeAudit.infoCount,
        high: (beforeAudit.findings || [])
          .filter((f: { severity: string }) => f.severity === "high")
          .map((f: { code: string; count: number; label: string; sampleIds: string[] }) => ({
            code: f.code,
            count: f.count,
            label: f.label,
            sampleIds: f.sampleIds,
          })),
        medium: (beforeAudit.findings || [])
          .filter((f: { severity: string }) => f.severity === "medium")
          .map((f: { code: string; count: number; label: string }) => ({
            code: f.code,
            count: f.count,
            label: f.label,
          })),
      },
      null,
      2
    )
  );

  const before = await investigate(prisma);
  const actions: Array<Record<string, unknown>> = [];

  const couponId = "12e8943b-45fe-4c31-9f47-b2ea5d475740";
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (coupon?.appointmentId != null) {
    const apt = await prisma.appointment.findUnique({
      where: { id: coupon.appointmentId },
    });
    if (!apt) {
      await prisma.coupon.update({
        where: { id: couponId },
        data: { appointmentId: null },
      });
      actions.push({
        action: "nullify_coupon_appointmentId",
        couponId,
        previousAppointmentId: coupon.appointmentId,
        reason: "dangling appointment reference (root: purge/delete apt without clearing coupon)",
      });
    }
  }

  for (const id of [32, 33]) {
    const apt = await prisma.appointment.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!apt) continue;

    const hasPayment =
      (await prisma.payment.count({
        where: {
          OR: [{ appointmentId: id }],
        },
      })) > 0;
    const hasSO =
      (await prisma.serviceOrder.count({ where: { appointmentId: id } })) > 0;
    const hasCoupon =
      (await prisma.coupon.count({ where: { appointmentId: id } })) > 0;

    if (!hasPayment && !hasSO && !hasCoupon) {
      // Remove orphan services then appointment (no commercial root)
      if (apt.services.length) {
        await prisma.service.deleteMany({ where: { appointmentId: id } });
      }
      await prisma.appointment.delete({ where: { id } });
      actions.push({
        action: "delete_orphan_appointment",
        appointmentId: id,
        servicesDeleted: apt.services.length,
        reason:
          "no Payment / ServiceOrder / Coupon — residual without Pedido Raiz (GO-H5 invariant)",
      });
    } else {
      actions.push({
        action: "skip_appointment",
        appointmentId: id,
        hasPayment,
        hasSO,
        hasCoupon,
      });
    }
  }

  const after = await auditDomainIntegrity();
  fs.writeFileSync(
    path.join(OUT, "integrity-after.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        ok: after.ok,
        highCount: after.highCount,
        mediumCount: after.mediumCount,
        infoCount: after.infoCount,
        high: (after.findings || [])
          .filter((f: { severity: string }) => f.severity === "high")
          .map((f: { code: string; count: number; label: string; sampleIds: string[] }) => ({
            code: f.code,
            count: f.count,
            label: f.label,
            sampleIds: f.sampleIds,
          })),
        medium: (after.findings || [])
          .filter((f: { severity: string }) => f.severity === "medium")
          .map((f: { code: string; count: number; label: string }) => ({
            code: f.code,
            count: f.count,
            label: f.label,
          })),
      },
      null,
      2
    )
  );
  const summary = {
    at: new Date().toISOString(),
    rootCauseFixes: [
      "DELETE /api/admin/agendamentos agora nullifica Coupon.appointmentId / ServiceOrder antes de apagar Appointment",
      "unified-cleanup orphan path agora nullifica cupons antes de apagar appointments",
    ],
    beforeHigh: before,
    actions,
    after: {
      ok: after.ok,
      highCount: after.highCount,
      mediumCount: after.mediumCount,
      infoCount: after.infoCount,
      high: (after.findings || [])
        .filter((f: { severity: string }) => f.severity === "high")
        .map((f: { code: string; count: number; label: string }) => ({
          code: f.code,
          count: f.count,
          label: f.label,
        })),
      medium: (after.findings || [])
        .filter((f: { severity: string }) => f.severity === "medium")
        .map((f: { code: string; count: number; label: string }) => ({
          code: f.code,
          count: f.count,
          label: f.label,
        })),
    },
  };
  fs.writeFileSync(path.join(OUT, "integrity-sanitize.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (mode === "probe") await probe(prisma);
    else if (mode === "investigate") await investigate(prisma);
    else await sanitize(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
