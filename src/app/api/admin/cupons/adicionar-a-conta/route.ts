/**
 * POST /api/admin/cupons/adicionar-a-conta
 * Vincula os cupons de um agendamento à Minha Conta do usuário que pagou:
 * atualiza o Appointment para userId do pagamento, para os cupons aparecerem em Minha Conta.
 * Body: { appointmentId: number } ou { couponId: string }
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const appointmentId = body.appointmentId != null ? Number(body.appointmentId) : null;
    let resolvedAppointmentId: number | null = appointmentId;

    if (resolvedAppointmentId == null && body.couponId) {
      const coupon = await prisma.coupon.findUnique({
        where: { id: String(body.couponId) },
        select: { appointmentId: true },
      });
      if (coupon?.appointmentId != null) resolvedAppointmentId = coupon.appointmentId;
    }

    if (resolvedAppointmentId == null) {
      return NextResponse.json(
        { error: "Informe appointmentId ou couponId no body." },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        appointmentId: resolvedAppointmentId,
        type: "agendamento",
        status: "approved",
      },
      select: { userId: true, amount: true },
    });

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Nenhum pagamento de agendamento vinculado a este agendamento. Associe o pagamento em Admin → Pagamentos (botão Associar agendamento e gerar cupons).",
        },
        { status: 404 }
      );
    }

    await prisma.appointment.update({
      where: { id: resolvedAppointmentId },
      data: { userId: payment.userId },
    });

    const cuponsCount = await prisma.coupon.count({
      where: { appointmentId: resolvedAppointmentId },
    });

    return NextResponse.json({
      success: true,
      message: `Cupons vinculados à Minha Conta do usuário. ${cuponsCount} cupom(ns) passarão a aparecer para o dono do pagamento.`,
      appointmentId: resolvedAppointmentId,
      cuponsCount,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin Cupons adicionar-a-conta]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao vincular cupons." },
      { status: 500 }
    );
  }
}
