/**
 * HS-03B — Efeitos oficiais por transição (únicos; não espalhar nas rotas).
 */

import { prisma } from "@/app/lib/prisma";
import { ensureServicesForAppointment } from "@/app/lib/ensure-appointment-services";
import { reconcileAppointmentWithServices } from "@/app/lib/appointment-service-sync";
import { releaseBookingCouponsForAppointment } from "@/app/lib/coupon-release";
import { toPersistedCouponType } from "@/app/lib/domain/coupon-types";
import { isTransitionAllowed } from "@/app/lib/domain/state-machine/guards";
import type { DomainEvent, TransitionInput } from "@/app/lib/domain/state-machine/types";

export type EffectPlan = {
  cascades: TransitionInput[];
  after?: () => Promise<void>;
};

export async function planTransitionEffects(event: DomainEvent): Promise<EffectPlan> {
  const cascades: TransitionInput[] = [];
  const meta = event.metadata || {};

  if (event.name === "AppointmentAccepted") {
    const appointmentId = parseInt(event.entityId, 10);
    await ensureServicesForAppointment(appointmentId);
    const services = await prisma.service.findMany({
      where: { appointmentId },
      select: { id: true, status: true },
    });
    for (const s of services) {
      if (s.status !== "aceito") {
        cascades.push({
          entity: "service",
          id: s.id,
          to: "aceito",
          actor: event.actor || { type: "system" },
          reason: "cascade:AppointmentAccepted",
          skipEffects: true,
        });
      }
    }
    const apt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { userId: true },
    });
    if (apt) {
      // GO-H8: resgate já marca used; aqui só cobre vínculos legados ainda used=false
      await prisma.coupon.updateMany({
        where: {
          appointmentId,
          used: false,
          couponType: { not: toPersistedCouponType("REFUND") },
        },
        data: { used: true, usedAt: new Date(), usedBy: apt.userId },
      });
    }
    return {
      cascades,
      after: async () => {
        await reconcileAppointmentWithServices(appointmentId);
      },
    };
  }

  if (event.name === "AppointmentRejected" || event.name === "AppointmentCancelled") {
    const appointmentId = parseInt(event.entityId, 10);
    const services = await prisma.service.findMany({
      where: { appointmentId },
      select: { id: true, status: true },
    });
    const target = event.name === "AppointmentRejected" ? "recusado" : "cancelado";
    for (const s of services) {
      if (s.status !== target && s.status !== "concluido") {
        cascades.push({
          entity: "service",
          id: s.id,
          to: target,
          actor: event.actor || { type: "system" },
          reason: `cascade:${event.name}`,
          skipEffects: true,
        });
      }
    }
    return {
      cascades,
      after: async () => {
        await releaseBookingCouponsForAppointment(appointmentId);
        await reconcileAppointmentWithServices(appointmentId);
      },
    };
  }

  if (event.name === "AppointmentStarted") {
    const appointmentId = parseInt(event.entityId, 10);
    // Só cascateia aceito → em_andamento (pendente não é transição válida).
    // Sessão/Captação pendentes são aceitas e iniciadas por startServiceWork.
    const services = await prisma.service.findMany({
      where: { appointmentId, status: "aceito" },
      select: { id: true },
    });
    for (const s of services) {
      cascades.push({
        entity: "service",
        id: s.id,
        to: "em_andamento",
        actor: event.actor || { type: "system" },
        reason: "cascade:AppointmentStarted",
        skipEffects: true,
      });
    }
    return {
      cascades,
      after: async () => reconcileAppointmentWithServices(appointmentId),
    };
  }

  if (event.name === "ServiceCompleted" || event.name === "ServiceDelivered") {
    const service = await prisma.service.findUnique({
      where: { id: event.entityId },
      select: { appointmentId: true },
    });
    if (!service?.appointmentId) return { cascades };
    const appointmentId = service.appointmentId;
    return {
      cascades,
      after: async () => {
        const abertos = await prisma.service.count({
          where: {
            appointmentId,
            status: { notIn: ["concluido", "cancelado", "recusado"] },
          },
        });
        if (abertos === 0) {
          const apt = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { status: true },
          });
          if (
            apt &&
            !["concluido", "cancelado", "recusado"].includes(apt.status) &&
            isTransitionAllowed("appointment", apt.status, "concluido")
          ) {
            const { transition } = await import("@/app/lib/domain/state-machine/transition");
            await transition({
              entity: "appointment",
              id: appointmentId,
              to: "concluido",
              actor: { type: "system" },
              reason: "cascade:allServicesTerminal",
              skipEffects: true,
            });
          }
        }
        await reconcileAppointmentWithServices(appointmentId);
      },
    };
  }

  if (
    event.name === "ServiceStarted" ||
    event.name === "ServiceAccepted" ||
    event.name === "ServiceCancelled" ||
    event.name === "ServiceRejected"
  ) {
    const service = await prisma.service.findUnique({
      where: { id: event.entityId },
      select: { appointmentId: true },
    });
    if (service?.appointmentId) {
      return {
        cascades,
        after: async () => reconcileAppointmentWithServices(service.appointmentId!),
      };
    }
  }

  if (event.name === "PaymentConfirmed" || event.name === "PaymentReceived") {
    // Efeitos de Appointment/Service/Coupon permanecem no pipeline Asaas oficial
    // (processPaymentWebhook → *payment-effects). skipEffects no webhook evita duplicar.
    return { cascades };
  }

  void meta;
  return { cascades };
}
