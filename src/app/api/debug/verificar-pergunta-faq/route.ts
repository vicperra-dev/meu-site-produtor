import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

/**
 * Endpoint de debug para verificar se uma pergunta específica está associada ao usuário logado
 * Uso: GET /api/debug/verificar-pergunta-faq?id=QUESTION_ID (apenas admin)
 */
export async function GET(req: Request) {
  try {
    const user = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("id");

    if (!questionId) {
      return NextResponse.json({ error: "ID da pergunta é obrigatório" }, { status: 400 });
    }

    // Buscar a pergunta específica
    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
      include: {
        faq: {
          select: {
            id: true,
            question: true,
          },
        },
      },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    // Verificar se está associada ao usuário
    const estaAssociada = pergunta.userId === user.id || pergunta.userEmail === user.email;

    // Verificar se seria encontrada pela query de /api/meus-dados
    const seriaEncontrada = await prisma.userQuestion.findFirst({
      where: {
        AND: [
          { id: questionId },
          {
            OR: [
              { userId: user.id },
              { userEmail: user.email },
            ],
          },
        ],
      },
    });

    return NextResponse.json({
      pergunta: {
        id: pergunta.id,
        question: pergunta.question,
        userId: pergunta.userId,
        userEmail: pergunta.userEmail,
        status: pergunta.status,
        createdAt: pergunta.createdAt,
      },
      usuario: {
        id: user.id,
        email: user.email,
      },
      associacao: {
        estaAssociada,
        seriaEncontrada: seriaEncontrada !== null,
        motivo: estaAssociada
          ? pergunta.userId === user.id
            ? "userId corresponde"
            : "userEmail corresponde"
          : "Não associada",
      },
      detalhes: {
        perguntaUserId: pergunta.userId,
        perguntaUserEmail: pergunta.userEmail,
        usuarioId: user.id,
        usuarioEmail: user.email,
        userIdMatch: pergunta.userId === user.id,
        userEmailMatch: pergunta.userEmail === user.email,
      },
    });
  } catch (err: any) {
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("[Debug Verificar Pergunta FAQ] Erro:", err);
    return NextResponse.json({ error: "Erro ao verificar pergunta" }, { status: 500 });
  }
}
