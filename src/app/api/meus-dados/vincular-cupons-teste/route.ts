/**
 * POST /api/meus-dados/vincular-cupons-teste
 * Vincula cupons de teste à conta do usuário: atualiza agendamento/pagamento e
 * define assignedUserId nos cupons para garantirem aparecer em Minha Conta.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";

export async function POST() {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user)) {
      return NextResponse.json(
        { error: "Funcionalidade de homologação indisponível." },
        { status: 403 }
      );
    }

    let pagamento = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        amount: 5,
        type: "agendamento",
        status: "approved",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, appointmentId: true },
    });

    if (!pagamento && user.email) {
      const porEmail = await prisma.payment.findFirst({
        where: {
          amount: 5,
          type: "agendamento",
          status: "approved",
          user: { email: { equals: user.email.trim(), mode: "insensitive" } },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, appointmentId: true },
      });
      if (porEmail) pagamento = porEmail;
    }

    if (!pagamento) {
      return NextResponse.json(
        { success: false, error: "Nenhum pagamento de teste (R$ 5, agendamento) encontrado para este e-mail. Faça o pagamento de teste ou peça ao admin associar os cupons ao seu e-mail em Admin → Planos e Cupons → Cupons." },
        { status: 404 }
      );
    }

    const cuponsTeste = await prisma.coupon.findMany({
      where: { code: { startsWith: "TESTE_AGEND_" }, appointmentId: { not: null } },
      select: { appointmentId: true },
    });
    const appointmentIds = [...new Set(cuponsTeste.map((c) => c.appointmentId).filter((id): id is number => id != null))];

    let agendamentoId: number | null = pagamento.appointmentId;
    if (!agendamentoId && appointmentIds.length === 1) {
      agendamentoId = appointmentIds[0];
    } else if (!agendamentoId && appointmentIds.length > 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Associação ambígua. Use o painel administrativo para selecionar a operação correta.",
        },
        { status: 409 }
      );
    }

    if (agendamentoId) {
      try {
        await prisma.appointment.update({
          where: { id: agendamentoId },
          data: { userId: user.id },
        });
      } catch (e) {
        console.warn("[vincular-cupons-teste] Appointment.update falhou:", e);
      }
      try {
        await prisma.payment.update({
          where: { id: pagamento.id },
          data: { appointmentId: agendamentoId },
        });
      } catch (e) {
        console.warn("[vincular-cupons-teste] Payment.update falhou:", e);
      }
    }

    const idsParaAssociar: string[] = [];
    if (agendamentoId != null) {
      const porAppointment = await prisma.coupon.findMany({
        where: { code: { startsWith: "TESTE_AGEND_" }, appointmentId: agendamentoId },
        select: { id: true },
      });
      idsParaAssociar.push(...porAppointment.map((c) => c.id));
    }
    const porPayment = await prisma.coupon.findMany({
      where: { code: { startsWith: "TESTE_PAY_" }, paymentId: pagamento.id },
      select: { id: true },
    });
    idsParaAssociar.push(...porPayment.map((c) => c.id));

    if (idsParaAssociar.length > 0) {
      await prisma.coupon.updateMany({
        where: { id: { in: idsParaAssociar } },
        data: { assignedUserId: user.id },
      });
    }

    const cuponsCount = idsParaAssociar.length;

    return NextResponse.json({
      success: true,
      message: cuponsCount > 0
        ? `${cuponsCount} cupom(ns) vinculado(s) à sua conta. Eles devem aparecer abaixo.`
        : "Nenhum cupom de teste encontrado para este pagamento. Se você pagou e os cupons existem no admin, peça ao admin usar 'Associar seleção à Minha Conta' com seu e-mail.",
      appointmentId: agendamentoId ?? undefined,
      cuponsCount,
    });
  } catch (err: any) {
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("[vincular-cupons-teste]", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Erro ao vincular cupons." },
      { status: 500 }
    );
  }
}
