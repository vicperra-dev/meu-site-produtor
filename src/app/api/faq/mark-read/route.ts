import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

// POST - Marcar pergunta como lida
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "ID da pergunta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a pergunta pertence ao usuário
    const question = await prisma.userQuestion.findUnique({
      where: { id: questionId },
      select: { userId: true, userEmail: true },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Pergunta não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se pertence ao usuário
    const userEmailNormalizado = user.email.toLowerCase().trim();
    if (
      question.userId !== user.id &&
      question.userEmail?.toLowerCase().trim() !== userEmailNormalizado
    ) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Marcar como lida
    await prisma.userQuestion.update({
      where: { id: questionId },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao marcar pergunta como lida:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao marcar como lida" },
      { status: 500 }
    );
  }
}
