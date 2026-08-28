import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import {
  priceCheckoutItems,
  totalPricedCheckoutItems,
  type PricedCheckoutItem,
} from "@/app/lib/service-catalog";
import { normalizeStaleCouponAppointmentLink } from "@/app/lib/coupon-stale-appointment";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import { resolveCouponCheckoutMode } from "@/app/lib/checkout-coupon-gates";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { fulfillZeroTotalCouponAppointment } from "@/app/lib/coupon-zero-checkout";

const agendamentoComCupomSchema = z.object({
  data: z.string(),
  hora: z.string(),
  duracaoMinutos: z.number().optional(),
  tipo: z.string().optional(),
  observacoes: z.string().optional(),
  servicos: z.array(z.object({
    id: z.string(),
    nome: z.string().optional(),
    quantidade: z.number().int().min(1).max(20),
    preco: z.number().optional(),
  })).optional(),
  beats: z.array(z.object({
    id: z.string(),
    nome: z.string().optional(),
    quantidade: z.number().int().min(1).max(20),
    preco: z.number().optional(),
  })).optional(),
  cupomCode: z.string(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const goLiveBlocked = goLiveBlockIfNeeded(user.role);
    if (goLiveBlocked) return goLiveBlocked;

    const body = await req.json();
    const validation = agendamentoComCupomSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { data, hora, duracaoMinutos, tipo, observacoes, cupomCode } = validation.data;
    let { servicos, beats } = validation.data;

    let pricedServices: PricedCheckoutItem[] = [];
    let pricedBeats: PricedCheckoutItem[] = [];
    try {
      pricedServices = priceCheckoutItems(servicos, "service");
      pricedBeats = priceCheckoutItems(beats, "beat");
      servicos = pricedServices;
      beats = pricedBeats;
    } catch {
      return NextResponse.json(
        { error: "Serviço ou quantidade inválida." },
        { status: 400 }
      );
    }
    const total = totalPricedCheckoutItems([...pricedServices, ...pricedBeats]);

    let couponRow = await prisma.coupon.findUnique({
      where: { code: cupomCode.toUpperCase() },
    });

    if (!couponRow) {
      return NextResponse.json(
        { error: "Cupom inexistente. Verifique o código e tente novamente." },
        { status: 404 }
      );
    }

    await normalizeStaleCouponAppointmentLink(couponRow.id);
    const couponReload = await prisma.coupon.findUnique({
      where: { code: cupomCode.toUpperCase() },
    });
    if (!couponReload) {
      return NextResponse.json({ error: "Cupom inexistente." }, { status: 404 });
    }
    couponRow = couponReload;

    const couponValidation = await validateCouponAndGetTotal(
      cupomCode,
      total,
      servicos || [],
      beats || [],
      {
        userId: user.id,
        mode: resolveCouponCheckoutMode(couponRow),
        selectedServiceIds: [...(servicos || []), ...(beats || [])].flatMap((item) =>
          Array.from({ length: item.quantidade }, () => item.id)
        ),
        allowTest: canUseSymbolicSimulation(user),
      }
    );
    if (!couponValidation.ok) {
      return NextResponse.json({ error: couponValidation.error }, { status: 400 });
    }
    if (couponValidation.finalTotal > 0) {
      return NextResponse.json(
        {
          error:
            "Ainda há valor a pagar. Conclua pelo checkout; o Asaas cobra apenas o total final.",
        },
        { status: 400 }
      );
    }

    const result = await fulfillZeroTotalCouponAppointment({
      user: {
        id: user.id,
        email: user.email,
        nomeArtistico: user.nomeArtistico,
        telefone: user.telefone,
      },
      data,
      hora,
      duracaoMinutos,
      tipo,
      observacoes,
      services: pricedServices,
      beats: pricedBeats,
      coupon: couponRow,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: result.appointment.id,
        data: result.appointment.data,
        status: result.appointment.status,
      },
      message: "Agendamento criado com sucesso usando cupom! Aguarde a confirmação do admin. Você receberá um email quando o agendamento for confirmado.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar agendamento";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[API] Erro ao criar agendamento com cupom:", err);
    if (message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error: message,
        details: process.env.NODE_ENV === "development" ? stack : undefined,
      },
      { status: 500 }
    );
  }
}
