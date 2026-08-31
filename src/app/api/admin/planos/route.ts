import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const planos = await prisma.userPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            nomeArtistico: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ planos });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar planos" }, { status: 500 });
  }
}
