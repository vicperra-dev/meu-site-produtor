/**
 * GO-H8C — Reparo administrativo (nunca apaga History/Sync — log imutável).
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

      // GO-H8C: NÃO apagar DomainTransitionHistory nem SynchronizationEvent.
      // History = Modelo A (log imutável de auditoria).
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
