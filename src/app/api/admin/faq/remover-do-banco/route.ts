import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const removerSchema = z.object({
  questionId: z.string(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = removerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId } = validation.data;

    // Verificar se a pergunta existe e se está publicada
    const userQuestion = await prisma.userQuestion.findUnique({
      where: { id: questionId },
      include: {
        faq: true,
      },
    });

    if (!userQuestion) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    if (!userQuestion.published || !userQuestion.faqId) {
      return NextResponse.json(
        { error: "Esta pergunta não está no banco de FAQs" },
        { status: 400 }
      );
    }

    const faqId = userQuestion.faqId;

    // Deletar o FAQ do banco
    await prisma.fAQ.delete({
      where: { id: faqId },
    });

    // Atualizar UserQuestion para remover a publicação e desassociar do FAQ
    await prisma.userQuestion.update({
      where: { id: questionId },
      data: {
        published: false,
        faqId: null,
      },
    });

    console.log(`[Admin FAQ] Pergunta ${questionId} removida do banco. FAQ ${faqId} deletado.`);

    return NextResponse.json({
      success: true,
      message: "Pergunta removida do banco de FAQs com sucesso",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Remover] Erro:", err);
    return NextResponse.json({ error: "Erro ao remover do banco" }, { status: 500 });
  }
}
