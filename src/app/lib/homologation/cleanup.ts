/**
 * GO-H6/H8B — Limpeza Lab (Simulation) via purge unificado.
 * Mantém assinatura legada; delega a purgeHomologationScope.
 */
import {
  purgeHomologationScope,
  type UnifiedHomologationPurgeResult,
} from "@/app/lib/homologation/unified-cleanup";

export type HomologationCleanupResult = {
  payments: number;
  appointments: number;
  services: number;
  coupons: number;
  serviceOrders: number;
  userPlans: number;
  paymentMetadata: number;
  runRecords: number;
  /** GO-H8B */
  unified?: UnifiedHomologationPurgeResult;
};

export async function cleanupHomologationData(): Promise<HomologationCleanupResult> {
  const unified = await purgeHomologationScope({ scope: "simulation", dryRun: false });
  return {
    payments: unified.totals.payments,
    appointments: unified.totals.appointments,
    services: unified.totals.services,
    coupons: unified.totals.coupons,
    serviceOrders: unified.totals.serviceOrders,
    userPlans: unified.totals.userPlans,
    paymentMetadata: unified.totals.paymentMetadata,
    runRecords: unified.orphanSweep.runRecords,
    unified,
  };
}
