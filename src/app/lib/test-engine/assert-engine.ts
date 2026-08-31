/**
 * TE-01B — Assert Engine (asserts reutilizáveis sobre o banco oficial).
 */
import { prisma } from "@/app/lib/prisma";
import type { AssertResult } from "@/app/lib/test-engine/types";

function ok(name: string, evidence?: Record<string, unknown>, message?: string): AssertResult {
  return { name, ok: true, evidence, message };
}

function fail(name: string, message: string, evidence?: Record<string, unknown>): AssertResult {
  return { name, ok: false, message, evidence };
}

export async function assertPayment(params: {
  paymentId?: string;
  asaasId?: string;
  userId?: string;
  status?: string;
}): Promise<AssertResult> {
  const name = "assertPayment";
  const where =
    params.paymentId
      ? { id: params.paymentId }
      : params.asaasId
        ? { asaasId: params.asaasId }
        : null;
  if (!where) return fail(name, "paymentId ou asaasId obrigatório");

  const payment = await prisma.payment.findFirst({
    where,
    select: {
      id: true,
      userId: true,
      status: true,
      type: true,
      amount: true,
      asaasId: true,
      appointmentId: true,
    },
  });
  if (!payment) return fail(name, "Payment não encontrado", { where });
  if (params.userId && payment.userId !== params.userId) {
    return fail(name, "Payment.userId divergente", { payment });
  }
  if (params.status && payment.status !== params.status) {
    return fail(name, `status esperado ${params.status}, obtido ${payment.status}`, { payment });
  }
  return ok(name, { payment });
}

export async function assertAppointment(params: {
  appointmentId?: number;
  userId?: string;
  statusIn?: string[];
}): Promise<AssertResult> {
  const name = "assertAppointment";
  if (params.appointmentId == null && !params.userId) {
    return fail(name, "appointmentId ou userId obrigatório");
  }
  const appointment = params.appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: params.appointmentId },
        select: { id: true, userId: true, status: true, tipo: true, data: true },
      })
    : await prisma.appointment.findFirst({
        where: { userId: params.userId! },
        orderBy: { createdAt: "desc" },
        select: { id: true, userId: true, status: true, tipo: true, data: true },
      });

  if (!appointment) return fail(name, "Appointment não encontrado");
  if (params.userId && appointment.userId !== params.userId) {
    return fail(name, "Appointment.userId divergente", { appointment });
  }
  if (params.statusIn && !params.statusIn.includes(appointment.status)) {
    return fail(name, `status ${appointment.status} fora de ${params.statusIn.join(",")}`, {
      appointment,
    });
  }
  return ok(name, { appointment });
}

export async function assertService(params: {
  appointmentId?: number;
  userId?: string;
  minCount?: number;
  statusIn?: string[];
}): Promise<AssertResult> {
  const name = "assertService";
  const minCount = params.minCount ?? 1;
  const where: { appointmentId?: number; userId?: string; status?: { in: string[] } } = {};
  if (params.appointmentId != null) where.appointmentId = params.appointmentId;
  if (params.userId) where.userId = params.userId;
  if (params.statusIn) where.status = { in: params.statusIn };

  if (where.appointmentId == null && !where.userId) {
    return fail(name, "appointmentId ou userId obrigatório");
  }

  const services = await prisma.service.findMany({
    where,
    select: { id: true, appointmentId: true, status: true, tipo: true },
    take: 50,
  });
  if (services.length < minCount) {
    return fail(name, `esperava ≥${minCount} Service(s), encontrou ${services.length}`, {
      services,
    });
  }
  return ok(name, { count: services.length, services: services.slice(0, 10) });
}

export async function assertCoupon(params: {
  userId?: string;
  code?: string;
  minCount?: number;
  used?: boolean;
}): Promise<AssertResult> {
  const name = "assertCoupon";
  const minCount = params.minCount ?? 1;
  if (params.code) {
    const c = await prisma.coupon.findUnique({
      where: { code: params.code.toUpperCase() },
      select: { id: true, code: true, used: true, assignedUserId: true, paymentId: true },
    });
    if (!c) return fail(name, `Cupom ${params.code} não encontrado`);
    if (params.used != null && c.used !== params.used) {
      return fail(name, `used esperado ${params.used}`, { coupon: c });
    }
    return ok(name, { coupon: c });
  }
  if (!params.userId) return fail(name, "userId ou code obrigatório");
  const coupons = await prisma.coupon.findMany({
    where: {
      OR: [{ assignedUserId: params.userId }, { usedBy: params.userId }],
    },
    take: 50,
    select: { id: true, code: true, used: true },
  });
  if (coupons.length < minCount) {
    return fail(name, `esperava ≥${minCount} cupom(ns)`, { count: coupons.length });
  }
  return ok(name, { count: coupons.length });
}

export async function assertDashboard(params?: { minServices?: number }): Promise<AssertResult> {
  const name = "assertDashboard";
  const minServices = params?.minServices ?? 0;
  const [paymentsApproved, services] = await Promise.all([
    prisma.payment.count({ where: { status: "approved" } }),
    prisma.service.count(),
  ]);
  if (services < minServices) {
    return fail(name, `Service count ${services} < ${minServices}`, {
      paymentsApproved,
      services,
    });
  }
  return ok(name, { paymentsApproved, services });
}

export async function assertMinhaConta(params: { userId: string }): Promise<AssertResult> {
  const name = "assertMinhaConta";
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true },
  });
  if (!user) return fail(name, "Usuário não encontrado");

  const [appointments, services, payments] = await Promise.all([
    prisma.appointment.count({ where: { userId: params.userId } }),
    prisma.service.count({ where: { userId: params.userId } }),
    prisma.payment.count({ where: { userId: params.userId } }),
  ]);

  return ok(name, {
    userId: user.id,
    email: user.email,
    appointments,
    services,
    payments,
  });
}
