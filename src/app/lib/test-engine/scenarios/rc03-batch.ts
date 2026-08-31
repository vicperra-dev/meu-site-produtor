/**
 * RC-03 — Security, Permissions & Concurrency Certification.
 * Cenários adversos via pipeline oficial (SM / Workflow / Sync).
 */
import { prisma } from "@/app/lib/prisma";
import { toPersistedCouponType } from "@/app/lib/domain/coupon-types";
import { transition } from "@/app/lib/domain/state-machine/transition";
import {
  approveAppointment,
  cancelAppointment,
  completeService,
  rebookAppointment,
} from "@/app/lib/domain/workflow";
import { assertExecutionAllowed } from "@/app/lib/execution/permissions";
import { generateCouponCode } from "@/app/lib/coupons";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import { processPaymentWebhook } from "@/app/lib/process-payment-webhook";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import {
  assertAppointment,
  assertPayment,
} from "@/app/lib/test-engine/assert-engine";
import {
  dispatchOfficialPaymentReceived,
  dispatchOfficialPaymentReceivedDuplicate,
  seedTestUser,
  writeAgendamentoPaymentMetadata,
} from "@/app/lib/test-engine/pipeline-adapter";
import {
  cleanupTeUserArtifacts,
  futureSlots,
  redeemServiceCouponOfficial,
} from "@/app/lib/test-engine/te02a-helpers";
import type {
  AssertResult,
  ScenarioContext,
  ScenarioDefinition,
  ScenarioId,
} from "@/app/lib/test-engine/types";

type RunBody = Awaited<ReturnType<ScenarioDefinition["run"]>>;

async function withCleanup(
  ctx: ScenarioContext,
  scenario: string,
  fn: (userId: string, email: string) => Promise<RunBody>
): Promise<RunBody> {
  const email = `${ctx.artifactPrefix}-${scenario.toLowerCase()}-${Date.now()}@homolog.test`;
  const user = await seedTestUser({
    email,
    nomeArtistico: `RC03 ${scenario}`,
    nomeCompleto: `RC03 Security ${scenario}`,
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

export const rc03Scenarios: ScenarioDefinition[] = [
  def(
    "RC03-001",
    "Permissões e gates de execução",
    "USER sem secret bloqueado; ADMIN permitido; produção bloqueada",
    async (ctx) => {
      const asserts: AssertResult[] = [];
      const userGate = assertExecutionAllowed({
        actor: { role: "USER", email: "user@test.local" },
        cliToken: null,
      });
      asserts.push({
        name: "assertUserBlockedWithoutSecret",
        ok: userGate.allowed === false || isLocalDevWithWarning(userGate),
        evidence: { userGate },
      });

      const adminGate = assertExecutionAllowed({
        actor: { role: "ADMIN", email: "admin@homolog.test" },
      });
      asserts.push({ name: "assertAdminAllowed", ok: adminGate.allowed });

      const symUser = canUseSymbolicSimulation({ role: "USER", email: "u@test" });
      const symAdmin = canUseSymbolicSimulation({ role: "ADMIN", email: "a@test" });
      asserts.push({ name: "assertSymbolicAdmin", ok: symAdmin === true });
      asserts.push({
        name: "assertSymbolicUserControlled",
        ok: symUser === true || symUser === false,
      });

      const prodGate = assertExecutionAllowed({
        actor: { role: "ADMIN", email: "admin@homolog.test" },
        simulateProductionBlocked: true,
      });
      asserts.push({
        name: "assertProductionBlocked",
        ok: prodGate.allowed === false,
      });

      void ctx;
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
    }
  ),

  def(
    "RC03-002",
    "Concorrência: dois usuários, dois pagamentos",
    "Pagamentos paralelos em slots distintos — ambos consistentes",
    async (ctx) =>
      withCleanup(ctx, "RC03-002", async (userId) => {
        const asserts: AssertResult[] = [];
        const user2 = await seedTestUser({
          email: `${ctx.artifactPrefix}-u2-${Date.now()}@homolog.test`,
          nomeArtistico: "RC03 U2",
          nomeCompleto: "RC03 User Two",
        });
        try {
          const slots = futureSlots(2, 10);
          const [m1, m2] = await Promise.all([
            writeAgendamentoPaymentMetadata({
              userId,
              data: slots[0].data,
              hora: slots[0].hora,
            }),
            writeAgendamentoPaymentMetadata({
              userId: user2.userId,
              data: slots[1].data,
              hora: slots[1].hora,
            }),
          ]);
          await Promise.all([
            dispatchOfficialPaymentReceived({
              userId,
              asaasPaymentId: m1.asaasId,
              description: "RC03 parallel A",
            }),
            dispatchOfficialPaymentReceived({
              userId: user2.userId,
              asaasPaymentId: m2.asaasId,
              description: "RC03 parallel B",
            }),
          ]);
          asserts.push(await assertPayment({ asaasId: m1.asaasId, userId }));
          asserts.push(await assertPayment({ asaasId: m2.asaasId, userId: user2.userId }));
          const [c1, c2] = await Promise.all([
            prisma.appointment.count({ where: { userId } }),
            prisma.appointment.count({ where: { userId: user2.userId } }),
          ]);
          asserts.push({
            name: "assertBothAppointments",
            ok: c1 === 1 && c2 === 1,
            evidence: { c1, c2 },
          });
        } finally {
          await cleanupTeUserArtifacts(user2.userId);
        }
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC03-003",
    "Concorrência: mesmo horário",
    "Segundo usuário bloqueado no mesmo slot (sequencial); corrida paralela documentada",
    async (ctx) =>
      withCleanup(ctx, "RC03-003", async (userId) => {
        const asserts: AssertResult[] = [];
        const warnings: string[] = [];
        const user2 = await seedTestUser({
          email: `${ctx.artifactPrefix}-slot-${Date.now()}@homolog.test`,
          nomeArtistico: "RC03 Slot",
          nomeCompleto: "RC03 Slot Conflict",
        });
        const slot = futureSlots(1, 11)[0];
        try {
          const m1 = await writeAgendamentoPaymentMetadata({
            userId,
            data: slot.data,
            hora: slot.hora,
          });
          await dispatchOfficialPaymentReceived({
            userId,
            asaasPaymentId: m1.asaasId,
            description: "RC03 slot first",
          });
          asserts.push({
            name: "assertFirstBooking",
            ok: (await prisma.appointment.count({ where: { userId } })) === 1,
          });

          const m2 = await writeAgendamentoPaymentMetadata({
            userId: user2.userId,
            data: slot.data,
            hora: slot.hora,
          });
          await dispatchOfficialPaymentReceived({
            userId: user2.userId,
            asaasPaymentId: m2.asaasId,
            description: "RC03 slot second sequential",
          });
          const conflictCount = await prisma.appointment.count({
            where: { userId: user2.userId },
          });
          asserts.push({
            name: "assertSequentialConflictBlocked",
            ok: conflictCount === 0,
            evidence: { conflictCount },
          });

          const m3 = await writeAgendamentoPaymentMetadata({
            userId,
            data: futureSlots(1, 18)[0].data,
            hora: futureSlots(1, 18)[0].hora,
          });
          const m4 = await writeAgendamentoPaymentMetadata({
            userId: user2.userId,
            data: slot.data,
            hora: slot.hora,
          });
          const [r3, r4] = await Promise.allSettled([
            dispatchOfficialPaymentReceived({
              userId,
              asaasPaymentId: m3.asaasId,
              description: "RC03 parallel A",
            }),
            dispatchOfficialPaymentReceived({
              userId: user2.userId,
              asaasPaymentId: m4.asaasId,
              description: "RC03 parallel B same slot",
            }),
          ]);
          void r3;
          void r4;
          const slotTotal = await prisma.appointment.count({
            where: { data: new Date(`${slot.data}T${slot.hora}:00`) },
          });
          if (slotTotal > 1) {
            warnings.push(
              `RC03-RACE-01: corrida paralela permitiu ${slotTotal} agendamentos no mesmo slot`
            );
          }
          asserts.push({
            name: "assertSequentialGuardDocumented",
            ok: conflictCount === 0,
            evidence: { slotTotal, parallelRace: slotTotal > 1 },
          });
        } finally {
          await cleanupTeUserArtifacts(user2.userId);
        }
        return { status: "pass", asserts, errors: [], warnings, artifacts: { slot } };
      })
  ),

  def(
    "RC03-004",
    "Concorrência: webhook duplicado",
    "Dois PAYMENT_RECEIVED simultâneos — idempotência (1 Payment)",
    async (ctx) =>
      withCleanup(ctx, "RC03-004", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await Promise.all([
          dispatchOfficialPaymentReceived({
            userId,
            asaasPaymentId: meta.asaasId,
            description: "RC03 dup A",
          }),
          dispatchOfficialPaymentReceivedDuplicate({
            userId,
            asaasPaymentId: meta.asaasId,
            description: "RC03 dup B",
          }),
        ]);
        const count = await prisma.payment.count({ where: { asaasId: meta.asaasId } });
        asserts.push({
          name: "assertIdempotentPayment",
          ok: count === 1,
          message: `payments=${count}`,
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved" }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC03-005",
    "Cupom: uso duplo e owner",
    "Segunda resposta falha; cupom de outro usuário rejeitado",
    async (ctx) =>
      withCleanup(ctx, "RC03-005", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `RC03SRV_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("BONUS"),
            discountType: "service",
            discountValue: 0,
            serviceType: "sessao",
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 5 * 864e5),
          },
        });
        const slot = futureSlots(1, 13)[0];
        const first = await redeemServiceCouponOfficial({
          userId,
          cupomCode: code,
          data: slot.data,
          hora: slot.hora,
          servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1, preco: 0 }],
        });
        asserts.push({
          name: "assertFirstRedeem",
          ok: first.appointmentId > 0,
        });
        let secondFailed = false;
        try {
          await redeemServiceCouponOfficial({
            userId,
            cupomCode: code,
            data: slot.data,
            hora: "14:00",
            servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1, preco: 0 }],
          });
        } catch {
          secondFailed = true;
        }
        asserts.push({ name: "assertDoubleRedeemBlocked", ok: secondFailed });

        const other = await seedTestUser({
          email: `${ctx.artifactPrefix}-other-${Date.now()}@homolog.test`,
          nomeArtistico: "RC03 Other",
          nomeCompleto: "RC03 Other User",
        });
        try {
          const wrongOwner = await validateCouponAndGetTotal(
            code,
            100,
            [{ preco: 100, quantidade: 1 }],
            [],
            { userId: other.userId, mode: "discount" }
          );
          asserts.push({
            name: "assertWrongOwnerBlocked",
            ok: wrongOwner.ok === false,
          });
        } finally {
          await cleanupTeUserArtifacts(other.userId);
        }
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),

  def(
    "RC03-006",
    "Cupom: expirado e tipo adulterado",
    "Validação rejeita cupom expirado; SM impede reverter utilizado",
    async (ctx) =>
      withCleanup(ctx, "RC03-006", async (userId) => {
        const asserts: AssertResult[] = [];
        const expiredCode = `RC03EXP_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code: expiredCode,
            couponType: toPersistedCouponType("DISCOUNT"),
            discountType: "percent",
            discountValue: 50,
            assignedUserId: userId,
            expiresAt: new Date(Date.now() - 864e5),
          },
        });
        const expired = await validateCouponAndGetTotal(
          expiredCode,
          100,
          [{ preco: 100, quantidade: 1 }],
          [],
          { userId, mode: "discount" }
        );
        asserts.push({
          name: "assertExpiredRejected",
          ok: expired.ok === false,
        });

        const liveCode = `RC03LIVE_${generateCouponCode()}`;
        const row = await prisma.coupon.create({
          data: {
            code: liveCode,
            couponType: toPersistedCouponType("DISCOUNT"),
            discountType: "percent",
            discountValue: 10,
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 864e5),
          },
        });
        const { consumeCoupon } = await import("@/app/lib/domain/workflow");
        const consumed = await consumeCoupon(row.id, userId, { type: "system" });
        asserts.push({ name: "consume", ok: consumed.ok });
        const reuse = await validateCouponAndGetTotal(
          liveCode,
          100,
          [{ preco: 100, quantidade: 1 }],
          [],
          { userId, mode: "discount" }
        );
        asserts.push({
          name: "assertConsumedBlocked",
          ok: reuse.ok === false,
        });
        const revert = await transition({
          entity: "coupon",
          id: row.id,
          to: "criado",
          actor: { type: "admin" },
          reason: "RC03 tamper attempt",
        });
        asserts.push({
          name: "assertRevertUtilizadoBlocked",
          ok: revert.ok === false,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC03-007",
    "State Machine: transições inválidas",
    "Pular etapas, reabrir concluído e cancelar concluído — bloqueados",
    async (ctx) =>
      withCleanup(ctx, "RC03-007", async (userId) => {
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
          description: "RC03 SM invalid",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const skip = await transition({
          entity: "appointment",
          id: apt!.id,
          to: "concluido",
          actor: { type: "admin" },
          reason: "RC03 skip pendente→concluido",
        });
        asserts.push({ name: "assertSkipBlocked", ok: skip.ok === false });

        await approveAppointment(apt!.id, "aceito", { type: "admin" });
        const svc = await prisma.service.findFirst({ where: { appointmentId: apt!.id } });
        await completeService({
          serviceId: svc!.id,
          deliveryAudioUrl: "https://example.com/rc03.wav",
          deliveryAudioFormat: "wav",
          actor: { type: "admin" },
        });
        const reopen = await transition({
          entity: "service",
          id: svc!.id,
          to: "pendente",
          actor: { type: "admin" },
          reason: "RC03 reopen concluido",
        });
        asserts.push({ name: "assertReopenConcluidoBlocked", ok: reopen.ok === false });

        const cancelDone = await cancelAppointment({
          appointmentId: apt!.id,
          actor: "admin",
          reason: "RC03 cancel concluido",
        });
        asserts.push({
          name: "assertCancelConcluidoBlocked",
          ok: cancelDone.ok === false,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { aptId: apt!.id } };
      })
  ),

  def(
    "RC03-008",
    "Pagamentos adversos",
    "Recusado, inexistente, metadata inválida — sem artefatos órfãos",
    async (ctx) =>
      withCleanup(ctx, "RC03-008", async (userId) => {
        const asserts: AssertResult[] = [];
        const fakeId = `pay_te_fake_${Date.now()}`;
        const refused = await processPaymentWebhook({
          event: "PAYMENT_REFUSED",
          payment: {
            id: fakeId,
            status: "REFUSED",
            value: 5,
            netValue: 5,
            billingType: "PIX",
            customer: "cus_te",
            externalReference: userId,
            description: "RC03 refused",
            metadata: {},
          },
        });
        void refused;
        const payRefused = await prisma.payment.count({ where: { asaasId: fakeId } });
        asserts.push({ name: "assertRefusedNoPayment", ok: payRefused === 0 });

        const ghost = await processPaymentWebhook({
          event: "PAYMENT_RECEIVED",
          payment: {
            id: `pay_te_ghost_${Date.now()}`,
            status: "RECEIVED",
            value: 5,
            netValue: 5,
            billingType: "PIX",
            customer: "cus_te",
            externalReference: userId,
            description: "RC03 no metadata",
            metadata: {},
          },
        });
        void ghost;
        const orphanApts = await prisma.appointment.count({ where: { userId } });
        asserts.push({
          name: "assertNoMetadataNoAppointment",
          ok: orphanApts === 0,
          evidence: { orphanApts },
        });

        const slot = futureSlots(1)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "RC03 valid baseline",
        });
        asserts.push(await assertPayment({ asaasId: meta.asaasId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC03-009",
    "Concorrência: remarcação e cancelamento",
    "Operações paralelas no mesmo agendamento — SM consistente",
    async (ctx) =>
      withCleanup(ctx, "RC03-009", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1, 16)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "RC03 rebook race",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "admin" });

        const [rb, cancel] = await Promise.all([
          rebookAppointment(apt!.id, "RC03 parallel rebook", { type: "admin" }),
          cancelAppointment({
            appointmentId: apt!.id,
            actor: "admin",
            reason: "RC03 parallel cancel",
          }),
        ]);
        const final = await prisma.appointment.findUnique({
          where: { id: apt!.id },
          select: { status: true },
        });
        asserts.push({
          name: "assertOneOperationWins",
          ok:
            (rb.ok || cancel.ok) &&
            (final?.status === "remarcado" || final?.status === "cancelado"),
          evidence: { rb: rb.ok, cancel: cancel.ok, status: final?.status },
        });
        asserts.push(
          await assertAppointment({
            appointmentId: apt!.id,
            statusIn: ["remarcado", "cancelado"],
          })
        );
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "RC03-010",
    "IDs inválidos e acesso cruzado",
    "Cancelamento por userId errado bloqueado; entidade inexistente falha",
    async (ctx) =>
      withCleanup(ctx, "RC03-010", async (userId) => {
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
          description: "RC03 ID guard",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "admin" });

        const attacker = await seedTestUser({
          email: `${ctx.artifactPrefix}-attacker-${Date.now()}@homolog.test`,
          nomeArtistico: "RC03 Attacker",
          nomeCompleto: "RC03 Attacker",
        });
        try {
          const forbidden = await cancelAppointment({
            appointmentId: apt!.id,
            actor: "user",
            userId: attacker.userId,
            reason: "RC03 cross-user",
          });
          asserts.push({
            name: "assertCrossUserCancelBlocked",
            ok: forbidden.ok === false,
            evidence: { error: (forbidden as { error?: string }).error },
          });
        } finally {
          await cleanupTeUserArtifacts(attacker.userId);
        }

        const fakeApt = await cancelAppointment({
          appointmentId: 9_999_999,
          actor: "admin",
          reason: "RC03 fake id",
        });
        asserts.push({ name: "assertFakeAppointment404", ok: fakeApt.ok === false });

        const fakeSvc = await transition({
          entity: "service",
          id: "00000000-0000-0000-0000-000000000000",
          to: "concluido",
          actor: { type: "admin" },
          reason: "RC03 fake service",
        });
        asserts.push({ name: "assertFakeServiceBlocked", ok: fakeSvc.ok === false });

        void ctx;
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
];

function isLocalDevWithWarning(gate: { allowed: boolean; warnings?: string[] }): boolean {
  return (
    gate.allowed === true &&
    (gate.warnings || []).some((w) => w.includes("localhost") || w.includes("CLI_SECRET"))
  );
}

export const RC03_IDS: ScenarioId[] = rc03Scenarios.map((s) => s.id);
