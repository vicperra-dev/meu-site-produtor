import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const recusarSchema = z.object({
  questionId: z.string(),
  motivo: z.string().optional(),
});

/**
 * Endpoint para recusar uma pergunta (marcar como recusada)
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = recusarSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId, motivo } = validation.data;

    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    // Marcar como bloqueada (não aparecerá mais nas listagens normais)
    await prisma.userQuestion.update({
      where: { id: questionId },
      data: {
        blocked: true,
        blockedReason: motivo?.trim() || null, // Salvar motivo da recusa
        // Manter status original, apenas bloquear
      },
    });

    console.log(`[Admin FAQ] Pergunta ${questionId} recusada. Motivo: ${motivo || "Não informado"}`);

    return NextResponse.json({
      success: true,
      message: "Pergunta recusada com sucesso",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Recusar] Erro:", err);
    return NextResponse.json({ error: "Erro ao recusar pergunta" }, { status: 500 });
  }
}
