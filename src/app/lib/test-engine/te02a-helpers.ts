/**
 * TE-02A — helpers oficiais (metadata, cleanup, redeem coupon) no pipeline adapter.
 */
import { prisma } from "@/app/lib/prisma";
import { SYMBOLIC_AGENDAMENTO_BRL, SYMBOLIC_PLANO_BRL } from "@/app/lib/symbolic-payment";
import { normalizeServiceTypeId } from "@/app/lib/service-catalog";
import { agendamentoBloqueiaReusoCupom } from "@/app/lib/coupon-booking-rules";
import { normalizeStaleCouponAppointmentLink } from "@/app/lib/coupon-stale-appointment";
import { reconcileAppointmentWithServices } from "@/app/lib/appointment-service-sync";
import { Prisma } from "@prisma/client";

export const TE_META = {
  source: "TEST_ENGINE",
  createdBy: "TEST_ENGINE",
} as const;

export function teScenarioMeta(scenario: string, runId: string) {
  return {
    ...TE_META,
    scenario,
    runId,
    teEngine: true,
    isTestPayment: true,
  };
}

export type CarrinhoItemInput = {
  data: string;
  hora: string;
  tipo: string;
  servicos: { id: string; nome: string; quantidade: number }[];
  beats?: { id: string; nome: string; quantidade: number }[];
  duracaoMinutos?: number;
};

/** PaymentMetadata oficial estilo checkout-carrinho. */
export async function writeCarrinhoPaymentMetadata(input: {
  userId: string;
  items: CarrinhoItemInput[];
  total?: number;
  scenario: string;
  runId: string;
}): Promise<{ metadataId: string; asaasId: string }> {
  const asaasId = `pay_te_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const metadataCompleto: Record<string, unknown> = {
    tipo: "carrinho",
    userId: input.userId,
    items: JSON.stringify(
      input.items.map((it) => ({
        data: it.data,
        hora: it.hora,
        duracaoMinutos: it.duracaoMinutos ?? 60,
        tipo: it.tipo,
        servicos: it.servicos,
        beats: it.beats || [],
        total: 40,
        observacoes: `TE ${input.scenario}`,
      }))
    ),
    total: String(input.total ?? SYMBOLIC_AGENDAMENTO_BRL * input.items.length),
    chargedAmount: String(SYMBOLIC_AGENDAMENTO_BRL),
    paymentMethod: "pix",
    symbolicAgendamento: true,
    ...teScenarioMeta(input.scenario, input.runId),
  };

  const row = await prisma.paymentMetadata.create({
    data: {
      userId: input.userId,
      metadata: JSON.stringify(metadataCompleto),
      asaasId,
      expiresAt,
    },
    select: { id: true, asaasId: true },
  });
  return { metadataId: row.id, asaasId: row.asaasId! };
}

/** PaymentMetadata oficial estilo checkout de plano. */
export async function writePlanoPaymentMetadata(input: {
  userId: string;
  planId: "bronze" | "prata" | "ouro" | "teste";
  planName: string;
  modo?: string;
  scenario: string;
  runId: string;
  amount?: number;
}): Promise<{ metadataId: string; asaasId: string }> {
  const asaasId = `pay_te_plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const metadataCompleto: Record<string, unknown> = {
    tipo: "plano",
    userId: input.userId,
    planId: input.planId,
    planName: input.planName,
    modo: input.modo || "mensal",
    amount: input.amount ?? SYMBOLIC_PLANO_BRL,
    paymentMethod: "pix",
    isTest: true,
    ...teScenarioMeta(input.scenario, input.runId),
  };
  const row = await prisma.paymentMetadata.create({
    data: {
      userId: input.userId,
      metadata: JSON.stringify(metadataCompleto),
      asaasId,
      expiresAt,
    },
    select: { id: true, asaasId: true },
  });
  return { metadataId: row.id, asaasId: row.asaasId! };
}

/**
 * Redeem oficial de cupom de serviço (mesma regra de /api/agendamentos/com-cupom),
 * invocável pelo Test Engine sem sessão HTTP.
 */
export async function redeemServiceCouponOfficial(input: {
  userId: string;
  cupomCode: string;
  data: string;
  hora: string;
  servicos: { id: string; nome: string; quantidade: number; preco: number }[];
  beats?: { id: string; nome: string; quantidade: number; preco: number }[];
  tipo?: string;
}): Promise<{ appointmentId: number; serviceIds: string[] }> {
  const code = input.cupomCode.toUpperCase();
  let couponRow = await prisma.coupon.findUnique({ where: { code } });
  if (!couponRow) throw new Error(`Cupom ${code} inexistente`);
  await normalizeStaleCouponAppointmentLink(couponRow.id);
  couponRow = (await prisma.coupon.findUnique({ where: { code } }))!;
  if (couponRow.used) throw new Error("Cupom já utilizado");
  if (couponRow.appointmentId) {
    const apt = await prisma.appointment.findUnique({
      where: { id: couponRow.appointmentId },
      select: { status: true },
    });
    if (apt && agendamentoBloqueiaReusoCupom(apt.status)) {
      throw new Error("Cupom vinculado a agendamento em andamento");
    }
  }

  const dataHoraISO = new Date(`${input.data}T${input.hora}:00`);
  const duracao = 60;
  const tipo = input.tipo || input.servicos[0]?.id || "sessao";
  let appointmentId = 0;
  const serviceIds: string[] = [];

  await prisma.$transaction(
    async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          userId: input.userId,
          data: dataHoraISO,
          duracaoMinutos: duracao,
          tipo,
          observacoes: "TE-02A com-cupom",
          status: "pendente",
        },
      });
      appointmentId = appointment.id;

      for (const s of input.servicos) {
        const qty = Math.max(1, s.quantidade || 1);
        for (let i = 0; i < qty; i++) {
          const svc = await tx.service.create({
            data: {
              userId: input.userId,
              appointmentId: appointment.id,
              tipo: normalizeServiceTypeId(s.id || s.nome),
              description: s.nome,
              status: "pendente",
            },
          });
          serviceIds.push(svc.id);
        }
      }

      await tx.coupon.update({
        where: { id: couponRow!.id },
        data: {
          appointmentId: appointment.id,
          used: false,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 }
  );

  await reconcileAppointmentWithServices(appointmentId);
  return { appointmentId, serviceIds };
}

/** Cleanup seguro: só apaga artefatos do user de teste TE (email @homolog.test). */
export async function cleanupTeUserArtifacts(userId: string): Promise<{
  deleted: Record<string, number>;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) return { deleted: {} };
  if (user.role === "ADMIN") throw new Error("Cleanup recusou ADMIN");
  if (!/@homolog\.test$/i.test(user.email)) {
    throw new Error(`Cleanup recusou email não-homolog: ${user.email}`);
  }

  const deleted: Record<string, number> = {};

  const apts = await prisma.appointment.findMany({
    where: { userId },
    select: { id: true },
  });
  const aptIds = apts.map((a) => a.id);

  const plans = await prisma.userPlan.findMany({
    where: { userId },
    select: { id: true },
  });
  const planIds = plans.map((p) => p.id);

  const payments = await prisma.payment.findMany({
    where: { userId },
    select: { id: true, asaasId: true },
  });
  const paymentIds = payments.map((p) => p.id);
  const serviceRows = await prisma.service.findMany({
    where: { userId },
    select: { id: true },
  });
  const serviceIds = serviceRows.map((service) => service.id);

  deleted.synchronizationEvents = (
    await prisma.synchronizationEvent.deleteMany({ where: { userId } })
  ).count;
  deleted.transitionHistory = (
    await prisma.domainTransitionHistory.deleteMany({
      where: {
        OR: [
          {
            entity: "appointment",
            entityId: { in: aptIds.map(String) },
          },
          {
            entity: "payment",
            entityId: { in: paymentIds },
          },
          {
            entity: "service",
            entityId: { in: serviceIds },
          },
        ],
      },
    })
  ).count;
  deleted.services = (
    await prisma.service.deleteMany({ where: { userId } })
  ).count;
  deleted.appointments = (
    await prisma.appointment.deleteMany({ where: { userId } })
  ).count;
  deleted.coupons = (
    await prisma.coupon.deleteMany({
      where: {
        OR: [
          { assignedUserId: userId },
          { usedBy: userId },
          { paymentId: { in: paymentIds.length ? paymentIds : ["__none__"] } },
          { userPlanId: { in: planIds.length ? planIds : ["__none__"] } },
          { appointmentId: { in: aptIds.length ? aptIds : [-1] } },
        ],
      },
    })
  ).count;
  deleted.subscriptions = (
    await prisma.subscription.deleteMany({ where: { userId } })
  ).count;
  deleted.userPlans = (
    await prisma.userPlan.deleteMany({ where: { userId } })
  ).count;
  deleted.payments = (
    await prisma.payment.deleteMany({ where: { userId } })
  ).count;
  deleted.paymentMetadata = (
    await prisma.paymentMetadata.deleteMany({ where: { userId } })
  ).count;
  deleted.users = (await prisma.user.deleteMany({ where: { id: userId } })).count;

  return { deleted };
}

export function futureSlots(count: number, startHour = 10): { data: string; hora: string }[] {
  const out: { data: string; hora: string }[] = [];
  const base = new Date();
  base.setDate(base.getDate() + 28);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    d.setHours(startHour + (i % 6), 0, 0, 0);
    out.push({
      data: d.toISOString().slice(0, 10),
      hora: `${String(startHour + (i % 6)).padStart(2, "0")}:00`,
    });
  }
  return out;
}
