/**
 * RC-01 — Customer Journey Certification (cenários dedicados).
 * Complementa SIM-01, TE-02A e SYNC-01A para lacunas da jornada ponta a ponta.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { registroSchema } from "@/app/lib/validations";
import { normalizeCpfDigits } from "@/app/lib/cpf-validation";
import { getBirthDateMaxYear } from "@/app/lib/birth-date-validation";
import { calculateServerCheckout } from "@/app/lib/checkout-calculation";
import { CHECKOUT_CATALOG } from "@/app/lib/service-catalog";
import { toPersistedCouponType } from "@/app/lib/domain/coupon-types";
import { generateCouponCode } from "@/app/lib/coupons";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import {
  assertAppointment,
  assertMinhaConta,
  assertPayment,
  assertService,
} from "@/app/lib/test-engine/assert-engine";
import {
  dispatchOfficialPaymentReceived,
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
    nomeArtistico: `RC ${scenario}`,
    nomeCompleto: `RC Certification ${scenario}`,
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

const INDIVIDUAL_PURCHASES: Array<{
  key: string;
  servicos?: { id: string; nome: string; quantidade: number }[];
  beats?: { id: string; nome: string; quantidade: number }[];
  tipo: string;
  emitsCouponsOnly?: boolean;
}> = [
  { key: "sessao", servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1 }], tipo: "sessao" },
  {
    key: "captacao",
    servicos: [{ id: "captacao", nome: "Captação", quantidade: 1 }],
    tipo: "captacao",
  },
  { key: "mix", servicos: [{ id: "mix", nome: "Mixagem", quantidade: 1 }], tipo: "mix" },
  {
    key: "master",
    servicos: [{ id: "master", nome: "Masterização", quantidade: 1 }],
    tipo: "master",
  },
  {
    key: "mix_master",
    servicos: [{ id: "mix_master", nome: "Mix + Master", quantidade: 1 }],
    tipo: "mix_master",
    emitsCouponsOnly: true,
  },
  {
    key: "producao_completa",
    beats: [{ id: "producao_completa", nome: "Produção Completa", quantidade: 1 }],
    tipo: "producao_completa",
    emitsCouponsOnly: true,
  },
  {
    key: "beat1",
    beats: [{ id: "beat1", nome: "1 Beat", quantidade: 1 }],
    tipo: "beat1",
  },
];

export const rc01Scenarios: ScenarioDefinition[] = [
  def(
    "RC01-001",
    "Cadastro completo",
    "CPF, email, idade, sexo, gênero, sessão e Minha Conta",
    async (ctx) => {
      const asserts: AssertResult[] = [];
      const email = `${ctx.artifactPrefix}-reg-${Date.now()}@homolog.test`;
      const cpf = `9${String(Date.now()).slice(-10)}`.slice(0, 11);
      const validBirth = `${getBirthDateMaxYear() - 5}-06-15`;

      const invalidCpf = registroSchema.safeParse({
        nomeCompleto: "Test User",
        nomeArtistico: "Test",
        email: "bad@test.com",
        senha: "secret1",
        telefone: "21999999999",
        cpf: "123",
        pais: "Brasil",
        estado: "RJ",
        cidade: "Rio",
        bairro: "Centro",
        dataNascimento: validBirth,
        sexo: "masculino",
        genero: "heterossexual",
      });
      asserts.push({
        name: "assertCpfRejected",
        ok: !invalidCpf.success,
        message: invalidCpf.success ? "CPF inválido aceito" : undefined,
      });

      const underage = registroSchema.safeParse({
        nomeCompleto: "Menor Test",
        nomeArtistico: "Menor",
        email: "minor@test.com",
        senha: "secret1",
        telefone: "21999999999",
        cpf: "12345678901",
        pais: "Brasil",
        estado: "RJ",
        cidade: "Rio",
        bairro: "Centro",
        dataNascimento: `${new Date().getFullYear()}-01-01`,
        sexo: "feminino",
        genero: "prefiro_nao_informar",
      });
      asserts.push({
        name: "assertAgeRejected",
        ok: !underage.success,
        message: underage.success ? "menor aceito" : undefined,
      });

      const body = {
        nomeCompleto: "RC01 Certificado",
        nomeArtistico: "RC01 User",
        email,
        senha: "Rc01@Test!",
        telefone: "21988887777",
        cpf,
        pais: "Brasil",
        estado: "RJ",
        cidade: "Rio de Janeiro",
        bairro: "Botafogo",
        dataNascimento: validBirth,
        sexo: "masculino" as const,
        genero: "bissexual" as const,
      };
      const parsed = registroSchema.safeParse(body);
      asserts.push({
        name: "assertValidRegistration",
        ok: parsed.success,
        message: parsed.success ? undefined : parsed.error.errors[0]?.message,
      });
      if (!parsed.success) {
        return { status: "fail", asserts, errors: ["registroSchema falhou"], warnings: [], artifacts: {} };
      }

      const hash = await bcrypt.hash(body.senha, 10);
      const user = await prisma.user.create({
        data: {
          ...parsed.data,
          cpf: normalizeCpfDigits(parsed.data.cpf),
          senha: hash,
          dataNascimento: new Date(parsed.data.dataNascimento),
          role: "USER",
        },
      });
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 864e5),
        },
      });
      asserts.push({
        name: "assertSessionCreated",
        ok: Boolean(session.id),
        evidence: { sessionId: session.id },
      });
      asserts.push({
        name: "assertUserFields",
        ok:
          user.cpf === normalizeCpfDigits(cpf) &&
          user.sexo === "masculino" &&
          user.genero === "bissexual",
        evidence: { cpf: user.cpf, sexo: user.sexo, genero: user.genero },
      });
      asserts.push(await assertMinhaConta({ userId: user.id }));

      try {
        await cleanupTeUserArtifacts(user.id);
      } catch {
        /* ignore */
      }
      return { status: "pass", asserts, errors: [], warnings: [], artifacts: { email, userId: user.id } };
    }
  ),

  def(
    "RC01-002",
    "Compra individual por serviço",
    "Sessão, Captação, Mix, Master, Mix+Master, Produção Completa e Pacote",
    async (ctx) =>
      withCleanup(ctx, "RC01-002", async (userId) => {
        const asserts: AssertResult[] = [];
        const slots = futureSlots(INDIVIDUAL_PURCHASES.length + 2, 10);
        const purchased: string[] = [];
        let bookedServices = 0;

        for (let i = 0; i < INDIVIDUAL_PURCHASES.length; i++) {
          const item = INDIVIDUAL_PURCHASES[i];
          const slot = slots[i];
          const calc = await calculateServerCheckout({
            userId,
            services: item.servicos?.map((s) => ({ id: s.id, quantidade: s.quantidade })),
            beats: item.beats?.map((b) => ({ id: b.id, quantidade: b.quantidade })),
          });
          const expected = item.servicos?.[0]?.id || item.beats?.[0]?.id || "";
          const catalog = CHECKOUT_CATALOG[expected as keyof typeof CHECKOUT_CATALOG];
          asserts.push({
            name: `assertCatalogPrice_${item.key}`,
            ok: catalog != null && calc.total === catalog.preco,
            message: `total=${calc.total} catalog=${catalog?.preco}`,
            evidence: { key: item.key, calc },
          });

          const couponsBefore = await prisma.coupon.count({ where: { assignedUserId: userId } });
          const meta = await writeAgendamentoPaymentMetadata({
            userId,
            data: slot.data,
            hora: slot.hora,
            tipoAgendamento: item.tipo,
            servicos: item.servicos ?? (item.beats ? [] : undefined),
            beats: item.beats,
            total: calc.total,
          });
          await dispatchOfficialPaymentReceived({
            userId,
            asaasPaymentId: meta.asaasId,
            description: `RC01 compra ${item.key}`,
          });
          asserts.push(await assertPayment({ asaasId: meta.asaasId, status: "approved", userId }));

          if (item.emitsCouponsOnly) {
            const couponsAfter = await prisma.coupon.count({ where: { assignedUserId: userId } });
            asserts.push({
              name: `assertCouponsEmitted_${item.key}`,
              ok: couponsAfter > couponsBefore,
              message: `coupons before=${couponsBefore} after=${couponsAfter}`,
            });
          } else {
            const apt = await prisma.appointment.findFirst({
              where: { userId, tipo: item.tipo },
              orderBy: { createdAt: "desc" },
            });
            asserts.push({
              name: `assertAppointment_${item.key}`,
              ok: apt != null && apt.status === "pendente",
              evidence: { apt },
            });
            bookedServices++;
            asserts.push(await assertService({ userId, minCount: bookedServices }));
          }
          purchased.push(item.key);
        }

        asserts.push({
          name: "assertAllServiceTypesPurchased",
          ok: purchased.length === INDIVIDUAL_PURCHASES.length,
          evidence: { purchased },
        });
        asserts.push(await assertMinhaConta({ userId }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { purchased } };
      })
  ),

  def(
    "RC01-003",
    "Cupom BONUS",
    "Validação percentual e owner",
    async (ctx) =>
      withCleanup(ctx, "RC01-003", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `RCBONUS_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("BONUS"),
            discountType: "percent",
            discountValue: 20,
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 7 * 864e5),
          },
        });
        const ok = await validateCouponAndGetTotal(code, 100, [{ preco: 100, quantidade: 1 }], [], {
          userId,
          mode: "discount",
        });
        asserts.push({
          name: "assertBonusApplies",
          ok: ok.ok === true && (ok as { finalTotal?: number }).finalTotal === 80,
          evidence: { result: ok },
        });
        const wrongOwner = await validateCouponAndGetTotal(
          code,
          100,
          [{ preco: 100, quantidade: 1 }],
          [],
          { userId: "other-user", mode: "discount" }
        );
        asserts.push({
          name: "assertBonusOwner",
          ok: wrongOwner.ok === false,
          message: wrongOwner.ok ? "owner não validado" : undefined,
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),

  def(
    "RC01-004",
    "Cupom REBOOK",
    "Resgate oficial de remarcação",
    async (ctx) =>
      withCleanup(ctx, "RC01-004", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `RCREBOOK_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("REBOOK"),
            discountType: "service",
            discountValue: 0,
            serviceType: "sessao",
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 30 * 864e5),
          },
        });
        const slot = futureSlots(1, 20)[0];
        const booked = await redeemServiceCouponOfficial({
          userId,
          cupomCode: code,
          data: slot.data,
          hora: slot.hora,
          servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1, preco: 0 }],
        });
        asserts.push(
          await assertAppointment({
            appointmentId: booked.appointmentId,
            statusIn: ["pendente"],
          })
        );
        asserts.push(await assertService({ appointmentId: booked.appointmentId, minCount: 1 }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code, booked } };
      })
  ),

  def(
    "RC01-005",
    "Agenda bloqueio e conflito",
    "Blocked slot publicado + conflito de horário no pipeline",
    async (ctx) =>
      withCleanup(ctx, "RC01-005", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(2, 14)[1];
        const blockedId = `rc01_blk_${Date.now()}`;
        await prisma.blockedTimeSlot.upsert({
          where: { data_hora: { data: slot.data, hora: slot.hora } },
          create: { id: blockedId, data: slot.data, hora: slot.hora, ativo: true },
          update: { ativo: true },
        });
        const blocked = await prisma.blockedTimeSlot.findFirst({
          where: { data: slot.data, hora: slot.hora, ativo: true },
        });
        asserts.push({
          name: "assertBlockedSlotActive",
          ok: Boolean(blocked),
          evidence: { blocked },
        });

        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "RC01 primeiro slot",
        });
        const firstCount = await prisma.appointment.count({ where: { userId } });
        asserts.push({
          name: "assertFirstBooking",
          ok: firstCount === 1,
          message: `appointments=${firstCount}`,
        });

        const user2 = await seedTestUser({
          email: `${ctx.artifactPrefix}-conflict-${Date.now()}@homolog.test`,
          nomeArtistico: "RC Conflict",
          nomeCompleto: "RC Conflict User",
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
            description: "RC01 conflito",
          });
          const conflictCount = await prisma.appointment.count({ where: { userId: user2.userId } });
          asserts.push({
            name: "assertConflictBlocksSecond",
            ok: conflictCount === 0,
            evidence: { conflictCount },
          });
        } finally {
          await cleanupTeUserArtifacts(user2.userId);
        }

        try {
          await prisma.blockedTimeSlot.deleteMany({ where: { data: slot.data, hora: slot.hora } });
        } catch {
          /* ignore */
        }
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { slot } };
      })
  ),

  def(
    "RC01-006",
    "Permissões usuário vs admin",
    "Role USER ≠ ADMIN; workflow admin executável",
    async (ctx) =>
      withCleanup(ctx, "RC01-006", async (userId) => {
        const asserts: AssertResult[] = [];
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, email: true },
        });
        asserts.push({
          name: "assertUserRole",
          ok: user?.role === "USER",
          evidence: { user },
        });
        asserts.push({
          name: "assertNotAdminEmail",
          ok: user?.email !== "thouse.rec.tremv@gmail.com",
        });

        const adminEmail = `${ctx.artifactPrefix}-admin-${Date.now()}@homolog.test`;
        const admin = await prisma.user.create({
          data: {
            nomeCompleto: "RC Admin",
            nomeArtistico: "RC Admin",
            email: adminEmail,
            senha: await bcrypt.hash("Admin@Test!", 10),
            telefone: "21977776666",
            cpf: `8${String(Date.now()).slice(-10)}`.slice(0, 11),
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
        asserts.push({
          name: "assertAdminRole",
          ok: admin.role === "ADMIN",
          evidence: { adminId: admin.id },
        });

        const slot = futureSlots(1, 14)[0];
        const meta = await writeAgendamentoPaymentMetadata({
          userId,
          data: slot.data,
          hora: slot.hora,
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "RC01 permissões",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        if (!apt) {
          return {
            status: "fail",
            asserts,
            errors: ["agendamento não criado"],
            warnings: [],
            artifacts: {},
          };
        }
        const { approveAppointment } = await import("@/app/lib/domain/workflow");
        const appr = await approveAppointment(apt.id, "aceito", { type: "admin", id: admin.id });
        asserts.push({
          name: "assertAdminWorkflow",
          ok: appr.ok,
          message: appr.ok ? undefined : (appr as { error?: string }).error,
        });

        try {
          await cleanupTeUserArtifacts(admin.id);
        } catch {
          /* ignore */
        }
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
];

export const RC01_IDS: ScenarioId[] = rc01Scenarios.map((s) => s.id);
