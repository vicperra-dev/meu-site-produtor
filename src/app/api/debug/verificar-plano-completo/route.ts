import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();

    // Buscar plano mais recente do usuário
    const plano = await prisma.userPlan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Buscar cupons do plano
    const cupons = plano ? await prisma.coupon.findMany({
      where: { userPlanId: plano.id },
      orderBy: { createdAt: "desc" },
    }) : [];

    // Buscar pagamento do plano
    const pagamento = plano ? await prisma.payment.findFirst({
      where: {
        userId: user.id,
        type: "plano",
        planId: plano.planId,
      },
      orderBy: { createdAt: "desc" },
    }) : null;

    return NextResponse.json({
      usuario: {
        id: user.id,
        email: user.email,
        nome: user.nomeArtistico || user.nomeCompleto,
      },
      plano: plano ? {
        id: plano.id,
        planId: plano.planId,
        planName: plano.planName,
        status: plano.status,
        modo: plano.modo,
        amount: plano.amount,
        startDate: plano.startDate instanceof Date ? plano.startDate.toISOString() : plano.startDate,
        endDate: plano.endDate instanceof Date ? plano.endDate.toISOString() : plano.endDate,
        createdAt: plano.createdAt instanceof Date ? plano.createdAt.toISOString() : plano.createdAt,
      } : null,
      cupons: {
        total: cupons.length,
        disponiveis: cupons.filter(c => !c.used && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length,
        usados: cupons.filter(c => c.used).length,
        lista: cupons.map(c => ({
          id: c.id,
          code: c.code,
          serviceType: c.serviceType,
          used: c.used,
          expiresAt: c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt,
        })),
      },
      pagamento: pagamento ? {
        id: pagamento.id,
        asaasId: pagamento.asaasId,
        amount: pagamento.amount,
        status: pagamento.status,
        createdAt: pagamento.createdAt instanceof Date ? pagamento.createdAt.toISOString() : pagamento.createdAt,
      } : null,
    });
  } catch (err: any) {
    console.error("[Debug Verificar Plano Completo] Erro:", err);
    return NextResponse.json(
      { 
        error: err.message || "Erro ao verificar plano",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
