import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

/**
 * Endpoint para buscar perguntas recusadas (blocked: true)
 */
export async function GET() {
  try {
    await requireAdmin();

    const perguntas = await prisma.userQuestion.findMany({
      where: {
        blocked: true, // Apenas perguntas bloqueadas (recusadas)
      },
      include: {
        user: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeArtistico: true,
            email: true,
            telefone: true,
          },
        },
        faq: {
          select: {
            id: true,
            question: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ perguntas });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Recusadas] Erro:", err);
    return NextResponse.json({ error: "Erro ao buscar perguntas recusadas" }, { status: 500 });
  }
}
