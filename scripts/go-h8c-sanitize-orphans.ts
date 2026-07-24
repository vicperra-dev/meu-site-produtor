/**
 * GO-H8C — Saneamento dos órfãos classificados (Neon/prod via .env.local).
 *
 * Remove apenas:
 * - Coupon e329cf2f… (remarcação sem Pedido Raiz; unused)
 * - Appointment #28 + Services (sem Payment/SO; resíduo pós-delete de Payment)
 *
 * Preserva DomainTransitionHistory e SynchronizationEvent (Modelo A).
 *
 * Uso: npx tsx scripts/go-h8c-sanitize-orphans.ts [--execute]
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
    let v = m[2].trim().replace(/^["']|["']$/g, "");
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
      process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const EXECUTE = process.argv.includes("--execute");
const APT_ID = 28;
const COUPON_ID = "e329cf2f-49e4-4338-979d-6416383f1eb3";
const prisma = new PrismaClient();

async function main() {
  const apt = await prisma.appointment.findUnique({
    where: { id: APT_ID },
    include: { services: { select: { id: true, status: true, tipo: true } } },
  });
  const coupon = await prisma.coupon.findUnique({ where: { id: COUPON_ID } });

  const plan = {
    dryRun: !EXECUTE,
    appointment: apt
      ? {
          id: apt.id,
          status: apt.status,
          createdAt: apt.createdAt,
          services: apt.services,
          hasPayment: false,
          hasSO: (await prisma.serviceOrder.count({ where: { appointmentId: APT_ID } })) > 0,
        }
      : null,
    coupon: coupon
      ? {
          id: coupon.id,
          code: coupon.code,
          used: coupon.used,
          paymentId: coupon.paymentId,
          rootPaymentId: coupon.rootPaymentId,
          couponType: coupon.couponType,
        }
      : null,
    classification: {
      appointment28: "historical_residue_real_inconsistency",
      coupon: "historical_residue_real_inconsistency",
      history: "immutable_audit_log_keep",
    },
  };

  console.log(JSON.stringify(plan, null, 2));

  if (!EXECUTE) {
    console.log("\nDry-run only. Re-run with --execute to apply.");
    return;
  }

  // Safety guards
  if (coupon) {
    if (coupon.used) throw new Error("Refuse: coupon is used");
    if (coupon.paymentId || coupon.rootPaymentId || coupon.userPlanId) {
      throw new Error("Refuse: coupon still linked to payment/plan");
    }
  }
  if (apt) {
    const pay = await prisma.payment.count({ where: { appointmentId: APT_ID } });
    const so = await prisma.serviceOrder.count({ where: { appointmentId: APT_ID } });
    if (pay > 0 || so > 0) throw new Error("Refuse: appointment regained payment/SO link");
  }

  await prisma.$transaction(async (tx) => {
    if (coupon) {
      await tx.serviceOrder.updateMany({
        where: { couponId: coupon.id },
        data: { couponId: null },
      });
      await tx.coupon.delete({ where: { id: coupon.id } });
    }
    if (apt) {
      await tx.service.deleteMany({ where: { appointmentId: APT_ID } });
      await tx.appointment.delete({ where: { id: APT_ID } });
    }
  });

  console.log("\nSanitized OK. History/Sync preserved.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
