import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { revertAppointmentCancellation } from "@/app/lib/domain/workflow";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const idNum = parseInt(id, 10);
    const result = await revertAppointmentCancellation(idNum);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    console.log(`[Admin] Cancelamento do agendamento ${id} revertido via workflow.`);

    return NextResponse.json({
      message: "Cancelamento revertido com sucesso",
      agendamento: result.data.agendamento,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin] Erro ao reverter cancelamento:", err);
    return NextResponse.json({ error: "Erro ao reverter cancelamento" }, { status: 500 });
  }
}
