/**
 * GO-H8B — Purge transacional da árvore do Pedido Raiz (Payment).
 * Único ponto de exclusão física do grafo comercial/operacional.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export type OrderTreeCounts = {
  payments: number;
  serviceOrders: number;
  coupons: number;
  appointments: number;
  services: number;
  /** Services com appointmentId (Serviços Selecionados). */
  selectedServices: number;
  /** Services com deliveryAudioUrl. */
  deliveries: number;
  userPlans: number;
  subscriptions: number;
  paymentMetadata: number;
  history: number;
  syncEvents: number;
};

export type OrderTreeIds = {
  rootPaymentId: string;
  paymentIds: string[];
  serviceOrderIds: string[];
  couponIds: string[];
  appointmentIds: number[];
  serviceIds: string[];
  userPlanIds: string[];
  paymentMetadataIds: string[];
  historyIds: string[];
  syncEventIds: string[];
  deliveryUrls: string[];
};

export type PurgeOrderTreeResult = {
  rootPaymentId: string;
  dryRun: boolean;
  counts: OrderTreeCounts;
  ids?: Pick<OrderTreeIds, "paymentIds" | "appointmentIds" | "serviceIds" | "couponIds">;
};

function emptyCounts(): OrderTreeCounts {
  return {
    payments: 0,
    serviceOrders: 0,
    coupons: 0,
    appointments: 0,
    services: 0,
    selectedServices: 0,
    deliveries: 0,
    userPlans: 0,
    subscriptions: 0,
    paymentMetadata: 0,
    history: 0,
    syncEvents: 0,
  };
}

function parseAppointmentIdsJson(raw: unknown): number[] {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const id of value) {
    const n = Number(id);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function countsFromTree(
  tree: OrderTreeIds,
  selectedServices: number,
  deliveries: number,
  subscriptions: number
): OrderTreeCounts {
  return {
    payments: tree.paymentIds.length,
    serviceOrders: tree.serviceOrderIds.length,
    coupons: tree.couponIds.length,
    appointments: tree.appointmentIds.length,
    services: tree.serviceIds.length,
    selectedServices,
    deliveries,
    userPlans: tree.userPlanIds.length,
    subscriptions,
    paymentMetadata: tree.paymentMetadataIds.length,
    history: tree.historyIds.length,
    syncEvents: tree.syncEventIds.length,
  };
}

/**
 * Resolve Pedido Raiz: se o id for um payment filho inexistente como raiz,
 * tenta cupom.rootPaymentId / paymentId.
 */
export async function resolveRootPaymentId(
  paymentOrRootId: string,
  db: Db = prisma
): Promise<string | null> {
  const payment = await db.payment.findUnique({
    where: { id: paymentOrRootId },
    select: { id: true },
  });
  if (payment) return payment.id;

  const coupon = await db.coupon.findFirst({
    where: {
      OR: [{ id: paymentOrRootId }, { paymentId: paymentOrRootId }, { rootPaymentId: paymentOrRootId }],
    },
    select: { rootPaymentId: true, paymentId: true },
  });
  return coupon?.rootPaymentId || coupon?.paymentId || null;
}

export async function collectOrderTree(
  rootPaymentId: string,
  db: Db = prisma
): Promise<OrderTreeIds | null> {
  const payment = await db.payment.findUnique({
    where: { id: rootPaymentId },
    select: {
      id: true,
      appointmentId: true,
      appointmentIds: true,
      providerPaymentId: true,
      asaasId: true,
    },
  });
  if (!payment) return null;

  const paymentIds = [payment.id];
  const appointmentIdSet = new Set<number>();
  if (payment.appointmentId) appointmentIdSet.add(payment.appointmentId);
  for (const id of parseAppointmentIdsJson(payment.appointmentIds)) {
    appointmentIdSet.add(id);
  }

  const serviceOrders = await db.serviceOrder.findMany({
    where: { paymentId: payment.id },
    select: { id: true, appointmentId: true, couponId: true },
  });
  const serviceOrderIds = serviceOrders.map((o) => o.id);
  for (const o of serviceOrders) {
    if (o.appointmentId) appointmentIdSet.add(o.appointmentId);
  }

  const coupons = await db.coupon.findMany({
    where: {
      OR: [{ paymentId: payment.id }, { rootPaymentId: payment.id }],
    },
    select: {
      id: true,
      appointmentId: true,
      originAppointmentId: true,
      userPlanId: true,
      serviceId: true,
    },
  });
  const couponIds = coupons.map((c) => c.id);
  const userPlanIds = [
    ...new Set(coupons.map((c) => c.userPlanId).filter((id): id is string => Boolean(id))),
  ];
  const serviceIdSet = new Set<string>();
  for (const c of coupons) {
    if (c.appointmentId) appointmentIdSet.add(c.appointmentId);
    if (c.originAppointmentId) appointmentIdSet.add(c.originAppointmentId);
    if (c.serviceId) serviceIdSet.add(c.serviceId);
  }

  // Remarcações: SO/cupons podem apontar a appointments fora do JSON do payment
  const appointmentIds = [...appointmentIdSet];

  if (appointmentIds.length > 0) {
    const servicesByApt = await db.service.findMany({
      where: { appointmentId: { in: appointmentIds } },
      select: { id: true, deliveryAudioUrl: true },
    });
    for (const s of servicesByApt) serviceIdSet.add(s.id);
  }

  if (serviceIdSet.size === 0 && appointmentIds.length === 0) {
    // ainda pode haver services só via cupom.serviceId (já no set)
  }

  const serviceIds = [...serviceIdSet];
  const services =
    serviceIds.length > 0
      ? await db.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, appointmentId: true, deliveryAudioUrl: true },
        })
      : [];

  const deliveryUrls = services
    .map((s) => s.deliveryAudioUrl)
    .filter((u): u is string => Boolean(u && String(u).trim()));

  const providerKeys = [payment.providerPaymentId, payment.asaasId, payment.id].filter(
    (v): v is string => Boolean(v)
  );
  const metas =
    providerKeys.length > 0
      ? await db.paymentMetadata.findMany({
          where: {
            OR: [
              { asaasId: { in: providerKeys } },
              ...providerKeys.map((k) => ({ metadata: { contains: k } })),
            ],
          },
          select: { id: true },
          take: 200,
        })
      : [];

  const entityPairs: Array<{ entity: string; ids: string[] }> = [
    { entity: "payment", ids: paymentIds },
    { entity: "Payment", ids: paymentIds },
    { entity: "appointment", ids: appointmentIds.map(String) },
    { entity: "Appointment", ids: appointmentIds.map(String) },
    { entity: "service", ids: serviceIds },
    { entity: "Service", ids: serviceIds },
    { entity: "coupon", ids: couponIds },
    { entity: "Coupon", ids: couponIds },
    { entity: "serviceOrder", ids: serviceOrderIds },
    { entity: "ServiceOrder", ids: serviceOrderIds },
  ];

  const historyOr = entityPairs
    .filter((p) => p.ids.length > 0)
    .flatMap((p) => [{ entity: p.entity, entityId: { in: p.ids } }]);

  const history =
    historyOr.length > 0
      ? await db.domainTransitionHistory.findMany({
          where: { OR: historyOr },
          select: { id: true },
          take: 5000,
        })
      : [];

  const sync =
    historyOr.length > 0
      ? await db.synchronizationEvent.findMany({
          where: { OR: historyOr },
          select: { id: true },
          take: 5000,
        })
      : [];

  return {
    rootPaymentId: payment.id,
    paymentIds,
    serviceOrderIds,
    couponIds,
    appointmentIds,
    serviceIds,
    userPlanIds,
    paymentMetadataIds: metas.map((m) => m.id),
    historyIds: history.map((h) => h.id),
    syncEventIds: sync.map((s) => s.id),
    deliveryUrls,
  };
}

async function executePurgeInTx(tree: OrderTreeIds, db: Prisma.TransactionClient): Promise<void> {
  const {
    paymentIds,
    serviceOrderIds,
    couponIds,
    appointmentIds,
    serviceIds,
    userPlanIds,
    paymentMetadataIds,
    historyIds,
    syncEventIds,
  } = tree;

  // 1) Desvincular FKs
  if (serviceOrderIds.length > 0) {
    await db.serviceOrder.updateMany({
      where: { id: { in: serviceOrderIds } },
      data: { couponId: null, appointmentId: null },
    });
  }
  if (couponIds.length > 0) {
    await db.coupon.updateMany({
      where: { id: { in: couponIds } },
      data: { serviceId: null, appointmentId: null },
    });
  }
  if (appointmentIds.length > 0) {
    await db.payment.updateMany({
      where: { appointmentId: { in: appointmentIds }, id: { in: paymentIds } },
      data: { appointmentId: null },
    });
  }

  // 2) Planos / assinaturas vinculados a cupons deste pedido
  if (userPlanIds.length > 0) {
    await db.subscription.deleteMany({ where: { userPlanId: { in: userPlanIds } } });
    await db.userPlan.deleteMany({ where: { id: { in: userPlanIds } } });
  }

  // 3) Services → Appointments
  if (serviceIds.length > 0) {
    await db.service.deleteMany({ where: { id: { in: serviceIds } } });
  }
  if (appointmentIds.length > 0) {
    // Services remanescentes do apt (segurança)
    await db.service.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await db.serviceOrder.updateMany({
      where: { appointmentId: { in: appointmentIds } },
      data: { appointmentId: null },
    });
    await db.coupon.updateMany({
      where: { appointmentId: { in: appointmentIds } },
      data: { appointmentId: null },
    });
    await db.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }

  // 4) Coupons → ServiceOrders → Metadata → History/Sync → Payment
  if (couponIds.length > 0) {
    await db.serviceOrder.updateMany({
      where: { couponId: { in: couponIds } },
      data: { couponId: null },
    });
    await db.coupon.deleteMany({ where: { id: { in: couponIds } } });
  }
  if (serviceOrderIds.length > 0) {
    await db.serviceOrder.deleteMany({ where: { id: { in: serviceOrderIds } } });
  }
  if (paymentMetadataIds.length > 0) {
    await db.paymentMetadata.deleteMany({ where: { id: { in: paymentMetadataIds } } });
  }
  if (historyIds.length > 0) {
    await db.domainTransitionHistory.deleteMany({ where: { id: { in: historyIds } } });
  }
  if (syncEventIds.length > 0) {
    await db.synchronizationEvent.deleteMany({ where: { id: { in: syncEventIds } } });
  }
  await db.payment.deleteMany({ where: { id: { in: paymentIds } } });
}

/**
 * Dry-run ou purge transacional de um Pedido Raiz.
 * Em falha de qualquer etapa: rollback completo (prisma.$transaction).
 */
export async function purgeOrderTree(
  rootPaymentId: string,
  options: { dryRun?: boolean } = {}
): Promise<PurgeOrderTreeResult> {
  const dryRun = Boolean(options.dryRun);
  const resolved = await resolveRootPaymentId(rootPaymentId);
  if (!resolved) {
    return {
      rootPaymentId,
      dryRun,
      counts: emptyCounts(),
    };
  }

  const tree = await collectOrderTree(resolved);
  if (!tree) {
    return { rootPaymentId: resolved, dryRun, counts: emptyCounts() };
  }

  const services =
    tree.serviceIds.length > 0
      ? await prisma.service.findMany({
          where: { id: { in: tree.serviceIds } },
          select: { appointmentId: true, deliveryAudioUrl: true },
        })
      : [];
  const selectedServices = services.filter((s) => s.appointmentId != null).length;
  const deliveries = services.filter((s) => Boolean(s.deliveryAudioUrl)).length;
  const subscriptions =
    tree.userPlanIds.length > 0
      ? await prisma.subscription.count({ where: { userPlanId: { in: tree.userPlanIds } } })
      : 0;

  const counts = countsFromTree(tree, selectedServices, deliveries, subscriptions);

  if (dryRun) {
    return {
      rootPaymentId: resolved,
      dryRun: true,
      counts,
      ids: {
        paymentIds: tree.paymentIds,
        appointmentIds: tree.appointmentIds,
        serviceIds: tree.serviceIds,
        couponIds: tree.couponIds,
      },
    };
  }

  await prisma.$transaction(
    async (tx) => {
      // Re-coleta dentro da TX para evitar race
      const fresh = await collectOrderTree(resolved, tx);
      if (!fresh) return;
      await executePurgeInTx(fresh, tx);
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  return {
    rootPaymentId: resolved,
    dryRun: false,
    counts,
    ids: {
      paymentIds: tree.paymentIds,
      appointmentIds: tree.appointmentIds,
      serviceIds: tree.serviceIds,
      couponIds: tree.couponIds,
    },
  };
}

export function sumCounts(list: OrderTreeCounts[]): OrderTreeCounts {
  const out = emptyCounts();
  for (const c of list) {
    (Object.keys(out) as Array<keyof OrderTreeCounts>).forEach((k) => {
      out[k] += c[k];
    });
  }
  return out;
}
