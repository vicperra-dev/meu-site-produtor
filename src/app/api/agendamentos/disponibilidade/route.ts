import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import {
  ADMIN_DAY_LEGEND,
  USER_DAY_LEGEND,
  OPERATIONAL_HOURS,
  PRODUCTION_DELIVERY_HOUR,
  computeCalendarDayStates,
  hoursCoveredByPresencial,
  isCompletedCalendarStatus,
  isProductionDeliveryAppointment,
  normalizeHourLabel,
  toIsoDateStudio,
  getHourStudio,
} from "@/app/lib/calendar-day-state";
import { phaseOccupiesCalendar, type ServiceOrderPhase } from "@/app/lib/service-orders/phases";
import {
  operationalCategoryFromServiceType,
  operationalCategoryLabel,
  serviceOrderLabel,
  serviceOrderSlotClasses,
  type HourOccupancyDetail,
  CALENDAR_OS_LEGEND,
  USER_HOUR_LEGEND,
} from "@/app/lib/ui/service-order-visual";
import {
  OFFICIAL_STATUS_META,
  statusFromServiceOrderPhase,
} from "@/app/lib/ui/status-palette";

/**
 * API pública de disponibilidade + estado do calendário (BUG-001).
 * hourOccupancy deriva da Ordem de Serviço; dayStates da fonte única.
 */

function resolveOrigin(params: {
  paymentProvider?: string | null;
  commercialSource?: string | null;
}): string {
  const p = String(params.paymentProvider || "").toUpperCase();
  if (p === "HOMOLOGATION") return "Homologação";
  if (p === "SIMULATION") return "Simulação";
  if (p === "ASAAS") return "Asaas";
  if (params.commercialSource) return String(params.commercialSource);
  return "Operacional";
}

export async function GET() {
  try {
    const [agendamentos, blocked] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          ...appointmentCalendarOccupancyFilter,
          data: { gte: new Date(new Date().getFullYear(), 0, 1) },
        },
        select: {
          id: true,
          data: true,
          duracaoMinutos: true,
          tipo: true,
          status: true,
          observacoes: true,
          user: { select: { nomeArtistico: true, email: true } },
          serviceOrders: {
            select: {
              id: true,
              serviceType: true,
              phase: true,
              paymentId: true,
              commercialSource: true,
              payment: { select: { id: true, provider: true } },
            },
          },
        },
        orderBy: { data: "asc" },
      }),
      prisma.blockedTimeSlot.findMany({
        where: { ativo: true },
        select: { data: true, hora: true },
      }),
    ]);

    const agendamentosSerializados = agendamentos.map((a) => ({
      id: a.id,
      data: a.data instanceof Date ? a.data.toISOString() : a.data,
      duracaoMinutos: a.duracaoMinutos || 60,
      tipo: a.tipo || null,
      status: a.status,
    }));

    const blockedSlots = blocked.map((s) => ({
      data: String(s.data || "").slice(0, 10),
      hora: s.hora,
    }));

    const dayStates = computeCalendarDayStates({
      appointments: agendamentosSerializados,
      blockedSlots,
    });

    const hourOccupancyByDate: Record<string, Record<string, HourOccupancyDetail>> = {};

    const ensureDay = (date: string) => {
      if (!hourOccupancyByDate[date]) hourOccupancyByDate[date] = {};
      return hourOccupancyByDate[date];
    };

    for (const slot of blockedSlots) {
      const date = String(slot.data || "").slice(0, 10);
      const hour = normalizeHourLabel(slot.hora);
      ensureDay(date)[hour] = {
        kind: "blocked",
        label: "Bloqueado",
      };
    }

    for (const apt of agendamentos) {
      const sos = apt.serviceOrders || [];
      const occupying = sos.filter((so) =>
        phaseOccupiesCalendar(so.phase as ServiceOrderPhase)
      );
      const effective =
        occupying.length > 0
          ? occupying
          : [
              {
                id: `legacy-${apt.id}`,
                serviceType: apt.tipo || "sessao",
                phase: "reserved",
                paymentId: null as string | null,
                commercialSource: apt.tipo,
                payment: null as { id: string; provider: string | null } | null,
              },
            ];

      const date = toIsoDateStudio(apt.data);
      const start = apt.data instanceof Date ? apt.data : new Date(apt.data);
      const clientName =
        apt.user?.nomeArtistico?.trim() || apt.user?.email || "Cliente";
      const dayState = dayStates[date];
      const completed = isCompletedCalendarStatus(apt.status);
      let productionHourCursor = 0;

      for (const so of effective) {
        const serviceType = so.serviceType || apt.tipo || "sessao";
        const category = operationalCategoryFromServiceType(serviceType);
        const statusKey = statusFromServiceOrderPhase(so.phase);
        const detail: HourOccupancyDetail = {
          kind: "service_order",
          serviceOrderId: so.id,
          serviceType,
          label: serviceOrderLabel(serviceType),
          category,
          categoryLabel: operationalCategoryLabel(category),
          clientName,
          rootPaymentId: so.payment?.id || so.paymentId || null,
          status: statusKey,
          statusLabel: OFFICIAL_STATUS_META[statusKey].label,
          origin: resolveOrigin({
            paymentProvider: so.payment?.provider,
            commercialSource: so.commercialSource,
          }),
          appointmentId: apt.id,
          completed,
        };

        let hours: string[];
        if (isProductionDeliveryAppointment(serviceType)) {
          const allocated = completed
            ? dayState?.completedProductionHours || []
            : dayState?.productionHours || [];
          const hour =
            allocated[productionHourCursor] ||
            getHourStudio(start) ||
            PRODUCTION_DELIVERY_HOUR;
          productionHourCursor += 1;
          hours = [hour];
        } else {
          hours = hoursCoveredByPresencial(start, apt.duracaoMinutos || 60);
        }

        const dayMap = ensureDay(date);
        for (const h of hours) {
          if (dayMap[h]?.kind === "blocked") continue;
          if (
            dayMap[h]?.kind === "service_order" &&
            !dayMap[h].completed &&
            completed
          ) {
            continue;
          }
          dayMap[h] = detail;
        }
      }
    }

    return NextResponse.json({
      agendamentos: agendamentosSerializados,
      blockedSlots,
      dayStates,
      hourOccupancyByDate,
      operationalHours: OPERATIONAL_HOURS,
      productionDeliveryHour: PRODUCTION_DELIVERY_HOUR,
      legend: ADMIN_DAY_LEGEND,
      adminDayLegend: ADMIN_DAY_LEGEND,
      userDayLegend: USER_DAY_LEGEND,
      osLegend: CALENDAR_OS_LEGEND,
      userHourLegend: USER_HOUR_LEGEND,
      slotClassByCategory: {
        presencial: serviceOrderSlotClasses("presencial"),
        producao: serviceOrderSlotClasses("producao"),
        concluido: serviceOrderSlotClasses("presencial", { completed: true }),
      },
      tooltipHelper: "use label/category/client/root/status/origin/completed",
      timezone: "America/Sao_Paulo",
    });
  } catch (err: unknown) {
    console.error("Erro ao buscar disponibilidade:", err);
    return NextResponse.json(
      { error: "Erro ao buscar disponibilidade" },
      { status: 500 }
    );
  }
}
