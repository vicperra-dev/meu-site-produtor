import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Criar agendamento
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, data, hora, duracaoMinutos, tipo, observacoes } = body;

    if (!userId || !data || !hora || !tipo) {
      return NextResponse.json(
        { error: "Dados incompletos para agendar." },
        { status: 400 }
      );
    }

    const dataHoraISO = new Date(`${data}T${hora}:00`);

    const agendamento = await prisma.appointment.create({
      data: {
        userId,
        data: dataHoraISO,
        duracaoMinutos: duracaoMinutos || 60,
        tipo,
        observacoes,
      },
    });

    return NextResponse.json({ agendamento });
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    return NextResponse.json(
      { error: "Erro ao criar agendamento." },
      { status: 500 }
    );
  }
}

// Listar agendamentos
// - ?userId=123  -> só do usuário
// - ?all=true    -> todos (usado pro calendário)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");
    const userId = searchParams.get("userId");

    let where: any = {};

    if (all === "true") {
      // todos os agendamentos futuros
      where = {
        data: {
          gte: new Date(),
        },
      };
    } else if (userId) {
      where = {
        userId: Number(userId),
      };
    } else {
      return NextResponse.json(
        { error: "Informe userId ou all=true." },
        { status: 400 }
      );
    }

    const agendamentos = await prisma.appointment.findMany({
      where,
      orderBy: { data: "asc" },
    });

    return NextResponse.json({ agendamentos });
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
    return NextResponse.json(
      { error: "Erro ao listar agendamentos." },
      { status: 500 }
    );
  }
}
