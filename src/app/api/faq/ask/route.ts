import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import { sendFAQQuestionEmail } from "@/app/lib/sendEmail";
import { requireAuth } from "@/app/lib/auth";

const askFaqSchema = z.object({
  question: z.string().min(10, "Descreva sua dúvida com pelo menos 10 caracteres"),
  userName: z.string().min(1, "O nome é obrigatório"),
  // userEmail removido - sempre usaremos o email da conta logada
});

export async function POST(req: Request) {
  try {
    // ✅ EXIGIR AUTENTICAÇÃO - usuário deve estar logado
    const user = await requireAuth();
    
    const body = await req.json();
    
    // ✅ Validar entrada (sem userEmail - será usado o da conta)
    const validation = askFaqSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { question, userName } = validation.data;

    // ✅ SEMPRE usar o email da conta logada (normalizado)
    const userEmailNormalizado = user.email.toLowerCase().trim();
    const userNameFinal = userName.trim() || user.nomeArtistico || user.nomeCompleto || "Usuário";
    
    console.log(`[FAQ Ask] Usuário logado: userId=${user.id}, email=${userEmailNormalizado}, nome=${userNameFinal}`);
    
    const novaPergunta = await prisma.userQuestion.create({
      data: {
        question: question.trim(),
        userName: userNameFinal,
        userEmail: userEmailNormalizado, // SEMPRE usar email da conta logada
        userId: user.id, // SEMPRE associar ao usuário logado
        status: "pendente",
      },
    });

    console.log(`[FAQ Ask] Pergunta criada: id=${novaPergunta.id}, userId=${novaPergunta.userId}, userEmail=${novaPergunta.userEmail}`);

    // Enviar email para THouse
    try {
      await sendFAQQuestionEmail(
        novaPergunta.question,
        novaPergunta.userName || userNameFinal,
        novaPergunta.userEmail || userEmailNormalizado,
        user.id,
        novaPergunta.id
      );
    } catch (emailError: any) {
      console.error("[FAQ Ask] Erro ao enviar email (não crítico):", emailError);
      // Não falhar a criação da pergunta por erro de email
    }

    return NextResponse.json({ ok: true, question: novaPergunta });
  } catch (e: any) {
    console.error("Erro ao registrar dúvida no FAQ:", e);
    return NextResponse.json(
      { error: "Erro ao enviar sua dúvida. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
