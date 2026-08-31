import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();

    // Buscar planos do usuário
    const planos = await prisma.userPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Buscar todos os planos (para comparar)
    const todosPlanos = await prisma.userPlan.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        planId: true,
        planName: true,
        status: true,
      },
    });

    return NextResponse.json({
      usuarioLogado: {
        id: user.id,
        email: user.email,
        nome: user.nomeArtistico || user.nomeCompleto,
      },
      planosDoUsuario: planos.length,
      planosEncontrados: planos.map(p => ({
        id: p.id,
        planId: p.planId,
        planName: p.planName,
        status: p.status,
      })),
      todosPlanosNoSistema: todosPlanos,
      comparacao: {
        meuUserId: user.id,
        userIdDoPlanoMaisRecente: todosPlanos[0]?.userId || null,
        saoIguais: todosPlanos[0]?.userId === user.id,
      },
    });
  } catch (err: any) {
    console.error("[Debug Meu UserId] Erro:", err);
    return NextResponse.json(
      { 
        error: err.message || "Erro ao verificar userId",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
