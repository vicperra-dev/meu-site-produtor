import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { createDomainCoupon } from "@/app/lib/domain/coupon-domain";

/** Admin gera apenas cupons de DESCONTO (não trava serviço / não página exclusiva). */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const {
      discountType = "fixed",
      discountValue,
      appointmentId,
      userId,
      expiresInDays = 90,
    } = body;

    if (!discountValue || discountValue <= 0) {
      return NextResponse.json(
        { error: "Valor do desconto é obrigatório" },
        { status: 400 }
      );
    }

    if (discountType !== "percent" && discountType !== "fixed") {
      return NextResponse.json(
        { error: "Tipo de desconto inválido (deve ser 'percent' ou 'fixed')" },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { prisma } = await import("@/app/lib/prisma");
    const coupon = await createDomainCoupon(prisma, {
      canonicalType: "DISCOUNT",
      discountType,
      discountValue,
      serviceType: null,
      originAppointmentId: appointmentId || null,
      assignedUserId: userId || null,
      expiresAt,
    });

    return NextResponse.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        couponType: coupon.couponType,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expiresAt: coupon.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("[API] Erro ao gerar cupom:", error);
    if (error.message === "Acesso negado" || error.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Erro ao gerar cupom" },
      { status: 500 }
    );
  }
}
