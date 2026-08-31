import { prisma } from "@/app/lib/prisma";
import {
  createServicesForAppointmentIfMissing,
  parseAgendamentoMetadataItems,
} from "@/app/lib/asaas-agendamento-payment-effects";
import { pickPrimaryCouponForDisplay } from "@/app/lib/coupon-selection";
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";
import { parsePaymentAppointmentIds } from "@/app/lib/symbolic-payment";
import {
  mapRequestStatusToServiceStatus,
  parsePaymentMetadataJson,
} from "@/app/lib/service-authority";

/**
 * Garante ≥1 Service vinculado ao Appointment (idempotente).
 * Único ponto de backfill/repair além da factory de pagamento e com-cupom.
 */
export async function ensureServicesForAppointment(appointmentId: number): Promise<number> {
  const existing = await prisma.service.count({ where: { appointmentId } });

  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, userId: true, tipo: true, status: true },
  });
  if (!apt) return 0;

  const payments = await prisma.payment.findMany({
    where: {
      userId: apt.userId,
      status: "approved",
      type: "agendamento",
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      appointmentId: true,
      appointmentIds: true,
      asaasId: true,
    },
  });

  const linkedPayment = payments.find((p) =>
    parsePaymentAppointmentIds(p).includes(appointmentId)
  );

  if (linkedPayment?.asaasId) {
    const metaRow = await prisma.paymentMetadata.findFirst({
      where: { asaasId: linkedPayment.asaasId },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    const metadata = parsePaymentMetadataJson(metaRow?.metadata);
    const { services, beats } = parseAgendamentoMetadataItems(metadata);
    if (services.length > 0 || beats.length > 0) {
      return createServicesForAppointmentIfMissing({
        appointmentId,
        userId: apt.userId,
        services,
        beats,
        logPrefix: "[EnsureServices]",
      });
    }
  }

  const coupons = await prisma.coupon.findMany({
    where: { appointmentId },
    select: {
      id: true,
      appointmentId: true,
      serviceType: true,
      paymentId: true,
      userPlanId: true,
      couponType: true,
      createdAt: true,
    },
  });
  const coupon = pickPrimaryCouponForDisplay(coupons);
  if (existing > 0) return 0;

  const tipo = normalizeServiceTypeId(String(coupon?.serviceType || apt.tipo || "sessao"));
  const mapStatus = mapRequestStatusToServiceStatus(apt.status);

  await prisma.service.create({
    data: {
      userId: apt.userId,
      appointmentId,
      tipo,
      description: `Agendamento ${tipo}`,
      status: mapStatus,
      ...(mapStatus === "aceito" ? { acceptedAt: new Date() } : {}),
    },
  });

  return 1;
}

/**
 * Repair explícito: appointments sem Service (mínimo necessário para A5 / listagens).
 * Preferir chamar no aceite; disponível também via GET?repair=1.
 */
export async function repairOrphanAppointmentServices(limit = 200): Promise<number> {
  const withService = await prisma.service.findMany({
    where: { appointmentId: { not: null } },
    select: { appointmentId: true },
    distinct: ["appointmentId"],
  });
  const idsComServico = withService
    .map((s) => s.appointmentId)
    .filter((id): id is number => id != null);

  const orphans = await prisma.appointment.findMany({
    where: {
      id: { notIn: idsComServico.length > 0 ? idsComServico : [0] },
      status: {
        notIn: ["cancelado", "recusado"],
      },
    },
    select: { id: true },
    take: limit,
  });

  let created = 0;
  for (const apt of orphans) {
    created += await ensureServicesForAppointment(apt.id);
  }
  return created;
}
