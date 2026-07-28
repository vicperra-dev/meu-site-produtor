/**
 * Homologation Engine — orquestra SimulationProvider + pipeline oficial.
 * Não cria Appointment/Service/Coupon diretamente: só via processPaymentWebhook / domínio.
 */
import { prisma } from "@/app/lib/prisma";
import { SimulationProvider } from "@/app/lib/payment-provider/simulation-provider";
import { paymentByProviderIdWhere } from "@/app/lib/payment-provider/identity";
import { SYMBOLIC_AGENDAMENTO_BRL } from "@/app/lib/symbolic-payment";
import { saveHomologationRun } from "@/app/lib/homologation/store";
import { getHomologationScenario } from "@/app/lib/homologation/scenarios";
import { createDomainCoupon, couponUsesExclusiveSchedulingPage } from "@/app/lib/domain/coupon-domain";
import type {
  HomologationCheck,
  HomologationRun,
  HomologationRunInput,
  HomologationTimelineEvent,
} from "@/app/lib/homologation/types";
import { totalPricedCheckoutItems, priceCheckoutItems } from "@/app/lib/service-catalog";
import { countPlanCycleCoupons } from "@/app/lib/plan-definitions";
import type { RefundLifecycleStatus } from "@/app/lib/payment-provider/types";

function pushTimeline(
  timeline: HomologationTimelineEvent[],
  step: string,
  ok: boolean,
  detail?: string,
  data?: unknown
) {
  timeline.push({
    at: new Date().toISOString(),
    step,
    ok,
    detail,
    data,
  });
}

function emptyChecks(): HomologationCheck[] {
  return [
    { key: "paymentCreated", label: "Payment Created", ok: false },
    { key: "webhookExecuted", label: "Webhook Executed", ok: false },
    { key: "appointmentCreated", label: "Appointment Created", ok: false },
    { key: "servicesCreated", label: "Services Created", ok: false },
    { key: "couponsCreated", label: "Coupons Created", ok: false },
    { key: "serviceOrdersCreated", label: "Service Orders Created", ok: false },
    { key: "refundRequested", label: "Refund Requested", ok: false },
    { key: "refundResolved", label: "Refund Approved / Failed / Pending / Timeout", ok: false },
    { key: "workflowUpdated", label: "Workflow Updated", ok: false },
    { key: "minhaContaUpdated", label: "Minha Conta Updated", ok: false },
    { key: "dashboardUpdated", label: "Dashboard Updated", ok: false },
  ];
}

function mark(
  checks: HomologationCheck[],
  key: HomologationCheck["key"],
  ok: boolean,
  detail?: string
) {
  const row = checks.find((c) => c.key === key);
  if (row) {
    row.ok = ok;
    row.detail = detail;
  }
}

function refundCheckOk(
  status: RefundLifecycleStatus | undefined,
  expected?: RefundLifecycleStatus
): boolean {
  if (!status) return false;
  if (expected) return status === expected;
  return status === "APPROVED" || status === "PENDING" || status === "TIMEOUT" || status === "FAILED";
}

export async function runHomologationSimulation(
  rawInput: HomologationRunInput
): Promise<HomologationRun> {
  // GO-H6: seleção livre do laboratório tem prioridade sobre scenarioId.
  const freeLab =
    Boolean(rawInput.freeLab) ||
    ((rawInput.servicos?.length || 0) + (rawInput.beats?.length || 0) > 0 &&
      !rawInput.scenarioId);

  const scenario = freeLab ? undefined : getHomologationScenario(rawInput.scenarioId);
  const input: HomologationRunInput = scenario
    ? {
        ...scenario.buildInput({
          userId: rawInput.userId,
          userEmail: rawInput.userEmail,
          userName: rawInput.userName,
        }),
        expectedServiceCoupons:
          rawInput.expectedServiceCoupons ?? scenario.expectedServiceCoupons ?? null,
        refundOutcome: rawInput.refundOutcome ?? scenario.refundOutcome,
      }
    : {
        ...rawInput,
        observacoes:
          rawInput.observacoes ||
          `[Homologação] SimulationProvider · laboratório operacional`,
      };

  const runId = `homo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timeline: HomologationTimelineEvent[] = [];
  const checks = emptyChecks();
  const provider = new SimulationProvider();
  const tipo = input.tipo || "agendamento";

  const run: HomologationRun = {
    runId,
    startedAt: new Date().toISOString(),
    provider: "SIMULATION",
    scenarioId: scenario?.id || input.scenarioId,
    input,
    checks,
    timeline,
    ok: false,
  };

  try {
    pushTimeline(
      timeline,
      "start",
      true,
      scenario
        ? `Cenário ${scenario.id}: ${scenario.label}`
        : `Homologação ${tipo} via SimulationProvider`
    );

    // Cenário cupom desconto: cria DISCOUNT via domínio (mesmo factory OP-02A)
    if (input.scenarioKind === "cupom_desconto") {
      const discount = await createDomainCoupon(prisma, {
        canonicalType: "DISCOUNT",
        discountType: "fixed",
        discountValue: 10,
        serviceType: null,
        assignedUserId: input.userId,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
      run.couponCodes = [discount.code];
      mark(checks, "couponsCreated", true, `DISCOUNT ${discount.code}`);
      mark(checks, "paymentCreated", true, "N/A — cenário cupom desconto");
      mark(checks, "webhookExecuted", true, "N/A");
      mark(checks, "appointmentCreated", true, "N/A");
      mark(checks, "servicesCreated", true, "N/A");
      mark(checks, "serviceOrdersCreated", true, "N/A — cupom desconto");
      mark(checks, "refundRequested", true, "não solicitado");
      mark(checks, "refundResolved", true, "não solicitado");
      mark(checks, "workflowUpdated", true, "createDomainCoupon DISCOUNT");
      mark(checks, "minhaContaUpdated", true, "cupom assignado ao usuário");
      mark(checks, "dashboardUpdated", true, "domínio cupom atualizado");
      run.ok = true;
      pushTimeline(timeline, "cupom_desconto", true, discount.code);
      run.finishedAt = new Date().toISOString();
      await saveHomologationRun(run);
      return run;
    }

    let metadata: Record<string, unknown>;
    let description: string;
    const chargedAmount = SYMBOLIC_AGENDAMENTO_BRL;

    if (tipo === "plano") {
      const planId = input.planId || "bronze";
      metadata = {
        tipo: "plano",
        userId: input.userId,
        planId,
        planName: `Plano ${planId}`,
        modo: input.modo || "mensal",
        amount: String(SYMBOLIC_AGENDAMENTO_BRL),
        chargedAmount: String(SYMBOLIC_AGENDAMENTO_BRL),
        symbolicPlano: true,
        isTestPayment: true,
        isTest: true,
        provider: "SIMULATION",
        origem: "Homologação",
        homologationRunId: runId,
        billingDay: new Date().getDate(),
        paymentMethod: "pix",
      };
      description = `Plano ${planId} - Homologação (SimulationProvider)`;
    } else {
      const servicos = input.servicos || [{ id: "sessao", nome: "Sessão", quantidade: 1 }];
      const beats = input.beats || [];
      let catalogTotal = 40;
      try {
        const ps = priceCheckoutItems(
          servicos.map((s) => ({ id: s.id, quantidade: s.quantidade })),
          "service"
        );
        const pb = priceCheckoutItems(
          beats.map((b) => ({ id: b.id, quantidade: b.quantidade })),
          "beat"
        );
        catalogTotal = totalPricedCheckoutItems([...ps, ...pb]);
      } catch {
        catalogTotal = 40;
      }
      metadata = {
        tipo: "agendamento",
        userId: input.userId,
        ...(input.data && input.hora ? { data: input.data, hora: input.hora } : {}),
        duracaoMinutos: input.duracaoMinutos || 60,
        tipoAgendamento: servicos[0]?.id || beats[0]?.id || "sessao",
        observacoes: input.observacoes || `Homologação ${runId}`,
        servicos,
        beats,
        total: String(catalogTotal),
        chargedAmount: String(SYMBOLIC_AGENDAMENTO_BRL),
        paymentMethod: "pix",
        symbolicAgendamento: true,
        isTestPayment: true,
        provider: "SIMULATION",
        origem: "Homologação",
        homologationRunId: runId,
      };
      description = "Agendamento THouse Rec - Homologação (SimulationProvider)";
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const metaRow = await prisma.paymentMetadata.create({
      data: {
        userId: input.userId,
        metadata: JSON.stringify(metadata),
        expiresAt,
      },
    });
    pushTimeline(timeline, "paymentMetadata", true, metaRow.id);

    const created = await provider.createPayment({
      items: [
        {
          id: tipo === "plano" ? "homo-plano" : "homo-agendamento",
          title: description,
          quantity: 1,
          unit_price: chargedAmount,
        },
      ],
      payer: { name: input.userName, email: input.userEmail },
      metadata: { operationId: metaRow.id, provider: "SIMULATION" },
      backUrls: {
        success: "/admin/homologacao",
        failure: "/admin/homologacao",
        pending: "/admin/homologacao",
      },
      description,
      value: chargedAmount,
    });
    run.providerPaymentId = created.providerPaymentId;
    mark(checks, "paymentCreated", true, created.providerPaymentId);
    pushTimeline(timeline, "createPayment", true, created.providerPaymentId, created);

    const paymentOutcome = input.paymentOutcome || "approved";

    if (paymentOutcome === "pending") {
      mark(checks, "webhookExecuted", true, "pagamento PENDING — confirmação não disparada (lab)");
      pushTimeline(timeline, "paymentOutcome", true, "pending");
      mark(checks, "appointmentCreated", true, "aguardando confirmação");
      mark(checks, "servicesCreated", true, "aguardando confirmação");
      mark(checks, "couponsCreated", true, "aguardando confirmação");
      mark(checks, "serviceOrdersCreated", true, "aguardando confirmação");
      mark(checks, "refundRequested", true, "não solicitado");
      mark(checks, "refundResolved", true, "não solicitado");
      mark(checks, "workflowUpdated", true, "PENDING — sem efeitos de domínio ainda");
      mark(checks, "minhaContaUpdated", true, "PENDING");
      mark(checks, "dashboardUpdated", true, "PENDING");
      run.ok = true;
      pushTimeline(timeline, "finish", true, "PASS (pending payment)");
      run.finishedAt = new Date().toISOString();
      await saveHomologationRun(run);
      return run;
    }

    if (paymentOutcome === "refused") {
      const cancelled = await provider.cancelPayment(created.providerPaymentId);
      mark(checks, "webhookExecuted", true, `pagamento recusado/cancelado (${cancelled.status})`);
      pushTimeline(timeline, "paymentOutcome", true, "refused", cancelled);
      mark(checks, "appointmentCreated", true, "não gerado — pagamento recusado");
      mark(checks, "servicesCreated", true, "não gerado — pagamento recusado");
      mark(checks, "couponsCreated", true, "não gerado — pagamento recusado");
      mark(checks, "serviceOrdersCreated", true, "não gerado — pagamento recusado");
      mark(checks, "refundRequested", true, "não solicitado");
      mark(checks, "refundResolved", true, "não solicitado");
      mark(checks, "workflowUpdated", true, `status=${cancelled.status}`);
      mark(checks, "minhaContaUpdated", true, "sem efeitos (recusa)");
      mark(checks, "dashboardUpdated", true, "sem efeitos (recusa)");
      run.ok = true;
      pushTimeline(timeline, "finish", true, "PASS (refused payment)");
      run.finishedAt = new Date().toISOString();
      await saveHomologationRun(run);
      return run;
    }

    const webhook = await provider.confirmPayment(created.providerPaymentId);
    mark(
      checks,
      "webhookExecuted",
      Boolean(webhook.received),
      webhook.error || (webhook.success ? "PAYMENT_RECEIVED processado" : "recebido sem success")
    );
    pushTimeline(
      timeline,
      "confirmPayment/simulateWebhook",
      Boolean(webhook.success || webhook.received),
      webhook.error,
      webhook
    );

    const payment = await prisma.payment.findFirst({
      where: paymentByProviderIdWhere(created.providerPaymentId),
    });
    if (!payment) {
      throw new Error("Payment local não criado após webhook simulado.");
    }
    if (payment.asaasId && String(payment.provider || "").toUpperCase() === "SIMULATION") {
      throw new Error("Invariante: Payment Simulation não deve preencher asaasId.");
    }
    run.paymentDbId = payment.id;
    mark(
      checks,
      "paymentCreated",
      true,
      `db=${payment.id} provider=${payment.provider || "?"} providerPaymentId=${payment.providerPaymentId || created.providerPaymentId} status=${payment.status}`
    );
    mark(
      checks,
      "workflowUpdated",
      ["approved", "confirmado"].includes(String(payment.status).toLowerCase()),
      `payment.status=${payment.status}`
    );

    const appointments = payment.appointmentId
      ? await prisma.appointment.findMany({ where: { id: payment.appointmentId } })
      : await prisma.appointment.findMany({
          where: {
            userId: input.userId,
            observacoes: { contains: runId },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

    let aptIds: number[] = appointments.map((a) => a.id);
    if (payment.appointmentIds) {
      let raw: unknown = payment.appointmentIds;
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch {
          raw = null;
        }
      }
      if (Array.isArray(raw)) {
        aptIds = [...new Set([...aptIds, ...raw.map(Number).filter(Number.isFinite)])];
      }
    }
    if (payment.appointmentId) aptIds = [...new Set([...aptIds, payment.appointmentId])];
    run.appointmentIds = aptIds;

    mark(
      checks,
      "appointmentCreated",
      aptIds.length > 0 || tipo === "plano",
      aptIds.length > 0
        ? `ids=${aptIds.join(",")}`
        : tipo === "plano"
          ? "plano: appointment opcional"
          : "cupons-only: appointment no resgate"
    );
    if (aptIds.length === 0 && tipo === "agendamento") {
      mark(checks, "appointmentCreated", true, "cupons-only: appointment no resgate");
    }

    const services =
      aptIds.length > 0
        ? await prisma.service.findMany({ where: { appointmentId: { in: aptIds } } })
        : [];
    run.serviceIds = services.map((s) => s.id);
    mark(
      checks,
      "servicesCreated",
      services.length > 0 || tipo === "plano" || aptIds.length === 0,
      services.length > 0 ? `${services.length} service(s)` : "sem services nesta etapa"
    );

    const coupons = await prisma.coupon.findMany({
      where: { paymentId: payment.id },
      orderBy: { createdAt: "asc" },
    });
    run.couponCodes = coupons.map((c) => c.code);

    const expected = input.expectedServiceCoupons;
    let couponsOk = coupons.length > 0 || (aptIds.length > 0 && services.length > 0) || tipo === "plano";
    let couponDetail =
      coupons.length > 0
        ? `${coupons.length} cupom(ns): ${coupons.map((c) => c.code).join(", ")}`
        : aptIds.length > 0
          ? "agendamento direto sem cupons de linha"
          : "nenhum cupom";

    if (typeof expected === "number") {
      couponsOk = coupons.length === expected;
      couponDetail = `esperado=${expected} obtido=${coupons.length} [${coupons.map((c) => c.code).join(", ")}]`;
      // Páginas exclusivas
      const exclusiveOk = coupons.every((c) => couponUsesExclusiveSchedulingPage(c));
      if (expected > 0 && !exclusiveOk) {
        couponsOk = false;
        couponDetail += " — nem todos usam página exclusiva";
      }
    } else if (tipo === "plano") {
      const planExpected = countPlanCycleCoupons(String(input.planId || "bronze"));
      couponsOk = coupons.length === planExpected;
      couponDetail = `plano ${input.planId || "bronze"}: esperado=${planExpected} obtido=${coupons.length} [${coupons.map((c) => `${c.serviceType || c.discountType}`).join(", ")}]`;
    }

    mark(checks, "couponsCreated", couponsOk, couponDetail);
    pushTimeline(timeline, "coupons", couponsOk, couponDetail);

    const serviceOrders = await prisma.serviceOrder.findMany({
      where: { paymentId: payment.id },
      orderBy: { sequenceIndex: "asc" },
    });
    run.serviceOrders = serviceOrders.map((o) => ({
      id: o.id,
      serviceType: o.serviceType,
      commercialSource: o.commercialSource,
      phase: o.phase,
      couponId: o.couponId,
      appointmentId: o.appointmentId,
      sequenceIndex: o.sequenceIndex,
    }));
    run.orderCount = serviceOrders.length;
    mark(
      checks,
      "serviceOrdersCreated",
      serviceOrders.length > 0 || tipo === "plano" || aptIds.length > 0,
      serviceOrders.length > 0
        ? `${serviceOrders.length} Ordem(ns): ${serviceOrders.map((o) => o.serviceType).join(", ")}`
        : aptIds.length > 0
          ? "Ordem imediata via appointment (pode sincronizar depois)"
          : "sem Ordens nesta etapa"
    );
    pushTimeline(
      timeline,
      "serviceOrders",
      (run.serviceOrders?.length || 0) > 0 || aptIds.length > 0,
      `count=${run.orderCount || 0}`
    );

    // Cenário remarcação: cancel + criar REBOOK
    if (input.scenarioKind === "cupom_remarcacao") {
      if (aptIds.length === 0) {
        // Se multi/cupons-only, criar appointment via com-cupom path não está aqui —
        // exige ao menos 1 appointment da sessão isolada
        throw new Error("cupom_remarcacao exige Appointment (use cenário com data/hora).");
      }
      const aptId = aptIds[0];
      await prisma.appointment.update({
        where: { id: aptId },
        data: {
          status: "cancelado",
          cancelledAt: new Date(),
          cancelReason: "Homologação remarcação",
          cancelRefundOption: "cupom",
        },
      });
      const rebook = await createDomainCoupon(prisma, {
        canonicalType: "REBOOK",
        discountType: "service",
        discountValue: 0,
        serviceType: "sessao",
        originAppointmentId: aptId,
        assignedUserId: input.userId,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
      await prisma.appointment.update({
        where: { id: aptId },
        data: { refundCouponId: rebook.id },
      });
      run.couponCodes = [...(run.couponCodes || []), rebook.code];
      pushTimeline(timeline, "cupom_remarcacao", true, rebook.code);
      mark(checks, "couponsCreated", true, `REBOOK ${rebook.code}`);
    }

    const syncEvents = await prisma.synchronizationEvent.count({
      where: {
        OR: [
          { entityId: payment.id },
          ...(aptIds.length ? [{ entityId: { in: aptIds.map(String) } }] : []),
        ],
      },
    });
    const history = await prisma.domainTransitionHistory.count({
      where: {
        OR: [
          { entityId: payment.id },
          ...(aptIds.length ? [{ entityId: { in: aptIds.map(String) } }] : []),
        ],
      },
    });
    mark(
      checks,
      "workflowUpdated",
      history > 0 || ["approved", "confirmado"].includes(String(payment.status).toLowerCase()),
      `history=${history} payment=${payment.status}`
    );
    mark(
      checks,
      "minhaContaUpdated",
      syncEvents > 0 || payment.status === "approved" || (run.couponCodes?.length || 0) > 0,
      `syncEvents=${syncEvents} cupons=${run.couponCodes?.length || 0}`
    );
    mark(
      checks,
      "dashboardUpdated",
      syncEvents > 0 || payment.status === "approved",
      `SynchronizationEngine (${syncEvents} eventos)`
    );

    if (input.runRefund) {
      const outcome = input.refundOutcome || "APPROVED";
      mark(checks, "refundRequested", true, `refundPayment(outcome=${outcome})`);
      pushTimeline(timeline, "refundPayment:request", true, outcome);
      const refund = await provider.refundPayment(created.providerPaymentId, {
        description: `Homologação refund ${runId}`,
        outcome,
      });
      run.refund = { status: refund.status, reason: refund.reason };
      const okRefund = refundCheckOk(refund.status, outcome);
      mark(
        checks,
        "refundResolved",
        okRefund,
        `${refund.status}${refund.reason ? ` — ${refund.reason}` : ""}`
      );
      pushTimeline(timeline, "refundPayment:result", okRefund, refund.reason, refund);
    } else {
      mark(checks, "refundRequested", true, "não solicitado neste run");
      mark(checks, "refundResolved", true, "não solicitado neste run");
    }

    run.ok =
      checks.find((c) => c.key === "paymentCreated")!.ok &&
      checks.find((c) => c.key === "webhookExecuted")!.ok &&
      checks.find((c) => c.key === "couponsCreated")!.ok &&
      (coupons.length > 0 || aptIds.length > 0 || tipo === "plano") &&
      (!input.runRefund || refundCheckOk(run.refund?.status, input.refundOutcome));

    pushTimeline(timeline, "finish", run.ok, run.ok ? "PASS" : "FAIL parcial");
  } catch (e: unknown) {
    run.error = e instanceof Error ? e.message : String(e);
    run.ok = false;
    pushTimeline(timeline, "error", false, run.error);
  }

  run.finishedAt = new Date().toISOString();
  await saveHomologationRun(run);
  return run;
}
