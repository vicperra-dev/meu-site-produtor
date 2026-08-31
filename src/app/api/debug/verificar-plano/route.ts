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

    // Buscar o plano mais recente criado (para debug)
    const planoMaisRecente = await prisma.userPlan.findFirst({
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
      usuarioLogado: {
        id: user.id,
        email: user.email,
        nome: user.nomeArtistico || user.nomeCompleto,
      },
      planosDoUsuario: planos.map(p => ({
        id: p.id,
        planId: p.planId,
        planName: p.planName,
        status: p.status,
        startDate: p.startDate instanceof Date ? p.startDate.toISOString() : p.startDate,
        endDate: p.endDate instanceof Date ? p.endDate.toISOString() : p.endDate,
        userId: p.userId,
      })),
      totalPlanosUsuario: planos.length,
      planoMaisRecenteNoSistema: planoMaisRecente ? {
        id: planoMaisRecente.id,
        planId: planoMaisRecente.planId,
        planName: planoMaisRecente.planName,
        status: planoMaisRecente.status,
        userId: planoMaisRecente.userId,
        user: planoMaisRecente.user,
        startDate: planoMaisRecente.startDate instanceof Date ? planoMaisRecente.startDate.toISOString() : planoMaisRecente.startDate,
        endDate: planoMaisRecente.endDate instanceof Date ? planoMaisRecente.endDate.toISOString() : planoMaisRecente.endDate,
      } : null,
    });
  } catch (err: any) {
    console.error("[Debug Verificar Plano] Erro:", err);
    return NextResponse.json(
      { 
        error: err.message || "Erro ao verificar plano",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
