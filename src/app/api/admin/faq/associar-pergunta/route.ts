import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const associarSchema = z.object({
  questionId: z.string(),
  userId: z.string(),
});

/**
 * Endpoint para associar uma pergunta a um usuário específico
 * Útil quando a pergunta foi criada sem userId ou com email diferente
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = associarSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId, userId } = validation.data;

    // Buscar pergunta
    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nomeArtistico: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Atualizar pergunta com userId e userEmail
    const perguntaAtualizada = await prisma.userQuestion.update({
      where: { id: questionId },
      data: {
        userId: user.id,
        userEmail: user.email, // Garantir que o email também está correto
      },
    });

    console.log(`[Admin FAQ] Pergunta ${questionId} associada ao usuário ${userId} (${user.email})`);

    return NextResponse.json({
      success: true,
      message: `Pergunta associada ao usuário ${user.email}`,
      pergunta: perguntaAtualizada,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Associar] Erro:", err);
    return NextResponse.json({ error: "Erro ao associar pergunta" }, { status: 500 });
  }
}
