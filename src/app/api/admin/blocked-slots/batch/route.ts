import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { computeCalendarDayStates } from "@/app/lib/calendar-day-state";
import {
  planBlockDays,
  planBlockSlots,
  planUnblockDays,
  planUnblockSlots,
  formatAdminMutationNotice,
} from "@/app/lib/admin-calendar-mutations";

const bodySchema = z.object({
  action: z.enum(["block", "unblock"]),
  slots: z
    .array(z.object({ data: z.string(), hora: z.string() }))
    .optional(),
  dates: z.array(z.string()).optional(),
  eligibleHours: z.array(z.string()).optional(),
});

async function loadContext() {
  const [blocked, appointments] = await Promise.all([
    prisma.blockedTimeSlot.findMany({
      select: { id: true, data: true, hora: true, ativo: true },
    }),
    prisma.appointment.findMany({
      where: appointmentCalendarOccupancyFilter,
      select: {
        id: true,
        data: true,
        duracaoMinutos: true,
        tipo: true,
        status: true,
      },
    }),
  ]);

  const dayStates = computeCalendarDayStates({
    appointments: appointments.map((a) => ({
      id: a.id,
      data: a.data,
      duracaoMinutos: a.duracaoMinutos,
      tipo: a.tipo,
      status: a.status,
    })),
    blockedSlots: blocked.map((s) => ({ data: s.data, hora: s.hora })),
  });

  return { blocked, dayStates };
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { action, slots, dates, eligibleHours } = parsed.data;
    const { blocked, dayStates } = await loadContext();

    const plan =
      action === "block"
        ? dates?.length
          ? planBlockDays({
              dates,
              eligibleHours,
              dayStates,
              blockedSlots: blocked,
            })
          : planBlockSlots({
              targets: slots || [],
              dayStates,
              blockedSlots: blocked,
            })
        : dates?.length
          ? planUnblockDays({ dates, blockedSlots: blocked })
          : planUnblockSlots({
              targets: slots || [],
              blockedSlots: blocked,
            });

    for (const slot of plan.create) {
      await prisma.blockedTimeSlot.upsert({
        where: { data_hora: { data: slot.data, hora: slot.hora } },
        create: { data: slot.data, hora: slot.hora, ativo: false },
        update: {},
      });
    }

    if (plan.deleteNow.length) {
      await prisma.blockedTimeSlot.deleteMany({
        where: { id: { in: plan.deleteNow.map((s) => s.id) } },
      });
    }

    return NextResponse.json({
      ok: true,
      plan,
      notice: formatAdminMutationNotice(plan, action),
      pendingUnpublishIds: plan.unpublish.map((s) => s.id),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[admin blocked-slots batch]", err);
    return NextResponse.json(
      { error: "Erro ao aplicar mutação administrativa" },
      { status: 500 }
    );
  }
}
