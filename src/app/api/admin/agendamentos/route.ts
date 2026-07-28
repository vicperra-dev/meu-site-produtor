import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";
import { sendAppointmentAcceptedEmail, sendAppointmentRejectedEmail } from "@/app/lib/sendEmail";
import { pickPrimaryCouponForDisplay } from "@/app/lib/coupon-selection";
import {
  approveAppointment,
  rejectAppointment,
  startServiceWork,
} from "@/app/lib/domain/workflow";
import { reconcileAppointmentWithServices } from "@/app/lib/appointment-service-sync";
import { canDeleteClosedAppointment } from "@/app/lib/appointment-delete-gate";


const updateSchema = z.object({
  status: z.string().optional(),
  blocked: z.boolean().optional(),
  blockedReason: z.string().optional(),
  rejectionComment: z.string().optional(), // Comentário editável para recusa
});

export async function GET() {
  try {
    await requireAdmin();

    // Buscar todos os agendamentos (pendente = aguardando aceitar/recusar; aceito/confirmado = aprovados; inclui teste e reais)
    const agendamentos = await prisma.appointment.findMany({
      where: {
        status: {
          in: [
            "pendente",
            "aceito",
            "recusado",
            "confirmado",
            "cancelado",
            "em_andamento",
            "concluido",
            "remarcado",
          ],
        },
      },
      orderBy: { data: "desc" },
      include: {
        user: {
          select: {
            nomeArtistico: true,
            email: true,
          },
        },
      },
    });

    // Lista vazia é sucesso — não é erro técnico
    if (agendamentos.length === 0) {
      return NextResponse.json({ agendamentos: [] });
    }

    try {
      // Buscar pagamentos de agendamento aprovados (para associar inclusive carrinho com appointmentIds)
      const pagamentosAgendamento = await prisma.payment.findMany({
        where: {
          type: "agendamento",
          status: "approved",
          OR: [
            { asaasId: { not: null } },
            { providerPaymentId: { not: null } },
            { mercadopagoId: { not: null } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      function pagamentoLigaAoAgendamento(
        p: (typeof pagamentosAgendamento)[0],
        aptId: number
      ): boolean {
        if (p.appointmentId === aptId) return true;
        if (p.appointmentIds == null) return false;
        let ids: unknown = p.appointmentIds;
        if (typeof ids === "string") {
          try {
            ids = JSON.parse(ids);
          } catch {
            return false;
          }
        }
        return Array.isArray(ids) && ids.some((id) => Number(id) === aptId);
      }

      const aptIds = agendamentos.map((a) => a.id);
      const payIds = pagamentosAgendamento.map((p) => p.id);
      let todosCuponsRelacionados: Awaited<ReturnType<typeof prisma.coupon.findMany>> = [];
      if (aptIds.length > 0 || payIds.length > 0) {
        const OR: { appointmentId?: { in: number[] }; paymentId?: { in: string[] } }[] = [];
        if (aptIds.length > 0) OR.push({ appointmentId: { in: aptIds } });
        if (payIds.length > 0) OR.push({ paymentId: { in: payIds } });
        todosCuponsRelacionados = await prisma.coupon.findMany({
          where: { OR },
          orderBy: { createdAt: "asc" },
        });
      }

      const listaCuponsPorAgendamento = (aptId: number): typeof todosCuponsRelacionados => {
        const map = new Map<string, (typeof todosCuponsRelacionados)[0]>();
        for (const c of todosCuponsRelacionados) {
          if (c.appointmentId === aptId) {
            map.set(c.id, c);
            continue;
          }
          if (!c.paymentId) continue;
          const p = pagamentosAgendamento.find((x) => x.id === c.paymentId);
          if (p && pagamentoLigaAoAgendamento(p, aptId)) {
            map.set(c.id, c);
          }
        }
        return [...map.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      };

      const agendamentosComPagamento = agendamentos.map((agendamento) => {
        let pagamento = pagamentosAgendamento.find((p) => p.appointmentId === agendamento.id);
        if (!pagamento && agendamento.userId) {
          pagamento = pagamentosAgendamento.find((p) => {
            if (p.userId !== agendamento.userId) return false;
            return pagamentoLigaAoAgendamento(p, agendamento.id);
          });
        }
        const lista = listaCuponsPorAgendamento(agendamento.id);
        const cupom = pickPrimaryCouponForDisplay(lista);
        return {
          ...agendamento,
          user: agendamento.user ?? { nomeArtistico: "Cliente", email: "" },
          pagamentoConfirmado: pagamento
            ? {
                id: pagamento.id,
                amount: pagamento.amount,
                status: pagamento.status,
                paymentMethod: pagamento.paymentMethod,
                asaasId: pagamento.asaasId,
                createdAt: pagamento.createdAt,
              }
            : null,
          cupomAssociado: cupom
            ? {
                id: cupom.id,
                code: cupom.code,
                serviceType: cupom.serviceType,
                discountType: cupom.discountType,
                used: cupom.used,
                couponType: cupom.couponType,
                paymentId: cupom.paymentId,
              }
            : null,
          cuponsAssociados: lista.map((c) => ({
            id: c.id,
            code: c.code,
            serviceType: c.serviceType,
            discountType: c.discountType,
            used: c.used,
            couponType: c.couponType,
            paymentId: c.paymentId,
          })),
        };
      });

      return NextResponse.json({ agendamentos: agendamentosComPagamento });
    } catch (enrichErr) {
      // Enriquecimento (pagamentos/cupons) não deve derrubar o calendário operacional
      console.error(
        "[Admin] GET /api/admin/agendamentos: falha no enriquecimento; retornando lista base:",
        enrichErr
      );
      return NextResponse.json({
        agendamentos: agendamentos.map((a) => ({
          ...a,
          user: a.user ?? { nomeArtistico: "Cliente", email: "" },
          pagamentoConfirmado: null,
          cupomAssociado: null,
          cuponsAssociados: [],
        })),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin] GET /api/admin/agendamentos falhou:", err);
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const body = await req.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Buscar agendamento antes de atualizar para enviar emails
    const agendamentoAntes = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            nomeArtistico: true,
            email: true,
          },
        },
      },
    });

    if (!agendamentoAntes) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const idNum = parseInt(id, 10);
    const userInclude = {
      user: {
        select: {
          nomeArtistico: true,
          email: true,
        },
      },
    } as const;

    const rejectionMsg =
      validation.data.status === "recusado"
        ? (validation.data.rejectionComment || "").trim() || "Agendamento recusado."
        : "";

    const statusIncoming = validation.data.status;
    const blockedIncoming = validation.data.blocked;

    const acceptFromPending =
      (statusIncoming === "aceito" || statusIncoming === "confirmado") &&
      agendamentoAntes.status === "pendente" &&
      blockedIncoming === undefined;

    const rejectFromPending =
      statusIncoming === "recusado" &&
      agendamentoAntes.status === "pendente" &&
      blockedIncoming === undefined;

    const startWorkTransition =
      statusIncoming === "em_andamento" &&
      (agendamentoAntes.status === "aceito" || agendamentoAntes.status === "confirmado") &&
      blockedIncoming === undefined;

    if (acceptFromPending && statusIncoming) {
      const result = await approveAppointment(
        idNum,
        statusIncoming === "confirmado" ? "confirmado" : "aceito"
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.httpStatus });
      }
      if (!result.alreadyProcessed) {
        try {
          await sendAppointmentAcceptedEmail(
            agendamentoAntes.user.email,
            agendamentoAntes.user.nomeArtistico,
            result.data.agendamento.data,
            result.data.agendamento.tipo
          );
        } catch (emailError: any) {
          console.error("[Admin] Erro ao enviar email de aceitação:", emailError);
        }
      }
      return NextResponse.json({
        agendamento: result.data.agendamento,
        alreadyProcessed: result.alreadyProcessed,
      });
    }

    if (rejectFromPending) {
      const result = await rejectAppointment(idNum, rejectionMsg);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.httpStatus });
      }
      if (!result.alreadyProcessed) {
        try {
          await sendAppointmentRejectedEmail(
            agendamentoAntes.user.email,
            agendamentoAntes.user.nomeArtistico,
            result.data.agendamento.cancelReason || rejectionMsg,
            undefined
          );
        } catch (emailError: any) {
          console.error("[Admin] Erro ao enviar email de recusa:", emailError);
        }
      }
      return NextResponse.json({
        agendamento: result.data.agendamento,
        alreadyProcessed: result.alreadyProcessed,
      });
    }

    if (startWorkTransition) {
      const result = await startServiceWork(idNum);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.httpStatus });
      }
      return NextResponse.json({
        agendamento: result.data.agendamento,
        alreadyProcessed: result.alreadyProcessed,
      });
    }

    // Bloqueio / campos administrativos (não são transições de workflow operacional)
      const updateData: Record<string, unknown> = {};
      if (validation.data.blocked !== undefined) {
        updateData.blocked = validation.data.blocked;
        if (validation.data.blocked) {
          updateData.blockedAt = new Date();
          updateData.blockedReason = validation.data.blockedReason || "Bloqueado pelo admin";
        } else {
          updateData.blockedAt = null;
          updateData.blockedReason = null;
        }
    } else if (validation.data.status !== undefined) {
      return NextResponse.json(
        {
          error:
            "Transição de status não permitida fora do workflow (approve/reject/start/cancel).",
        },
        { status: 400 }
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhuma alteração solicitada" }, { status: 400 });
    }

    const agendamento = await prisma.appointment.update({
        where: { id: idNum },
        data: updateData as any,
        include: userInclude,
      });

    await reconcileAppointmentWithServices(idNum);

    return NextResponse.json({ agendamento });

  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const agendamento = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!agendamento) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    // Só permite excluir quando workflow encerrado (OP-02B)
    const gate = canDeleteClosedAppointment(agendamento);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 400 });
    }

    await prisma.coupon.updateMany({
      where: { appointmentId: parseInt(id) },
      data: { appointmentId: null },
    });
    await prisma.serviceOrder.updateMany({
      where: { appointmentId: parseInt(id) },
      data: { appointmentId: null },
    });
    await prisma.service.deleteMany({
      where: { appointmentId: parseInt(id) },
    });

    await prisma.appointment.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Agendamento excluído com sucesso" });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao excluir agendamento" }, { status: 500 });
  }
}
