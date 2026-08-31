import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pendente"; // pendente, respondida, todas

    const where: any = {
      blocked: false, // Não mostrar perguntas bloqueadas (recusadas)
    };
    if (status !== "todas") {
      where.status = status;
    }

    const perguntas = await prisma.userQuestion.findMany({
      where,
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
    console.error("[Admin FAQ Pendentes] Erro:", err);
    return NextResponse.json({ error: "Erro ao buscar perguntas" }, { status: 500 });
  }
}
