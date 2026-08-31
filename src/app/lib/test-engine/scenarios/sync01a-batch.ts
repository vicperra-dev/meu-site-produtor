/**
 * SYNC-01A — Cenários determinísticos do Synchronization Engine (sem sleeps).
 */

import { prisma } from "@/app/lib/prisma";
import {
  approveAppointment,
  cancelAppointment,
  completeService,
  startServiceWork,
} from "@/app/lib/domain/workflow";
import {
  assertAppointment,
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
  writePlanoPaymentMetadata,
} from "@/app/lib/test-engine/te02a-helpers";
import {
  disableSyncObserver,
  drainSyncObserver,
  enableSyncObserver,
  findSyncObserverEvents,
} from "@/app/lib/synchronization/observer";
import { surfacesForEvent } from "@/app/lib/synchronization/routing";
import { listSyncEventsSince } from "@/app/lib/synchronization/engine";
import type {
  AssertResult,
  ScenarioContext,
  ScenarioDefinition,
  ScenarioId,
} from "@/app/lib/test-engine/types";

const DELIVERY_URL = "https://example.com/sync01a-delivery.wav";

export const SYNC01A_IDS: ScenarioId[] = [
  "SYNC-001",
  "SYNC-002",
  "SYNC-003",
  "SYNC-004",
  "SYNC-005",
  "SYNC-006",
  "SYNC-007",
];

type RunBody = Awaited<ReturnType<ScenarioDefinition["run"]>>;

async function withCleanup(
  ctx: ScenarioContext,
  scenario: string,
  fn: (userId: string) => Promise<RunBody>
): Promise<RunBody> {
  const email = `${ctx.artifactPrefix}-${scenario.toLowerCase()}-${Date.now()}@homolog.test`;
  const user = await seedTestUser({
    email,
    nomeArtistico: `SYNC ${scenario}`,
    nomeCompleto: `Sync Engine ${scenario}`,
  });
  enableSyncObserver();
  try {
    const body = await fn(user.userId);
    const cleanup = await cleanupTeUserArtifacts(user.userId);
    return {
      ...body,
      artifacts: {
        ...(body.artifacts || {}),
        userId: user.userId,
        email,
        scenario,
        runId: ctx.runId,
        cleanup,
        syncEvents: drainSyncObserver(),
      },
    };
  } catch (err) {
    try {
      await cleanupTeUserArtifacts(user.userId);
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    disableSyncObserver();
  }
}

function def(
  id: ScenarioId,
  name: string,
  description: string,
  run: ScenarioDefinition["run"]
): ScenarioDefinition {
  return { id, name, description, status: "implemented", run };
}

export const sync01aScenarios: ScenarioDefinition[] = [
  def(
    "SYNC-001",
    "PaymentConfirmed → sync envelopes",
    "Pagamento confirmado gera envelopes para minha-conta/pagamentos",
    async (ctx) =>
      withCleanup(ctx, "SYNC-001", async (userId) => {
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
          description: "TE Agendamento SYNC-001",
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved" }));
        const paymentEvents = findSyncObserverEvents(
          (e) => e.name === "PaymentConfirmed" || e.name === "AppointmentReserved"
        );
        asserts.push({
          name: "assertSyncPaymentOrReserved",
          ok: paymentEvents.length > 0,
          evidence: { names: paymentEvents.map((e) => e.name) },
        });
        const mc = surfacesForEvent("PaymentConfirmed");
        asserts.push({
          name: "assertSurfacesIncludeMinhaConta",
          ok: mc.includes("minha-conta") && mc.includes("pagamentos"),
          evidence: { mc },
        });
        asserts.push(await assertMinhaConta({ userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "SYNC-002",
    "Admin accept → sync cascade",
    "AppointmentAccepted notifica minhas superfícies admin/user",
    async (ctx) =>
      withCleanup(ctx, "SYNC-002", async (userId) => {
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
          description: "TE Agendamento SYNC-002",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        drainSyncObserver();
        enableSyncObserver();
        const r = await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        asserts.push({ name: "approve", ok: r.ok });
        asserts.push(
          await assertAppointment({ appointmentId: apt!.id, statusIn: ["aceito", "confirmado"] })
        );
        const accepted = findSyncObserverEvents((e) => e.name === "AppointmentAccepted");
        asserts.push({
          name: "assertAppointmentAcceptedEvent",
          ok: accepted.length >= 1,
          evidence: { accepted },
        });
        const surfaces = surfacesForEvent("AppointmentAccepted");
        asserts.push({
          name: "assertAdminAndUserSurfaces",
          ok:
            surfaces.includes("minha-conta") &&
            surfaces.includes("servicos-selecionados") &&
            surfaces.includes("dashboard"),
          evidence: { surfaces },
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "SYNC-003",
    "ServiceStarted → dashboard/services surfaces",
    "Início de serviço publica ServiceStarted/AppointmentStarted",
    async (ctx) =>
      withCleanup(ctx, "SYNC-003", async (userId) => {
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
          description: "TE Agendamento SYNC-003",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        drainSyncObserver();
        enableSyncObserver();
        const started = await startServiceWork(apt!.id, { type: "test-engine" });
        asserts.push({ name: "start", ok: started.ok });
        const events = findSyncObserverEvents(
          (e) => e.name === "AppointmentStarted" || e.name === "ServiceStarted"
        );
        asserts.push({
          name: "assertStartEvents",
          ok: events.length >= 1,
          evidence: { events: events.map((e) => e.name) },
        });
        asserts.push({
          name: "assertDashboardSurface",
          ok: surfacesForEvent("AppointmentStarted").includes("dashboard"),
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "SYNC-004",
    "ServiceCompleted → selecionados/gerais/minha-conta",
    "Conclusão remove da seleção e sincroniza superfícies",
    async (ctx) =>
      withCleanup(ctx, "SYNC-004", async (userId) => {
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
          description: "TE Agendamento SYNC-004",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        await startServiceWork(apt!.id, { type: "test-engine" });
        const svc = await prisma.service.findFirst({ where: { appointmentId: apt!.id } });
        drainSyncObserver();
        enableSyncObserver();
        const done = await completeService({
          serviceId: svc!.id,
          deliveryAudioUrl: DELIVERY_URL,
          deliveryAudioFormat: "wav",
          actor: { type: "test-engine" },
        });
        asserts.push({ name: "complete", ok: done.ok });
        asserts.push(
          await assertService({
            appointmentId: apt!.id,
            userId,
            statusIn: ["concluido"],
            minCount: 1,
          })
        );
        const completed = findSyncObserverEvents((e) => e.name === "ServiceCompleted");
        asserts.push({
          name: "assertServiceCompletedEvent",
          ok: completed.length >= 1,
          evidence: { completed },
        });
        const surfaces = surfacesForEvent("ServiceCompleted");
        asserts.push({
          name: "assertCompletedSurfaces",
          ok:
            surfaces.includes("servicos-selecionados") &&
            surfaces.includes("servicos-gerais") &&
            surfaces.includes("minha-conta"),
          evidence: { surfaces },
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "SYNC-005",
    "AppointmentReserved agenda pública",
    "Reserva publica envelope agenda (scope public companion)",
    async (ctx) =>
      withCleanup(ctx, "SYNC-005", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1, 14)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "TE Agendamento SYNC-005",
        });
        const reserved = findSyncObserverEvents((e) => e.name === "AppointmentReserved");
        asserts.push({
          name: "assertReserved",
          ok: reserved.length >= 1,
          evidence: { reserved: reserved.map((e) => ({ scope: e.scope, surfaces: e.surfaces })) },
        });
        const publicOnes = reserved.filter((e) => e.scope === "public");
        asserts.push({
          name: "assertPublicAgendaCompanion",
          ok: publicOnes.some((e) => e.surfaces.includes("agenda")),
          evidence: { publicOnes },
        });
        // Segunda reserva no mesmo slot deve falhar/criar 0 (conflito)
        const user2 = await seedTestUser({
          email: `${ctx.artifactPrefix}-sync005b-${Date.now()}@homolog.test`,
          nomeArtistico: "SYNC conflict",
          nomeCompleto: "Sync Conflict",
        });
        try {
          const meta2 = await writeAgendamentoPaymentMetadata({
            userId: user2.userId,
            data: slot.data,
            hora: slot.hora,
          });
          await dispatchOfficialPaymentReceived({
            userId: user2.userId,
            asaasPaymentId: meta2.asaasId,
            description: "TE Agendamento SYNC-005 conflict",
          });
          const apts2 = await prisma.appointment.count({ where: { userId: user2.userId } });
          asserts.push({
            name: "assertConflictBlocksSecond",
            ok: apts2 === 0,
            evidence: { apts2 },
          });
        } finally {
          await cleanupTeUserArtifacts(user2.userId);
        }
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "SYNC-006",
    "CouponConsumed via cancel/rebuild path surfaces",
    "Cancelamento após aceite → envelope Coupon/Appointment",
    async (ctx) =>
      withCleanup(ctx, "SYNC-006", async (userId) => {
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
          description: "TE Agendamento SYNC-006",
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
          reason: "SYNC-01A cancel after accept",
        });
        asserts.push({ name: "cancel", ok: c.ok });
        const cancelled = findSyncObserverEvents((e) => e.name === "AppointmentCancelled");
        asserts.push({
          name: "assertCancelledEvent",
          ok: cancelled.length >= 1,
          evidence: { cancelled },
        });
        asserts.push({
          name: "assertCouponSurfaceOnCancel",
          ok: surfacesForEvent("AppointmentCancelled").includes("cupons"),
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "SYNC-007",
    "PlanCancelled → sync planos/cupons/minha-conta",
    "Cancelamento de plano publica PlanCancelled e replay cursor",
    async (ctx) =>
      withCleanup(ctx, "SYNC-007", async (userId) => {
        const asserts: AssertResult[] = [];
        const planMeta = await writePlanoPaymentMetadata({
          userId,
          planId: "bronze",
          planName: "Bronze",
          scenario: "SYNC-007",
          runId: ctx.runId,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: planMeta.asaasId,
          description: "Plano Bronze TE SYNC-007",
        });
        const userPlan = await prisma.userPlan.findFirst({
          where: { userId, status: "active" },
          orderBy: { createdAt: "desc" },
        });
        asserts.push({
          name: "assertPlanActive",
          ok: Boolean(userPlan),
          evidence: { userPlan },
        });
        drainSyncObserver();
        enableSyncObserver();
        await prisma.userPlan.update({
          where: { id: userPlan!.id },
          data: { status: "cancelled" },
        });
        const { emitPlanCancelled } = await import("@/app/lib/synchronization/lifecycle");
        await emitPlanCancelled({
          userPlanId: userPlan!.id,
          userId,
          metadata: { planName: "Bronze", via: "SYNC-007" },
        });
        const planEvents = findSyncObserverEvents((e) => e.name === "PlanCancelled");
        asserts.push({
          name: "assertPlanCancelledEvent",
          ok: planEvents.length >= 1,
          evidence: { planEvents },
        });
        const surfaces = surfacesForEvent("PlanCancelled");
        asserts.push({
          name: "assertPlanSurfaces",
          ok:
            surfaces.includes("minha-conta") &&
            surfaces.includes("cupons") &&
            surfaces.includes("dashboard"),
          evidence: { surfaces },
        });
        // Replay a partir do cursor imediatamente anterior ao PlanCancelled
        // (outbox acumulado de suites paralelas torna take=20 do início flaky).
        const planCursor = planEvents[0]?.cursor;
        const cursorBefore =
          planCursor && /^\d+$/.test(planCursor)
            ? String(BigInt(planCursor) - BigInt(1))
            : null;
        const replay = await listSyncEventsSince({
          userId,
          isAdmin: false,
          take: 20,
          cursor: cursorBefore,
        });
        asserts.push({
          name: "assertCursorReplay",
          ok: replay.events.some((e) => e.name === "PlanCancelled"),
          evidence: {
            count: replay.events.length,
            nextCursor: replay.nextCursor,
            cursorBefore,
            planCursor,
          },
        });
        void findLatestPaymentByAsaasId;
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
];
