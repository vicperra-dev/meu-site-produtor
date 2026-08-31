import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getDatabaseProvider } from "@/app/lib/db-utils";

export const dynamic = "force-dynamic";

// POST - Marcar agendamento como lido
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID do agendamento é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o agendamento pertence ao usuário
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(appointmentId) },
      select: { userId: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    if (appointment.userId !== user.id) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Marcar como lido usando Prisma Client (compatível com SQLite e PostgreSQL)
    try {
      await prisma.appointment.update({
        where: { id: parseInt(appointmentId) },
        data: { readAt: new Date() },
      });
      console.log(`[Appointment Mark Read] ✅ readAt atualizado para agendamento ${appointmentId}`);
    } catch (e: any) {
      console.error("[Appointment Mark Read] ❌ Erro ao atualizar readAt:", e);
      // Tentar com query raw adaptada para PostgreSQL
      try {
        const now = new Date().toISOString();
        const provider = getDatabaseProvider();
        if (provider === 'postgresql') {
          await prisma.$executeRawUnsafe(
            `UPDATE "Appointment" SET "readAt" = $1::timestamp WHERE id = $2`,
            now,
            parseInt(appointmentId)
          );
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE Appointment SET readAt = ? WHERE id = ?`,
            now,
            parseInt(appointmentId)
          );
        }
        console.log(`[Appointment Mark Read] ✅ readAt atualizado via query raw para agendamento ${appointmentId}`);
      } catch (e2: any) {
        console.error("[Appointment Mark Read] ❌ Erro ao atualizar readAt via query raw:", e2);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao marcar agendamento como lido:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao marcar como lido" },
      { status: 500 }
    );
  }
}
