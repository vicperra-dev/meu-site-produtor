import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { sendAppointmentCancelledEmail } from "@/app/lib/sendEmail";
import { cancelAppointment } from "@/app/lib/domain/workflow";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    let cancellationComment: string | undefined;
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim()) {
        const body = JSON.parse(bodyText);
        cancellationComment = (body.cancellationComment || "").trim();
      }
    } catch (parseError: any) {
      console.warn("[Admin] Erro ao parsear body do cancelamento:", parseError);
    }

    const idNum = parseInt(id, 10);
    const agendamento = await prisma.appointment.findUnique({
      where: { id: idNum },
      include: {
        user: {
          select: {
            email: true,
            nomeArtistico: true,
          },
        },
      },
    });

    if (!agendamento) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const result = await cancelAppointment({
      appointmentId: idNum,
      actor: "admin",
      reason: cancellationComment,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    if (!result.alreadyProcessed) {
      try {
        await sendAppointmentCancelledEmail(
          agendamento.user.email,
          agendamento.user.nomeArtistico,
          agendamento.data,
          cancellationComment || "Agendamento cancelado.",
          undefined
        );
      } catch (emailError: any) {
        console.error("[Admin] Erro ao enviar email (não crítico):", emailError);
      }
    }

    return NextResponse.json({
      message: result.alreadyProcessed
        ? "Este agendamento já estava cancelado."
        : "Agendamento cancelado com sucesso",
      alreadyProcessed: result.alreadyProcessed,
      agendamento: result.data.agendamento,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin] Erro ao cancelar agendamento:", err);
    return NextResponse.json({ error: "Erro ao cancelar agendamento" }, { status: 500 });
  }
}
