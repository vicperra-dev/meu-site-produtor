import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const reaceitarSchema = z.object({
  questionId: z.string(),
});

/**
 * Endpoint para reaceitar uma pergunta recusada (desbloquear)
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = reaceitarSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId } = validation.data;

    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    // Desbloquear a pergunta (voltar para pendentes)
    await prisma.userQuestion.update({
      where: { id: questionId },
      data: {
        blocked: false,
        blockedReason: null, // Limpar motivo ao reaceitar
      },
    });

    console.log(`[Admin FAQ] Pergunta ${questionId} reaceita (desbloqueada)`);

    return NextResponse.json({
      success: true,
      message: "Pergunta reaceita com sucesso",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Reaceitar] Erro:", err);
    return NextResponse.json({ error: "Erro ao reaceitar pergunta" }, { status: 500 });
  }
}
