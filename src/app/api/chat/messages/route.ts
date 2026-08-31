import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getDatabaseProvider } from "@/app/lib/db-utils";

export const dynamic = "force-dynamic";

// GET - Buscar mensagens de uma conversa específica
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "ID da sessão é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a sessão pertence ao usuário e buscar dados necessários
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        status: true,
        adminAccepted: true,
        humanRequested: true,
      },
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

    // Buscar mensagens da sessão
    const messages = await prisma.chatMessage.findMany({
      where: { chatSessionId: sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderType: true,
        content: true,
        createdAt: true,
      },
    });

    // Marcar mensagens como lidas (atualizar lastReadAt)
    // Usar Prisma Client para atualizar lastReadAt (compatível com SQLite e PostgreSQL)
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { lastReadAt: new Date() },
      });
      console.log(`[Chat Messages] ✅ lastReadAt atualizado para sessão ${sessionId}`);
    } catch (e: any) {
      console.error("[Chat Messages] ❌ Erro ao atualizar lastReadAt:", e);
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
        console.log(`[Chat Messages] ✅ lastReadAt atualizado via query raw para sessão ${sessionId}`);
      } catch (e2: any) {
        console.error("[Chat Messages] ❌ Erro ao atualizar lastReadAt via query raw:", e2);
      }
    }

    // Calcular mensagens não lidas usando query raw adaptada para PostgreSQL
    let unreadCount = 0;
    try {
      const provider = getDatabaseProvider();
      let result: Array<{ count: number }>;
      
      if (provider === 'postgresql') {
        result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*) as count
           FROM "ChatMessage"
           WHERE "chatSessionId" = $1
             AND "senderType" IN ('admin', 'human')
             AND "createdAt" > COALESCE((SELECT "lastReadAt" FROM "ChatSession" WHERE id = $2), '1970-01-01 00:00:00'::timestamp)`,
          sessionId,
          sessionId
        );
      } else {
        result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*) as count
           FROM ChatMessage
           WHERE chatSessionId = ?
             AND senderType IN ('admin', 'human')
             AND datetime(createdAt) > COALESCE((SELECT datetime(lastReadAt) FROM ChatSession WHERE id = ?), '1970-01-01 00:00:00')`,
          sessionId,
          sessionId
        );
      }
      unreadCount = Number(result[0]?.count || 0);
    } catch (e: any) {
      // Se a coluna não existir, retornar 0
      if (e.message?.includes("no such column") || e.message?.includes("does not exist")) {
        unreadCount = 0;
      } else {
        console.log("[Chat] Erro ao calcular unreadCount:", e);
      }
    }

    // Converter para o formato esperado pelo frontend
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.senderType === "user" ? "user" : msg.senderType === "ai" ? "ai" : "human",
      content: msg.content,
    }));

    return NextResponse.json({ 
      messages: formattedMessages,
      session: session || null,
      unreadCount: unreadCount, // Já foi marcado como lido, então deve ser 0
    });
  } catch (err: any) {
    console.error("Erro ao buscar mensagens:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao buscar mensagens" },
      { status: 500 }
    );
  }
}
