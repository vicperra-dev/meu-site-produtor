import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { sendAppointmentCancelledEmail } from "@/app/lib/sendEmail";
import { refundAsaasPayment } from "@/app/lib/asaas-refund";
import { cancelAppointment } from "@/app/lib/domain/workflow";
import { getPaymentForAppointment } from "@/app/lib/domain/domain-service";
import { createDomainCoupon } from "@/app/lib/domain/coupon-domain";
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { appointmentId, refundType } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "ID do agendamento é obrigatório" }, { status: 400 });
    }

    const aptIdNum = parseInt(appointmentId, 10);
    const agendamento = await prisma.appointment.findUnique({
      where: { id: aptIdNum },
      include: {
        user: {
          select: {
            email: true,
            nomeArtistico: true,
          },
        },
      },
    });

    if (!agendamento) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    if (agendamento.userId !== user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const payment = await getPaymentForAppointment(aptIdNum);
    if (!payment) {
      return NextResponse.json(
        { error: "Pagamento não encontrado para este agendamento" },
        { status: 400 }
      );
    }

    if (payment.status !== "approved") {
      return NextResponse.json(
        { error: "Apenas agendamentos com pagamento aprovado podem ser cancelados" },
        { status: 400 }
      );
    }

    const result = await cancelAppointment({
      appointmentId: aptIdNum,
      actor: "user",
      userId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    const refundAmount = payment.amount;
    let couponCode: string | null = null;
    let refundDirectSuccess = false;
    let finalRefundType = refundType;

    if (refundAmount && refundAmount > 0) {
      if (finalRefundType === "direct") {
        try {
          if (payment.asaasId) {
            await refundAsaasPayment(
              payment.asaasId,
              refundAmount,
              `Reembolso de cancelamento de agendamento #${appointmentId}`
            );
            refundDirectSuccess = true;
          } else {
            finalRefundType = "coupon";
          }
        } catch (refundError: any) {
          console.error("[Cancelar Agendamento] Erro ao fazer reembolso direto:", refundError);
          finalRefundType = "coupon";
        }
      }

      if (finalRefundType === "coupon" || (!refundDirectSuccess && finalRefundType === "direct")) {
        try {
          const svc = await prisma.service.findFirst({
            where: { appointmentId: aptIdNum },
            select: { tipo: true },
            orderBy: { createdAt: "asc" },
          });
          const serviceType = normalizeServiceTypeId(svc?.tipo || agendamento.tipo || "sessao");
          const refundCoupon = await createDomainCoupon(prisma, {
            canonicalType: "REBOOK",
            discountType: "service",
            discountValue: 0,
            serviceType,
            originAppointmentId: aptIdNum,
            assignedUserId: user.id,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          });
          couponCode = refundCoupon.code;
        } catch (couponError: any) {
          console.error("[Cancelar Agendamento] Erro ao criar cupom de remarcação:", couponError);
        }
      }
    }

    if (!result.alreadyProcessed) {
      try {
        await sendAppointmentCancelledEmail(
          agendamento.user.email,
          agendamento.user.nomeArtistico || "Cliente",
          agendamento.data,
          "Agendamento cancelado pelo usuário.",
          couponCode || undefined
        );
      } catch (emailError: any) {
        console.error("[Cancelar Agendamento] Erro ao enviar email (não crítico):", emailError);
      }
    }

    return NextResponse.json({
      message: result.alreadyProcessed
        ? "Este agendamento já estava cancelado."
        : "Agendamento cancelado com sucesso",
      alreadyProcessed: result.alreadyProcessed,
      refundAmount,
      couponCode,
      refundType: refundDirectSuccess ? "direct" : couponCode ? "coupon" : null,
      agendamento: result.data.agendamento,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Cancelar Agendamento] Erro:", err);
    return NextResponse.json(
      {
        error: err.message || "Erro ao cancelar agendamento",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
