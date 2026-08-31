/**
 * GO-H7 — Pedido de Homologação.
 * Gatilho fino: mesmo checkout + processPaymentWebhook do Asaas.
 * Única diferença: confirmação interna (provider HOMOLOGATION).
 * Sem Asaas, sem PIX, sem cartão. Sem isTestPayment / symbolicAgendamento.
 */
import { prisma } from "@/app/lib/prisma";
import { calculateServerCheckout } from "@/app/lib/checkout-calculation";
import { processPaymentWebhook } from "@/app/lib/process-payment-webhook";
import {
  newHomologationPaymentId,
  paymentByProviderIdWhere,
} from "@/app/lib/payment-provider/identity";
import {
  exigeAgendamentoHora,
  exigeAgendamentoNoCheckout,
  exigeAgendamentoSomenteData,
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
} from "@/app/lib/agendamento-payment-rules";
import { appointmentCalendarOccupancyFilter } from "@/app/lib/appointment-operational-filter";
import { parsePaymentAppointmentIds } from "@/app/lib/symbolic-payment";
import { parseStudioDateTime } from "@/app/lib/calendar-day-state";

export const HOMOLOGATION_ORIGIN = "HOMOLOGATION" as const;

export type HomologationOrderItem = {
  id: string;
  nome?: string;
  quantidade: number;
  preco?: number;
};

export type CreateHomologationOrderInput = {
  userId: string;
  userName?: string;
  userEmail?: string;
  servicos?: HomologationOrderItem[];
  beats?: HomologationOrderItem[];
  data?: string;
  hora?: string;
  duracaoMinutos?: number;
  tipo?: string;
  observacoes?: string;
  cupomCode?: string;
};

export type HomologationOrderSnapshot = {
  origin: typeof HOMOLOGATION_ORIGIN;
  providerPaymentId: string;
  paymentDbId: string;
  paymentStatus: string;
  amount: number;
  appointmentIds: number[];
  serviceIds: string[];
  couponCodes: string[];
  couponTypes: string[];
  couponCategories?: string[];
  couponMeta?: Array<{
    code: string;
    category: string | null;
    rootPaymentId: string | null;
    parentCouponId: string | null;
    originAppointmentId: number | null;
  }>;
  serviceOrders: Array<{
    id: string;
    serviceType: string;
    commercialSource: string | null;
    phase: string;
    couponId: string | null;
    appointmentId: number | null;
    sequenceIndex: number;
  }>;
  orderCount: number;
  appointments: Array<{
    id: number;
    status: string;
    tipo: string;
    data: string;
  }>;
  services: Array<{
    id: string;
    status: string;
    tipo: string;
    deliveryAudioUrl: string | null;
  }>;
  flow: HomologationFlowState;
};

export type HomologationFlowState = {
  pedidoCriado: boolean;
  pagamentoConfirmado: boolean;
  ordensCriadas: boolean;
  cuponsCriados: boolean;
  agendamentoCriado: boolean;
  aceitoPeloAdmin: boolean;
  servicosSelecionados: boolean;
  upload: boolean;
  entrega: boolean;
  downloadPronto: boolean;
  concluido: boolean;
};

function buildFlow(snapshot: {
  paymentStatus: string;
  orderCount: number;
  couponCodes: string[];
  appointmentIds: number[];
  appointments: Array<{ status: string }>;
  services: Array<{ status: string; deliveryAudioUrl: string | null }>;
}): HomologationFlowState {
  const aceito = snapshot.appointments.some((a) =>
    ["aceito", "confirmado", "em_andamento", "concluido"].includes(a.status)
  );
  const hasServices = snapshot.services.length > 0;
  const hasUpload = snapshot.services.some((s) => Boolean(s.deliveryAudioUrl));
  const entregue = snapshot.services.some((s) =>
    ["concluido", "entregue"].includes(s.status)
  );
  const concluido =
    snapshot.services.length > 0 &&
    snapshot.services.every((s) => s.status === "concluido");

  return {
    pedidoCriado: true,
    pagamentoConfirmado: ["approved", "confirmado"].includes(
      String(snapshot.paymentStatus).toLowerCase()
    ),
    ordensCriadas: snapshot.orderCount > 0,
    cuponsCriados: snapshot.couponCodes.length > 0 || snapshot.orderCount === 1,
    agendamentoCriado: snapshot.appointmentIds.length > 0,
    aceitoPeloAdmin: aceito,
    servicosSelecionados: hasServices,
    upload: hasUpload,
    entrega: entregue,
    downloadPronto: hasUpload,
    concluido,
  };
}

export async function loadHomologationOrderSnapshot(
  paymentDbId: string
): Promise<HomologationOrderSnapshot | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentDbId } });
  if (!payment) return null;
  const provider = String(payment.provider || "").toUpperCase();
  const pid = String(payment.providerPaymentId || "");
  if (provider !== "HOMOLOGATION" && !pid.startsWith("homo_pay_")) {
    return null;
  }

  const aptIds = parsePaymentAppointmentIds(payment);
  const serviceOrders = await prisma.serviceOrder.findMany({
    where: { paymentId: payment.id },
    orderBy: { sequenceIndex: "asc" },
  });
  for (const o of serviceOrders) {
    if (o.appointmentId) aptIds.push(o.appointmentId);
  }
  const uniqueAptIds = [...new Set(aptIds)];

  const appointments =
    uniqueAptIds.length > 0
      ? await prisma.appointment.findMany({
          where: { id: { in: uniqueAptIds } },
          select: { id: true, status: true, tipo: true, data: true },
        })
      : [];

  const services =
    uniqueAptIds.length > 0
      ? await prisma.service.findMany({
          where: { appointmentId: { in: uniqueAptIds } },
          select: {
            id: true,
            status: true,
            tipo: true,
            deliveryAudioUrl: true,
          },
        })
      : [];

  const coupons = await prisma.coupon.findMany({
    where: {
      OR: [{ paymentId: payment.id }, { rootPaymentId: payment.id }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      code: true,
      couponType: true,
      couponCategory: true,
      rootPaymentId: true,
      parentCouponId: true,
      originAppointmentId: true,
    },
  });

  const base = {
    paymentStatus: payment.status,
    orderCount: serviceOrders.length,
    couponCodes: coupons.map((c) => c.code),
    appointmentIds: uniqueAptIds,
    appointments: appointments.map((a) => ({ status: a.status })),
    services: services.map((s) => ({
      status: s.status,
      deliveryAudioUrl: s.deliveryAudioUrl,
    })),
  };

  return {
    origin: HOMOLOGATION_ORIGIN,
    providerPaymentId: payment.providerPaymentId || pid,
    paymentDbId: payment.id,
    paymentStatus: payment.status,
    amount: payment.amount,
    appointmentIds: uniqueAptIds,
    serviceIds: services.map((s) => s.id),
    couponCodes: coupons.map((c) => c.code),
    couponTypes: coupons.map((c) => c.couponType),
    couponCategories: coupons.map((c) => c.couponCategory || c.couponType),
    couponMeta: coupons.map((c) => ({
      code: c.code,
      category: c.couponCategory,
      rootPaymentId: c.rootPaymentId,
      parentCouponId: c.parentCouponId,
      originAppointmentId: c.originAppointmentId,
    })),
    serviceOrders: serviceOrders.map((o) => ({
      id: o.id,
      serviceType: o.serviceType,
      commercialSource: o.commercialSource,
      phase: o.phase,
      couponId: o.couponId,
      appointmentId: o.appointmentId,
      sequenceIndex: o.sequenceIndex,
    })),
    orderCount: serviceOrders.length,
    appointments: appointments.map((a) => ({
      id: a.id,
      status: a.status,
      tipo: a.tipo,
      data: a.data.toISOString(),
    })),
    services: services.map((s) => ({
      id: s.id,
      status: s.status,
      tipo: s.tipo,
      deliveryAudioUrl: s.deliveryAudioUrl,
    })),
    flow: buildFlow(base),
  };
}

export async function createHomologationOrder(
  input: CreateHomologationOrderInput
): Promise<HomologationOrderSnapshot> {
  const calculation = await calculateServerCheckout({
    userId: input.userId,
    services: input.servicos,
    beats: input.beats,
    couponCode: input.cupomCode,
    allowTestCoupon: false,
  });

  const servicos = calculation.services;
  const beats = calculation.beats;
  const total = calculation.total;
  if (total <= 0) {
    throw new Error("Total do pedido deve ser maior que zero.");
  }

  const requerAgenda = exigeAgendamentoNoCheckout(servicos, beats);
  const requerHora = exigeAgendamentoHora(servicos, beats);
  const somenteData = exigeAgendamentoSomenteData(servicos, beats);
  const duracao = input.duracaoMinutos || 60;
  const horaEfetiva =
    input.hora?.trim() ||
    (somenteData && input.data?.trim() ? PRODUCTION_SCHEDULE_DEFAULT_HOUR : undefined);

  if (requerAgenda) {
    if (!input.data?.trim()) {
      throw new Error("Selecione a data do agendamento.");
    }
    if (requerHora && !horaEfetiva) {
      throw new Error("Selecione o horário do agendamento.");
    }
  }

  if (requerHora && input.data?.trim() && horaEfetiva) {
    const dataHoraISO = parseStudioDateTime(input.data, horaEfetiva);
    const conflito = await prisma.appointment.findFirst({
      where: {
        ...appointmentCalendarOccupancyFilter,
        AND: [
          { data: { lt: new Date(dataHoraISO.getTime() + duracao * 60000) } },
          { data: { gte: new Date(dataHoraISO.getTime() - duracao * 60000) } },
        ],
      },
      select: { id: true },
    });
    if (conflito) {
      throw new Error("Já existe um agendamento neste horário.");
    }
  }

  const providerPaymentId = newHomologationPaymentId();
  const descricaoItens: string[] = [];
  for (const s of servicos) descricaoItens.push(`${s.nome} (${s.quantidade}x)`);
  for (const b of beats) descricaoItens.push(`${b.nome} (${b.quantidade}x)`);

  const agendaLabel = requerAgenda
    ? input.data?.trim() && horaEfetiva
      ? `${input.data} ${requerHora ? horaEfetiva : "(entrega desejada)"}`
      : "agendar"
    : "cupons (agendar depois)";

  const observacoes = [
    input.observacoes?.trim() || "",
    `[HOMOLOGATION] Pedido de Homologação · origin=${HOMOLOGATION_ORIGIN}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const metadataCompleto: Record<string, unknown> = {
    tipo: "agendamento",
    userId: input.userId,
    ...(input.data?.trim() && horaEfetiva
      ? { data: input.data, hora: horaEfetiva }
      : {}),
    duracaoMinutos: duracao,
    tipoAgendamento: input.tipo || servicos[0]?.id || beats[0]?.id || "sessao",
    observacoes,
    servicos,
    beats,
    total: total.toString(),
    chargedAmount: total.toString(),
    paymentMethod: null,
    cupomCode: input.cupomCode || undefined,
    // GO-H7: origem operacional — NÃO marcar isTestPayment / symbolicAgendamento
    origin: HOMOLOGATION_ORIGIN,
    provider: HOMOLOGATION_ORIGIN,
    confirmedBy: "homologation_internal",
  };

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const metaRow = await prisma.paymentMetadata.create({
    data: {
      userId: input.userId,
      metadata: JSON.stringify(metadataCompleto),
      expiresAt,
      asaasId: providerPaymentId, // vínculo operacional legado (igual Simulation)
    },
  });

  const webhookResult = await processPaymentWebhook({
    event: "PAYMENT_RECEIVED",
    payment: {
      id: providerPaymentId,
      status: "RECEIVED",
      value: total,
      netValue: total,
      billingType: "UNDEFINED",
      customer: "cus_homologation",
      externalReference: metaRow.id,
      description: `Agendamento THouse Rec - ${agendaLabel}${
        descricaoItens.length > 0 ? ` - ${descricaoItens.join(", ")}` : ""
      }`,
      metadata: {
        provider: HOMOLOGATION_ORIGIN,
        origin: HOMOLOGATION_ORIGIN,
      },
    },
  });

  if ((webhookResult as { error?: string })?.error) {
    throw new Error(
      `Falha no pipeline oficial: ${(webhookResult as { error: string }).error}`
    );
  }

  const payment = await prisma.payment.findFirst({
    where: paymentByProviderIdWhere(providerPaymentId),
  });
  if (!payment) {
    throw new Error("Payment não criado após processPaymentWebhook.");
  }
  if (payment.asaasId) {
    throw new Error("Invariante: Pedido Homologação não deve preencher asaasId.");
  }
  if (String(payment.provider || "").toUpperCase() !== "HOMOLOGATION") {
    throw new Error(
      `Invariante: provider esperado HOMOLOGATION, obtido ${payment.provider}`
    );
  }

  const snapshot = await loadHomologationOrderSnapshot(payment.id);
  if (!snapshot) {
    throw new Error("Não foi possível carregar snapshot do Pedido de Homologação.");
  }
  return snapshot;
}
