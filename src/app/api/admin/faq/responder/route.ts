import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { sendFAQAnswerEmail } from "@/app/lib/sendEmail";
import { z } from "zod";

const responderSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1, "A resposta é obrigatória"),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const validation = responderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId, answer } = validation.data;

    // Buscar pergunta
    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
      include: {
        user: {
          select: {
            email: true,
            nomeArtistico: true,
            nomeCompleto: true,
          },
        },
      },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    // Atualizar pergunta com resposta
    const perguntaAtualizada = await prisma.userQuestion.update({
      where: { id: questionId },
      data: {
        answer: answer.trim(),
        answeredAt: new Date(),
        answeredBy: admin.id,
        status: "respondida",
      },
    });

    // Enviar email para o usuário
    try {
      const userEmail = pergunta.userEmail || pergunta.user?.email;
      const userName = pergunta.userName || pergunta.user?.nomeArtistico || pergunta.user?.nomeCompleto || "Usuário";
      
      if (userEmail) {
        await sendFAQAnswerEmail(
          userEmail,
          userName,
          pergunta.question,
          answer.trim()
        );
        console.log(`[Admin FAQ] Email de resposta enviado para ${userEmail}`);
      }
    } catch (emailError: any) {
      console.error("[Admin FAQ] Erro ao enviar email (não crítico):", emailError);
      // Não falhar a resposta por erro de email
    }

    return NextResponse.json({ 
      success: true, 
      pergunta: perguntaAtualizada,
      message: "Pergunta respondida com sucesso" 
    });
  } catch (err: any) {
    console.error("[Admin FAQ Responder] Erro:", err);
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao responder pergunta" }, { status: 500 });
  }
}
