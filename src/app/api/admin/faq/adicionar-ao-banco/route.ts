import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const adicionarSchema = z.object({
  questionId: z.string(),
  question: z.string().min(1, "A pergunta é obrigatória"),
  answer: z.string().min(1, "A resposta é obrigatória"),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = adicionarSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId, question, answer } = validation.data;

    // Verificar se a pergunta existe
    const userQuestion = await prisma.userQuestion.findUnique({
      where: { id: questionId },
    });

    if (!userQuestion) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    // Criar FAQ no banco
    const faq = await prisma.fAQ.create({
      data: {
        question: question.trim(),
        answer: answer.trim(),
        views: 0,
      },
    });

    // Atualizar UserQuestion para marcar como publicada e associar ao FAQ
    await prisma.userQuestion.update({
      where: { id: questionId },
      data: {
        published: true,
        faqId: faq.id,
      },
    });

    return NextResponse.json({
      success: true,
      faq,
      message: "Pergunta adicionada ao banco de FAQs com sucesso",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Adicionar] Erro:", err);
    return NextResponse.json({ error: "Erro ao adicionar ao banco" }, { status: 500 });
  }
}
