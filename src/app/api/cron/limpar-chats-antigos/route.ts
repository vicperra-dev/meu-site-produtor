import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * Endpoint de cron para limpar chats antigos automaticamente
 * Deve ser chamado diariamente via cron job ou agendador de tarefas
 */
export async function GET(req: Request) {
  try {
    // Verificar autenticação via header (cron secret)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production" && !cronSecret) {
      console.error("[Cron] CRON_SECRET não configurado em produção");
      return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
    }
    const expectedSecret = cronSecret || "default-secret-change-in-production";
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    console.log(`[Cron Limpeza Chats] Buscando chats criados antes de ${umaSemanaAtras.toLocaleString("pt-BR")}...`);

    // Contar quantos serão deletados
    const count = await prisma.chatSession.count({
      where: {
        createdAt: {
          lt: umaSemanaAtras,
        },
      },
    });

    if (count === 0) {
      console.log("[Cron Limpeza Chats] Nenhum chat antigo encontrado.");
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "Nenhum chat antigo encontrado",
      });
    }

    // Deletar chats antigos (mensagens serão deletadas em cascade)
    const result = await prisma.chatSession.deleteMany({
      where: {
        createdAt: {
          lt: umaSemanaAtras,
        },
      },
    });

    console.log(`[Cron Limpeza Chats] ✅ ${result.count} chat(s) excluído(s) com sucesso!`);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count} chat(s) antigo(s) excluído(s) com sucesso`,
    });
  } catch (error: any) {
    console.error("[Cron Limpeza Chats] ❌ Erro:", error);
    return NextResponse.json(
      { error: "Erro ao limpar chats antigos", details: error.message },
      { status: 500 }
    );
  }
}
