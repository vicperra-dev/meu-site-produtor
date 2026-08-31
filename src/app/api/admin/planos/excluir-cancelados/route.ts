import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

/**
 * Exclui permanentemente do banco de dados:
 * - Planos com status "cancelled"
 * - Cupons vinculados a esses planos (cupons inativos)
 */
export async function DELETE() {
  try {
    await requireAdmin();

    const cancelados = await prisma.userPlan.findMany({
      where: { status: "cancelled" },
      select: { id: true },
    });
    const idsPlanosCancelados = cancelados.map((p) => p.id);

    if (idsPlanosCancelados.length === 0) {
      return NextResponse.json({
        message: "Nenhum plano cancelado ou cupom inativo para excluir.",
        deletedPlans: 0,
        deletedCoupons: 0,
      });
    }

    const cuponsDeletados = await prisma.coupon.deleteMany({
      where: { userPlanId: { in: idsPlanosCancelados } },
    });

    const planosDeletados = await prisma.userPlan.deleteMany({
      where: { id: { in: idsPlanosCancelados } },
    });

    console.log(
      `[Admin] Excluídos do BD: ${planosDeletados.count} plano(s) cancelado(s), ${cuponsDeletados.count} cupom(ns) inativo(s)`
    );

    return NextResponse.json({
      message: `${planosDeletados.count} plano(s) cancelado(s) e ${cuponsDeletados.count} cupom(ns) inativo(s) excluídos do banco de dados.`,
      deletedPlans: planosDeletados.count,
      deletedCoupons: cuponsDeletados.count,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin Excluir Cancelados] Erro:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao excluir do banco." },
      { status: 500 }
    );
  }
}
