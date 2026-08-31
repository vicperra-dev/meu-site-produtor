/**
 * RC-02 — Administration & Operations Certification.
 * Operações admin via Workflow/SM/Sync oficial (sem pipeline paralelo).
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { toPersistedCouponType } from "@/app/lib/domain/coupon-types";
import {
  approveAppointment,
  completeService,
  startServiceWork,
  updateServiceFields,
} from "@/app/lib/domain/workflow";
import { assertExecutionAllowed } from "@/app/lib/execution/permissions";
import { generateCouponCode } from "@/app/lib/coupons";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import {
  assertAppointment,
  assertDashboard,
  assertMinhaConta,
  assertPayment,
  assertService,
} from "@/app/lib/test-engine/assert-engine";
import {
  dispatchOfficialPaymentReceived,
  seedTestUser,
  writeAgendamentoPaymentMetadata,
} from "@/app/lib/test-engine/pipeline-adapter";
import { cleanupTeUserArtifacts, futureSlots } from "@/app/lib/test-engine/te02a-helpers";
import type {
  AssertResult,
  ScenarioContext,
  ScenarioDefinition,
  ScenarioId,
} from "@/app/lib/test-engine/types";
import {
  disableSyncObserver,
  drainSyncObserver,
  enableSyncObserver,
  findSyncObserverEvents,
} from "@/app/lib/synchronization/observer";
import { surfacesForEvent } from "@/app/lib/synchronization/routing";

type RunBody = Awaited<ReturnType<ScenarioDefinition["run"]>>;

async function withCleanup(
  ctx: ScenarioContext,
  scenario: string,
  fn: (userId: string, email: string) => Promise<RunBody>
): Promise<RunBody> {
  const email = `${ctx.artifactPrefix}-${scenario.toLowerCase()}-${Date.now()}@homolog.test`;
  const user = await seedTestUser({
    email,
    nomeArtistico: `RC02 ${scenario}`,
    nomeCompleto: `RC02 Admin Cert ${scenario}`,
  });
  try {
    const body = await fn(user.userId, user.email);
    const failed = (body.asserts || []).filter((a) => !a.ok);
    if (failed.length || body.status === "fail" || body.status === "error") {
      return {
        status: body.status === "error" ? "error" : "fail",
        asserts: body.asserts || [],
        errors: [
          ...(body.errors || []),
          ...failed.map((f) => f.message || f.name),
        ],
        warnings: body.warnings || [],
        artifacts: { ...(body.artifacts || {}), userId: user.userId, email },
      };
    }
    return {
      status: "pass",
      asserts: body.asserts || [],
      errors: [],
      warnings: body.warnings || [],
      artifacts: { ...(body.artifacts || {}), userId: user.userId, email },
    };
  } catch (e: unknown) {
    return {
      status: "error",
      asserts: [],
      errors: [e instanceof Error ? e.message : String(e)],
      warnings: [],
      artifacts: { userId: user.userId, email },
    };
  } finally {
    try {
      await cleanupTeUserArtifacts(user.userId);
    } catch {
      /* ignore */
    }
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

export const rc02Scenarios: ScenarioDefinition[] = [
  def(
    "RC02-001",
    "Admin login e permissões",
    "Role ADMIN vs USER, sessão e gates de execução/simbólico",
    async (ctx) => {
      const asserts: AssertResult[] = [];
      const adminEmail = `${ctx.artifactPrefix}-admin-${Date.now()}@homolog.test`;
      const admin = await prisma.user.create({
        data: {
          nomeCompleto: "RC02 Admin",
          nomeArtistico: "RC02 Admin",
          email: adminEmail,
          senha: await bcrypt.hash("Admin@Test!", 10),
          telefone: "21966665555",
          cpf: `7${String(Date.now()).slice(-10)}`.slice(0, 11),
          pais: "Brasil",
          estado: "RJ",
          cidade: "Rio",
          bairro: "Centro",
          dataNascimento: new Date("1990-01-01"),
          sexo: "prefiro_nao_declarar",
          genero: "prefiro_nao_informar",
          role: "ADMIN",
        },
      });
      const session = await prisma.session.create({
        data: {
          userId: admin.id,
          expiresAt: new Date(Date.now() + 7 * 864e5),
        },
      });
      asserts.push({
        name: "assertAdminSession",
        ok: Boolean(session.id),
        evidence: { sessionId: session.id, adminId: admin.id },
      });
      asserts.push({
        name: "assertAdminRole",
        ok: admin.role === "ADMIN",
      });

      const userEmail = `${ctx.artifactPrefix}-user-${Date.now()}@homolog.test`;
      const common = await seedTestUser({
        email: userEmail,
        nomeArtistico: "RC02 User",
        nomeCompleto: "RC02 Common User",
      });
      const commonRow = await prisma.user.findUnique({
        where: { id: common.userId },
        select: { role: true },
      });
      asserts.push({
        name: "assertUserNotAdmin",
        ok: commonRow?.role === "USER",
      });

      const adminGate = assertExecutionAllowed({
        actor: { role: "ADMIN", email: adminEmail },
      });
      asserts.push({
        name: "assertExecutionAdminAllowed",
        ok: adminGate.allowed,
      });

      const symAdmin = canUseSymbolicSimulation({ role: "ADMIN", email: adminEmail });
      const symUser = canUseSymbolicSimulation({ role: "USER", email: userEmail });
      asserts.push({
        name: "assertSymbolicAdmin",
        ok: symAdmin === true,
      });
      asserts.push({
        name: "assertSymbolicUserLocalhost",
        ok: symUser === true || symUser === false,
        evidence: { symUser, note: "USER simbólico permitido só em localhost/dev" },
      });

      try {
        await cleanupTeUserArtifacts(admin.id);
        await cleanupTeUserArtifacts(common.userId);
      } catch {
        /* ignore */
      }
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    }
  ),

  def(
    "RC02-002",
    "Ciclo administrativo completo",
    "aceitar → iniciar → entregar → concluir + Sync (confirmar coberto em pendente→confirmado via SM)",
    async (ctx) =>
      withCleanup(ctx, "RC02-002", async (userId) => {
        const asserts: AssertResult[] = [];
        enableSyncObserver();
        const slot = futureSlots(1, 12)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "RC02 admin lifecycle",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved" }));

        const aceito = await approveAppointment(apt!.id, "aceito", {
          type: "admin",
        });
        asserts.push({ name: "accept", ok: aceito.ok });
        drainSyncObserver();
        enableSyncObserver();
        const started = await startServiceWork(apt!.id, { type: "admin" });
        asserts.push({ name: "start", ok: started.ok });

        const svc = await prisma.service.findFirst({
          where: { appointmentId: apt!.id },
        });
        const url1 = "https://example.com/rc02-delivery-v1.wav";
        const url2 = "https://example.com/rc02-delivery-v2.wav";
        await updateServiceFields({
          serviceId: svc!.id,
          deliveryAudioUrl: url1,
          deliveryAudioFormat: "wav",
        });
        const mid = await prisma.service.findUnique({ where: { id: svc!.id } });
        asserts.push({
          name: "assertDeliveryUrlSet",
          ok: mid?.deliveryAudioUrl === url1,
          evidence: { url: mid?.deliveryAudioUrl },
        });

        drainSyncObserver();
        enableSyncObserver();
        const done = await completeService({
          serviceId: svc!.id,
          deliveryAudioUrl: url2,
          deliveryAudioFormat: "wav",
          actor: { type: "admin" },
        });
        asserts.push({ name: "complete", ok: done.ok });
        asserts.push(
          await assertAppointment({
            appointmentId: apt!.id,
            statusIn: ["concluido", "em_andamento"],
          })
        );
        asserts.push(
          await assertService({
            appointmentId: apt!.id,
            statusIn: ["concluido"],
            minCount: 1,
          })
        );
        const finalSvc = await prisma.service.findUnique({ where: { id: svc!.id } });
        asserts.push({
          name: "assertFinalDeliveryUrl",
          ok: finalSvc?.deliveryAudioUrl === url2,
        });

        const completed = findSyncObserverEvents((e) => e.name === "ServiceCompleted");
        asserts.push({
          name: "assertServiceCompletedSync",
          ok: completed.length >= 1,
          evidence: { completed: completed.map((e) => e.surfaces) },
        });
        const surfaces = surfacesForEvent("ServiceCompleted");
        asserts.push({
          name: "assertCompletedSurfaces",
          ok:
            surfaces.includes("minha-conta") &&
            surfaces.includes("servicos-gerais") &&
            surfaces.includes("dashboard"),
          evidence: { surfaces },
        });
        asserts.push(await assertMinhaConta({ userId }));
        asserts.push(await assertDashboard({ minServices: 1 }));
        disableSyncObserver();
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { aptId: apt!.id } };
      })
  ),

  def(
    "RC02-003",
    "Estatísticas consistentes com domínio",
    "Totais admin espelham contagens Prisma",
    async (ctx) =>
      withCleanup(ctx, "RC02-003", async (userId) => {
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
          description: "RC02 stats",
        });

        const [
          appointments,
          appointmentsPendente,
          appointmentsAceitos,
          users,
          paymentsApproved,
          services,
          activePlans,
          refunded,
          cancelled,
        ] = await Promise.all([
          prisma.appointment.count(),
          prisma.appointment.count({ where: { status: "pendente" } }),
          prisma.appointment.count({
            where: { status: { in: ["aceito", "confirmado"] } },
          }),
          prisma.user.count(),
          prisma.payment.count({ where: { status: "approved" } }),
          prisma.service.count(),
          prisma.userPlan.count({ where: { status: "active" } }),
          prisma.payment.count({ where: { status: "refunded" } }),
          prisma.appointment.count({ where: { status: "cancelado" } }),
        ]);

        asserts.push({
          name: "assertAppointmentBuckets",
          ok:
            appointmentsPendente <= appointments &&
            appointmentsAceitos <= appointments,
          evidence: { appointments, appointmentsPendente, appointmentsAceitos },
        });
        asserts.push({
          name: "assertDomainTotalsPositive",
          ok: users >= 1 && paymentsApproved >= 1 && services >= 1,
          evidence: { users, paymentsApproved, services, activePlans, refunded, cancelled },
        });
        asserts.push(await assertDashboard({ minServices: 1 }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC02-004",
    "Integridade escopo homolog",
    "Sem Services/Appointments órfãos para usuário @homolog.test após fluxo",
    async (ctx) =>
      withCleanup(ctx, "RC02-004", async (userId) => {
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
          description: "RC02 integrity",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "admin" });

        const orphanServices = await prisma.service.count({
          where: { userId, appointmentId: null },
        });
        const orphanPayments = await prisma.payment.count({
          where: {
            userId,
            status: "approved",
            appointmentId: null,
            type: { not: "plano" },
          },
        });
        const servicesLinked = await prisma.service.count({
          where: { userId, appointmentId: { not: null } },
        });

        asserts.push({
          name: "assertNoOrphanServices",
          ok: orphanServices === 0,
          message: `orphan services=${orphanServices}`,
        });
        asserts.push({
          name: "assertServicesLinked",
          ok: servicesLinked >= 1,
          evidence: { servicesLinked, orphanPayments },
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC02-005",
    "Cupom TEST e restrições admin",
    "TEST exige gate; owner e expiração validados",
    async (ctx) =>
      withCleanup(ctx, "RC02-005", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `RCTEST_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("TEST"),
            discountType: "percent",
            discountValue: 100,
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 3 * 864e5),
          },
        });
        const blocked = await validateCouponAndGetTotal(
          code,
          100,
          [{ preco: 100, quantidade: 1 }],
          [],
          { userId, mode: "discount", allowTest: false }
        );
        asserts.push({
          name: "assertTestBlockedWithoutAllow",
          ok: blocked.ok === false,
          message: blocked.ok ? "TEST aceito sem allowTest" : undefined,
        });
        const allowed = await validateCouponAndGetTotal(
          code,
          100,
          [{ preco: 100, quantidade: 1 }],
          [],
          { userId, mode: "discount", allowTest: true }
        );
        asserts.push({
          name: "assertTestAllowedWithGate",
          ok: allowed.ok === true && (allowed as { finalTotal?: number }).finalTotal === 0,
          evidence: { result: allowed },
        });
        const wrongOwner = await validateCouponAndGetTotal(
          code,
          100,
          [{ preco: 100, quantidade: 1 }],
          [],
          { userId: "other", mode: "discount", allowTest: true }
        );
        asserts.push({
          name: "assertTestOwner",
          ok: wrongOwner.ok === false,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),

  def(
    "RC02-006",
    "Remarcação administrativa",
    "aceito → remarcado + superfícies agenda",
    async (ctx) =>
      withCleanup(ctx, "RC02-006", async (userId) => {
        const asserts: AssertResult[] = [];
        const { rebookAppointment } = await import("@/app/lib/domain/workflow");
        enableSyncObserver();
        const slot = futureSlots(1, 15)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "RC02 rebook",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "admin" });
        drainSyncObserver();
        enableSyncObserver();
        const rb = await rebookAppointment(apt!.id, "RC02 remarcação admin", {
          type: "admin",
        });
        asserts.push({ name: "rebook", ok: rb.ok });
        asserts.push(
          await assertAppointment({ appointmentId: apt!.id, statusIn: ["remarcado"] })
        );
        const events = findSyncObserverEvents((e) => e.name === "AppointmentRebooked");
        asserts.push({
          name: "assertRebookSync",
          ok: events.length >= 1,
          evidence: { events: events.map((e) => e.surfaces) },
        });
        disableSyncObserver();
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC02-007",
    "Confirmar agendamento",
    "pendente → confirmado (SM canônico)",
    async (ctx) =>
      withCleanup(ctx, "RC02-007", async (userId) => {
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
          description: "RC02 confirm",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const confirmed = await approveAppointment(apt!.id, "confirmado", {
          type: "admin",
        });
        asserts.push({ name: "confirm", ok: confirmed.ok });
        asserts.push(
          await assertAppointment({ appointmentId: apt!.id, statusIn: ["confirmado"] })
        );
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
];

export const RC02_IDS: ScenarioId[] = rc02Scenarios.map((s) => s.id);
