import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();

    // Buscar todos os planos do usuário
    const planos = await prisma.userPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Buscar todos os planos no sistema (para debug)
    const todosPlanos = await prisma.userPlan.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            nomeArtistico: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      userName: user.nomeArtistico || user.nomeCompleto,
      planosDoUsuario: planos,
      totalPlanosUsuario: planos.length,
      ultimosPlanosSistema: todosPlanos,
    });
  } catch (err: any) {
    console.error("[Debug Planos] Erro:", err);
    return NextResponse.json(
      { 
        error: err.message || "Erro ao buscar planos",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
