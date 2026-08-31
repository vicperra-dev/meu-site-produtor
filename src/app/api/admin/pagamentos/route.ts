import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { pickPrimaryCouponForDisplay } from "@/app/lib/coupon-selection";
import { resolveCouponOrigin } from "@/app/lib/coupon-origin";
import {
  parsePaymentAppointmentIds,
  resolvePaymentModoTransacao,
} from "@/app/lib/symbolic-payment";
import { resolvePaymentRefundInfo } from "@/app/lib/payment-refund-status";
import { canAdminDeletePayment } from "@/app/lib/admin-delete-payment";

export async function GET() {
  try {
    await requireAdmin();

    const pagamentos = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            nomeArtistico: true,
            nomeSocial: true,
            email: true,
            telefone: true,
            cpf: true,
            pais: true,
            estado: true,
            cidade: true,
            bairro: true,
            cep: true,
            dataNascimento: true,
            sexo: true,
            genero: true,
            generoOutro: true,
            nacionalidade: true,
            createdAt: true,
          },
        },
      },
    });

    const asaasIds = pagamentos
      .map((p) => p.asaasId)
      .filter((id): id is string => Boolean(id));
    const userIds = [...new Set(pagamentos.map((p) => p.userId))];

    const metadataFilters = [
      ...(asaasIds.length > 0 ? [{ asaasId: { in: asaasIds } }] : []),
      ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
    ];
    const metadataRows =
      metadataFilters.length > 0
        ? await prisma.paymentMetadata.findMany({
            where: { OR: metadataFilters },
            orderBy: { createdAt: "desc" },
            select: { userId: true, asaasId: true, metadata: true, createdAt: true },
          })
        : [];

    const metadataByAsaasId = new Map<string, Record<string, unknown>>();
    const metadataByUserId = new Map<string, Array<{ createdAt: Date; parsed: Record<string, unknown> }>>();

    for (const row of metadataRows) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(row.metadata) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      if (row.asaasId && !metadataByAsaasId.has(row.asaasId)) {
        metadataByAsaasId.set(row.asaasId, parsed);
      }
      const userList = metadataByUserId.get(row.userId) ?? [];
      userList.push({ createdAt: row.createdAt, parsed });
      metadataByUserId.set(row.userId, userList);
    }

    function resolveMetadataForPayment(pagamento: (typeof pagamentos)[number]) {
      if (pagamento.asaasId) {
        const byAsaas = metadataByAsaasId.get(pagamento.asaasId);
        if (byAsaas) return byAsaas;
      }

      const userMeta = metadataByUserId.get(pagamento.userId) ?? [];
      const paymentTime = pagamento.createdAt.getTime();
      const windowMs = 2 * 60 * 60 * 1000;

      for (const entry of userMeta) {
        const delta = Math.abs(entry.createdAt.getTime() - paymentTime);
        if (delta > windowMs) continue;
        if (
          pagamento.type === "agendamento" &&
          entry.parsed.symbolicAgendamento === true
        ) {
          return entry.parsed;
        }
        if (pagamento.type === "plano" && entry.parsed.symbolicPlano === true) {
          return entry.parsed;
        }
        if (entry.parsed.isTest === true && entry.parsed.tipo === pagamento.type) {
          return entry.parsed;
        }
      }

      return null;
    }

    const appointmentIds = [
      ...new Set(pagamentos.flatMap((p) => parsePaymentAppointmentIds(p))),
    ];
    const paymentIds = pagamentos.map((p) => p.id);

    const cuponsPorPagamento = new Map<
      string,
      Array<{
        refundProcessedAt: Date | null;
        refundUserConfirmedAt: Date | null;
        refundUserDisputedAt: Date | null;
        refundAsaasStatus: string | null;
        refundAmount: number | null;
      }>
    >();

    if (paymentIds.length > 0) {
      const cuponsPagamento = await prisma.coupon.findMany({
        where: { paymentId: { in: paymentIds } },
        select: {
          paymentId: true,
          refundProcessedAt: true,
          refundUserConfirmedAt: true,
          refundUserDisputedAt: true,
          refundAsaasStatus: true,
          refundAmount: true,
        },
      });
      for (const cupom of cuponsPagamento) {
        if (!cupom.paymentId) continue;
        const lista = cuponsPorPagamento.get(cupom.paymentId) ?? [];
        lista.push(cupom);
        cuponsPorPagamento.set(cupom.paymentId, lista);
      }
    }

    const agendamentosPorId = new Map<
      number,
      {
        cancelRefundOption: string | null;
        refundProcessedAt: Date | null;
        refundUserConfirmedAt: Date | null;
        refundUserDisputedAt: Date | null;
        refundAsaasStatus: string | null;
      }
    >();

    if (appointmentIds.length > 0) {
      const agendamentos = await prisma.appointment.findMany({
        where: { id: { in: appointmentIds } },
        select: {
          id: true,
          cancelRefundOption: true,
          refundProcessedAt: true,
          refundUserConfirmedAt: true,
          refundUserDisputedAt: true,
          refundAsaasStatus: true,
        },
      });
      for (const ag of agendamentos) {
        agendamentosPorId.set(ag.id, ag);
      }
    }

    const cuponsPorAgendamento = new Map<
      number,
      Array<{
        id: string;
        code: string;
        appointmentId: number | null;
        couponType: string;
        userPlanId: string | null;
        paymentId: string | null;
        createdAt: Date;
      }>
    >();

    if (appointmentIds.length > 0) {
      const cupons = await prisma.coupon.findMany({
        where: {
          appointmentId: { in: appointmentIds },
          used: true,
          couponType: { not: "reembolso" },
        },
        select: {
          id: true,
          code: true,
          appointmentId: true,
          couponType: true,
          userPlanId: true,
          paymentId: true,
          createdAt: true,
        },
      });

      for (const cupom of cupons) {
        if (cupom.appointmentId == null) continue;
        const lista = cuponsPorAgendamento.get(cupom.appointmentId) ?? [];
        lista.push(cupom);
        cuponsPorAgendamento.set(cupom.appointmentId, lista);
      }
    }

    const pagamentosEnriquecidos = pagamentos.map((pagamento) => {
      const aptIds = parsePaymentAppointmentIds(pagamento);
      const cuponsDoPagamento = aptIds.flatMap((id) => cuponsPorAgendamento.get(id) ?? []);
      const cupomUtilizado = pickPrimaryCouponForDisplay(cuponsDoPagamento);
      const paymentMetadata = resolveMetadataForPayment(pagamento);
      const pagamentoComCupom =
        pagamento.paymentMethod === "cupom" || Boolean(cupomUtilizado);
      const refundSources = [
        ...(cuponsPorPagamento.get(pagamento.id) ?? []),
        ...aptIds
          .map((id) => agendamentosPorId.get(id))
          .filter((ag): ag is NonNullable<typeof ag> => Boolean(ag)),
      ];
      const reembolso = resolvePaymentRefundInfo(refundSources);

      return {
        ...pagamento,
        modoTransacao: resolvePaymentModoTransacao(pagamento, paymentMetadata),
        pagamentoComCupom,
        ...reembolso,
        cupomUtilizado: cupomUtilizado
          ? {
              id: cupomUtilizado.id,
              code: cupomUtilizado.code,
              origem: resolveCouponOrigin(cupomUtilizado),
            }
          : null,
      };
    });

    return NextResponse.json({ pagamentos: pagamentosEnriquecidos });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("Erro ao buscar pagamentos:", err);
    return NextResponse.json({ error: "Erro ao buscar pagamentos" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID do pagamento é obrigatório" }, { status: 400 });
    }

    const decision = await canAdminDeletePayment(id);
    if (decision === null) {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.reason }, { status: 422 });
    }

    await prisma.payment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Pagamento excluído com sucesso." });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("Erro ao excluir pagamento:", err);
    return NextResponse.json({ error: "Erro ao excluir pagamento" }, { status: 500 });
  }
}
