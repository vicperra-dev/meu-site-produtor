import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  couponOriginLabel,
  couponStatusLabel,
  couponUsesCheckoutDiscount,
  couponUsesExclusiveSchedulingPage,
} from "@/app/lib/domain/coupon-domain";
import {
  resolveCanonicalCouponType,
  couponTypeLabel,
} from "@/app/lib/domain/coupon-types";
import { CHECKOUT_CATALOG, normalizeServiceTypeId } from "@/app/lib/service-catalog";
import { normalizeStaleCouponAppointmentLink } from "@/app/lib/coupon-stale-appointment";

/**
 * GET /api/coupons/[codigo] — metadados do cupom para página exclusiva / checkout.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ codigo: string }> }
) {
  try {
    const user = await requireAuth();
    const { codigo } = await ctx.params;
    const code = String(codigo || "").trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Código obrigatório." }, { status: 400 });
    }

    let coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ error: "Cupom inexistente." }, { status: 404 });
    }

    await normalizeStaleCouponAppointmentLink(coupon.id);
    coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ error: "Cupom inexistente." }, { status: 404 });
    }

    if (coupon.assignedUserId && coupon.assignedUserId !== user.id) {
      return NextResponse.json({ error: "Este cupom pertence a outro usuário." }, { status: 403 });
    }

    const canonical = resolveCanonicalCouponType(coupon);
    const exclusive = couponUsesExclusiveSchedulingPage(coupon);
    const discountOnly = couponUsesCheckoutDiscount(coupon);
    const serviceType = coupon.serviceType
      ? normalizeServiceTypeId(coupon.serviceType)
      : null;
    const catalog =
      serviceType && serviceType in CHECKOUT_CATALOG
        ? CHECKOUT_CATALOG[serviceType as keyof typeof CHECKOUT_CATALOG]
        : null;

    return NextResponse.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        couponType: coupon.couponType,
        canonicalType: canonical,
        typeLabel: couponTypeLabel(canonical),
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        serviceType,
        serviceId: coupon.serviceId,
        paymentId: coupon.paymentId,
        userPlanId: coupon.userPlanId,
        appointmentId: coupon.appointmentId,
        assignedUserId: coupon.assignedUserId,
        used: coupon.used,
        expiresAt: coupon.expiresAt,
        status: couponStatusLabel(coupon),
        origin: couponOriginLabel(coupon),
        exclusiveScheduling: exclusive,
        checkoutDiscount: discountOnly,
        catalogItem: catalog
          ? { id: catalog.id, nome: catalog.nome, preco: catalog.preco, category: catalog.category }
          : null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Acesso negado" || msg === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("[GET /api/coupons/codigo]", err);
    return NextResponse.json({ error: "Erro ao carregar cupom." }, { status: 500 });
  }
}
