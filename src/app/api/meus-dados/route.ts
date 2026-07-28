import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getDatabaseProvider } from "@/app/lib/db-utils";
import { deriveAppointmentStatusFromServiceStatuses } from "@/app/lib/domain/statuses";
import { resolveCanonicalCouponType } from "@/app/lib/domain/coupon-types";
import { resolveCouponCategoryFromRow } from "@/app/lib/domain/coupon-category";
import { serviceOrderLabel } from "@/app/lib/ui/service-order-visual";
import { userHasPromotionAccess } from "@/app/lib/plan-promotion-access";

export async function GET() {
  try {
    const user = await requireAuth();
    
    // Normalizar email do usuário para garantir correspondência
    const userEmailNormalizado = user.email.toLowerCase().trim();

    // Buscar agendamentos do usuário
    const agendamentos = await prisma.appointment.findMany({
      where: { userId: user.id },
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

    // Buscar pagamentos do usuário
    const pagamentos = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Buscar planos do usuário
    console.log("[API /meus-dados] Buscando planos para userId:", user.id);
    const planos = await prisma.userPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    console.log("[API /meus-dados] Planos encontrados:", planos.length, planos.map(p => ({ id: p.id, planId: p.planId, status: p.status })));

    // Buscar cupons do usuário: usedBy, planos ativos, agendamentos do usuário, ou agendamentos vinculados a pagamentos do usuário (cupons de teste)
    const planosAtivosIds = planos.filter((p) => p.status !== "cancelled").map((p) => p.id);
    const planosIds = planos.length > 0 ? planos.map((p) => p.id) : [];
    const agendamentosIds = agendamentos.length > 0 ? agendamentos.map((a) => a.id) : [];

    // Cupons de teste: pagamentos do usuário podem ter appointmentId; ou cupons TESTE_ cujo agendamento pertence ao usuário
    let appointmentIdsDosPagamentos: number[] = [];
    try {
      const pagamentosUsuarioComAgendamento = await prisma.payment.findMany({
        where: { userId: user.id, appointmentId: { not: null } },
        select: { appointmentId: true },
      });
      appointmentIdsDosPagamentos = pagamentosUsuarioComAgendamento
        .map((p) => p.appointmentId)
        .filter((id): id is number => id != null);
    } catch (e) {
      console.warn("[API /meus-dados] Falha ao buscar payment.appointmentId (pode não existir no banco):", e);
    }
    let todosAppointmentIds = [...new Set([...agendamentosIds, ...appointmentIdsDosPagamentos])];

    let paymentIdsUsuario = pagamentos.map((p) => p.id);
    if (user.email) {
      try {
        const pagamentoTestePorEmail = await prisma.payment.findFirst({
          where: {
            amount: 5,
            type: "agendamento",
            status: "approved",
            user: { email: { equals: user.email.trim(), mode: "insensitive" } },
          },
          select: { id: true },
        });
        if (pagamentoTestePorEmail && !paymentIdsUsuario.includes(pagamentoTestePorEmail.id)) {
          paymentIdsUsuario = [...paymentIdsUsuario, pagamentoTestePorEmail.id];
        }
      } catch (_) {}
    }
    // 1) Buscar cupons associados ao usuário pelo admin (sempre em query separada para não falhar)
    let cuponsPorAssigned: Awaited<ReturnType<typeof prisma.coupon.findMany>> = [];
    try {
      cuponsPorAssigned = await prisma.coupon.findMany({
        where: { assignedUserId: user.id },
        orderBy: { createdAt: "desc" },
      });
      if (cuponsPorAssigned.length > 0) {
        console.log("[meus-dados] Cupons por assignedUserId:", cuponsPorAssigned.length, cuponsPorAssigned.map((c) => c.code));
      }
    } catch (e) {
      console.warn("[meus-dados] Busca por assignedUserId falhou (coluna pode não existir):", e);
    }

    // 2) Buscar cupons por usedBy, plano, agendamento, pagamento
    let todosCupons: Awaited<ReturnType<typeof prisma.coupon.findMany>> = [];
    try {
      todosCupons = await prisma.coupon.findMany({
        where: {
          OR: [
            { usedBy: user.id },
            ...(planosAtivosIds.length > 0 ? [{ userPlanId: { in: planosAtivosIds } }] : []),
            ...(todosAppointmentIds.length > 0 ? [{ appointmentId: { in: todosAppointmentIds } }] : []),
            ...(paymentIdsUsuario.length > 0 ? [{ paymentId: { in: paymentIdsUsuario } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (e) {
      console.warn("[meus-dados] Query principal de cupons falhou:", e);
    }

    // 3) Unir listas sem duplicar por id
    const idsJa = new Set(todosCupons.map((c) => c.id));
    for (const c of cuponsPorAssigned) {
      if (!idsJa.has(c.id)) {
        todosCupons = [...todosCupons, c];
        idsJa.add(c.id);
      }
    }
    todosCupons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    console.log("[meus-dados] Total cupons (após merge):", todosCupons.length, "| userId:", user.id);

    // Integração cupons teste: buscar cupons TESTE_AGEND_* cujo agendamento pertence ao usuário
    let cuponsTeste = await prisma.coupon.findMany({
      where: { code: { startsWith: "TESTE_AGEND_" }, appointmentId: { not: null } },
      select: { id: true, appointmentId: true },
    });
    const idsAgendamentoTeste = [...new Set(cuponsTeste.map((c) => c.appointmentId).filter((id): id is number => id != null))];

    // Auto-vincular: se usuário tem pagamento R$ 5 agendamento mas nenhum cupom TESTE_ apareceu, vincular o agendamento ao usuário agora
    const temCupomTesteNaLista = todosCupons.some((c) => c.code.startsWith("TESTE_AGEND_"));
    if (!temCupomTesteNaLista && idsAgendamentoTeste.length > 0) {
      let pagamentoTeste = await prisma.payment.findFirst({
        where: { userId: user.id, amount: 5, type: "agendamento", status: "approved" },
        orderBy: { createdAt: "desc" },
        select: { id: true, appointmentId: true },
      });
      // Fallback: pagamento pode estar com outro userId; buscar por email do usuário (case-insensitive)
      if (!pagamentoTeste && user.email) {
        try {
          const emailNorm = user.email.trim().toLowerCase();
          const pagamentosPorEmail = await prisma.payment.findMany({
            where: {
              amount: 5,
              type: "agendamento",
              status: "approved",
              user: { email: { equals: emailNorm, mode: "insensitive" } },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, appointmentId: true },
            take: 1,
          });
          if (pagamentosPorEmail[0]) pagamentoTeste = pagamentosPorEmail[0];
        } catch (_) {}
      }
      if (pagamentoTeste) {
        const agendamentoIdParaVincular = pagamentoTeste.appointmentId ?? idsAgendamentoTeste[0];
        try {
          await prisma.appointment.update({
            where: { id: agendamentoIdParaVincular },
            data: { userId: user.id },
          });
          try {
            await prisma.payment.update({
              where: { id: pagamentoTeste.id },
              data: { appointmentId: agendamentoIdParaVincular },
            });
          } catch (_) {}
        } catch (e) {
          console.warn("[meus-dados] Auto-vincular appointment falhou:", e);
        }
      }
    }

    if (idsAgendamentoTeste.length > 0) {
      const agendamentosDoUsuario = await prisma.appointment.findMany({
        where: { id: { in: idsAgendamentoTeste }, userId: user.id },
        select: { id: true },
      });
      const idsQueSaoDoUsuario = new Set(agendamentosDoUsuario.map((a) => a.id));

      // Cupons teste pelo pagamento: incluir quando o pagamento ligado ao appointment for do usuário (por email)
      let idsAppointmentDoUsuarioPorEmail = new Set<number>(idsQueSaoDoUsuario);
      try {
        const pagamentosDosAgendamentosTeste = await prisma.payment.findMany({
          where: {
            appointmentId: { in: idsAgendamentoTeste },
            amount: 5,
            type: "agendamento",
            status: "approved",
          },
          select: { appointmentId: true, user: { select: { email: true } } },
        });
        const emailDoUsuario = user.email?.toLowerCase().trim();
        for (const p of pagamentosDosAgendamentosTeste) {
          if (p.appointmentId != null && emailDoUsuario && p.user?.email?.toLowerCase().trim() === emailDoUsuario) {
            idsAppointmentDoUsuarioPorEmail.add(p.appointmentId);
          }
        }
      } catch (e) {
        console.warn("[meus-dados] Busca pagamentos por appointmentId (cupons teste) falhou:", e);
      }
      // Se o usuário tem algum pagamento de teste (por id ou email), incluir todos os cupons TESTE_ desses appointments
      let temPagamentoTeste = false;
      try {
        const pt = await prisma.payment.findFirst({
          where: { userId: user.id, amount: 5, type: "agendamento", status: "approved" },
          select: { id: true },
        });
        if (pt) temPagamentoTeste = true;
      } catch (_) {}
      if (!temPagamentoTeste && user.email) {
        try {
          const pt2 = await prisma.payment.findFirst({
            where: {
              amount: 5,
              type: "agendamento",
              status: "approved",
              user: { email: { equals: user.email.trim(), mode: "insensitive" } },
            },
            select: { id: true },
          });
          if (pt2) temPagamentoTeste = true;
        } catch (_) {}
      }
      if (temPagamentoTeste) {
        idsAgendamentoTeste.forEach((id) => idsAppointmentDoUsuarioPorEmail.add(id));
      }

      if (idsAppointmentDoUsuarioPorEmail.size > 0) {
        const idsFinais = [...idsAppointmentDoUsuarioPorEmail];
        const cuponsTesteDoUsuario = await prisma.coupon.findMany({
          where: { code: { startsWith: "TESTE_AGEND_" }, appointmentId: { in: idsFinais } },
          orderBy: { createdAt: "desc" },
        });
        const idsJaIncluidos = new Set(todosCupons.map((c) => c.id));
        for (const c of cuponsTesteDoUsuario) {
          if (!idsJaIncluidos.has(c.id)) {
            (todosCupons as any).push(c);
            idsJaIncluidos.add(c.id);
          }
        }
      }
    }

    // Buscar userPlans separadamente para os cupons que têm userPlanId
    const userPlanIds = todosCupons
      .filter(c => c.userPlanId)
      .map(c => c.userPlanId!)
      .filter((id, index, self) => self.indexOf(id) === index); // Remover duplicatas

    const userPlansMap = new Map();
    if (userPlanIds.length > 0) {
      const userPlans = await prisma.userPlan.findMany({
        where: { id: { in: userPlanIds } },
        select: {
          id: true,
          planId: true,
          planName: true,
          endDate: true,
        },
      });
      userPlans.forEach(up => userPlansMap.set(up.id, up));
    }

    // Classificar cupons por status
    const agora = new Date();
    const cupons = todosCupons.map(cupom => {
      let status: "disponivel" | "usado" | "expirado" | "substituido" = "disponivel";
      
      if (cupom.used) {
        status = "usado";
      } else {
        const cancelReason = String((cupom as { cancelReason?: string | null }).cancelReason || "");
        if (cancelReason === "ciclo_mensal_substituido" || cancelReason === "substituido") {
          status = "substituido";
        } else if (cupom.expiresAt && new Date(cupom.expiresAt) < agora) {
          status = "expirado";
        }
        
        // Verificar regra especial: cupons de plano (serviço ou percent) expiram 1 mês após expiração do plano
        if (
          status === "disponivel" &&
          cupom.userPlanId &&
          (cupom.discountType === "service" || cupom.discountType === "percent")
        ) {
          const userPlan = userPlansMap.get(cupom.userPlanId);
          if (userPlan && userPlan.endDate) {
            const umMesAposPlano = new Date(userPlan.endDate);
            umMesAposPlano.setMonth(umMesAposPlano.getMonth() + 1);
            
            if (agora > umMesAposPlano) {
              status = "expirado";
            }
          }
        }
      }

      const userPlan = cupom.userPlanId ? userPlansMap.get(cupom.userPlanId) : null;
      const canonicalCouponType = resolveCanonicalCouponType(cupom);
      const couponCategory = resolveCouponCategoryFromRow({
        ...cupom,
        couponCategory: (cupom as { couponCategory?: string | null }).couponCategory,
      });

      return {
        ...cupom,
        status,
        couponType: cupom.couponType || "plano",
        canonicalCouponType,
        couponCategory,
        discountValue: cupom.discountValue || 0,
        userPlan: userPlan ? {
          id: userPlan.id,
          planId: userPlan.planId,
          planName: userPlan.planName,
          endDate: userPlan.endDate instanceof Date ? userPlan.endDate.toISOString() : userPlan.endDate,
        } : null,
      };
    });

    // Buscar pagamentos associados aos agendamentos (inclui carrinho: payment.appointmentId ou payment.appointmentIds)
    const pagamentosUsuario = await prisma.payment.findMany({
      where: { userId: user.id, type: "agendamento", status: "approved" },
      orderBy: { createdAt: "desc" },
    });
    const refundCouponIds = agendamentos.map((a) => a.refundCouponId).filter(Boolean) as string[];
    const refundCouponsMap = new Map<string, { code: string }>();
    if (refundCouponIds.length > 0) {
      const refundCoupons = await prisma.coupon.findMany({
        where: { id: { in: refundCouponIds } },
        select: { id: true, code: true },
      });
      refundCoupons.forEach((c) => refundCouponsMap.set(c.id, { code: c.code }));
    }
    // Cupons de plano vinculados a agendamentos (para saber se o agendamento foi feito com cupom do plano)
    const cuponsPlanoPorAgendamento = await prisma.coupon.findMany({
      where: {
        appointmentId: { in: agendamentosIds.length > 0 ? agendamentosIds : [-1] },
        userPlanId: { not: null },
      },
      select: { appointmentId: true },
    });
    const agendamentosIdsComCupomPlano = new Set(
      cuponsPlanoPorAgendamento.map((c) => c.appointmentId).filter((id): id is number => id != null)
    );
    const agendamentosComPagamento = agendamentos.map((agendamento) => {
      let pagamento = pagamentosUsuario.find((p) => p.appointmentId === agendamento.id);
      if (!pagamento && agendamento.id != null) {
        pagamento = pagamentosUsuario.find((p) => {
          if (p.appointmentIds == null) return false;
          const ids = Array.isArray(p.appointmentIds) ? p.appointmentIds : (typeof p.appointmentIds === "string" ? JSON.parse(p.appointmentIds) : []);
          return Array.isArray(ids) && ids.includes(agendamento.id);
        }) ?? undefined;
      }
      const cancelCouponCode = agendamento.refundCouponId ? refundCouponsMap.get(agendamento.refundCouponId)?.code : null;
      // Cupom de plano: cupom ainda vinculado OU cancelado sem pagamento (cupom foi liberado ao cancelar)
      const foiComCupomPlano =
        agendamentosIdsComCupomPlano.has(agendamento.id) ||
        ((agendamento.status === "cancelado" || agendamento.status === "recusado") && !pagamento);
      return {
        ...agendamento,
        pagamento: pagamento ? {
          id: pagamento.id,
          amount: pagamento.amount,
          status: pagamento.status,
          paymentMethod: pagamento.paymentMethod,
          createdAt: pagamento.createdAt,
        } : null,
        cancelCouponCode: cancelCouponCode ?? undefined,
        foiComCupomPlano: !!foiComCupomPlano,
      };
    });

    // Buscar perguntas do FAQ do usuário
    // Buscar por userId OU userEmail (pode ter sido enviado sem estar logado ou com email diferente)
    // IMPORTANTE: Normalizar email para garantir correspondência (case-insensitive)
    // Incluir perguntas bloqueadas (recusadas) também para que o usuário veja o status
    const faqQuestions = await prisma.userQuestion.findMany({
      where: {
        OR: [
          { userId: user.id },
          { userEmail: user.email },
          { userEmail: userEmailNormalizado }, // Buscar também por email normalizado
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        question: true,
        answer: true,
        status: true,
        blocked: true,
        blockedReason: true,
        answeredAt: true,
        readAt: true, // Incluir readAt no select
        userId: true,
        userEmail: true,
        published: true,
        createdAt: true,
        faq: {
          select: {
            id: true,
            question: true,
          },
        },
      },
    });

    console.log(`[API /meus-dados] Perguntas FAQ encontradas para userId=${user.id}, email=${user.email}, emailNormalizado=${userEmailNormalizado}: ${faqQuestions.length}`);
    
    // Log detalhado das perguntas encontradas
    if (faqQuestions.length > 0) {
      console.log(`[API /meus-dados] Perguntas encontradas:`, faqQuestions.map(p => ({
        id: p.id,
        question: p.question.substring(0, 50),
        userId: p.userId,
        userEmail: p.userEmail,
        status: p.status,
      })));
    } else {
      // Se não encontrou, buscar todas as perguntas recentes para debug
      console.log(`[API /meus-dados] Nenhuma pergunta encontrada, buscando últimas 20 para debug...`);
      
      const todasPerguntas = await prisma.userQuestion.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          userEmail: true,
          userName: true,
          question: true,
          status: true,
          createdAt: true,
        },
      });
      
      console.log(`[API /meus-dados] DEBUG - Últimas 20 perguntas no sistema:`, todasPerguntas.map(p => ({
        id: p.id,
        userId: p.userId,
        userEmail: p.userEmail,
        userName: p.userName,
        status: p.status,
        createdAt: p.createdAt,
      })));
      console.log(`[API /meus-dados] DEBUG - Buscando por userId=${user.id}, userEmail=${user.email}`);
    }

    // Verificar quais planos têm pagamento com Asaas (podem solicitar reembolso) — janela 48h como na API de reembolso (inclui plano teste)
    const planosComPagamentoAsaas = await prisma.payment.findMany({
      where: {
        userId: user.id,
        type: "plano",
        status: "approved",
        asaasId: { not: null },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const janelaMs = 48 * 60 * 60 * 1000;
    const planosIdsComReembolsoDisponivel = new Set<string>();
    for (const plano of planos) {
      const planCreated = new Date(plano.createdAt).getTime();
      const temPayment = planosComPagamentoAsaas.some((p) => {
        const payCreated = new Date(p.createdAt).getTime();
        return Math.abs(payCreated - planCreated) <= janelaMs;
      });
      if (temPayment) planosIdsComReembolsoDisponivel.add(plano.id);
    }

    // Serializar planos e buscar readAt
    const planosFormatados = await Promise.all(
      planos.map(async (plano) => {
        // Buscar readAt usando query raw adaptada para PostgreSQL
        let readAt: string | null = null;
        try {
          const provider = getDatabaseProvider();
          if (provider === 'postgresql') {
            const readData = await prisma.$queryRawUnsafe<Array<{ readAt: Date | null }>>(
              `SELECT "readAt" FROM "UserPlan" WHERE id = $1`,
              plano.id
            );
            readAt = readData[0]?.readAt ? new Date(readData[0].readAt).toISOString() : null;
          } else {
            const readData = await prisma.$queryRawUnsafe<Array<{ readAt: string | null }>>(
              `SELECT readAt FROM UserPlan WHERE id = ?`,
              plano.id
            );
            readAt = readData[0]?.readAt || null;
          }
        } catch (e: any) {
          if (!e.message?.includes("no such column") && !e.message?.includes("does not exist")) {
            console.error(`[API /meus-dados] Erro ao buscar readAt para plano ${plano.id}:`, e.message);
          }
        }
        
        // Serializar datas para evitar erros de JSON
        return {
          ...plano,
          startDate: plano.startDate instanceof Date ? plano.startDate.toISOString() : plano.startDate,
          endDate: plano.endDate instanceof Date ? plano.endDate.toISOString() : plano.endDate,
          createdAt: plano.createdAt instanceof Date ? plano.createdAt.toISOString() : plano.createdAt,
          ativo: plano.status === "active" && (!plano.endDate || new Date(plano.endDate) > new Date()),
          expiraEm: plano.endDate instanceof Date ? plano.endDate.toISOString() : plano.endDate,
          readAt: readAt,
          refundProcessedAt: (() => {
            const r = (plano as { refundProcessedAt?: Date | null }).refundProcessedAt;
            return r instanceof Date ? r.toISOString() : r ?? null;
          })(),
          podeSolicitarReembolso: planosIdsComReembolsoDisponivel.has(plano.id),
        };
      })
    );

    console.log("[API /meus-dados] Retornando:", {
      userId: user.id,
      totalPlanos: planos.length,
      planosFormatados: planosFormatados.map(p => ({
        id: p.id,
        planId: p.planId,
        status: p.status,
        ativo: p.ativo,
      })),
    });

    const entregasPorAgendamento = new Map<
      number,
      {
        id: string;
        tipo: string;
        description: string | null;
        deliveryAudioUrl: string;
        deliveryAudioFormat: string | null;
        deliveredAt: string | null;
        status: string;
      }[]
    >();
    const serviceStatusesPorAgendamento = new Map<number, string[]>();
    const serviceOrderPorAgendamento = new Map<
      number,
      { id: string; serviceType: string; phase: string; paymentId: string | null }
    >();
    try {
      const aptIds = agendamentosComPagamento.map((a) => a.id);
      if (aptIds.length > 0) {
        const orders = await prisma.serviceOrder.findMany({
          where: { appointmentId: { in: aptIds } },
          select: {
            id: true,
            appointmentId: true,
            serviceType: true,
            phase: true,
            paymentId: true,
            sequenceIndex: true,
          },
          orderBy: { sequenceIndex: "asc" },
        });
        for (const o of orders) {
          if (o.appointmentId == null) continue;
          if (!serviceOrderPorAgendamento.has(o.appointmentId)) {
            serviceOrderPorAgendamento.set(o.appointmentId, {
              id: o.id,
              serviceType: o.serviceType,
              phase: o.phase,
              paymentId: o.paymentId,
            });
          }
        }

        const allServices = await prisma.service.findMany({
          where: {
            appointmentId: { in: aptIds },
          },
          select: {
            id: true,
            appointmentId: true,
            status: true,
            tipo: true,
            description: true,
            deliveryAudioUrl: true,
            deliveryAudioFormat: true,
            updatedAt: true,
          },
        });
        for (const s of allServices) {
          if (s.appointmentId == null) continue;
          const statuses = serviceStatusesPorAgendamento.get(s.appointmentId) || [];
          statuses.push(s.status);
          serviceStatusesPorAgendamento.set(s.appointmentId, statuses);

          if (s.status === "concluido" && s.deliveryAudioUrl) {
            const row = {
              id: s.id,
              tipo: s.tipo,
              description: s.description,
              // GO-H11A: nunca expor URL bruta de Blob/local ao cliente
              deliveryAudioUrl: `/api/entregas/${s.id}`,
              deliveryAudioFormat: s.deliveryAudioFormat,
              deliveredAt: s.updatedAt ? s.updatedAt.toISOString() : null,
              status: s.status,
            };
            const list = entregasPorAgendamento.get(s.appointmentId) || [];
            list.push(row);
            entregasPorAgendamento.set(s.appointmentId, list);
          }
        }
      }
    } catch (e) {
      console.warn("[meus-dados] Busca de Services/SO (domínio) falhou:", e);
    }

    // Serializar agendamentos e buscar readAt usando query raw adaptada para PostgreSQL
    const agendamentosSerializados = await Promise.all(
      agendamentosComPagamento.map(async (a) => {
        // Buscar readAt usando query raw adaptada para PostgreSQL
        let readAt: string | null = null;
        try {
          const provider = getDatabaseProvider();
          if (provider === 'postgresql') {
            const readData = await prisma.$queryRawUnsafe<Array<{ readAt: Date | null }>>(
              `SELECT "readAt" FROM "Appointment" WHERE id = $1`,
              a.id
            );
            readAt = readData[0]?.readAt ? new Date(readData[0].readAt).toISOString() : null;
          } else {
            const readData = await prisma.$queryRawUnsafe<Array<{ readAt: string | null }>>(
              `SELECT readAt FROM Appointment WHERE id = ?`,
              a.id
            );
            readAt = readData[0]?.readAt || null;
          }
        } catch (e: any) {
          // Se a coluna não existir, readAt será null
          if (!e.message?.includes("no such column") && !e.message?.includes("does not exist")) {
            console.error(`[API /meus-dados] Erro ao buscar readAt para agendamento ${a.id}:`, e.message);
          }
        }

        const serviceStatuses = serviceStatusesPorAgendamento.get(a.id) || [];
        const derived = deriveAppointmentStatusFromServiceStatuses(a.status, serviceStatuses);
        const operationalStatus = derived || a.status;
        const so = serviceOrderPorAgendamento.get(a.id) || null;

        return {
          ...a,
          status: operationalStatus,
          adminStatus: a.status,
          operationalStatus,
          serviceStatuses,
          serviceOrderType: so?.serviceType ?? a.tipo ?? null,
          serviceOrderPhase: so?.phase ?? null,
          serviceOrderLabel: serviceOrderLabel(so?.serviceType ?? a.tipo),
          rootPaymentId: so?.paymentId ?? a.pagamento?.id ?? null,
          data: a.data instanceof Date ? a.data.toISOString() : a.data,
          createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
          readAt: readAt,
          entregas: entregasPorAgendamento.get(a.id) ?? [],
          pagamento: a.pagamento ? {
            ...a.pagamento,
            createdAt: a.pagamento.createdAt instanceof Date ? a.pagamento.createdAt.toISOString() : a.pagamento.createdAt,
          } : null,
        };
      })
    );

    const pagamentosSerializados = pagamentos.map(p => ({
      ...p,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    }));

    const cuponsSerializados = cupons.map(c => ({
      ...c,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      expiresAt: c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt,
      usedAt: c.usedAt instanceof Date ? c.usedAt.toISOString() : c.usedAt,
    }));

    // Serializar perguntas FAQ e buscar readAt usando query raw adaptada para PostgreSQL
    const faqSerializados = await Promise.all(
      faqQuestions.map(async (f) => {
        // Buscar readAt usando query raw adaptada para PostgreSQL
        let readAt: string | null = null;
        try {
          const provider = getDatabaseProvider();
          if (provider === 'postgresql') {
            const readData = await prisma.$queryRawUnsafe<Array<{ readAt: Date | null }>>(
              `SELECT "readAt" FROM "UserQuestion" WHERE id = $1`,
              f.id
            );
            readAt = readData[0]?.readAt ? new Date(readData[0].readAt).toISOString() : null;
          } else {
            const readData = await prisma.$queryRawUnsafe<Array<{ readAt: string | null }>>(
              `SELECT readAt FROM UserQuestion WHERE id = ?`,
              f.id
            );
            readAt = readData[0]?.readAt || null;
          }
        } catch (e: any) {
          // Se a coluna não existir, readAt será null
          if (!e.message?.includes("no such column") && !e.message?.includes("does not exist")) {
            console.error(`[API /meus-dados] Erro ao buscar readAt para pergunta ${f.id}:`, e.message);
          }
        }
        
        return {
          id: f.id,
          question: f.question,
          answer: f.answer,
          status: f.blocked ? "recusada" : f.status, // Se bloqueada, status é "recusada"
          blocked: f.blocked, // Incluir campo blocked para referência
          blockedReason: f.blockedReason || null, // Motivo da recusa
          published: f.published,
          answeredAt: f.answeredAt instanceof Date ? f.answeredAt.toISOString() : f.answeredAt,
          readAt: readAt,
          createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
          faq: f.faq,
        };
      })
    );

    console.log(`[API /meus-dados] Retornando ${faqSerializados.length} pergunta(s) FAQ serializada(s)`);

    const hasPromotionAccess = await userHasPromotionAccess(user.id);

    return NextResponse.json({
      agendamentos: agendamentosSerializados,
      pagamentos: pagamentosSerializados,
      planos: planosFormatados,
      cupons: cuponsSerializados,
      faqQuestions: faqSerializados,
      hasPromotionAccess,
    });
  } catch (err: any) {
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("[API] Erro ao buscar dados do usuário:", err);
    console.error("[API] Stack trace:", err.stack);
    console.error("[API] Detalhes do erro:", {
      message: err.message,
      name: err.name,
      cause: err.cause,
    });
    return NextResponse.json({ 
      error: "Erro ao buscar dados",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    }, { status: 500 });
  }
}
