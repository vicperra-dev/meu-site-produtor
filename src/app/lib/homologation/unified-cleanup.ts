/**
 * GO-H8B — Limpeza unificada de Homologação via purgeOrderTree (Pedido Raiz).
 */
import { prisma } from "@/app/lib/prisma";
import {
  purgeOrderTree,
  sumCounts,
  type OrderTreeCounts,
  type PurgeOrderTreeResult,
} from "@/app/lib/domain/purge-order-tree";
import { HOMOLOGATION_ORIGIN } from "@/app/lib/homologation/create-order";

export type HomologationPurgeScope = "simulation" | "homologation" | "both";

export type UnifiedHomologationPurgeResult = {
  scope: HomologationPurgeScope;
  dryRun: boolean;
  rootPaymentIds: string[];
  totals: OrderTreeCounts;
  perRoot: PurgeOrderTreeResult[];
  orphanSweep: {
    appointments: number;
    services: number;
    serviceOrders: number;
    runRecords: number;
  };
};

function isSimulationPayment(row: {
  provider: string | null;
  providerPaymentId: string | null;
  asaasId: string | null;
}): boolean {
  const provider = String(row.provider || "").toUpperCase();
  if (provider === "SIMULATION") return true;
  const pid = String(row.providerPaymentId || "");
  if (pid.startsWith("sim_pay_")) return true;
  return String(row.asaasId || "").startsWith("sim_pay_");
}

function isHomologationPayment(row: {
  provider: string | null;
  providerPaymentId: string | null;
  asaasId: string | null;
}): boolean {
  const provider = String(row.provider || "").toUpperCase();
  if (provider === HOMOLOGATION_ORIGIN) return true;
  const pid = String(row.providerPaymentId || "");
  if (pid.startsWith("homo_pay_")) return true;
  return String(row.asaasId || "").startsWith("homo_pay_");
}

async function listRootPaymentIds(scope: HomologationPurgeScope): Promise<string[]> {
  const includeSim = scope === "simulation" || scope === "both";
  const includeHomo = scope === "homologation" || scope === "both";

  const or: Array<Record<string, unknown>> = [];
  if (includeSim) {
    or.push(
      { provider: { equals: "SIMULATION", mode: "insensitive" } },
      { providerPaymentId: { startsWith: "sim_pay_" } },
      { asaasId: { startsWith: "sim_pay_" } }
    );
  }
  if (includeHomo) {
    or.push(
      { provider: { equals: HOMOLOGATION_ORIGIN, mode: "insensitive" } },
      { providerPaymentId: { startsWith: "homo_pay_" } },
      { asaasId: { startsWith: "homo_pay_" } }
    );
  }
  if (or.length === 0) return [];

  const candidates = await prisma.payment.findMany({
    where: { OR: or },
    select: {
      id: true,
      provider: true,
      providerPaymentId: true,
      asaasId: true,
    },
  });

  const ids = new Set<string>();
  for (const row of candidates) {
    if (includeSim && isSimulationPayment(row)) ids.add(row.id);
    if (includeHomo && isHomologationPayment(row)) ids.add(row.id);
  }
  return [...ids];
}

async function sweepOrphans(
  scope: HomologationPurgeScope,
  dryRun: boolean
): Promise<UnifiedHomologationPurgeResult["orphanSweep"]> {
  const includeSim = scope === "simulation" || scope === "both";
  const includeHomo = scope === "homologation" || scope === "both";

  const obsOr: Array<{ observacoes: { contains: string } }> = [];
  if (includeSim) {
    obsOr.push(
      { observacoes: { contains: "homo_" } },
      { observacoes: { contains: "[Homologação]" } },
      { observacoes: { contains: "Homologação cenário" } },
      { observacoes: { contains: "simulação homologação" } }
    );
  }
  if (includeHomo) {
    obsOr.push(
      { observacoes: { contains: "[HOMOLOGATION]" } },
      { observacoes: { contains: "origin=HOMOLOGATION" } },
      { observacoes: { contains: "Pedido de Homologação" } }
    );
  }

  const orphanApts =
    obsOr.length > 0
      ? await prisma.appointment.findMany({
          where: { OR: obsOr },
          select: { id: true },
        })
      : [];
  const aptIds = orphanApts.map((a) => a.id);

  let services = 0;
  let serviceOrders = 0;
  let appointments = 0;
  let runRecords = 0;

  if (dryRun) {
    if (aptIds.length > 0) {
      services = await prisma.service.count({ where: { appointmentId: { in: aptIds } } });
      serviceOrders = await prisma.serviceOrder.count({
        where: { appointmentId: { in: aptIds } },
      });
      appointments = aptIds.length;
    }
    if (includeSim) {
      runRecords = await prisma.homologationRunRecord.count();
    }
    return { appointments, services, serviceOrders, runRecords };
  }

  if (aptIds.length > 0) {
    await prisma.coupon.updateMany({
      where: { appointmentId: { in: aptIds } },
      data: { appointmentId: null },
    });
    services = (
      await prisma.service.deleteMany({ where: { appointmentId: { in: aptIds } } })
    ).count;
    serviceOrders = (
      await prisma.serviceOrder.deleteMany({ where: { appointmentId: { in: aptIds } } })
    ).count;
    appointments = (
      await prisma.appointment.deleteMany({ where: { id: { in: aptIds } } })
    ).count;
  }

  if (includeSim) {
    runRecords = (await prisma.homologationRunRecord.deleteMany({})).count;
  }

  // Metadata residual por padrão de string (fora da árvore de um payment já apagado)
  if (includeSim) {
    await prisma.paymentMetadata.deleteMany({
      where: {
        OR: [
          { asaasId: { startsWith: "sim_pay_" } },
          { metadata: { contains: '"provider":"SIMULATION"' } },
          { metadata: { contains: "homologationRunId" } },
          { metadata: { contains: "laboratório operacional" } },
        ],
      },
    });
  }
  if (includeHomo) {
    await prisma.paymentMetadata.deleteMany({
      where: {
        OR: [
          { asaasId: { startsWith: "homo_pay_" } },
          { metadata: { contains: '"origin":"HOMOLOGATION"' } },
          { metadata: { contains: '"provider":"HOMOLOGATION"' } },
          { metadata: { contains: "Pedido de Homologação" } },
        ],
      },
    });
  }

  return { appointments, services, serviceOrders, runRecords };
}

/**
 * Limpeza unificada: resolve Pedidos Raiz do escopo e chama purgeOrderTree em cada um.
 */
export async function purgeHomologationScope(options: {
  scope: HomologationPurgeScope;
  dryRun?: boolean;
}): Promise<UnifiedHomologationPurgeResult> {
  const dryRun = Boolean(options.dryRun);
  const scope = options.scope;
  const rootPaymentIds = await listRootPaymentIds(scope);
  const perRoot: PurgeOrderTreeResult[] = [];

  for (const id of rootPaymentIds) {
    perRoot.push(await purgeOrderTree(id, { dryRun }));
  }

  const orphanSweep = await sweepOrphans(scope, dryRun);
  const totals = sumCounts(perRoot.map((r) => r.counts));
  totals.appointments += orphanSweep.appointments;
  totals.services += orphanSweep.services;
  totals.serviceOrders += orphanSweep.serviceOrders;

  return {
    scope,
    dryRun,
    rootPaymentIds,
    totals,
    perRoot,
    orphanSweep,
  };
}
