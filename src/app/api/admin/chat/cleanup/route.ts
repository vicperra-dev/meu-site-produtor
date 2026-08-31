import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// POST - Limpar chats antigos (exclusão automática após 1 semana)
export async function POST() {
  try {
    await requireAdmin();

    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    // Buscar chats criados há mais de 1 semana
    const chatsAntigos = await prisma.chatSession.findMany({
      where: {
        createdAt: {
          lt: umaSemanaAtras,
        },
      },
      select: {
        id: true,
      },
    });

    // Deletar chats antigos (mensagens serão deletadas em cascade)
    const deletedCount = await prisma.chatSession.deleteMany({
      where: {
        createdAt: {
          lt: umaSemanaAtras,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deletedCount.count,
      message: `${deletedCount.count} chat(s) antigo(s) excluído(s) com sucesso`,
    });
  } catch (err: any) {
    console.error("[Admin Chat Cleanup] Erro:", err);
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao limpar chats antigos" }, { status: 500 });
  }
}

// GET - Verificar quantos chats serão deletados
export async function GET() {
  try {
    await requireAdmin();

    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    const count = await prisma.chatSession.count({
      where: {
        createdAt: {
          lt: umaSemanaAtras,
        },
      },
    });

    return NextResponse.json({
      count,
      message: `${count} chat(s) serão excluído(s) (criados há mais de 1 semana)`,
    });
  } catch (err: any) {
    console.error("[Admin Chat Cleanup] Erro:", err);
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao verificar chats antigos" }, { status: 500 });
  }
}
