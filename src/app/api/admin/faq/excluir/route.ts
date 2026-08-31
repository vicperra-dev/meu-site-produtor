import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const excluirSchema = z.object({
  questionId: z.string(),
});

/**
 * Endpoint para excluir permanentemente uma pergunta
 */
export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("id");

    if (!questionId) {
      return NextResponse.json({ error: "ID da pergunta é obrigatório" }, { status: 400 });
    }

    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    await prisma.userQuestion.delete({
      where: { id: questionId },
    });

    console.log(`[Admin FAQ] Pergunta ${questionId} excluída permanentemente`);

    return NextResponse.json({
      success: true,
      message: "Pergunta excluída com sucesso",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Excluir] Erro:", err);
    return NextResponse.json({ error: "Erro ao excluir pergunta" }, { status: 500 });
  }
}
