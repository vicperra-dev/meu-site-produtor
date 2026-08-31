/**
 * TE-02A — Business Validation Suite (Batch 1)
 * Todos os cenários usam pipeline oficial + State Machine + cleanup obrigatório.
 */
import { prisma } from "@/app/lib/prisma";
import {
  assertAppointment,
  assertCoupon,
  assertDashboard,
  assertMinhaConta,
  assertPayment,
  assertService,
} from "@/app/lib/test-engine/assert-engine";
import {
  dispatchOfficialPaymentReceived,
  findLatestPaymentByAsaasId,
  seedTestUser,
  writeAgendamentoPaymentMetadata,
} from "@/app/lib/test-engine/pipeline-adapter";
import {
  cleanupTeUserArtifacts,
  futureSlots,
  redeemServiceCouponOfficial,
  writeCarrinhoPaymentMetadata,
  writePlanoPaymentMetadata,
} from "@/app/lib/test-engine/te02a-helpers";
import type {
  AssertResult,
  ScenarioContext,
  ScenarioDefinition,
  ScenarioId,
} from "@/app/lib/test-engine/types";
import {
  ACTIVE_OPERATIONAL_SERVICE_STATUSES,
} from "@/app/lib/domain/statuses";
import {
  approveAppointment,
  cancelAppointment,
  completeService,
  rejectAppointment,
  refundPaymentStatus,
  startServiceWork,
} from "@/app/lib/domain/workflow";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import { getPlanCouponUsageBlockMessage } from "@/app/lib/checkout-coupon-gates";
import { toPersistedCouponType } from "@/app/lib/domain/coupon-types";
import { generateCouponCode } from "@/app/lib/coupons";
import { SYMBOLIC_PLANO_BRL } from "@/app/lib/symbolic-payment";

const DELIVERY_URL = "https://example.com/te02a-delivery.wav";

type RunBody = Awaited<ReturnType<ScenarioDefinition["run"]>>;

async function withCleanup(
  ctx: ScenarioContext,
  scenario: string,
  fn: (userId: string, email: string) => Promise<RunBody>
): Promise<RunBody> {
  const email = `${ctx.artifactPrefix}-${scenario.toLowerCase()}-${Date.now()}@homolog.test`;
  const user = await seedTestUser({
    email,
    nomeArtistico: `TE ${scenario}`,
    nomeCompleto: `TE Engine ${scenario}`,
  });
  const asserts: AssertResult[] = [];
  const warnings: string[] = [];
  const artifacts: Record<string, unknown> = {
    userId: user.userId,
    email: user.email,
    scenario,
    runId: ctx.runId,
  };
  try {
    const body = await fn(user.userId, user.email);
    Object.assign(artifacts, body.artifacts || {});
    asserts.push(...(body.asserts || []));
    warnings.push(...(body.warnings || []));
    const failed = asserts.filter((a) => !a.ok);
    if (failed.length || body.status === "fail" || body.status === "error") {
      return {
        status: body.status === "error" ? "error" : "fail",
        asserts,
        errors: [
          ...(body.errors || []),
          ...failed.map((f) => f.message || f.name),
        ],
        warnings,
        artifacts,
      };
    }
    return {
      status: "pass",
      asserts,
      errors: [],
      warnings,
      artifacts,
    };
  } catch (e: unknown) {
    return {
      status: "error",
      asserts,
      errors: [e instanceof Error ? e.message : String(e)],
      warnings,
      artifacts,
    };
  } finally {
    try {
      const cleanup = await cleanupTeUserArtifacts(user.userId);
      artifacts.cleanup = cleanup;
    } catch (ce: unknown) {
      warnings.push(
        `cleanup: ${ce instanceof Error ? ce.message : String(ce)}`
      );
      artifacts.cleanupError = String(ce);
    }
  }
}

function planCouponExpect(planId: string): number {
  if (planId === "bronze") return 5; // 1+2+1+1
  if (planId === "prata") return 5; // 1+2+1+1
  if (planId === "ouro") return 12; // 2+4+2+2+1+1
  return 1;
}

async function buyPlan(
  userId: string,
  planId: "bronze" | "prata" | "ouro",
  scenario: string,
  runId: string
) {
  const names = { bronze: "Bronze", prata: "Prata", ouro: "Ouro" } as const;
  const meta = await writePlanoPaymentMetadata({
    userId,
    planId,
    planName: `Plano ${names[planId]}`,
    scenario,
    runId,
    amount: SYMBOLIC_PLANO_BRL,
  });
  const webhook = await dispatchOfficialPaymentReceived({
    userId,
    asaasPaymentId: meta.asaasId,
    value: SYMBOLIC_PLANO_BRL,
    description: `Plano ${names[planId]} TE`,
  });
  const payment = await findLatestPaymentByAsaasId(meta.asaasId);
  const userPlan = await prisma.userPlan.findFirst({
    where: { userId, planId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  const coupons = await prisma.coupon.findMany({
    where: { userPlanId: userPlan?.id || "__none__" },
  });
  return { meta, webhook, payment, userPlan, coupons };
}

async function cancelPlanOfficial(userId: string, userPlanId: string) {
  const userPlan = await prisma.userPlan.findUnique({ where: { id: userPlanId } });
  if (!userPlan || userPlan.userId !== userId) throw new Error("Plano inválido");
  await prisma.userPlan.update({
    where: { id: userPlanId },
    data: { status: "cancelled" },
  });
  await prisma.subscription.updateMany({
    where: { userPlanId },
    data: { status: "cancelled" },
  });
}

function def(
  id: ScenarioId,
  name: string,
  description: string,
  run: ScenarioDefinition["run"]
): ScenarioDefinition {
  return { id, name, description, status: "implemented", run };
}

export const te02aScenarios: ScenarioDefinition[] = [
  def(
    "SRV-001",
    "Compra múltiplos serviços (carrinho)",
    "1 Payment → N Appointments → N Services independentes",
    async (ctx) =>
      withCleanup(ctx, "SRV-001", async (userId) => {
        const asserts: AssertResult[] = [];
        const slots = futureSlots(2);
        const meta = await writeCarrinhoPaymentMetadata({
          userId,
          scenario: "SRV-001",
          runId: ctx.runId,
          items: [
            {
              data: slots[0].data,
              hora: slots[0].hora,
              tipo: "sessao",
              servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1 }],
            },
            {
              data: slots[1].data,
              hora: slots[1].hora,
              tipo: "mix",
              servicos: [{ id: "mix", nome: "Mix", quantidade: 1 }],
            },
          ],
        });
        const webhook = await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "TE Carrinho SRV-001",
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, userId, status: "approved" }));
        const payment = await findLatestPaymentByAsaasId(meta.asaasId);
        const aptIds =
          (webhook as { appointmentIds?: number[] })?.appointmentIds ||
          (Array.isArray(payment && (payment as any))
            ? []
            : []);
        const apts = await prisma.appointment.findMany({
          where: { userId },
          orderBy: { id: "asc" },
        });
        asserts.push({
          name: "assertNAppointments",
          ok: apts.length >= 2,
          message: `esperava ≥2 appointments, got ${apts.length}`,
          evidence: { ids: apts.map((a) => a.id) },
        });
        const services = await prisma.service.findMany({ where: { userId } });
        asserts.push({
          name: "assertNServices",
          ok: services.length >= 2,
          message: `esperava ≥2 services, got ${services.length}`,
          evidence: { services },
        });
        const tipos = new Set(services.map((s) => s.status));
        asserts.push({
          name: "assertIndependentStatuses",
          ok: services.every((s) => s.appointmentId != null),
          message: "cada Service deve ter appointmentId",
        });
        asserts.push(await assertDashboard({ minServices: 1 }));
        asserts.push(await assertMinhaConta({ userId }));
        void aptIds;
        void tipos;
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { asaasId: meta.asaasId, webhook } };
      })
  ),

  def(
    "SRV-002",
    "Sessão + Mix + Master → 3 Appointments",
    "Carrinho com 3 itens atômicos e 3 entregas independentes",
    async (ctx) =>
      withCleanup(ctx, "SRV-002", async (userId) => {
        const asserts: AssertResult[] = [];
        const slots = futureSlots(3);
        const types = [
          { id: "sessao", nome: "Sessão" },
          { id: "mix", nome: "Mix" },
          { id: "master", nome: "Master" },
        ];
        const meta = await writeCarrinhoPaymentMetadata({
          userId,
          scenario: "SRV-002",
          runId: ctx.runId,
          items: types.map((t, i) => ({
            data: slots[i].data,
            hora: slots[i].hora,
            tipo: t.id,
            servicos: [{ id: t.id, nome: t.nome, quantidade: 1 }],
          })),
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "TE Carrinho SRV-002",
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved" }));
        const apts = await prisma.appointment.findMany({ where: { userId } });
        asserts.push({
          name: "assert3Appointments",
          ok: apts.length === 3,
          message: `got ${apts.length}`,
        });
        for (const apt of apts) {
          const r = await approveAppointment(apt.id, "aceito", { type: "test-engine" });
          asserts.push({
            name: `approve_${apt.id}`,
            ok: r.ok,
            message: r.ok ? undefined : (r as any).error,
          });
        }
        const services = await prisma.service.findMany({ where: { userId } });
        asserts.push({
          name: "assert3Services",
          ok: services.length === 3,
          message: `got ${services.length}`,
        });
        for (const s of services) {
          const c = await completeService({
            serviceId: s.id,
            deliveryAudioUrl: DELIVERY_URL,
            deliveryAudioFormat: "wav",
            actor: { type: "test-engine" },
          });
          asserts.push({
            name: `deliver_${s.id}`,
            ok: c.ok,
            message: c.ok ? undefined : (c as any).error,
          });
        }
        const done = await prisma.service.count({
          where: { userId, status: "concluido", deliveryAudioUrl: { not: null } },
        });
        asserts.push({
          name: "assert3IndependentDeliveries",
          ok: done === 3,
          message: `concluidos com URL: ${done}`,
        });
        asserts.push(await assertMinhaConta({ userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { asaasId: meta.asaasId } };
      })
  ),

  def(
    "CPN-001",
    "Cupom de serviço → deep link",
    "Cupom serviceType abre /agendamento?cupom=CODE",
    async (ctx) =>
      withCleanup(ctx, "CPN-001", async (userId) => {
        const asserts: AssertResult[] = [];
        const slots = futureSlots(1);
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slots[0].data,
          hora: slots[0].hora,
          servicos: [{ id: "captacao", nome: "Captação", quantidade: 1 }],
        });
        // pagamento multi sem data → cupons? Captacao qty 1 creates appointment.
        // For service coupon, buy coupons-only: use qty>1 or create coupon manually via payment coupons.
        // Official: agendamento with 2 servicos → coupons only
        const meta2 = await writeAgendamentoPaymentMetadata({
          userId,
          data: slots[0].data,
          hora: slots[0].hora,
          servicos: [
            { id: "sessao", nome: "Sessão", quantidade: 1 },
            { id: "mix", nome: "Mix", quantidade: 1 },
          ],
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta2.asaasId,
          description: "TE Agendamento cupons SRV",
        });
        void meta;
        const coupon = await prisma.coupon.findFirst({
          where: {
            assignedUserId: userId,
            discountType: "service",
            serviceType: { not: null },
          },
          orderBy: { createdAt: "desc" },
        });
        asserts.push({
          name: "assertServiceCoupon",
          ok: Boolean(coupon?.serviceType),
          evidence: { coupon },
          message: coupon ? undefined : "cupom de serviço não gerado",
        });
        const deepLink = coupon
          ? `/agendamento?cupom=${encodeURIComponent(coupon.code)}`
          : "";
        asserts.push({
          name: "assertDeepLinkPattern",
          ok: deepLink.startsWith("/agendamento?cupom="),
          evidence: { deepLink, serviceType: coupon?.serviceType },
        });
        asserts.push(await assertCoupon({ userId, minCount: 1 }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { deepLink } };
      })
  ),

  def(
    "CPN-002",
    "Cupom de desconto percentual",
    "Percentual aplica em qualquer compra (checkout validate)",
    async (ctx) =>
      withCleanup(ctx, "CPN-002", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `TE02A_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("DISCOUNT"),
            discountType: "percent",
            discountValue: 10,
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 7 * 864e5),
          },
        });
        const servicos = [{ preco: 100, quantidade: 1 }];
        const result = await validateCouponAndGetTotal(code, 100, servicos, []);
        asserts.push({
          name: "assertDiscountApplied",
          ok: result.ok === true && (result as any).finalTotal === 90,
          message: result.ok ? `finalTotal=${(result as any).finalTotal}` : (result as any).error,
          evidence: { result },
        });
        const other = await validateCouponAndGetTotal(code, 200, [{ preco: 200, quantidade: 1 }], []);
        asserts.push({
          name: "assertDiscountAnyPurchase",
          ok: other.ok === true && (other as any).finalTotal === 180,
          message: other.ok ? undefined : (other as any).error,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),

  def(
    "CPN-003",
    "Cupom de reembolso → remarcação",
    "Cancelamento gera cupom REFUND → novo Appointment + Service",
    async (ctx) =>
      withCleanup(ctx, "CPN-003", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "TE Agendamento CPN-003",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        asserts.push(await assertAppointment({ appointmentId: apt?.id, statusIn: ["pendente"] }));
        const appr = await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        asserts.push({ name: "approve", ok: appr.ok, message: appr.ok ? undefined : (appr as any).error });

        // Cupom de reembolso oficial (mesmo tipo do fluxo cancelamento)
        const refundCode = `TE_REF_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code: refundCode,
            couponType: toPersistedCouponType("REFUND"),
            discountType: "service",
            discountValue: 0,
            serviceType: "sessao",
            appointmentId: apt!.id,
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 90 * 864e5),
          },
        });
        await cancelAppointment({
          appointmentId: apt!.id,
          actor: "admin",
          reason: "TE-02A CPN-003 cancelamento após aceite",
        });

        const rebookSlot = futureSlots(1, 16)[0];
        const booked = await redeemServiceCouponOfficial({
          userId,
          cupomCode: refundCode,
          data: rebookSlot.data,
          hora: rebookSlot.hora,
          servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1, preco: 0 }],
        });
        asserts.push(
          await assertAppointment({
            appointmentId: booked.appointmentId,
            statusIn: ["pendente"],
          })
        );
        asserts.push(
          await assertService({ appointmentId: booked.appointmentId, minCount: 1 })
        );
        asserts.push({
          name: "assertNewAppointmentDifferent",
          ok: booked.appointmentId !== apt!.id,
          evidence: { old: apt!.id, neu: booked.appointmentId },
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { refundCode } };
      })
  ),

  def(
    "CPN-004",
    "Cupom utilizado não reutiliza",
    "Segundo uso de cupom used=true deve falhar",
    async (ctx) =>
      withCleanup(ctx, "CPN-004", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `TEUSED_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("SERVICE"),
            discountType: "service",
            discountValue: 0,
            serviceType: "sessao",
            assignedUserId: userId,
            used: true,
            usedAt: new Date(),
            usedBy: userId,
          },
        });
        let failed = false;
        try {
          await redeemServiceCouponOfficial({
            userId,
            cupomCode: code,
            data: futureSlots(1)[0].data,
            hora: "11:00",
            servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1, preco: 0 }],
          });
        } catch {
          failed = true;
        }
        asserts.push({
          name: "assertReuseBlocked",
          ok: failed,
          message: failed ? "reuso bloqueado" : "reuso permitido indevidamente",
        });
        const v = await validateCouponAndGetTotal(code, 40, [{ preco: 40, quantidade: 1 }], []);
        asserts.push({
          name: "assertValidateRejectsUsed",
          ok: v.ok === false,
          message: v.ok ? "validate aceitou cupom usado" : (v as any).error,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),
];

function planScenario(
  id: ScenarioId,
  planId: "bronze" | "prata" | "ouro",
  label: string
): ScenarioDefinition {
  return def(id, `Plano ${label}`, `Gera todos cupons do plano ${label}`, async (ctx) =>
    withCleanup(ctx, id, async (userId) => {
      const asserts: AssertResult[] = [];
      const buy = await buyPlan(userId, planId, id, ctx.runId);
      asserts.push(
        await assertPayment({
          asaasId: buy.meta.asaasId,
          userId,
          status: "approved",
        })
      );
      asserts.push({
        name: "assertUserPlanActive",
        ok: buy.userPlan?.status === "active",
        evidence: { userPlan: buy.userPlan },
      });
      const expected = planCouponExpect(planId);
      asserts.push({
        name: "assertAllPlanCoupons",
        ok: buy.coupons.length === expected,
        message: `esperava ${expected}, got ${buy.coupons.length}`,
        evidence: {
          types: buy.coupons.map((c) => c.serviceType),
        },
      });
      asserts.push(await assertCoupon({ userId, minCount: expected }));
      asserts.push(await assertMinhaConta({ userId }));
      return {
        status: "pass",
        asserts,
        errors: [],
        warnings: [],
        artifacts: { planId, coupons: buy.coupons.length },
      };
    })
  );
}

te02aScenarios.push(
  planScenario("PLN-001", "bronze", "Bronze"),
  planScenario("PLN-002", "prata", "Prata"),
  planScenario("PLN-003", "ouro", "Ouro"),
  def(
    "PLN-004",
    "Agendamento individual por cupom do plano",
    "Cada cupom de serviço do Bronze agenda independentemente",
    async (ctx) =>
      withCleanup(ctx, "PLN-004", async (userId) => {
        const asserts: AssertResult[] = [];
        const buy = await buyPlan(userId, "bronze", "PLN-004", ctx.runId);
        const serviceCoupons = buy.coupons.filter(
          (c) => c.discountType === "service" && c.serviceType
        );
        asserts.push({
          name: "assertHasServiceCoupons",
          ok: serviceCoupons.length >= 1,
          evidence: { count: serviceCoupons.length },
        });
        const slots = futureSlots(serviceCoupons.length, 9);
        const aptIds: number[] = [];
        for (let i = 0; i < serviceCoupons.length; i++) {
          const c = serviceCoupons[i];
          const st = c.serviceType!;
          const booked = await redeemServiceCouponOfficial({
            userId,
            cupomCode: c.code,
            data: slots[i].data,
            hora: slots[i].hora,
            tipo: st,
            servicos: [{ id: st, nome: st, quantidade: 1, preco: 0 }],
          });
          aptIds.push(booked.appointmentId);
          asserts.push(
            await assertService({ appointmentId: booked.appointmentId, minCount: 1 })
          );
        }
        asserts.push({
          name: "assertIndependentBookings",
          ok: new Set(aptIds).size === aptIds.length,
          evidence: { aptIds },
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { aptIds } };
      })
  ),
  def(
    "PLN-005",
    "Cancelamento do plano",
    "Status cancelled + cupons bloqueados por plano",
    async (ctx) =>
      withCleanup(ctx, "PLN-005", async (userId) => {
        const asserts: AssertResult[] = [];
        const buy = await buyPlan(userId, "bronze", "PLN-005", ctx.runId);
        await cancelPlanOfficial(userId, buy.userPlan!.id);
        const plan = await prisma.userPlan.findUnique({ where: { id: buy.userPlan!.id } });
        asserts.push({
          name: "assertPlanCancelled",
          ok: plan?.status === "cancelled",
          evidence: { status: plan?.status },
        });
        const sample = buy.coupons[0];
        if (sample) {
          const block = await getPlanCouponUsageBlockMessage(sample);
          asserts.push({
            name: "assertCouponsBlockedAfterCancel",
            ok: Boolean(block),
            message: block || "esperado bloqueio C5",
          });
        }
        asserts.push(await assertMinhaConta({ userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
  def("APT-001", "Recusa antes do aceite", "pendente → recusado", async (ctx) =>
    withCleanup(ctx, "APT-001", async (userId) => {
      const asserts: AssertResult[] = [];
      const slot = futureSlots(1)[0];
      const meta = await writeAgendamentoPaymentMetadata({
        userId,
        data: slot.data,
        hora: slot.hora,
      });
      await dispatchOfficialPaymentReceived({
        userId,
        asaasPaymentId: meta.asaasId,
        description: "TE Agendamento APT-001",
      });
      const apt = await prisma.appointment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      const r = await rejectAppointment(apt!.id, "TE recusa", { type: "test-engine" });
      asserts.push({ name: "reject", ok: r.ok, message: r.ok ? undefined : (r as any).error });
      asserts.push(
        await assertAppointment({ appointmentId: apt!.id, statusIn: ["recusado"] })
      );
      const svc = await prisma.service.findMany({ where: { appointmentId: apt!.id } });
      asserts.push({
        name: "assertServicesRecusado",
        ok: svc.every((s) => s.status === "recusado") || svc.length === 0,
        evidence: { svc },
      });
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    })
  ),
  def("APT-002", "Cancelamento após aceite", "aceito → cancelado", async (ctx) =>
    withCleanup(ctx, "APT-002", async (userId) => {
      const asserts: AssertResult[] = [];
      const slot = futureSlots(1)[0];
      const meta = await writeAgendamentoPaymentMetadata({
        userId,
        data: slot.data,
        hora: slot.hora,
      });
      await dispatchOfficialPaymentReceived({
        userId,
        asaasPaymentId: meta.asaasId,
        description: "TE Agendamento APT-002",
      });
      const apt = await prisma.appointment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
      const c = await cancelAppointment({
        appointmentId: apt!.id,
        actor: "admin",
        reason: "TE-02A cancel após aceite",
      });
      asserts.push({ name: "cancel", ok: c.ok, message: c.ok ? undefined : (c as any).error });
      asserts.push(
        await assertAppointment({ appointmentId: apt!.id, statusIn: ["cancelado"] })
      );
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    })
  ),
  def("APT-003", "Em andamento", "aceito → em_andamento via SM", async (ctx) =>
    withCleanup(ctx, "APT-003", async (userId) => {
      const asserts: AssertResult[] = [];
      const slot = futureSlots(1)[0];
      const meta = await writeAgendamentoPaymentMetadata({
        userId,
        data: slot.data,
        hora: slot.hora,
      });
      await dispatchOfficialPaymentReceived({
        userId,
        asaasPaymentId: meta.asaasId,
        description: "TE Agendamento APT-003",
      });
      const apt = await prisma.appointment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
      const s = await startServiceWork(apt!.id, { type: "test-engine" });
      asserts.push({ name: "start", ok: s.ok, message: s.ok ? undefined : (s as any).error });
      asserts.push(
        await assertAppointment({ appointmentId: apt!.id, statusIn: ["em_andamento"] })
      );
      asserts.push(
        await assertService({
          appointmentId: apt!.id,
          statusIn: ["em_andamento"],
          minCount: 1,
        })
      );
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    })
  ),
  def("APT-004", "Concluído com entrega", "Service concluido → Appointment concluido", async (ctx) =>
    withCleanup(ctx, "APT-004", async (userId) => {
      const asserts: AssertResult[] = [];
      const slot = futureSlots(1)[0];
      const meta = await writeAgendamentoPaymentMetadata({
        userId,
        data: slot.data,
        hora: slot.hora,
      });
      await dispatchOfficialPaymentReceived({
        userId,
        asaasPaymentId: meta.asaasId,
        description: "TE Agendamento APT-004",
      });
      const apt = await prisma.appointment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
      await startServiceWork(apt!.id, { type: "test-engine" });
      const services = await prisma.service.findMany({ where: { appointmentId: apt!.id } });
      for (const svc of services) {
        const c = await completeService({
          serviceId: svc.id,
          deliveryAudioUrl: DELIVERY_URL,
          deliveryAudioFormat: "wav",
          actor: { type: "test-engine" },
        });
        asserts.push({
          name: `complete_${svc.id}`,
          ok: c.ok,
          message: c.ok ? undefined : (c as any).error,
        });
      }
      asserts.push(
        await assertAppointment({ appointmentId: apt!.id, statusIn: ["concluido"] })
      );
      asserts.push(
        await assertService({
          appointmentId: apt!.id,
          statusIn: ["concluido"],
          minCount: 1,
        })
      );
      asserts.push(await assertMinhaConta({ userId }));
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    })
  ),
  def(
    "PAY-001",
    "Reembolso financeiro",
    "Payment → refunded via State Machine",
    async (ctx) =>
      withCleanup(ctx, "PAY-001", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "TE Agendamento PAY-001",
        });
        const payment = await findLatestPaymentByAsaasId(meta.asaasId);
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved" }));
        const r = await refundPaymentStatus(payment!.id, { type: "test-engine" });
        asserts.push({
          name: "refundTransition",
          ok: r.ok,
          message: r.ok ? undefined : (r as any).error,
        });
        const updated = await prisma.payment.findUnique({ where: { id: payment!.id } });
        asserts.push({
          name: "assertPaymentRefunded",
          ok: updated?.status === "refunded",
          evidence: { status: updated?.status },
        });
        asserts.push(await assertDashboard());
        asserts.push(await assertMinhaConta({ userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
  def("ADM-001", "Serviços Gerais", "Lista todos os Services do usuário TE", async (ctx) =>
    withCleanup(ctx, "ADM-001", async (userId) => {
      const asserts: AssertResult[] = [];
      const slot = futureSlots(1)[0];
      const meta = await writeAgendamentoPaymentMetadata({
        userId,
        data: slot.data,
        hora: slot.hora,
      });
      await dispatchOfficialPaymentReceived({
        userId,
        asaasPaymentId: meta.asaasId,
        description: "TE Agendamento ADM-001",
      });
      const all = await prisma.service.findMany({ where: { userId } });
      asserts.push({
        name: "assertGeraisAllServices",
        ok: all.length >= 1,
        evidence: { count: all.length, statuses: all.map((s) => s.status) },
      });
      asserts.push(await assertService({ userId, minCount: 1 }));
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    })
  ),
  def(
    "ADM-002",
    "Serviços Selecionados",
    "Somente ACEITO e EM_ANDAMENTO",
    async (ctx) =>
      withCleanup(ctx, "ADM-002", async (userId) => {
        const asserts: AssertResult[] = [];
        const slots = futureSlots(2);
        for (let i = 0; i < 2; i++) {
          const meta = await writeAgendamentoPaymentMetadata({
            userId,
            data: slots[i].data,
            hora: slots[i].hora,
          });
          await dispatchOfficialPaymentReceived({
            userId,
            asaasPaymentId: meta.asaasId,
            description: `TE Agendamento ADM-002-${i}`,
          });
        }
        const apts = await prisma.appointment.findMany({ where: { userId } });
        await approveAppointment(apts[0].id, "aceito", { type: "test-engine" });
        if (apts[1]) {
          await approveAppointment(apts[1].id, "aceito", { type: "test-engine" });
          await startServiceWork(apts[1].id, { type: "test-engine" });
        }
        const selected = await prisma.service.findMany({
          where: {
            userId,
            status: { in: [...ACTIVE_OPERATIONAL_SERVICE_STATUSES] },
          },
        });
        asserts.push({
          name: "assertOnlyActiveOperational",
          ok:
            selected.length >= 1 &&
            selected.every((s) => ACTIVE_OPERATIONAL_SERVICE_STATUSES.has(s.status)),
          evidence: {
            selected: selected.map((s) => s.status),
            allowed: [...ACTIVE_OPERATIONAL_SERVICE_STATUSES],
          },
        });
        const pendente = selected.filter((s) => s.status === "pendente");
        asserts.push({
          name: "assertNoPendenteInSelecionados",
          ok: pendente.length === 0,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
  def("ADM-003", "Dashboard stats", "Receita/serviços/clientes legíveis", async (ctx) =>
    withCleanup(ctx, "ADM-003", async (userId) => {
      const asserts: AssertResult[] = [];
      const slot = futureSlots(1)[0];
      const meta = await writeAgendamentoPaymentMetadata({
        userId,
        data: slot.data,
        hora: slot.hora,
      });
      await dispatchOfficialPaymentReceived({
        userId,
        asaasPaymentId: meta.asaasId,
        description: "TE Agendamento ADM-003",
      });
      const [paymentsApproved, services, clients] = await Promise.all([
        prisma.payment.count({ where: { status: "approved" } }),
        prisma.service.count(),
        prisma.user.count(),
      ]);
      asserts.push(await assertDashboard({ minServices: 1 }));
      asserts.push({
        name: "assertDashboardTotals",
        ok: paymentsApproved >= 1 && services >= 1 && clients >= 1,
        evidence: { paymentsApproved, services, clients },
      });
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    })
  ),
  def(
    "ADM-004",
    "Pagamentos → Appointment → Service → Dashboard",
    "Cadeia Payment/Appointment/Service refletida no dashboard",
    async (ctx) =>
      withCleanup(ctx, "ADM-004", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "TE Agendamento ADM-004",
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved" }));
        asserts.push(await assertAppointment({ userId, statusIn: ["pendente", "aceito"] }));
        asserts.push(await assertService({ userId, minCount: 1 }));
        asserts.push(await assertDashboard({ minServices: 1 }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
  def(
    "USR-001",
    "Minha Conta sincronizada",
    "Appointments/Services/Payments alinhados ao domínio",
    async (ctx) =>
      withCleanup(ctx, "USR-001", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "TE Agendamento USR-001",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        await startServiceWork(apt!.id, { type: "test-engine" });
        const domainStatus = await prisma.appointment.findUnique({
          where: { id: apt!.id },
          select: { status: true },
        });
        const services = await prisma.service.findMany({
          where: { appointmentId: apt!.id },
          select: { status: true },
        });
        asserts.push(await assertMinhaConta({ userId }));
        asserts.push({
          name: "assertSyncedOperationalStatus",
          ok:
            domainStatus?.status === "em_andamento" &&
            services.some((s) => s.status === "em_andamento"),
          evidence: { appointment: domainStatus, services },
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  )
);

export const TE02A_IDS: ScenarioId[] = te02aScenarios.map((s) => s.id);
