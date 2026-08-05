import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import {
  normalizeServiceTypeId,
  priceCheckoutItems,
  totalPricedCheckoutItems,
  type PricedCheckoutItem,
} from "@/app/lib/service-catalog";
import { agendamentoBloqueiaReusoCupom } from "@/app/lib/coupon-booking-rules";
import { normalizeStaleCouponAppointmentLink } from "@/app/lib/coupon-stale-appointment";
import { reconcileAppointmentWithServices } from "@/app/lib/appointment-service-sync";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { parseStudioDateTime } from "@/app/lib/calendar-day-state";

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

    let { data, hora, duracaoMinutos, tipo, observacoes, servicos, beats, cupomCode } = validation.data;

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
    const totalServicos = totalPricedCheckoutItems(pricedServices);
    const totalBeats = totalPricedCheckoutItems(pricedBeats);
    const total = totalServicos + totalBeats;
    
    console.log("[API Agendamento com Cupom] Dados recebidos:", {
      data,
      hora,
      servicos: servicos?.length || 0,
      beats: beats?.length || 0,
      total,
      cupomCode,
    });

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
        mode: "service-redemption",
        selectedServiceIds: [...(servicos || []), ...(beats || [])].flatMap((item) =>
          Array.from({ length: item.quantidade }, () => item.id)
        ),
        allowTest: canUseSymbolicSimulation(user),
      }
    );
    if (!couponValidation.ok) {
      return NextResponse.json({ error: couponValidation.error }, { status: 400 });
    }

    if (couponRow.used) {
      return NextResponse.json(
        { error: "Este cupom já foi utilizado e não pode ser usado novamente." },
        { status: 400 }
      );
    }

    if (couponRow.appointmentId) {
      const agendamentoAssociado = await prisma.appointment.findUnique({
        where: { id: couponRow.appointmentId },
        select: { id: true, status: true },
      });
      if (agendamentoAssociado && agendamentoBloqueiaReusoCupom(agendamentoAssociado.status)) {
        return NextResponse.json(
          {
            error:
              "Este cupom já está vinculado a um agendamento em andamento. Aguarde o desfecho ou use outro cupom.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error:
            "Este cupom ainda está reservado a outro agendamento. Atualize a página ou contate o suporte.",
        },
        { status: 409 }
      );
    }

    // Verificar se expirou
    const agora = new Date();
    if (couponRow.expiresAt && new Date(couponRow.expiresAt) < agora) {
      return NextResponse.json(
        { error: "Este cupom expirou" },
        { status: 400 }
      );
    }

    // Verificar regra especial: cupons de plano expiram 1 mês após expiração do plano
    if (couponRow.userPlanId && couponRow.discountType === "service") {
      const userPlan = await prisma.userPlan.findUnique({
        where: { id: couponRow.userPlanId },
      });

      if (userPlan && userPlan.endDate) {
        const umMesAposPlano = new Date(userPlan.endDate);
        umMesAposPlano.setMonth(umMesAposPlano.getMonth() + 1);
        
        if (agora > umMesAposPlano) {
          return NextResponse.json(
            { error: "Este cupom expirou. Cupons de plano são válidos até 1 mês após a expiração do plano." },
            { status: 400 }
          );
        }
      }
    }

    // Verificar valor mínimo
    if (couponRow.minValue && total < couponRow.minValue) {
      return NextResponse.json(
        { error: `Valor mínimo para usar este cupom é R$ ${couponRow.minValue.toFixed(2).replace(".", ",")}` },
        { status: 400 }
      );
    }

    // Cupom 10% serviços: NÃO permite uso em beats
    if (couponRow.serviceType === "percent_servicos" && totalBeats > 0) {
      return NextResponse.json(
        { error: "Este cupom de 10% é válido apenas para serviços avulsos. Não pode ser usado em beats." },
        { status: 400 }
      );
    }

    // Cupom 10% beats: NÃO permite uso em outros serviços
    if (couponRow.serviceType === "percent_beats" && totalServicos > 0) {
      return NextResponse.json(
        { error: "Este cupom de 10% é válido apenas para beats. Não pode ser usado em serviços avulsos." },
        { status: 400 }
      );
    }

    // Calcular desconto
    let discount = 0;
    let finalTotal = total;
    
    if (couponRow.discountType === "service") {
      // Cupom de serviço - zera o valor
      discount = total;
      finalTotal = 0;
    } else if (couponRow.discountType === "percent") {
      discount = (total * couponRow.discountValue) / 100;
      if (couponRow.maxDiscount && discount > couponRow.maxDiscount) {
        discount = couponRow.maxDiscount;
      }
      finalTotal = total - discount;
    } else {
      // Fixed discount
      if (couponRow.couponType === "reembolso") {
        if (couponRow.discountValue >= total) {
          discount = total;
          finalTotal = 0;
        } else {
          discount = couponRow.discountValue;
          finalTotal = total - discount;
        }
      } else {
        discount = couponRow.discountValue;
        finalTotal = total - discount;
      }
    }

    console.log("[API Agendamento com Cupom] Cupom validado:", {
      code: couponRow.code,
      discountType: couponRow.discountType,
      serviceType: couponRow.serviceType,
      discount,
      finalTotal,
    });

    // Cupom de serviço: vínculo exclusivo validado em validateCouponAndGetTotal (service-redemption).
    // Removido mapa frouxo sessao↔captacao — OP-02A: cupom não troca de serviço.

    // Criar data/hora do agendamento
    const dataHoraISO = parseStudioDateTime(data, hora);
    const duracao = duracaoMinutos || 60;

    let appointment!: {
      id: number;
      data: Date;
      tipo: string;
      duracaoMinutos: number;
      observacoes: string | null;
      status: string;
    };
    let boundServiceId: string | null = null;

    try {
      await prisma.$transaction(
        async (tx) => {
          const conflito = await tx.appointment.findFirst({
            where: {
              ...appointmentCalendarOccupancyFilter,
              AND: [
                { data: { lt: new Date(dataHoraISO.getTime() + duracao * 60000) } },
                { data: { gte: new Date(dataHoraISO.getTime() - duracao * 60000) } },
              ],
            },
            select: { id: true },
          });
          // Conflito de estúdio só para Sessão/Captação; pendente não reserva (GO-H4.3).
          const tipoNorm = normalizeServiceTypeId(
            String(tipo || couponRow.serviceType || "sessao")
          );
          const isPresencial =
            tipoNorm === "sessao" || tipoNorm === "captacao";
          if (isPresencial && conflito) {
            const err = new Error("SLOT_CONFLICT");
            (err as { code?: string }).code = "SLOT_CONFLICT";
            throw err;
          }

          const apt = await tx.appointment.create({
            data: {
              userId: user.id,
              data: dataHoraISO,
              duracaoMinutos: duracao,
              tipo: tipo || "sessao",
              observacoes: observacoes || null,
              status: "pendente",
            },
          });

          // GO-H8: garantir originAppointmentId antes de sobrescrever appointmentId no resgate
          const originId =
            couponRow.originAppointmentId ??
            (couponRow.appointmentId && couponRow.appointmentId !== apt.id
              ? couponRow.appointmentId
              : null);

          const claimed = await tx.coupon.updateMany({
            where: {
              id: couponRow.id,
              used: false,
            },
            data: {
              appointmentId: apt.id,
              ...(originId ? { originAppointmentId: originId } : {}),
              // Consumo imediato — não esperar Aceitar do admin
              used: true,
              usedAt: new Date(),
              usedBy: user.id,
            },
          });

          if (claimed.count !== 1) {
            const err = new Error("COUPON_CLAIM_CONFLICT");
            (err as { code?: string }).code = "COUPON_CLAIM_CONFLICT";
            throw err;
          }

          // Vincular ServiceOrder ao novo appointment (mesmo Pedido Raiz)
          await tx.serviceOrder.updateMany({
            where: { couponId: couponRow.id },
            data: { appointmentId: apt.id, phase: "solicitation" },
          });

          appointment = {
            id: apt.id,
            data: apt.data,
            tipo: apt.tipo,
            duracaoMinutos: apt.duracaoMinutos,
            observacoes: apt.observacoes,
            status: apt.status,
          };

          if (Array.isArray(servicos) && servicos.length > 0) {
            for (const svc of servicos) {
              const tipoSvc = normalizeServiceTypeId(String(svc.id || svc.nome || "sessao"));
              const desc =
                [svc.nome, svc.quantidade > 1 ? `Qtd: ${svc.quantidade}` : null].filter(Boolean).join(" — ") ||
                tipoSvc;
              for (let q = 0; q < (svc.quantidade || 1); q++) {
                const created = await tx.service.create({
                  data: {
                    userId: user.id,
                    appointmentId: apt.id,
                    tipo: tipoSvc,
                    description: desc,
                    status: "pendente",
                  },
                });
                if (!boundServiceId) boundServiceId = created.id;
              }
            }
          }

          if (Array.isArray(beats) && beats.length > 0) {
            for (const b of beats) {
              const tipoB = normalizeServiceTypeId(String(b.id || b.nome || "beat1"));
              const descB =
                [b.nome, b.quantidade > 1 ? `Qtd: ${b.quantidade}` : null].filter(Boolean).join(" — ") || tipoB;
              for (let q = 0; q < (b.quantidade || 1); q++) {
                const created = await tx.service.create({
                  data: {
                    userId: user.id,
                    appointmentId: apt.id,
                    tipo: tipoB,
                    description: descB,
                    status: "pendente",
                  },
                });
                if (!boundServiceId) boundServiceId = created.id;
              }
            }
          }

          if (boundServiceId) {
            await tx.coupon.updateMany({
              where: { id: couponRow.id, serviceId: null },
              data: { serviceId: boundServiceId },
            });
          }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 20000,
        }
      );
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      const msg = (e as Error)?.message;
      if (code === "SLOT_CONFLICT" || msg === "SLOT_CONFLICT") {
        return NextResponse.json({ error: "Já existe um agendamento neste horário." }, { status: 409 });
      }
      if (code === "COUPON_CLAIM_CONFLICT" || msg === "COUPON_CLAIM_CONFLICT") {
        return NextResponse.json(
          {
            error:
              "Não foi possível reservar este cupom (pode ter sido usado por outra requisição). Atualize e tente novamente.",
          },
          { status: 409 }
        );
      }
      if (code === "P2034") {
        return NextResponse.json(
          { error: "Concorrência ao gravar o agendamento. Tente novamente." },
          { status: 409 }
        );
      }
      throw e;
    }

    await reconcileAppointmentWithServices(appointment.id);
    console.log("[API Agendamento com Cupom] Agendamento e vínculo criados:", appointment.id);

    try {
      const { emitAppointmentReserved } = await import("@/app/lib/synchronization/lifecycle");
      const { publishSyncEvent } = await import("@/app/lib/synchronization/engine");
      await emitAppointmentReserved({
        appointmentId: appointment.id,
        userId: user.id,
        dataIso: new Date(appointment.data).toISOString(),
        duracaoMinutos: appointment.duracaoMinutos || 60,
      });
      if (couponRow?.id) {
        await publishSyncEvent({
          name: "CouponConsumed",
          entity: "coupon",
          entityId: couponRow.id,
          to: "utilizado",
          options: {
            source: "lifecycle",
            userId: user.id,
            metadata: { appointmentId: appointment.id, via: "com-cupom" },
          },
        });
      }
    } catch (syncErr) {
      console.error("[API Agendamento com Cupom] sync falhou (non-fatal):", syncErr);
    }

    // Enviar email de notificação para o admin
    try {
      const { sendPaymentNotificationToTHouse } = await import("@/app/lib/sendEmail");
      await sendPaymentNotificationToTHouse(
        user.email,
        user.nomeArtistico,
        user.telefone || "",
        appointment.data,
        appointment.tipo,
        appointment.duracaoMinutos,
        appointment.observacoes || "",
        0, // Total = 0 porque foi pago com cupom
        "cupom", // Método de pagamento
        servicos || [],
        beats || []
      );
      console.log(`[API] Email de notificação enviado para admin sobre agendamento com cupom`);
    } catch (emailError: any) {
      console.error("[API] Erro ao enviar email (não crítico):", emailError);
    }

    console.log(`[API] Agendamento criado com cupom ${cupomCode}: ${appointment.id} (status: pendente)`);

    try {
      const { linkServiceOrderCouponToAppointment } = await import(
        "@/app/lib/service-orders/persist"
      );
      await linkServiceOrderCouponToAppointment({
        couponId: couponRow.id,
        appointmentId: appointment.id,
      });
    } catch (e) {
      console.error("[API] link ServiceOrder←cupom falhou (non-fatal):", e);
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        data: appointment.data,
        status: appointment.status,
      },
      message: "Agendamento criado com sucesso usando cupom! Aguarde a confirmação do admin. Você receberá um email quando o agendamento for confirmado.",
    });
  } catch (err: any) {
    console.error("[API] Erro ao criar agendamento com cupom:", err);
    console.error("[API] Stack trace:", err.stack);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { 
        error: err.message || "Erro ao criar agendamento",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
