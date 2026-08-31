/**
 * POST /api/admin/cupons/associar-usuario
 * Associa cupons a um usuário específico para que apareçam na Minha Conta dele.
 * Uso: cupons órfãos ou que não conseguiram vincular automaticamente.
 * Body: { userEmail: string, couponIds: string[] } ou { userId: string, couponIds: string[] }
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { assertCouponOwnershipTransferAllowed } from "@/app/lib/domain/coupon-domain";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const userEmail = typeof body.userEmail === "string" ? body.userEmail.trim() : null;
    const userId = typeof body.userId === "string" ? body.userId.trim() : null;
    const couponIds = Array.isArray(body.couponIds) ? body.couponIds.filter((id: unknown) => typeof id === "string") : [];

    if (couponIds.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um cupom em couponIds." },
        { status: 400 }
      );
    }

    let user: { id: string; nomeArtistico: string; email: string } | null = null;
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nomeArtistico: true, email: true },
      });
    }
    if (!user && userEmail) {
      const byEmail = await prisma.user.findFirst({
        where: { email: { equals: userEmail, mode: "insensitive" } },
        select: { id: true, nomeArtistico: true, email: true },
      });
      if (byEmail) user = byEmail;
    }
    if (!user) {
      return NextResponse.json(
        { error: userId ? "Usuário não encontrado com esse ID." : "Usuário não encontrado com esse e-mail. Verifique o e-mail (pode ser diferença de maiúsculas/minúsculas ou cadastro com outro e-mail)." },
        { status: 404 }
      );
    }

    const existing = await prisma.coupon.findMany({
      where: { id: { in: couponIds } },
      select: { id: true, assignedUserId: true },
    });
    for (const c of existing) {
      try {
        assertCouponOwnershipTransferAllowed(c, user.id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Transferência de cupom bloqueada.";
        return NextResponse.json({ error: msg, couponId: c.id }, { status: 409 });
      }
    }

    const result = await prisma.coupon.updateMany({
      where: {
        id: { in: couponIds },
        OR: [{ assignedUserId: null }, { assignedUserId: user.id }],
      },
      data: { assignedUserId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          error:
            "Nenhum cupom foi atualizado. Verifique se os cupons ainda existem no banco. Se o problema persistir, execute no servidor: npx prisma migrate deploy (para criar a coluna assignedUserId).",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${result.count} cupom(ns) associado(s) à Minha Conta de ${user.nomeArtistico || user.email}. Peça ao usuário atualizar a página Minha Conta (F5) para ver os cupons.`,
      userId: user.id,
      userEmail: user.email,
      count: result.count,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin Cupons associar-usuario]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao associar cupons." },
      { status: 500 }
    );
  }
}
