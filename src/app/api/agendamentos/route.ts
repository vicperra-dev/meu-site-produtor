import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { agendamentoSchema } from "@/app/lib/validations";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { parseStudioDateTime } from "@/app/lib/calendar-day-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Criar agendamento
export async function POST(req: Request) {
  try {
    // 🔒 Verificar autenticação
    const user = await requireAuth();
    const goLiveBlocked = goLiveBlockIfNeeded(user.role);
    if (goLiveBlocked) return goLiveBlocked;

    const body = await req.json();
    
    // ✅ Validar entrada
    const validation = agendamentoSchema.safeParse({
      ...body,
      duracaoMinutos: body.duracaoMinutos || 60,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { data, hora, duracaoMinutos, tipo, observacoes } = validation.data;

    const dataHoraISO = parseStudioDateTime(data, hora);
    const dataFim = new Date(dataHoraISO.getTime() + (duracaoMinutos * 60000));

    // GO-H4.3: só conflita com reservas aceitas (pendente não ocupa)
    const conflito = await prisma.appointment.findFirst({
      where: {
        ...appointmentCalendarOccupancyFilter,
        AND: [
          { data: { lt: dataFim } },
          {
            data: {
              gte: new Date(dataHoraISO.getTime() - (duracaoMinutos * 60000)),
            },
          },
        ],
      },
      select: { id: true },
    });

    if (conflito) {
      return NextResponse.json(
        { error: "Já existe um agendamento neste horário." },
        { status: 409 }
      );
    }

    const agendamento = await prisma.appointment.create({
      data: {
        userId: user.id,
        data: dataHoraISO,
        duracaoMinutos,
        tipo,
        observacoes,
      },
    });

    try {
      const { emitAppointmentReserved } = await import("@/app/lib/synchronization/lifecycle");
      await emitAppointmentReserved({
        appointmentId: agendamento.id,
        userId: user.id,
        dataIso: dataHoraISO.toISOString(),
        duracaoMinutos,
      });
    } catch (e) {
      console.error("[agendamentos] sync AppointmentReserved falhou (non-fatal):", e);
    }

    return NextResponse.json({ agendamento });
  } catch (err: any) {
    console.error("Erro ao criar agendamento:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao criar agendamento." },
      { status: 500 }
    );
  }
}

// Listar agendamentos
export async function GET(req: Request) {
  try {
    // 🔒 Verificar autenticação
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    let where: any = {
      userId: user.id, // Usuário vê apenas seus agendamentos
    };

    if (all === "true") {
      // Se all=true, mostrar todos (futuro uso admin)
      delete where.userId;
      where = {
        data: {
          gte: new Date(),
        },
      };
    }

    const [agendamentos, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { data: "asc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              nomeArtistico: true,
              email: true,
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({
      agendamentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("Erro ao listar agendamentos:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao listar agendamentos." },
      { status: 500 }
    );
  }
}
