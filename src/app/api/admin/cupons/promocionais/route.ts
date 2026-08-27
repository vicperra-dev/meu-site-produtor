import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import {
  applicableServiceLabels,
  canReactivatePartnershipCoupon,
  createPartnershipCoupon,
  isPromotionalPartnershipCoupon,
  parsePartnershipFixedAmount,
  partnershipExpiryEndOfDay,
  partnershipExpiryError,
  remainingUseCount,
} from "@/app/lib/promotional-coupon";
import { CANONICAL_SERVICE_IDS } from "@/app/lib/service-catalog";

function partnershipWhere() {
  return {
    assignedUserId: { not: null },
    userPlanId: null,
    parentCouponId: null,
    originAppointmentId: null,
    couponType: "desconto",
    discountType: { in: ["percent", "fixed"] },
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const cupons = await prisma.coupon.findMany({
      where: partnershipWhere(),
      orderBy: { createdAt: "desc" },
      include: {
        assignedUser: { select: { id: true, nomeArtistico: true, email: true } },
      },
    });
    return NextResponse.json({
      cupons: cupons.filter(isPromotionalPartnershipCoupon).map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        applicableServiceTypes: c.applicableServiceTypes,
        applicableLabels: applicableServiceLabels(c.applicableServiceTypes),
        maxUses: c.maxUses,
        useCount: c.useCount,
        remainingUses: remainingUseCount(c),
        expiresAt: c.expiresAt,
        isActive: c.isActive,
        used: c.used,
        adminNote: c.adminNote,
        createdAt: c.createdAt,
        assignedUser: c.assignedUser,
      })),
      catalogIds: [...CANONICAL_SERVICE_IDS],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin cupons promocionais GET]", err);
    return NextResponse.json({ error: "Erro ao listar cupons de parceria." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const assignedUserId = String(body.assignedUserId || "").trim();
    if (!assignedUserId) {
      return NextResponse.json({ error: "Usuário beneficiado é obrigatório." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 400 });
    }

    const amount = parsePartnershipFixedAmount(body.discountValue);
    if (!amount.ok) {
      return NextResponse.json({ error: amount.error }, { status: 400 });
    }

    const expiresIso = String(body.expiresAt || "").trim().slice(0, 10);
    const expiryErr = partnershipExpiryError(expiresIso);
    if (expiryErr) {
      return NextResponse.json({ error: expiryErr }, { status: 400 });
    }
    const expiresAt = partnershipExpiryEndOfDay(expiresIso);

    let maxUses: number | null = 1;
    if (body.maxUses === null || body.maxUses === "unlimited") {
      maxUses = null;
    } else {
      const n = Number(body.maxUses);
      if (![1, 3, 5].includes(n)) {
        return NextResponse.json({ error: "Limite de usos deve ser 1, 3, 5 ou ilimitado." }, { status: 400 });
      }
      maxUses = n;
    }

    const allServices = Boolean(body.allServices);
    const applicable = allServices
      ? null
      : Array.isArray(body.applicableServiceTypes)
        ? body.applicableServiceTypes.map(String)
        : [];
    if (!allServices && applicable.length === 0) {
      return NextResponse.json(
        { error: "Selecione todos os serviços ou ao menos um SKU." },
        { status: 400 }
      );
    }

    const coupon = await createPartnershipCoupon(prisma, {
      assignedUserId,
      createdByAdminId: admin.id,
      discountValue: amount.value,
      code: body.code ? String(body.code) : null,
      expiresAt,
      maxUses,
      applicableServiceTypes: applicable,
      applicableDomain: "STUDIO",
      adminNote: body.adminNote ? String(body.adminNote) : null,
    });

    return NextResponse.json({ ok: true, coupon: { id: coupon.id, code: coupon.code } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar cupom.";
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    const status = message.includes("inválido") || message.includes("Já existe") || message.includes("obrigatório")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing || !isPromotionalPartnershipCoupon(existing)) {
      return NextResponse.json({ error: "Cupom de parceria não encontrado." }, { status: 404 });
    }
    const wantActive = Boolean(body.isActive);
    if (wantActive && !canReactivatePartnershipCoupon(existing)) {
      return NextResponse.json(
        {
          error:
            "Não é possível reativar: o cupom está expirado ou não tem mais usos disponíveis.",
        },
        { status: 400 }
      );
    }
    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: wantActive },
    });
    return NextResponse.json({ ok: true, isActive: updated.isActive });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao atualizar cupom." }, { status: 500 });
  }
}
