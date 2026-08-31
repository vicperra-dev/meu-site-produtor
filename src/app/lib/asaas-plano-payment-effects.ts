import { prisma } from "@/app/lib/prisma";
import { getPlanPrice } from "@/app/lib/plan-prices";
import { generatePlanServiceCoupons } from "@/app/lib/plan-coupons";
import { resolvePlanIsTestPayment, SYMBOLIC_PLANO_BRL } from "@/app/lib/plan-payment-simulation";
import { sendPlanPaymentConfirmationEmail } from "@/app/lib/sendEmail";
import { findActiveUserPlan, ACTIVE_PLAN_BLOCK_MESSAGE } from "@/app/lib/checkout-active-plan-gate";
import {
  ensureLocalSubscription,
  findActiveSubscriptionForUser,
} from "@/app/lib/subscription-lifecycle";

export type ProcessPlanoPaymentEffectsResult = {
  userPlanId: string | null;
  paymentLinked: boolean;
  couponsCount: number;
  emailsSent: boolean;
  skippedReason?: string;
};

/** Enriquece metadata de plano a partir da descrição Asaas (ex.: inferência de plano teste). */
export function enrichPlanoMetadata(
  metadata: Record<string, unknown>,
  description?: string | null
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...metadata };
  if (description) {
    const descMatch = description.match(/Plano (\w+)/i);
    if (descMatch) {
      out.tipo = out.tipo ?? "plano";
      out.planId = out.planId ?? descMatch[1].toLowerCase();
    }
    if (description.toLowerCase().includes("teste")) {
      out.planId = out.planId ?? "teste";
      out.modo = out.modo ?? "mensal";
      out.planName = out.planName ?? "Plano de Teste";
    }
  }
  if (out.planId != null && (out.modo == null || String(out.modo).trim() === "")) {
    out.modo = "mensal";
  }
  return out;
}

function computePlanEndDate(startDate: Date, modo: string): Date {

  const endDate = new Date(startDate);
  if (modo === "mensal") {
    const ano = startDate.getFullYear();
    const mes = startDate.getMonth();
    const dia = startDate.getDate();
    let novoMes = mes + 1;
    let novoAno = ano;
    if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }
    const ultimoDiaDoMes = new Date(novoAno, novoMes + 1, 0).getDate();
    endDate.setFullYear(novoAno, novoMes, Math.min(dia, ultimoDiaDoMes));
    return endDate;
  }
  endDate.setFullYear(startDate.getFullYear() + 1);
  return endDate;
}

export async function processPlanoPaymentEffects(params: {
  paymentDbId: string;
  value: number;
  metadata: Record<string, unknown>;
  options?: { sendEmails?: boolean; source?: "webhook" | "admin_reprocess" };
}): Promise<ProcessPlanoPaymentEffectsResult> {
  const { paymentDbId, value } = params;
  const metadata = enrichPlanoMetadata(params.metadata);
  const sendEmails = params.options?.sendEmails !== false;
  const symbolic = resolvePlanIsTestPayment(metadata);

  const pay = await prisma.payment.findUnique({
    where: { id: paymentDbId },
    select: { id: true, userId: true, amount: true, planId: true, status: true, type: true },
  });
  if (!pay) {
    return {
      userPlanId: null,
      paymentLinked: false,
      couponsCount: 0,
      emailsSent: false,
      skippedReason: "Pagamento não encontrado",
    };
  }

  const userId = String(metadata.userId || pay.userId);
  const planIdRaw = metadata.planId ?? pay.planId;
  if (planIdRaw == null || String(planIdRaw).trim() === "") {
    return {
      userPlanId: null,
      paymentLinked: false,
      couponsCount: 0,
      emailsSent: false,
      skippedReason: "planId ausente no metadata do pagamento",
    };
  }
  const planId = String(planIdRaw).toLowerCase();
  const modo = String(metadata.modo || "mensal");
  const planName = String(metadata.planName || `Plano ${planId}`);
  const amount = parseFloat(String(metadata.amount || pay.amount || value || SYMBOLIC_PLANO_BRL));

  const existingCoupons = await prisma.coupon.findMany({
    where: { paymentId: paymentDbId },
    orderBy: { createdAt: "asc" },
  });
  if (existingCoupons.length > 0) {
    const userPlanId = existingCoupons[0].userPlanId;
    return {
      userPlanId,
      paymentLinked: true,
      couponsCount: existingCoupons.length,
      emailsSent: false,
    };
  }

  const planoAtivo = await findActiveUserPlan(userId);
  const assinaturaAtiva = await findActiveSubscriptionForUser(userId);
  if (planoAtivo || assinaturaAtiva) {
    await prisma.payment.update({
      where: { id: paymentDbId },
      data: {
        userId,
        type: "plano",
        status: "approved",
        planId,
      },
    });
    return {
      userPlanId: planoAtivo?.id || assinaturaAtiva?.userPlanId || null,
      paymentLinked: true,
      couponsCount: 0,
      emailsSent: false,
      skippedReason: ACTIVE_PLAN_BLOCK_MESSAGE,
    };
  }

  const startDate = new Date();
  const endDate = computePlanEndDate(startDate, modo);

  const userPlan = await prisma.userPlan.create({
    data: {
      userId,
      planId,
      planName,
      modo,
      amount: symbolic
        ? pay.amount
        : amount || getPlanPrice(planId, modo as "mensal" | "anual") || pay.amount,
      status: "active",
      startDate,
      endDate,
    },
  });

  await prisma.payment.update({
    where: { id: paymentDbId },
    data: {
      userId,
      type: "plano",
      status: "approved",
      planId,
      amount: pay.amount,
    },
  });

  const coupons = await generatePlanServiceCoupons({
    userId,
    userPlanId: userPlan.id,
    planId,
    planName,
    modo,
    paymentId: paymentDbId,
    isTestPayment: symbolic,
  });

  // GO-H10C — Assinatura é a entidade comercial oficial (não o Payment).
  try {
    await ensureLocalSubscription({
      userId,
      userPlanId: userPlan.id,
      modo,
      paymentMethod: String(metadata.paymentMethod || "pix"),
      billingDay: Number(metadata.billingDay) || startDate.getDate(),
      startDate,
      endDate,
      rootPaymentId: paymentDbId,
      planValue: userPlan.amount,
      planDescription: `${planName} - ${modo}`,
      // Recorrência remota Asaas: apenas produção não-simbólica com customer quando disponível
      createRemote: !symbolic && Boolean(metadata.asaasCustomerId),
      asaasCustomerId: metadata.asaasCustomerId
        ? String(metadata.asaasCustomerId)
        : null,
    });
  } catch (subErr) {
    console.error("[PlanoEffects] Falha ao criar Assinatura (non-fatal):", subErr);
  }

  let emailsSent = false;
  if (sendEmails) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await sendPlanPaymentConfirmationEmail(
          user.email,
          user.nomeArtistico || user.nomeCompleto || "Usuário",
          planName,
          modo,
          amount || pay.amount,
          endDate
        );
        emailsSent = true;
      }
    } catch (emailErr) {
      console.error("[PlanoEffects] Erro ao enviar email:", emailErr);
    }
  }

  return {
    userPlanId: userPlan.id,
    paymentLinked: true,
    couponsCount: coupons.length,
    emailsSent,
  };
}
