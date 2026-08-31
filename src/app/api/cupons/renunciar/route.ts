import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

/**
 * Permite ao usuário renunciar (excluir da lista) um cupom de plano não utilizado.
 * Só cupons não usados e vinculados a um plano do usuário podem ser renunciados.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const couponId = body.couponId ?? body.cupomId;

    if (!couponId || typeof couponId !== "string") {
      return NextResponse.json(
        { error: "ID do cupom é obrigatório." },
        { status: 400 }
      );
    }

    const cupom = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: { userPlan: { select: { userId: true } } },
    });

    if (!cupom) {
      return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 });
    }

    if (cupom.used) {
      return NextResponse.json(
        { error: "Só é possível excluir cupons que ainda não foram utilizados." },
        { status: 400 }
      );
    }

    const pertenceAoUsuario = cupom.userPlanId && cupom.userPlan?.userId === user.id;
    if (!pertenceAoUsuario) {
      return NextResponse.json({ error: "Este cupom não pertence à sua conta." }, { status: 403 });
    }

    await prisma.coupon.delete({
      where: { id: couponId },
    });

    console.log("[Cupons] Cupom renunciado pelo usuário:", couponId, "user:", user.id);

    return NextResponse.json({
      message: "Cupom excluído da sua lista.",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("[Cupons] Erro ao renunciar:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao excluir cupom." },
      { status: 500 }
    );
  }
}
