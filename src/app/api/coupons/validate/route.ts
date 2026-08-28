import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  priceCheckoutItems,
  totalPricedCheckoutItems,
} from "@/app/lib/service-catalog";
import { normalizeStaleCouponAppointmentLink } from "@/app/lib/coupon-stale-appointment";
import { resolveCanonicalCouponType } from "@/app/lib/domain/coupon-types";
import { resolveCouponCheckoutMode } from "@/app/lib/checkout-coupon-gates";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) {
      return NextResponse.json({ error: "Código do cupom é obrigatório" }, { status: 400 });
    }

    let services;
    let beats;
    try {
      services = priceCheckoutItems(body.servicos, "service");
      beats = priceCheckoutItems(body.beats, "beat");
    } catch {
      return NextResponse.json(
        { error: "Serviço ou quantidade inválida." },
        { status: 400 }
      );
    }
    if (services.length + beats.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos um serviço." }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json(
        { error: "Cupom inexistente. Verifique o código e tente novamente." },
        { status: 404 }
      );
    }
    await normalizeStaleCouponAppointmentLink(coupon.id);
    const currentCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    if (!currentCoupon) {
      return NextResponse.json({ error: "Cupom inexistente." }, { status: 404 });
    }

    const canonicalType = resolveCanonicalCouponType(currentCoupon);
    const mode = resolveCouponCheckoutMode(currentCoupon);
    const subtotal = totalPricedCheckoutItems([...services, ...beats]);
    const result = await validateCouponAndGetTotal(
      code,
      subtotal,
      services,
      beats,
      {
        userId: user.id,
        mode,
        selectedServiceIds: [...services, ...beats].flatMap((item) =>
          Array.from({ length: item.quantidade }, () => item.id)
        ),
        allowTest: canUseSymbolicSimulation(user),
      }
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      subtotal: result.subtotal,
      discount: result.discount,
      finalTotal: result.finalTotal,
      isServiceCoupon: mode === "service-redemption",
      couponType: canonicalType,
      coupon: {
        code: currentCoupon.code,
        couponType: currentCoupon.couponType,
        discountType: currentCoupon.discountType,
        discountValue: currentCoupon.discountValue,
        serviceType: currentCoupon.serviceType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("[API coupons/validate]", error);
    return NextResponse.json({ error: "Erro ao validar cupom" }, { status: 500 });
  }
}
