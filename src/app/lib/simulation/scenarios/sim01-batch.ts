/**
 * SIM-01 — Cenários oficiais SIM-001 … SIM-010.
 * Pipeline: Simulation → Runner → Adapter → Workflow → SM → Sync → Assertions
 */

import { prisma } from "@/app/lib/prisma";
import {
  approveAppointment,
  cancelAppointment,
  completeService,
  rebookAppointment,
  refundPaymentStatus,
  startServiceWork,
} from "@/app/lib/domain/workflow";
import { toPersistedCouponType } from "@/app/lib/domain/coupon-types";
import { generateCouponCode } from "@/app/lib/coupons";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import type { AssertResult } from "@/app/lib/test-engine/types";
import {
  assertAgenda,
  assertAppointment,
  assertCoupon,
  assertDashboard,
  assertMinhaConta,
  assertPayment,
  assertService,
  assertStateMachine,
  assertStatistics,
  assertSynchronization,
  assertWorkflow,
} from "@/app/lib/simulation/assertions";
import { cleanupSimulationUser } from "@/app/lib/simulation/cleanup";
import { beginSimulationHooks, endSimulationHooks } from "@/app/lib/simulation/hooks";
import {
  dispatchOfficialPaymentEvent,
  dispatchOfficialPaymentReceived,
  dispatchOfficialPaymentReceivedDuplicate,
  findLatestPaymentByAsaasId,
  futureSlots,
  seedTestUser,
  redeemServiceCouponOfficial,
  writeAgendamentoPaymentMetadata,
  writePlanoPaymentMetadata,
} from "@/app/lib/simulation/pipeline";
import type { SimulationContext, SimulationDefinition, SimulationId } from "@/app/lib/simulation/types";
import {
  disableSyncObserver,
  drainSyncObserver,
  enableSyncObserver,
  findSyncObserverEvents,
} from "@/app/lib/synchronization/observer";

const DELIVERY_URL = "https://example.com/sim01-delivery.wav";

/** Slot único por cenário — evita colisão entre SIM-001…010 e suites TE paralelas. */
function simSlot(id: SimulationId, extraDayOffset = 0): { data: string; hora: string } {
  const idx = SIM01_IDS.indexOf(id);
  const hour = 9 + (idx % 7);
  const dayOffset = Math.floor(idx / 7) + extraDayOffset;
  const slots = futureSlots(1 + dayOffset, hour);
  return slots[dayOffset] ?? slots[0];
}

export const SIM01_IDS: SimulationId[] = [
  "SIM-001",
  "SIM-002",
  "SIM-003",
  "SIM-004",
  "SIM-005",
  "SIM-006",
  "SIM-007",
  "SIM-008",
  "SIM-009",
  "SIM-010",
];

type SimBody = Awaited<ReturnType<SimulationDefinition["run"]>>;

async function withSimulation(
  ctx: SimulationContext,
  scenario: SimulationId,
  fn: (userId: string, email: string) => Promise<Omit<SimBody, "userId" | "email" | "eventsProduced" | "cleanup">>
): Promise<SimBody> {
  const email = `${ctx.artifactPrefix}-${scenario.toLowerCase()}-${Date.now()}@homolog.test`;
  const user = await seedTestUser({
    email,
    nomeArtistico: `SIM ${scenario}`,
    nomeCompleto: `Simulation ${scenario}`,
  });
  beginSimulationHooks(ctx.runId);
  enableSyncObserver();
  try {
    const body = await fn(user.userId, user.email);
    const eventsProduced = drainSyncObserver();
    const cleanup = await cleanupSimulationUser(user.userId);
    const asserts = body.asserts || [];
    const failed = asserts.filter((a) => !a.ok);
    const status =
      body.status === "fail" || body.status === "error"
        ? body.status
        : failed.length
          ? "fail"
          : "pass";
    return {
      ...body,
      status,
      userId: user.userId,
      email: user.email,
      eventsProduced,
      cleanup,
      errors: failed.length
        ? [...(body.errors || []), ...failed.map((f) => f.message || f.name)]
        : body.errors || [],
    };
  } catch (err) {
    try {
      await cleanupSimulationUser(user.userId);
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    disableSyncObserver();
    endSimulationHooks();
  }
}

function def(
  id: SimulationId,
  name: string,
  description: string,
  pipeline: string[],
  run: SimulationDefinition["run"]
): SimulationDefinition {
  return { id, name, description, pipeline, run };
}

const BASE_PIPELINE = [
  "OfficialPipelineAdapter",
  "processPaymentWebhook",
  "Workflow",
  "StateMachine",
  "SynchronizationEngine",
];

export const sim01Scenarios: SimulationDefinition[] = [
  def(
    "SIM-001",
    "Pagamento aprovado",
    "Webhook PAYMENT_RECEIVED → Payment + Appointment + Service + Sync",
    BASE_PIPELINE,
    async (ctx) =>
      withSimulation(ctx, "SIM-001", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-001");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM Agendamento SIM-001",
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved", userId }));
        asserts.push(await assertAppointment({ userId, statusIn: ["pendente"] }));
        asserts.push(await assertService({ userId, minCount: 1 }));
        asserts.push(assertSynchronization({ eventName: "PaymentConfirmed", minCount: 1 }));
        asserts.push(await assertMinhaConta({ userId }));
        asserts.push(await assertDashboard({ minServices: 1 }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { asaasId: meta.asaasId } };
      })
  ),

  def(
    "SIM-002",
    "Pagamento recusado",
    "Webhook não confirmado não cria Payment nem artefatos",
    [...BASE_PIPELINE, "isConfirmedPaymentEvent gate"],
    async (ctx) =>
      withSimulation(ctx, "SIM-002", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-002");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        const res = await dispatchOfficialPaymentEvent({
          userId,
          asaasPaymentId: meta.asaasId,
          event: "PAYMENT_REFUSED",
          status: "REFUSED",
          description: "SIM refused SIM-002",
        });
        const payment = await findLatestPaymentByAsaasId(meta.asaasId);
        asserts.push({
          name: "assertNoPaymentCreated",
          ok: payment === null,
          message: payment ? "Payment não deveria existir" : undefined,
          evidence: { webhook: res },
        });
        const apts = await prisma.appointment.count({ where: { userId } });
        asserts.push({
          name: "assertNoAppointment",
          ok: apts === 0,
          message: `appointments=${apts}`,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { asaasId: meta.asaasId } };
      })
  ),

  def(
    "SIM-003",
    "Pagamento duplicado",
    "Dois PAYMENT_RECEIVED idempotentes — 1 Payment",
    BASE_PIPELINE,
    async (ctx) =>
      withSimulation(ctx, "SIM-003", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-003");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        const p1 = await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM SIM-003 first",
        });
        const p2 = await dispatchOfficialPaymentReceivedDuplicate({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM SIM-003 duplicate",
        });
        void p1;
        void p2;
        const count = await prisma.payment.count({ where: { asaasId: meta.asaasId } });
        asserts.push({
          name: "assertSinglePayment",
          ok: count === 1,
          message: `payment count=${count}`,
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved" }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { asaasId: meta.asaasId } };
      })
  ),

  def(
    "SIM-004",
    "Sessão completa",
    "Payment → aceite → em_andamento → concluído + entrega",
    [...BASE_PIPELINE, "approveAppointment", "startServiceWork", "completeService"],
    async (ctx) =>
      withSimulation(ctx, "SIM-004", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-004");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM SIM-004",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        drainSyncObserver();
        enableSyncObserver();
        await startServiceWork(apt!.id, { type: "test-engine" });
        const svc = await prisma.service.findFirst({ where: { appointmentId: apt!.id } });
        await completeService({
          serviceId: svc!.id,
          deliveryAudioUrl: DELIVERY_URL,
          deliveryAudioFormat: "wav",
          actor: { type: "test-engine" },
        });
        asserts.push(await assertAppointment({ appointmentId: apt!.id, statusIn: ["concluido", "em_andamento"] }));
        asserts.push(await assertService({ appointmentId: apt!.id, statusIn: ["concluido"], minCount: 1 }));
        asserts.push(assertSynchronization({ eventName: "ServiceCompleted", minCount: 1 }));
        asserts.push(await assertWorkflow({ entity: "service", entityId: svc!.id, eventName: "ServiceCompleted" }));
        asserts.push(await assertMinhaConta({ userId }));
        asserts.push(await assertStatistics());
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { appointmentId: apt!.id } };
      })
  ),

  def(
    "SIM-005",
    "Plano Bronze",
    "Pagamento plano → UserPlan ativo + cupons",
    [...BASE_PIPELINE, "processPlanoPaymentEffects"],
    async (ctx) =>
      withSimulation(ctx, "SIM-005", async (userId) => {
        const asserts: AssertResult[] = [];
        const meta = await writePlanoPaymentMetadata({
          userId,
          planId: "bronze",
          planName: "Bronze",
          scenario: "SIM-005",
          runId: ctx.runId,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "Plano Bronze SIM-005",
        });
        const plan = await prisma.userPlan.findFirst({
          where: { userId, planId: "bronze", status: "active" },
        });
        asserts.push({
          name: "assertBronzePlan",
          ok: Boolean(plan),
          evidence: { plan },
        });
        const coupons = await prisma.coupon.count({ where: { userPlanId: plan?.id } });
        asserts.push({
          name: "assertBronzeCoupons",
          ok: coupons >= 5,
          message: `coupons=${coupons}`,
        });
        asserts.push(assertSynchronization({ minCount: 1 }));
        asserts.push(await assertMinhaConta({ userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { userPlanId: plan?.id } };
      })
  ),

  def(
    "SIM-006",
    "Cupom Serviço",
    "Pagamento multi-serviço gera cupom + resgate oficial com-cupom",
    [...BASE_PIPELINE, "redeemServiceCouponOfficial"],
    async (ctx) =>
      withSimulation(ctx, "SIM-006", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-006");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
          servicos: [
            { id: "sessao", nome: "Sessão", quantidade: 1 },
            { id: "mix", nome: "Mix", quantidade: 1 },
          ],
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM Agendamento cupom serviço SIM-006",
        });
        const coupon = await prisma.coupon.findFirst({
          where: {
            assignedUserId: userId,
            discountType: "service",
            serviceType: { not: null },
          },
          orderBy: { createdAt: "desc" },
        });
        asserts.push({
          name: "assertServiceCouponGenerated",
          ok: Boolean(coupon?.serviceType),
          evidence: { coupon },
          message: coupon ? undefined : "cupom de serviço não gerado pelo pipeline",
        });
        const deepLink = coupon
          ? `/agendamento?cupom=${encodeURIComponent(coupon.code)}`
          : "";
        asserts.push({
          name: "assertDeepLink",
          ok: deepLink.startsWith("/agendamento?cupom="),
          evidence: { deepLink, serviceType: coupon?.serviceType },
        });
        asserts.push(await assertCoupon({ code: coupon?.code, userId }));
        const redeemSlot = simSlot("SIM-006", 1);
        const booked = await redeemServiceCouponOfficial({
          userId,
          cupomCode: coupon!.code,
          data: redeemSlot.data,
          hora: redeemSlot.hora,
          servicos: [{ id: coupon!.serviceType!, nome: coupon!.serviceType!, quantidade: 1, preco: 0 }],
        });
        asserts.push(
          await assertAppointment({
            appointmentId: booked.appointmentId,
            statusIn: ["pendente"],
          })
        );
        asserts.push(await assertService({ appointmentId: booked.appointmentId, minCount: 1 }));
        asserts.push(assertSynchronization({ minCount: 1 }));
        return {
          status: "pass",
          asserts,
          errors: [],
          warnings: [],
          artifacts: { code: coupon?.code, deepLink, appointmentId: booked.appointmentId },
        };
      })
  ),

  def(
    "SIM-007",
    "Cupom Desconto",
    "Percentual aplica em qualquer compra",
    ["validateCouponAndGetTotal"],
    async (ctx) =>
      withSimulation(ctx, "SIM-007", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `SIMDISC_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("DISCOUNT"),
            discountType: "percent",
            discountValue: 15,
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 7 * 864e5),
          },
        });
        const r1 = await validateCouponAndGetTotal(code, 100, [{ preco: 100, quantidade: 1 }], []);
        asserts.push({
          name: "assert15Percent",
          ok: r1.ok === true && (r1 as any).finalTotal === 85,
          evidence: { result: r1 },
        });
        const r2 = await validateCouponAndGetTotal(code, 200, [{ preco: 200, quantidade: 1 }], []);
        asserts.push({
          name: "assertAnyPurchase",
          ok: r2.ok === true && (r2 as any).finalTotal === 170,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),

  def(
    "SIM-008",
    "Reembolso financeiro",
    "Payment approved → refundPaymentStatus (SM) → refunded",
    [...BASE_PIPELINE, "refundPaymentStatus"],
    async (ctx) =>
      withSimulation(ctx, "SIM-008", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-008");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM SIM-008",
        });
        const payment = await findLatestPaymentByAsaasId(meta.asaasId);
        const r = await refundPaymentStatus(payment!.id, { type: "test-engine" });
        asserts.push({ name: "refundSM", ok: r.ok, message: r.ok ? undefined : (r as any).error });
        asserts.push(await assertPayment({ paymentId: payment!.id, status: "refunded" }));
        asserts.push(assertSynchronization({ eventName: "PaymentRefunded", minCount: 1 }));
        asserts.push(
          await assertStateMachine({
            entity: "payment",
            entityId: payment!.id,
            toStatus: "reembolsado",
          })
        );
        asserts.push(await assertDashboard());
        asserts.push(await assertMinhaConta({ userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { paymentId: payment!.id } };
      })
  ),

  def(
    "SIM-009",
    "Cancelamento após aceite",
    "aceito → cancelado via Workflow/SM",
    [...BASE_PIPELINE, "cancelAppointment"],
    async (ctx) =>
      withSimulation(ctx, "SIM-009", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-009");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM SIM-009",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        drainSyncObserver();
        enableSyncObserver();
        const c = await cancelAppointment({
          appointmentId: apt!.id,
          actor: "admin",
          reason: "SIM-01 cancelamento após aceite",
        });
        asserts.push({ name: "cancel", ok: c.ok });
        asserts.push(await assertAppointment({ appointmentId: apt!.id, statusIn: ["cancelado"] }));
        asserts.push(assertSynchronization({ eventName: "AppointmentCancelled", minCount: 1 }));
        asserts.push(
          await assertWorkflow({
            entity: "appointment",
            entityId: String(apt!.id),
            eventName: "AppointmentCancelled",
          })
        );
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { appointmentId: apt!.id } };
      })
  ),

  def(
    "SIM-010",
    "Remarcação",
    "aceito → remarcado via State Machine",
    [...BASE_PIPELINE, "rebookAppointment"],
    async (ctx) =>
      withSimulation(ctx, "SIM-010", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = simSlot("SIM-010");
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "SIM SIM-010",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        drainSyncObserver();
        enableSyncObserver();
        const rb = await rebookAppointment(apt!.id, "SIM-01 remarcação", { type: "test-engine" });
        asserts.push({ name: "rebook", ok: rb.ok, message: rb.ok ? undefined : (rb as any).error });
        asserts.push(await assertAppointment({ appointmentId: apt!.id, statusIn: ["remarcado"] }));
        asserts.push(assertSynchronization({ eventName: "AppointmentRebooked", minCount: 1 }));
        asserts.push(await assertAgenda());
        const events = findSyncObserverEvents((e) => e.name === "AppointmentRebooked");
        asserts.push({
          name: "assertAgendaSurface",
          ok: events.some((e) => e.surfaces.includes("agenda")),
          evidence: { events },
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { appointmentId: apt!.id } };
      })
  ),
];
