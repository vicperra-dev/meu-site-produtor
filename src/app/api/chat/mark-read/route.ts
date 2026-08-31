import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getDatabaseProvider } from "@/app/lib/db-utils";

export const dynamic = "force-dynamic";

// POST - Marcar mensagens como lidas
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "ID da sessão é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a sessão pertence ao usuário
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Marcar como lida usando Prisma Client (compatível com SQLite e PostgreSQL)
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { lastReadAt: new Date() },
      });
      console.log(`[Chat Mark Read] ✅ lastReadAt atualizado para sessão ${sessionId}`);
    } catch (e: any) {
      console.error("[Chat Mark Read] ❌ Erro ao atualizar lastReadAt:", e);
      // Tentar com query raw adaptada para PostgreSQL
      try {
        const now = new Date().toISOString();
        const provider = getDatabaseProvider();
        if (provider === 'postgresql') {
          await prisma.$executeRawUnsafe(
            `UPDATE "ChatSession" SET "lastReadAt" = $1::timestamp WHERE id = $2`,
            now,
            sessionId
          );
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE ChatSession SET lastReadAt = ? WHERE id = ?`,
            now,
            sessionId
          );
        }
        console.log(`[Chat Mark Read] ✅ lastReadAt atualizado via query raw para sessão ${sessionId}`);
      } catch (e2: any) {
        console.error("[Chat Mark Read] ❌ Erro ao atualizar lastReadAt via query raw:", e2);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao marcar como lida:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao marcar como lida" },
      { status: 500 }
    );
  }
}
