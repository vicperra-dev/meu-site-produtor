import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import {
  CALENDAR_LEGEND,
  OPERATIONAL_HOURS,
  PRODUCTION_DELIVERY_HOUR,
  computeCalendarDayStates,
  isProductionDeliveryAppointment,
  normalizeHourLabel,
  toIsoDateLocal,
} from "@/app/lib/calendar-day-state";
import { phaseOccupiesCalendar, type ServiceOrderPhase } from "@/app/lib/service-orders/phases";
import {
  operationalCategoryFromServiceType,
  operationalCategoryLabel,
  serviceOrderLabel,
  serviceOrderSlotClasses,
  type HourOccupancyDetail,
  CALENDAR_OS_LEGEND,
} from "@/app/lib/ui/service-order-visual";
import {
  OFFICIAL_STATUS_META,
  statusFromServiceOrderPhase,
} from "@/app/lib/ui/status-palette";

/**
 * API pública de disponibilidade + estado do calendário (GO-H4 / GO-H9).
 * GO-H9: hourOccupancy deriva da Ordem de Serviço (rótulo/categoria/tooltip).
 */

function hoursCoveredByPresencial(start: Date, duracaoMinutos: number): string[] {
  const horaInicio = start.getHours();
  const horasOcupadas = Math.max(1, Math.ceil(duracaoMinutos / 60));
  const out: string[] = [];
  for (let i = 0; i < horasOcupadas; i++) {
    out.push(`${String(horaInicio + i).padStart(2, "0")}:00`);
  }
  return out;
}

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
      data: s.data,
      hora: s.hora,
    }));

    const dayStates = computeCalendarDayStates({
      appointments: agendamentosSerializados,
      blockedSlots,
    });

    // GO-H9 — detalhe por horário a partir da Ordem de Serviço
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
      // Fallback legado: appointment sem SO ainda ocupa (tipo do appointment)
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

      const date = toIsoDateLocal(apt.data);
      const start = apt.data instanceof Date ? apt.data : new Date(apt.data);
      const clientName =
        apt.user?.nomeArtistico?.trim() || apt.user?.email || "Cliente";

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
        };

        const hours = isProductionDeliveryAppointment(serviceType)
          ? [PRODUCTION_DELIVERY_HOUR]
          : hoursCoveredByPresencial(start, apt.duracaoMinutos || 60);

        const dayMap = ensureDay(date);
        for (const h of hours) {
          // Não sobrescrever bloqueio admin
          if (dayMap[h]?.kind === "blocked") continue;
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
      legend: CALENDAR_LEGEND,
      osLegend: CALENDAR_OS_LEGEND,
      slotClassByCategory: {
        presencial: serviceOrderSlotClasses("presencial"),
        producao: serviceOrderSlotClasses("producao"),
      },
      tooltipHelper: "use label/category/client/root/status/origin",
    });
  } catch (err: unknown) {
    console.error("Erro ao buscar disponibilidade:", err);
    return NextResponse.json(
      { error: "Erro ao buscar disponibilidade" },
      { status: 500 }
    );
  }
}
