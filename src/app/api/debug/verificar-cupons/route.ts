import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const user = admin; // Admin pode ver seus próprios cupons; para ver de outro usuário, precisaria de param

    // Buscar todos os cupons do usuário
    const todosCupons = await prisma.coupon.findMany({
      where: {
        OR: [
          { usedBy: user.id },
          { userPlanId: { in: (await prisma.userPlan.findMany({ where: { userId: user.id }, select: { id: true } })).map(p => p.id) } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Separar por tipo
    const cuponsReembolso = todosCupons.filter(c => c.couponType === "reembolso");
    const cuponsPlano = todosCupons.filter(c => c.couponType === "plano");

    return NextResponse.json({
      usuario: {
        id: user.id,
        email: user.email,
      },
      totalCupons: todosCupons.length,
      cuponsReembolso: cuponsReembolso.map(c => ({
        id: c.id,
        code: c.code,
        discountValue: c.discountValue,
        used: c.used,
        expiresAt: c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      })),
      cuponsPlano: cuponsPlano.map(c => ({
        id: c.id,
        code: c.code,
        serviceType: c.serviceType,
        used: c.used,
        userPlanId: c.userPlanId,
      })),
      planos: await prisma.userPlan.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          planId: true,
          planName: true,
          status: true,
          amount: true,
        },
      }),
    });
  } catch (err: any) {
    console.error("[Debug Verificar Cupons] Erro:", err);
    return NextResponse.json(
      { 
        error: err.message || "Erro ao verificar cupons",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
