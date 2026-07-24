/**
 * GO-H8B — Auditor de integridade (somente leitura; nunca corrige).
 */
import { prisma } from "@/app/lib/prisma";

export type IntegrityFinding = {
  code: string;
  severity: "high" | "medium" | "low";
  label: string;
  count: number;
  sampleIds: string[];
};

export type IntegrityAuditReport = {
  generatedAt: string;
  findings: IntegrityFinding[];
  totalIssues: number;
  ok: boolean;
};

async function finding(
  code: string,
  severity: IntegrityFinding["severity"],
  label: string,
  ids: string[]
): Promise<IntegrityFinding> {
  return {
    code,
    severity,
    label,
    count: ids.length,
    sampleIds: ids.slice(0, 20),
  };
}

export async function auditDomainIntegrity(): Promise<IntegrityAuditReport> {
  const findings: IntegrityFinding[] = [];

  // Coupon.appointmentId dangling
  const couponDanglingApt = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id FROM "Coupon" c
    WHERE c."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = c."appointmentId")
    LIMIT 100
  `;
  if (couponDanglingApt.length) {
    findings.push(
      await finding(
        "coupon_dangling_appointment",
        "high",
        "Cupom com appointmentId sem Appointment",
        couponDanglingApt.map((r) => r.id)
      )
    );
  }

  // Coupon.rootPaymentId dangling
  const couponDanglingRoot = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id FROM "Coupon" c
    WHERE c."rootPaymentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = c."rootPaymentId")
    LIMIT 100
  `;
  if (couponDanglingRoot.length) {
    findings.push(
      await finding(
        "coupon_dangling_root",
        "high",
        "Cupom com rootPaymentId sem Payment (Pedido Raiz)",
        couponDanglingRoot.map((r) => r.id)
      )
    );
  }

  // Coupon.paymentId dangling (SetNull should prevent; still check)
  const couponDanglingPay = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id FROM "Coupon" c
    WHERE c."paymentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = c."paymentId")
    LIMIT 100
  `;
  if (couponDanglingPay.length) {
    findings.push(
      await finding(
        "coupon_dangling_payment",
        "high",
        "Cupom com paymentId sem Payment",
        couponDanglingPay.map((r) => r.id)
      )
    );
  }

  // ServiceOrder without payment (órfão de pedido)
  const soNoPayment = await prisma.serviceOrder.findMany({
    where: { paymentId: null },
    select: { id: true },
    take: 100,
  });
  if (soNoPayment.length) {
    findings.push(
      await finding(
        "service_order_without_payment",
        "medium",
        "Ordem de Serviço sem Pedido (paymentId null)",
        soNoPayment.map((r) => r.id)
      )
    );
  }

  // ServiceOrder.appointmentId dangling
  const soDanglingApt = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT s.id FROM "ServiceOrder" s
    WHERE s."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = s."appointmentId")
    LIMIT 100
  `;
  if (soDanglingApt.length) {
    findings.push(
      await finding(
        "service_order_dangling_appointment",
        "high",
        "Ordem de Serviço com appointmentId inválido",
        soDanglingApt.map((r) => r.id)
      )
    );
  }

  // Payment.appointmentId dangling
  const payDanglingApt = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p.id FROM "Payment" p
    WHERE p."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = p."appointmentId")
    LIMIT 100
  `;
  if (payDanglingApt.length) {
    findings.push(
      await finding(
        "payment_dangling_appointment",
        "medium",
        "Payment.appointmentId sem Appointment",
        payDanglingApt.map((r) => r.id)
      )
    );
  }

  // Appointment sem ServiceOrder e sem Payment apontando (candidato órfão)
  const aptOrphans = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT a.id FROM "Appointment" a
    WHERE NOT EXISTS (
      SELECT 1 FROM "ServiceOrder" so WHERE so."appointmentId" = a.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Payment" p WHERE p."appointmentId" = a.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Coupon" c
      WHERE c."appointmentId" = a.id OR c."originAppointmentId" = a.id
    )
    LIMIT 100
  `;
  if (aptOrphans.length) {
    findings.push(
      await finding(
        "appointment_without_order_or_payment",
        "medium",
        "Appointment sem Order/Payment/Cupom vinculado",
        aptOrphans.map((r) => String(r.id))
      )
    );
  }

  // Service sem Appointment (não é sempre erro — Serviços Gerais; flag medium se cancelado)
  const svcCancelNoApt = await prisma.service.findMany({
    where: { appointmentId: null, status: "cancelado" },
    select: { id: true },
    take: 100,
  });
  if (svcCancelNoApt.length) {
    findings.push(
      await finding(
        "cancelled_service_without_appointment",
        "low",
        "Service cancelado sem Appointment (candidato a purge)",
        svcCancelNoApt.map((r) => r.id)
      )
    );
  }

  // Cancelled appointment vs SO phase
  const phaseMismatch = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT so.id FROM "Appointment" a
    JOIN "ServiceOrder" so ON so."appointmentId" = a.id
    WHERE a.status = 'cancelado'
      AND so.phase IS DISTINCT FROM 'cancelled'
    LIMIT 100
  `;
  if (phaseMismatch.length) {
    findings.push(
      await finding(
        "appointment_cancelled_so_phase_mismatch",
        "medium",
        "Appointment cancelado com ServiceOrder.phase ≠ cancelled",
        phaseMismatch.map((r) => r.id)
      )
    );
  }

  // History sem entidade
  const histOrphans = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT h.id FROM "DomainTransitionHistory" h
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
    LIMIT 100
  `;
  if (histOrphans.length) {
    findings.push(
      await finding(
        "history_without_entity",
        "low",
        "Histórico Domínio sem entidade correspondente",
        histOrphans.map((r) => r.id)
      )
    );
  }

  // Coupon sem Order e sem Pedido (crédito solto)
  const couponNoOrder = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id FROM "Coupon" c
    WHERE c."paymentId" IS NULL
      AND c."rootPaymentId" IS NULL
      AND c."userPlanId" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "ServiceOrder" so WHERE so."couponId" = c.id)
    LIMIT 100
  `;
  if (couponNoOrder.length) {
    findings.push(
      await finding(
        "coupon_without_order_or_payment",
        "medium",
        "Cupom sem Pedido Raiz / Payment / UserPlan / ServiceOrder",
        couponNoOrder.map((r) => r.id)
      )
    );
  }

  const totalIssues = findings.reduce((acc, f) => acc + f.count, 0);
  return {
    generatedAt: new Date().toISOString(),
    findings,
    totalIssues,
    ok: totalIssues === 0,
  };
}
