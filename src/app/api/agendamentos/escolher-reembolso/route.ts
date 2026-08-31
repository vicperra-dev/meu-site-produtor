import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { refundAsaasPayment } from "@/app/lib/asaas-refund";
import { fetchAsaasPayment, asaasPaymentIsRefundedStatus } from "@/app/lib/asaas-get-payment";
import { listAsaasPaymentsReceived } from "@/app/lib/asaas-list-payments";
import {
  createDomainCoupon,
  invalidateUnusedCouponsForAppointment,
} from "@/app/lib/domain/coupon-domain";
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";
import { resolveCartPartialRefundAmount } from "@/app/lib/cart-partial-refund";
import { logFinancialFailure, logFinancialInfo } from "@/app/lib/financial-ops-log";

/**
 * Para agendamentos cancelados ou recusados pelo admin: usuário escolhe reembolso direto (Asaas) ou cupom para remarcar.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { appointmentId, opcao } = body; // opcao: "reembolso" | "cupom"

    if (!appointmentId || !opcao || !["reembolso", "cupom"].includes(opcao)) {
      return NextResponse.json(
        { error: "Informe o ID do agendamento e a opção: reembolso ou cupom." },
        { status: 400 }
      );
    }

    const id = parseInt(String(appointmentId));
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID do agendamento inválido." }, { status: 400 });
    }

    const agendamento = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!agendamento) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }
    if (agendamento.userId !== user.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    if (agendamento.status !== "cancelado" && agendamento.status !== "recusado") {
      return NextResponse.json(
        { error: "Esta opção só está disponível para agendamentos cancelados ou recusados." },
        { status: 400 }
      );
    }

    if (
      opcao === "reembolso" &&
      agendamento.cancelRefundOption === "reembolso" &&
      agendamento.refundProcessedAt
    ) {
      return NextResponse.json({
        message: "Reembolso já registrado anteriormente.",
        opcao: "reembolso",
        alreadyProcessed: true,
      });
    }
    if (opcao === "cupom" && agendamento.cancelRefundOption === "cupom" && agendamento.refundCouponId) {
      const cupomExistente = await prisma.coupon.findUnique({
        where: { id: agendamento.refundCouponId },
        select: { code: true },
      });
      return NextResponse.json({
        message: "Cupom já gerado para esta solicitação.",
        opcao: "cupom",
        couponCode: cupomExistente?.code,
        alreadyProcessed: true,
      });
    }

    if (agendamento.cancelRefundOption && agendamento.cancelRefundOption !== opcao) {
      return NextResponse.json(
        { error: "Você já escolheu outra opção para este cancelamento ou recusa." },
        { status: 400 }
      );
    }

    // Preferir o cupom que efetivamente amparou este agendamento (appointmentId).
    // Fallback: originAppointmentId (legado / remarcação já gerada).
    let cupomDoAgendamento = await prisma.coupon.findFirst({
      where: { appointmentId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        serviceType: true,
        discountType: true,
        discountValue: true,
        userPlanId: true,
        paymentId: true,
        rootPaymentId: true,
        parentCouponId: true,
        code: true,
      },
    });
    if (!cupomDoAgendamento) {
      cupomDoAgendamento = await prisma.coupon.findFirst({
        where: { originAppointmentId: id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          serviceType: true,
          discountType: true,
          discountValue: true,
          userPlanId: true,
          paymentId: true,
          rootPaymentId: true,
          parentCouponId: true,
          code: true,
        },
      });
    }
    const cupomPlanoDoAgendamento = cupomDoAgendamento?.userPlanId
      ? cupomDoAgendamento
      : null;
    // legado: variável ainda usada para serviceType do cupom
    void cupomPlanoDoAgendamento;

    // Buscar pagamento: por appointmentId ou por appointmentIds (carrinho)
    let payment = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        status: "approved",
        appointmentId: id,
      },
    });
    if (!payment) {
      const pagamentos = await prisma.payment.findMany({
        where: { userId: user.id, status: "approved" },
      });
      payment = pagamentos.find((p) => {
        if (p.appointmentId === id) return true;
        if (p.appointmentIds == null) return false;
        const ids = Array.isArray(p.appointmentIds) ? p.appointmentIds : (typeof p.appointmentIds === "string" ? JSON.parse(p.appointmentIds) : []);
        return Array.isArray(ids) && ids.includes(id);
      }) ?? null;
    }
    // Fallback: pagamento pode não ter appointmentId (ex.: webhook antigo). Buscar por PaymentMetadata.
    if (!payment) {
      const metas = await prisma.paymentMetadata.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      for (const meta of metas) {
        try {
          const parsed = JSON.parse(meta.metadata || "{}");
          const metaAppId = parsed.appointmentId != null ? parseInt(String(parsed.appointmentId), 10) : null;
          if (metaAppId === id && meta.asaasId) {
            const found = await prisma.payment.findFirst({
              where: { userId: user.id, status: "approved", asaasId: meta.asaasId },
            });
            if (found) {
              payment = found;
              await prisma.payment.update({
                where: { id: found.id },
                data: { appointmentId: id, type: "agendamento" },
              });
              break;
            }
            // Payment não existe no nosso banco mas temos asaasId no metadata: criar registro (valor será reembolsado total pelo Asaas)
            payment = await prisma.payment.create({
              data: {
                userId: user.id,
                amount: 0,
                currency: "BRL",
                status: "approved",
                type: "agendamento",
                asaasId: meta.asaasId,
                appointmentId: id,
              },
            });
            break;
          }
        } catch (_) {}
      }
    }

    // Último recurso para reembolso: buscar cobranças RECEIVED no Asaas por externalReference (userId)
    if (opcao === "reembolso" && (!payment || !payment.asaasId)) {
      try {
        const asaasList = await listAsaasPaymentsReceived(user.id, 30);
        const appointmentCreated = agendamento.createdAt.getTime();
        const twoDaysMs = 48 * 60 * 60 * 1000;
        // Encontrar cobrança cuja data de criação está próxima do agendamento (até 48h antes/depois)
        let best: { id: string; value: number; dateCreated: string } | null = null;
        for (const p of asaasList) {
          const created = new Date(p.dateCreated).getTime();
          if (Math.abs(created - appointmentCreated) <= twoDaysMs) {
            if (!best || Math.abs(created - appointmentCreated) < Math.abs(new Date(best.dateCreated).getTime() - appointmentCreated)) {
              best = { id: p.id, value: p.value, dateCreated: p.dateCreated };
            }
          }
        }
        if (best) {
          let existing = await prisma.payment.findFirst({
            where: { userId: user.id, asaasId: best.id },
          });
          if (existing) {
            await prisma.payment.update({
              where: { id: existing.id },
              data: { appointmentId: id, type: "agendamento", amount: best.value },
            });
            const updated = await prisma.payment.findUnique({ where: { id: existing.id } });
            if (updated) payment = updated;
          } else {
            payment = await prisma.payment.create({
              data: {
                userId: user.id,
                amount: best.value,
                currency: "BRL",
                status: "approved",
                type: "agendamento",
                asaasId: best.id,
                appointmentId: id,
              },
            });
          }
        }
      } catch (asaasErr: any) {
        console.error("[Escolher Reembolso] Fallback Asaas list:", asaasErr);
      }
    }

    // GO-H8: se o agendamento veio de cupom, localizar Pedido Raiz para Asaas
    if (!payment && cupomDoAgendamento) {
      const rootId = cupomDoAgendamento.rootPaymentId || cupomDoAgendamento.paymentId;
      if (rootId) {
        payment = await prisma.payment.findFirst({
          where: { id: rootId, userId: user.id, status: "approved" },
        });
      }
    }

    const now = new Date();
    let refundAmount: number = 0;
    let couponCode: string | null = null;

    if (opcao === "reembolso") {
      if (!payment?.asaasId && !payment?.providerPaymentId) {
        // Homologação / Simulation: ainda permite registrar intenção se houver payment
        if (!payment) {
          return NextResponse.json(
            {
              error:
                "Pagamento original não encontrado para reembolso. Use a opção \"Cupom para remarcar\" ou contate o suporte.",
            },
            { status: 400 }
          );
        }
      }

      if (!payment?.asaasId) {
        // Sem Asaas (HOMOLOGATION/SIMULATION): registra opção localmente
        if (payment && String(payment.provider || "").toUpperCase() !== "ASAAS") {
          await prisma.appointment.update({
            where: { id },
            data: {
              cancelRefundOption: "reembolso",
              refundProcessedAt: now,
              refundAsaasStatus: "simulated",
            },
          });
          return NextResponse.json({
            message:
              "Reembolso registrado no domínio (pagamento sem Asaas). Para cobranças Asaas o estorno segue o gateway.",
            opcao: "reembolso",
            refundAsaasStatus: "simulated",
          });
        }
        return NextResponse.json(
          {
            error:
              "Pagamento não encontrado ou sem vínculo com Asaas para reembolso direto. Use a opção \"Cupom para remarcar\".",
          },
          { status: 400 }
        );
      }

      const ids = payment.appointmentIds != null
        ? (Array.isArray(payment.appointmentIds) ? payment.appointmentIds : JSON.parse(String(payment.appointmentIds)))
        : [payment.appointmentId].filter(Boolean);
      const isMultiItem = Array.isArray(ids) && ids.length > 1;

      const partial = await resolveCartPartialRefundAmount({
        payment: {
          id: payment.id,
          amount: payment.amount,
          asaasId: payment.asaasId,
          appointmentId: payment.appointmentId,
          appointmentIds: payment.appointmentIds,
        },
        appointmentId: id,
      });
      refundAmount = partial.amount;

      if (refundAmount <= 0) {
        logFinancialFailure({
          paymentId: payment.id,
          provider: "asaas",
          providerPaymentId: payment.asaasId,
          motivo: "Valor de reembolso parcial inválido ou saldo esgotado",
          status: "failed",
          code: "CART_PARTIAL_REFUND_ZERO",
          extra: { appointmentId: id, remaining: partial.remaining, source: partial.source },
        });
        return NextResponse.json(
          {
            error:
              "Não há valor restante a reembolsar neste pagamento. Atualize a página ou entre em contato com o suporte.",
          },
          { status: 400 }
        );
      }

      // Sempre enviar valor explícito (nunca undefined em multi-item — evita estorno total acidental)
      const valueToRefund = refundAmount;

      const remoteBefore = await fetchAsaasPayment(payment.asaasId);
      if (remoteBefore && asaasPaymentIsRefundedStatus(remoteBefore.status)) {
        const sync = await prisma.appointment.updateMany({
          where: {
            id,
            cancelRefundOption: null,
            status: { in: ["cancelado", "recusado"] },
          },
          data: {
            cancelRefundOption: "reembolso",
            refundProcessedAt: now,
            refundAsaasStatus: "REFUNDED",
          },
        });
        return NextResponse.json({
          message:
            sync.count > 0
              ? "Pagamento já estava reembolsado no Asaas; registro local foi atualizado."
              : "Reembolso já registrado anteriormente.",
          opcao: "reembolso",
          alreadyProcessed: true,
          refundAmount: refundAmount > 0 ? refundAmount : undefined,
        });
      }

      const reserve = await prisma.appointment.updateMany({
        where: {
          id,
          cancelRefundOption: null,
          status: { in: ["cancelado", "recusado"] },
        },
        data: {
          cancelRefundOption: "reembolso",
          refundProcessedAt: now,
          refundAsaasStatus: "pending",
        },
      });

      if (reserve.count === 0) {
        const apt2 = await prisma.appointment.findUnique({ where: { id } });
        if (
          apt2?.cancelRefundOption === "reembolso" &&
          apt2.refundProcessedAt
        ) {
          return NextResponse.json({
            message: "Reembolso já registrado anteriormente.",
            opcao: "reembolso",
            alreadyProcessed: true,
          });
        }
        return NextResponse.json(
          {
            error:
              "Não foi possível iniciar o reembolso. Atualize a página ou entre em contato com o suporte.",
          },
          { status: 409 }
        );
      }

      const remoteAfterReserve = await fetchAsaasPayment(payment.asaasId);
      if (remoteAfterReserve && asaasPaymentIsRefundedStatus(remoteAfterReserve.status)) {
        await prisma.appointment.updateMany({
          where: { id, cancelRefundOption: "reembolso" },
          data: { refundAsaasStatus: "REFUNDED" },
        });
        return NextResponse.json({
          message:
            "Pagamento já consta como reembolsado no Asaas após reserva local; nenhuma nova solicitação de estorno foi enviada.",
          opcao: "reembolso",
          alreadyProcessed: true,
          refundAmount: refundAmount > 0 ? refundAmount : undefined,
        });
      }

      try {
        await refundAsaasPayment(
          payment.asaasId,
          valueToRefund,
          `Reembolso de agendamento #${id} (${agendamento.status === "recusado" ? "recusa" : "cancelamento"})${isMultiItem ? " — parcial carrinho" : ""}`
        );
        await invalidateUnusedCouponsForAppointment(prisma, id);
        logFinancialInfo({
          paymentId: payment.id,
          provider: "asaas",
          providerPaymentId: payment.asaasId,
          motivo: "Reembolso de agendamento solicitado",
          status: "pending",
          code: "APPOINTMENT_REFUND_REQUESTED",
          extra: {
            appointmentId: id,
            refundAmount: valueToRefund,
            multiItem: isMultiItem,
            amountSource: partial.source,
          },
        });
      } catch (err: any) {
        console.error("[Escolher Reembolso] Erro Asaas:", err);
        await prisma.appointment.updateMany({
          where: { id, cancelRefundOption: "reembolso" },
          data: {
            cancelRefundOption: null,
            refundProcessedAt: null,
            refundAsaasStatus: "failed",
          },
        });
        logFinancialFailure({
          paymentId: payment.id,
          provider: "asaas",
          providerPaymentId: payment.asaasId,
          motivo: err.message || "Erro ao processar reembolso no Asaas",
          status: "failed",
          code: "APPOINTMENT_REFUND_ASAAS_ERROR",
          extra: { appointmentId: id },
        });
        return NextResponse.json(
          { error: err.message || "Erro ao processar reembolso no Asaas. Tente a opção cupom." },
          { status: 502 }
        );
      }

      return NextResponse.json({
        message: refundAmount > 0
          ? "Reembolso direto solicitado com sucesso. O valor será creditado em até 5 dias úteis."
          : "Reembolso do valor total da cobrança solicitado no Asaas. O valor será creditado em até 5 dias úteis.",
        opcao: "reembolso",
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
        refundAsaasStatus: "pending",
      });
    }

    // opcao === "cupom" → REBOOK (mesmo serviço, página exclusiva)
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    async function amarrarCupomOuIdempotente(couponId: string): Promise<
      | { ok: true }
      | { ok: false; response: ReturnType<typeof NextResponse.json> }
    > {
      const bind = await prisma.appointment.updateMany({
        where: { id, cancelRefundOption: null },
        data: { cancelRefundOption: "cupom", refundCouponId: couponId },
      });
      if (bind.count > 0) return { ok: true };

      const apt3 = await prisma.appointment.findUnique({ where: { id } });
      if (apt3?.cancelRefundOption === "cupom" && apt3.refundCouponId === couponId) {
        const c = await prisma.coupon.findUnique({
          where: { id: couponId },
          select: { code: true },
        });
        return {
          ok: false,
          response: NextResponse.json({
            message: "Cupom já gerado para esta solicitação.",
            opcao: "cupom",
            couponCode: c?.code,
            alreadyProcessed: true,
          }),
        };
      }
      await prisma.coupon.delete({ where: { id: couponId } }).catch(() => {});
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Conflito ao registrar cupom. Atualize a página e tente novamente." },
          { status: 409 }
        ),
      };
    }

    const servicesDoApt = await prisma.service.findMany({
      where: { appointmentId: id },
      select: { tipo: true },
      orderBy: { createdAt: "asc" },
    });
    const serviceType = normalizeServiceTypeId(
      cupomDoAgendamento?.serviceType ||
        servicesDoApt[0]?.tipo ||
        agendamento.tipo ||
        "sessao"
    );

    // GO-H8: cadeia de remarcações — mesmo Pedido Raiz
    const parentCoupon = cupomDoAgendamento;
    const rootPaymentId =
      parentCoupon?.rootPaymentId ||
      parentCoupon?.paymentId ||
      payment?.id ||
      null;

    const coupon = await createDomainCoupon(prisma, {
      canonicalType: "REBOOK",
      discountType: "service",
      discountValue: 0,
      serviceType,
      originAppointmentId: id,
      assignedUserId: user.id,
      expiresAt,
      paymentId: rootPaymentId,
      rootPaymentId,
      parentCouponId: parentCoupon?.id || null,
      cancelReason: agendamento.cancelReason || null,
      couponCategory: "reembolso",
    });
    couponCode = coupon.code;
    const ar = await amarrarCupomOuIdempotente(coupon.id);
    if (!ar.ok) return ar.response;
    return NextResponse.json({
      message: `Cupom de remarcação gerado (serviço: ${serviceType}). Use a página exclusiva para remarcar.`,
      opcao: "cupom",
      couponCode,
      serviceType,
      rootPaymentId,
      parentCouponId: parentCoupon?.id || null,
      couponCategory: "reembolso",
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("[Escolher Reembolso] Erro:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao processar opção." },
      { status: 500 }
    );
  }
}
