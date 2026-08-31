/**
 * GO-H8C — Auditor de integridade com severidades oficiais.
 *
 * Alta: quebra de domínio (órfãos operacionais).
 * Média: divergências entre módulos / estados.
 * Informativo: History (e Sync) cuja entidade operacional já foi removida —
 *   Modelo A = log imutável de auditoria (HS-03B); NÃO é inconsistência.
 */
import { prisma } from "@/app/lib/prisma";

export type IntegritySeverity = "high" | "medium" | "info";

export type IntegrityFinding = {
  code: string;
  severity: IntegritySeverity;
  label: string;
  count: number;
  sampleIds: string[];
};

export type IntegrityAuditReport = {
  generatedAt: string;
  findings: IntegrityFinding[];
  /** Soma de ocorrências high + medium (info excluído). */
  totalIssues: number;
  highCount: number;
  mediumCount: number;
  infoCount: number;
  /** true quando não há Alta nem Média. */
  ok: boolean;
  historyModel: "immutable_audit_log";
};

async function finding(
  code: string,
  severity: IntegritySeverity,
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

  const soNoPayment = await prisma.serviceOrder.findMany({
    where: { paymentId: null },
    select: { id: true },
    take: 100,
  });
  if (soNoPayment.length) {
    findings.push(
      await finding(
        "service_order_without_payment",
        "high",
        "Ordem de Serviço sem Pedido (paymentId null)",
        soNoPayment.map((r) => r.id)
      )
    );
  }

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
        "Payment.appointmentId sem Appointment (referência stale)",
        payDanglingApt.map((r) => r.id)
      )
    );
  }

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
        "high",
        "Appointment sem Order/Payment/Cupom vinculado",
        aptOrphans.map((r) => String(r.id))
      )
    );
  }

  const couponNoOrder = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id FROM "Coupon" c
    WHERE c."paymentId" IS NULL
      AND c."rootPaymentId" IS NULL
      AND c."userPlanId" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "ServiceOrder" so WHERE so."couponId" = c.id)
      AND (
        c."couponType" IN ('remarcacao', 'reembolso', 'REBOOK', 'REFUND')
        OR c."couponCategory" = 'reembolso'
        OR (c."assignedUserId" IS NULL AND c."usedBy" IS NULL)
      )
    LIMIT 100
  `;
  if (couponNoOrder.length) {
    findings.push(
      await finding(
        "coupon_without_order_or_payment",
        "high",
        "Cupom sem Pedido Raiz / Payment / UserPlan / ServiceOrder",
        couponNoOrder.map((r) => r.id)
      )
    );
  }

  const deliveryOrphans = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT s.id FROM "Service" s
    WHERE s."deliveryAudioUrl" IS NOT NULL
      AND s."appointmentId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = s."appointmentId")
    LIMIT 100
  `;
  if (deliveryOrphans.length) {
    findings.push(
      await finding(
        "delivery_without_appointment",
        "high",
        "Delivery (Service) sem Appointment válido",
        deliveryOrphans.map((r) => r.id)
      )
    );
  }

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

  // Cancelado Service sem apt — baixa relevância operacional; média se "aceito/em_andamento" sem apt
  const svcActiveNoApt = await prisma.service.findMany({
    where: {
      appointmentId: null,
      status: { in: ["aceito", "em_andamento", "pendente"] },
    },
    select: { id: true },
    take: 100,
  });
  if (svcActiveNoApt.length) {
    findings.push(
      await finding(
        "active_service_without_appointment",
        "medium",
        "Service ativo sem Appointment (possível dessync de módulos)",
        svcActiveNoApt.map((r) => r.id)
      )
    );
  }

  // Modelo A — History imutável: informativo, não é erro
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
    LIMIT 200
  `;
  if (histOrphans.length) {
    findings.push(
      await finding(
        "history_without_entity",
        "info",
        "Histórico (log imutável) cuja entidade operacional já foi removida",
        histOrphans.map((r) => r.id)
      )
    );
  }

  const syncOrphans = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT e.id FROM "SynchronizationEvent" e
    WHERE
      (LOWER(e.entity) IN ('appointment') AND NOT EXISTS (
        SELECT 1 FROM "Appointment" a WHERE a.id::text = e."entityId"
      ))
      OR (LOWER(e.entity) IN ('payment') AND NOT EXISTS (
        SELECT 1 FROM "Payment" p WHERE p.id = e."entityId"
      ))
      OR (LOWER(e.entity) IN ('service') AND NOT EXISTS (
        SELECT 1 FROM "Service" s WHERE s.id = e."entityId"
      ))
      OR (LOWER(e.entity) IN ('coupon') AND NOT EXISTS (
        SELECT 1 FROM "Coupon" c WHERE c.id = e."entityId"
      ))
      OR (LOWER(e.entity) IN ('serviceorder', 'service_order') AND NOT EXISTS (
        SELECT 1 FROM "ServiceOrder" s WHERE s.id = e."entityId"
      ))
    LIMIT 200
  `;
  if (syncOrphans.length) {
    findings.push(
      await finding(
        "sync_without_entity",
        "info",
        "Evento de sincronização cuja entidade operacional já foi removida",
        syncOrphans.map((r) => r.id)
      )
    );
  }

  const highCount = findings
    .filter((f) => f.severity === "high")
    .reduce((a, f) => a + f.count, 0);
  const mediumCount = findings
    .filter((f) => f.severity === "medium")
    .reduce((a, f) => a + f.count, 0);
  const infoCount = findings
    .filter((f) => f.severity === "info")
    .reduce((a, f) => a + f.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    findings,
    totalIssues: highCount + mediumCount,
    highCount,
    mediumCount,
    infoCount,
    ok: highCount + mediumCount === 0,
    historyModel: "immutable_audit_log",
  };
}
