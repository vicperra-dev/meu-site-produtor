import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getDatabaseProvider } from "@/app/lib/db-utils";

export const dynamic = "force-dynamic";

// GET - Listar todas as conversas do usuário
export async function GET() {
  try {
    const user = await requireAuth();

    // Buscar todas as sessões do usuário, incluindo as que foram respondidas pelo admin
    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        adminAccepted: true,
        humanRequested: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Calcular mensagens não lidas para cada sessão
    // Estratégia: sempre contar todas as mensagens do admin/humano por enquanto
    // Depois podemos implementar lastReadAt quando o Prisma Client for regenerado
    const sessionsWithUnread = await Promise.all(
      sessions.map(async (session) => {
        let unreadCount = 0;

        try {
          // Buscar lastReadAt primeiro - adaptado para PostgreSQL
          let lastReadAt: string | null = null;
          try {
            const provider = getDatabaseProvider();
            if (provider === 'postgresql') {
              const sessionData = await prisma.$queryRawUnsafe<Array<{ lastReadAt: Date | null }>>(
                `SELECT "lastReadAt" FROM "ChatSession" WHERE id = $1`,
                session.id
              );
              lastReadAt = sessionData[0]?.lastReadAt ? new Date(sessionData[0].lastReadAt).toISOString() : null;
            } else {
              const sessionData = await prisma.$queryRawUnsafe<Array<{ lastReadAt: string | null }>>(
                `SELECT lastReadAt FROM ChatSession WHERE id = ?`,
                session.id
              );
              lastReadAt = sessionData[0]?.lastReadAt || null;
            }
          } catch (e: any) {
            // Se a coluna não existir, lastReadAt será null e contará todas as mensagens
            if (!e.message?.includes("no such column") && !e.message?.includes("does not exist")) {
              console.error(`[Chat Sessions] Erro ao buscar lastReadAt para sessão ${session.id}:`, e.message);
            }
          }

          // Contar mensagens do admin/humano criadas APÓS lastReadAt - adaptado para PostgreSQL
          // Se lastReadAt for null, contar todas as mensagens do admin/humano
          let result: Array<{ count: number }>;
          const provider = getDatabaseProvider();
          
          if (lastReadAt) {
            // Usar comparação de datetime corretamente - adaptado para PostgreSQL
            const lastReadDate = new Date(lastReadAt);
            if (provider === 'postgresql') {
              result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
                `SELECT COUNT(*) as count
                 FROM "ChatMessage"
                 WHERE "chatSessionId" = $1
                   AND "senderType" IN ('admin', 'human')
                   AND "createdAt" > $2::timestamp`,
                session.id,
                lastReadDate.toISOString()
              );
            } else {
              result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
                `SELECT COUNT(*) as count
                 FROM ChatMessage
                 WHERE chatSessionId = ?
                   AND senderType IN ('admin', 'human')
                   AND datetime(createdAt) > datetime(?)`,
                session.id,
                lastReadDate.toISOString()
              );
            }
          } else {
            // Se não houver lastReadAt, contar todas as mensagens do admin/humano
            if (provider === 'postgresql') {
              result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
                `SELECT COUNT(*) as count
                 FROM "ChatMessage"
                 WHERE "chatSessionId" = $1
                   AND "senderType" IN ('admin', 'human')`,
                session.id
              );
            } else {
              result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
                `SELECT COUNT(*) as count
                 FROM ChatMessage
                 WHERE chatSessionId = ?
                   AND senderType IN ('admin', 'human')`,
                session.id
              );
            }
          }

          unreadCount = Number(result[0]?.count || 0);
          
          // Debug: verificar se há mensagens do admin/humano na sessão
          let totalAdminMessages: Array<{ count: number }>;
          if (provider === 'postgresql') {
            totalAdminMessages = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
              `SELECT COUNT(*) as count
               FROM "ChatMessage"
               WHERE "chatSessionId" = $1
                 AND "senderType" IN ('admin', 'human')`,
              session.id
            );
          } else {
            totalAdminMessages = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
              `SELECT COUNT(*) as count
               FROM ChatMessage
               WHERE chatSessionId = ?
                 AND senderType IN ('admin', 'human')`,
              session.id
            );
          }
          const totalAdmin = Number(totalAdminMessages[0]?.count || 0);
          
          console.log(`[Chat Sessions] Sessão ${session.id.substring(0, 8)}...: ${unreadCount} não lidas de ${totalAdmin} total (lastReadAt: ${lastReadAt ? new Date(lastReadAt).toISOString() : 'null'})`);
        } catch (e: any) {
          console.error(`[Chat Sessions] ❌ Erro ao contar mensagens para sessão ${session.id.substring(0, 8)}...:`, e.message);
          console.error(`[Chat Sessions] Stack trace:`, e.stack);
          unreadCount = 0;
        }

        const sessionData: any = {
          ...session,
        };

        // Sempre incluir unreadCount se for > 0
        if (unreadCount > 0) {
          sessionData.unreadCount = unreadCount;
          console.log(`[Chat Sessions] ✅ Retornando unreadCount = ${unreadCount} para sessão ${session.id.substring(0, 8)}...`);
        }

        return sessionData;
      })
    );

    const totalUnread = sessionsWithUnread.reduce((sum, s) => sum + (s.unreadCount || 0), 0);
    console.log(`[Chat Sessions] 📊 Total de mensagens não lidas: ${totalUnread} em ${sessionsWithUnread.filter(s => s.unreadCount > 0).length} sessão(ões)`);

    return NextResponse.json({ sessions: sessionsWithUnread });
  } catch (err: any) {
    console.error("Erro ao listar conversas:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao listar conversas" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar uma conversa
export async function DELETE(req: Request) {
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

    // Verificar se a sessão pertence ao usuário
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
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

    // Deletar a sessão (as mensagens serão deletadas em cascade)
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ message: "Conversa deletada com sucesso" });
  } catch (err: any) {
    console.error("Erro ao deletar conversa:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao deletar conversa" },
      { status: 500 }
    );
  }
}
