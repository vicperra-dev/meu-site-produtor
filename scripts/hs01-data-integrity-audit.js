/**
 * HS-01 — Auditoria de integridade (somente leitura).
 *
 *   node scripts/hs01-data-integrity-audit.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const issues = [];

  const users = await prisma.user.count();
  const appointments = await prisma.appointment.findMany({
    select: { id: true, status: true, userId: true },
  });
  const services = await prisma.service.findMany({
    select: { id: true, appointmentId: true, status: true, tipo: true, userId: true },
  });
  const payments = await prisma.payment.findMany({
    select: {
      id: true,
      userId: true,
      appointmentId: true,
      appointmentIds: true,
      status: true,
      asaasId: true,
    },
  });
  const coupons = await prisma.coupon.findMany({
    select: {
      id: true,
      code: true,
      assignedUserId: true,
      appointmentId: true,
      paymentId: true,
      userPlanId: true,
      usedBy: true,
      used: true,
    },
  });

  const aptIds = new Set(appointments.map((a) => a.id));
  const acceptedApts = appointments.filter((a) =>
    ["aceito", "confirmado", "em_andamento", "concluido"].includes(a.status)
  );

  const aptsSemService = acceptedApts.filter(
    (a) => !services.some((s) => s.appointmentId === a.id)
  );
  if (aptsSemService.length > 0) {
    issues.push({
      type: "appointments_aceitos_sem_service",
      count: aptsSemService.length,
      sample: aptsSemService.slice(0, 10).map((a) => a.id),
    });
  }

  const servicesSemApt = services.filter(
    (s) => s.appointmentId != null && !aptIds.has(s.appointmentId)
  );
  if (servicesSemApt.length > 0) {
    issues.push({
      type: "services_com_appointment_orfao",
      count: servicesSemApt.length,
      sample: servicesSemApt.slice(0, 10).map((s) => s.id),
    });
  }

  const servicesSemTipo = services.filter((s) => !String(s.tipo || "").trim());
  if (servicesSemTipo.length > 0) {
    issues.push({
      type: "services_sem_tipo",
      count: servicesSemTipo.length,
      sample: servicesSemTipo.slice(0, 10).map((s) => s.id),
    });
  }

  const asaasDup = new Map();
  for (const p of payments) {
    if (!p.asaasId) continue;
    const list = asaasDup.get(p.asaasId) || [];
    list.push(p.id);
    asaasDup.set(p.asaasId, list);
  }
  const dupPayments = [...asaasDup.entries()].filter(([, ids]) => ids.length > 1);
  if (dupPayments.length > 0) {
    issues.push({
      type: "payments_asaas_id_duplicado",
      count: dupPayments.length,
      sample: dupPayments.slice(0, 5),
    });
  }

  const approvedPayments = await prisma.payment.findMany({
    where: { status: "approved", asaasId: { not: null } },
    select: { id: true, asaasId: true },
  });
  const metaRows = await prisma.paymentMetadata.findMany({
    where: { asaasId: { not: null } },
    select: { asaasId: true },
  });
  const metaAsaas = new Set(metaRows.map((m) => m.asaasId).filter(Boolean));
  const semMeta = approvedPayments.filter((p) => p.asaasId && !metaAsaas.has(p.asaasId));
  if (semMeta.length > 0) {
    issues.push({
      type: "payments_aprovados_sem_payment_metadata",
      count: semMeta.length,
      sample: semMeta.slice(0, 10).map((p) => p.id),
    });
  }

  const cuponsOrfaos = coupons.filter(
    (c) => !c.assignedUserId && !c.paymentId && !c.userPlanId && !c.usedBy
  );
  if (cuponsOrfaos.length > 0) {
    issues.push({
      type: "cupons_sem_owner",
      count: cuponsOrfaos.length,
      sample: cuponsOrfaos.slice(0, 10).map((c) => c.code),
    });
  }

  const cpfDup = await prisma.$queryRaw`
    SELECT cpf, COUNT(*)::bigint AS n
    FROM "User"
    WHERE cpf IS NOT NULL AND cpf <> ''
    GROUP BY cpf
    HAVING COUNT(*) > 1
  `;
  if (cpfDup.length > 0) {
    issues.push({
      type: "cpf_duplicado",
      count: cpfDup.length,
      sample: cpfDup.slice(0, 10),
    });
  }

  console.log(
    JSON.stringify(
      {
        reportId: "HS-01-data-integrity",
        generatedAt: new Date().toISOString(),
        totals: {
          users,
          appointments: appointments.length,
          services: services.length,
          payments: payments.length,
          coupons: coupons.length,
        },
        issues,
        issueCount: issues.length,
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
