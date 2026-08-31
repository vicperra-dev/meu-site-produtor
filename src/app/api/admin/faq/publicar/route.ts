import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const publicarSchema = z.object({
  questionId: z.string(),
  publish: z.boolean(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const validation = publicarSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId, publish } = validation.data;

    // Buscar pergunta
    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    if (!pergunta.answer) {
      return NextResponse.json({ error: "A pergunta precisa ser respondida antes de ser publicada" }, { status: 400 });
    }

    if (publish) {
      // Criar FAQ público
      const faq = await prisma.fAQ.create({
        data: {
          question: pergunta.question,
          answer: pergunta.answer,
        },
      });

      // Atualizar pergunta para publicada
      await prisma.userQuestion.update({
        where: { id: questionId },
        data: {
          published: true,
          status: "publicada",
          faqId: faq.id,
        },
      });

      return NextResponse.json({ 
        success: true, 
        faq,
        message: "Pergunta publicada no FAQ com sucesso" 
      });
    } else {
      // Despublicar (remover do FAQ se existir)
      if (pergunta.faqId) {
        await prisma.fAQ.delete({
          where: { id: pergunta.faqId },
        });
      }

      await prisma.userQuestion.update({
        where: { id: questionId },
        data: {
          published: false,
          status: "respondida",
          faqId: null,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: "Pergunta removida do FAQ" 
      });
    }
  } catch (err: any) {
    console.error("[Admin FAQ Publicar] Erro:", err);
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao publicar pergunta" }, { status: 500 });
  }
}
