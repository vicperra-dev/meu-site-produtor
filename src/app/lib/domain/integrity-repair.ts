/**
 * GO-H8B — Reparo administrativo de integridade (somente sob demanda).
 * Nunca apaga registros válidos ligados a Pedido Raiz ativo.
 */
import { prisma } from "@/app/lib/prisma";
import { auditDomainIntegrity, type IntegrityAuditReport } from "@/app/lib/domain/integrity-audit";

export type IntegrityRepairAction = {
  code: string;
  description: string;
  affected: number;
};

export type IntegrityRepairReport = {
  generatedAt: string;
  actions: IntegrityRepairAction[];
  before: IntegrityAuditReport;
  after: IntegrityAuditReport;
};

export async function repairDomainIntegrity(): Promise<IntegrityRepairReport> {
  const before = await auditDomainIntegrity();
  const actions: IntegrityRepairAction[] = [];

  await prisma.$transaction(
    async (tx) => {
      // Null dangling coupon.appointmentId
      const c1 = await tx.$executeRaw`
        UPDATE "Coupon" c
        SET "appointmentId" = NULL
        WHERE c."appointmentId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = c."appointmentId")
      `;
      if (c1 > 0) {
        actions.push({
          code: "null_coupon_dangling_appointment",
          description: "Zerar Coupon.appointmentId órfão",
          affected: Number(c1),
        });
      }

      // Null dangling originAppointmentId
      const c1b = await tx.$executeRaw`
        UPDATE "Coupon" c
        SET "originAppointmentId" = NULL
        WHERE c."originAppointmentId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = c."originAppointmentId")
      `;
      if (c1b > 0) {
        actions.push({
          code: "null_coupon_dangling_origin",
          description: "Zerar Coupon.originAppointmentId órfão",
          affected: Number(c1b),
        });
      }

      // Null dangling payment.appointmentId
      const p1 = await tx.$executeRaw`
        UPDATE "Payment" p
        SET "appointmentId" = NULL
        WHERE p."appointmentId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = p."appointmentId")
      `;
      if (p1 > 0) {
        actions.push({
          code: "null_payment_dangling_appointment",
          description: "Zerar Payment.appointmentId órfão",
          affected: Number(p1),
        });
      }

      // Null dangling ServiceOrder.appointmentId
      const so1 = await tx.$executeRaw`
        UPDATE "ServiceOrder" s
        SET "appointmentId" = NULL
        WHERE s."appointmentId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = s."appointmentId")
      `;
      if (so1 > 0) {
        actions.push({
          code: "null_so_dangling_appointment",
          description: "Zerar ServiceOrder.appointmentId órfão",
          affected: Number(so1),
        });
      }

      // Sync SO phase when appointment cancelled
      const so2 = await tx.$executeRaw`
        UPDATE "ServiceOrder" so
        SET phase = 'cancelled', "updatedAt" = NOW()
        FROM "Appointment" a
        WHERE so."appointmentId" = a.id
          AND a.status = 'cancelado'
          AND so.phase IS DISTINCT FROM 'cancelled'
      `;
      if (so2 > 0) {
        actions.push({
          code: "sync_so_phase_cancelled",
          description: "Alinhar ServiceOrder.phase=cancelled com Appointment cancelado",
          affected: Number(so2),
        });
      }

      // Delete history for missing entities
      const h1 = await tx.$executeRaw`
        DELETE FROM "DomainTransitionHistory" h
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
      `;
      if (h1 > 0) {
        actions.push({
          code: "delete_orphan_history",
          description: "Remover DomainTransitionHistory sem entidade",
          affected: Number(h1),
        });
      }

      // Delete sync events for missing entities (mesmo critério)
      const s1 = await tx.$executeRaw`
        DELETE FROM "SynchronizationEvent" e
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
      `;
      if (s1 > 0) {
        actions.push({
          code: "delete_orphan_sync_events",
          description: "Remover SynchronizationEvent sem entidade",
          affected: Number(s1),
        });
      }

      // Clear dangling rootPaymentId on coupons (não apaga o cupom)
      const c2 = await tx.$executeRaw`
        UPDATE "Coupon" c
        SET "rootPaymentId" = NULL
        WHERE c."rootPaymentId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = c."rootPaymentId")
      `;
      if (c2 > 0) {
        actions.push({
          code: "null_coupon_dangling_root",
          description: "Zerar Coupon.rootPaymentId órfão",
          affected: Number(c2),
        });
      }
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  const after = await auditDomainIntegrity();
  return {
    generatedAt: new Date().toISOString(),
    actions,
    before,
    after,
  };
}
