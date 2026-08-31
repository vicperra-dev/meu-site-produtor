/**
 * GO-H5 — Persistência de Ordens de Serviço.
 * Cupom de serviço = Ordem aguardando agendamento.
 * Appointment pendente = Ordem em solicitação.
 */
import type { Coupon, Prisma, ServiceOrder } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import {
  expandPurchaseToServiceOrders,
  type PurchaseLine,
  type ServiceOrderSpec,
} from "@/app/lib/service-orders/expand";
import { phaseFromAppointmentStatus } from "@/app/lib/service-orders/phases";

export type ServiceOrderDb = Prisma.TransactionClient | typeof prisma;

export async function createServiceOrdersWithCoupons(params: {
  db: ServiceOrderDb;
  userId: string;
  paymentId: string;
  services: PurchaseLine[];
  beats: PurchaseLine[];
  coupons: Coupon[];
}): Promise<ServiceOrder[]> {
  const { db, userId, paymentId, services, beats, coupons } = params;
  const existing = await db.serviceOrder.findMany({
    where: { paymentId },
    orderBy: { sequenceIndex: "asc" },
  });
  if (existing.length > 0) return existing;

  const specs = expandPurchaseToServiceOrders(services, beats);
  const serviceCoupons = coupons.filter((c) => c.discountType === "service" && c.serviceType);
  const created: ServiceOrder[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const coupon = serviceCoupons[i] ?? null;
    const row = await db.serviceOrder.create({
      data: {
        userId,
        serviceType: spec.serviceType,
        commercialSource: spec.commercialSource,
        phase: "awaiting_schedule",
        paymentId,
        couponId: coupon?.id ?? null,
        sequenceIndex: spec.sequenceIndex,
      },
    });
    created.push(row);
  }
  return created;
}

/** Uma Ordem vinculada a agendamento imediato (compra unitária atômica). */
export async function createServiceOrderForImmediateAppointment(params: {
  db?: ServiceOrderDb;
  userId: string;
  paymentId?: string | null;
  appointmentId: number;
  serviceType: string;
  commercialSource?: string | null;
  appointmentStatus?: string | null;
}): Promise<ServiceOrder | null> {
  const db = params.db ?? prisma;
  const existing = await db.serviceOrder.findFirst({
    where: { appointmentId: params.appointmentId },
  });
  if (existing) return existing;

  return db.serviceOrder.create({
    data: {
      userId: params.userId,
      serviceType: params.serviceType,
      commercialSource: params.commercialSource ?? params.serviceType,
      phase: phaseFromAppointmentStatus(params.appointmentStatus ?? "pendente"),
      paymentId: params.paymentId ?? null,
      appointmentId: params.appointmentId,
      sequenceIndex: 0,
    },
  });
}

/** Ao aceitar/recusar/avançar appointment, espelha a fase na Ordem. */
export async function syncServiceOrderPhaseFromAppointment(params: {
  appointmentId: number;
  appointmentStatus: string;
}): Promise<void> {
  const phase = phaseFromAppointmentStatus(params.appointmentStatus);
  await prisma.serviceOrder.updateMany({
    where: { appointmentId: params.appointmentId },
    data: { phase },
  });
}

/** Ao resgatar cupom → vincula appointment e passa a solicitation. */
export async function linkServiceOrderCouponToAppointment(params: {
  couponId: string;
  appointmentId: number;
}): Promise<void> {
  await prisma.serviceOrder.updateMany({
    where: { couponId: params.couponId },
    data: {
      appointmentId: params.appointmentId,
      phase: "solicitation",
    },
  });
}

export function specsFromPurchase(
  services: PurchaseLine[],
  beats: PurchaseLine[]
): ServiceOrderSpec[] {
  return expandPurchaseToServiceOrders(services, beats);
}
