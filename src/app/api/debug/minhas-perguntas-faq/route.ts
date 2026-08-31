import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();

    // Buscar todas as perguntas do usuário
    const perguntasPorUserId = await prisma.userQuestion.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const perguntasPorEmail = await prisma.userQuestion.findMany({
      where: { userEmail: user.email },
      orderBy: { createdAt: "desc" },
    });

    // Buscar usando a mesma query que /api/meus-dados usa
    const perguntasCombinadas = await prisma.userQuestion.findMany({
      where: {
        OR: [
          { userId: user.id },
          { userEmail: user.email },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        faq: {
          select: {
            id: true,
            question: true,
          },
        },
      },
    });

    // Buscar todas as perguntas recentes (últimas 20)
    const todasPerguntas = await prisma.userQuestion.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        question: true,
        userId: true,
        userEmail: true,
        userName: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nomeArtistico: user.nomeArtistico,
        nomeCompleto: user.nomeCompleto,
      },
      perguntasPorUserId: perguntasPorUserId.length,
      perguntasPorEmail: perguntasPorEmail.length,
      perguntasCombinadas: perguntasCombinadas.length,
      perguntasPorUserIdDetalhes: perguntasPorUserId,
      perguntasPorEmailDetalhes: perguntasPorEmail,
      perguntasCombinadasDetalhes: perguntasCombinadas,
      ultimas20Perguntas: todasPerguntas,
      debug: {
        buscaPorUserId: `userId = "${user.id}"`,
        buscaPorEmail: `userEmail = "${user.email}"`,
        queryCombinada: `OR: [{ userId: "${user.id}" }, { userEmail: "${user.email}" }]`,
      },
    });
  } catch (err: any) {
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("[Debug FAQ] Erro:", err);
    return NextResponse.json({ error: "Erro ao buscar perguntas" }, { status: 500 });
  }
}
