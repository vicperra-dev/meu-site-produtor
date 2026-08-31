import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

/**
 * Exclui um plano inativo (cancelado) do usuário.
 * Só permite excluir planos com status "cancelled".
 */
export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const userPlanId = searchParams.get("userPlanId");

    if (!userPlanId) {
      return NextResponse.json(
        { error: "ID do plano (userPlanId) é obrigatório." },
        { status: 400 }
      );
    }

    const plano = await prisma.userPlan.findUnique({
      where: { id: userPlanId },
      include: { subscription: true },
    });

    if (!plano) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    }

    if (plano.userId !== user.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const agora = new Date();
    const estaExpirado = plano.endDate != null && new Date(plano.endDate) < agora;
    const estaCancelado = plano.status === "cancelled";
    const podeExcluir = estaCancelado || estaExpirado;

    if (!podeExcluir) {
      return NextResponse.json(
        { error: "Apenas planos inativos ou já expirados podem ser excluídos da lista." },
        { status: 400 }
      );
    }

    await prisma.userPlan.delete({
      where: { id: userPlanId },
    });

    console.log("[Planos] Plano inativo excluído:", userPlanId, "usuário:", user.id);

    return NextResponse.json({
      message: "Plano excluído. Sua lista foi atualizada.",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("[Planos] Erro ao excluir plano:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao excluir plano." },
      { status: 500 }
    );
  }
}
