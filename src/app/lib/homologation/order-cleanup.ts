/**
 * GO-H7/H8B — Limpeza Pedidos HOMOLOGATION via purge unificado.
 */
import {
  purgeHomologationScope,
  type UnifiedHomologationPurgeResult,
} from "@/app/lib/homologation/unified-cleanup";

export type HomologationOrderCleanupResult = {
  payments: number;
  appointments: number;
  services: number;
  coupons: number;
  serviceOrders: number;
  paymentMetadata: number;
  unified?: UnifiedHomologationPurgeResult;
};

export async function cleanupHomologationOrders(): Promise<HomologationOrderCleanupResult> {
  const unified = await purgeHomologationScope({ scope: "homologation", dryRun: false });
  return {
    payments: unified.totals.payments,
    appointments: unified.totals.appointments,
    services: unified.totals.services,
    coupons: unified.totals.coupons,
    serviceOrders: unified.totals.serviceOrders,
    paymentMetadata: unified.totals.paymentMetadata,
    unified,
  };
}
