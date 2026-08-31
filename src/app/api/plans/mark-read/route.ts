import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getDatabaseProvider } from "@/app/lib/db-utils";

export const dynamic = "force-dynamic";

// POST - Marcar plano como lido
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "ID do plano é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o plano pertence ao usuário
    const plan = await prisma.userPlan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    if (plan.userId !== user.id) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Marcar como lido usando Prisma Client (compatível com SQLite e PostgreSQL)
    try {
      await prisma.userPlan.update({
        where: { id: planId },
        data: { readAt: new Date() },
      });
      console.log(`[Plan Mark Read] ✅ readAt atualizado para plano ${planId}`);
    } catch (e: any) {
      console.error("[Plan Mark Read] ❌ Erro ao atualizar readAt:", e);
      // Tentar com query raw adaptada para PostgreSQL
      try {
        const now = new Date().toISOString();
        const provider = getDatabaseProvider();
        if (provider === 'postgresql') {
          await prisma.$executeRawUnsafe(
            `UPDATE "UserPlan" SET "readAt" = $1::timestamp WHERE id = $2`,
            now,
            planId
          );
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE UserPlan SET readAt = ? WHERE id = ?`,
            now,
            planId
          );
        }
        console.log(`[Plan Mark Read] ✅ readAt atualizado via query raw para plano ${planId}`);
      } catch (e2: any) {
        console.error("[Plan Mark Read] ❌ Erro ao atualizar readAt via query raw:", e2);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao marcar plano como lido:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao marcar como lido" },
      { status: 500 }
    );
  }
}
