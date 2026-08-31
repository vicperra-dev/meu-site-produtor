/**
 * PH-01 — Product Hardening (Business Validation)
 * Cenários de regressão para bugs corrigidos na sprint PH-01.
 */
import { prisma } from "@/app/lib/prisma";
import {
  assertAppointment,
  assertCoupon,
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
  writeCarrinhoPaymentMetadata,
} from "@/app/lib/test-engine/te02a-helpers";
import type {
  AssertResult,
  ScenarioContext,
  ScenarioDefinition,
  ScenarioId,
} from "@/app/lib/test-engine/types";
import { approveAppointment, completeService } from "@/app/lib/domain/workflow";
import { toPersistedCouponType, resolveCanonicalCouponType } from "@/app/lib/domain/coupon-types";
import { generateCouponCode } from "@/app/lib/coupons";
import { normalizeStaleCouponAppointmentLink } from "@/app/lib/coupon-stale-appointment";
import { createServicesForAppointmentIfMissing } from "@/app/lib/asaas-agendamento-payment-effects";
import { getBirthDateMaxYear, validateBirthDateString } from "@/app/lib/birth-date-validation";
import { calculateServerCheckout } from "@/app/lib/checkout-calculation";
import { validateCouponAndGetTotal } from "@/app/lib/validate-coupon-checkout";
import {
  assertWebhookAmountMatchesMetadata,
  resolvePaymentOperationIdentity,
} from "@/app/lib/asaas-agendamento-reconcile";

type RunBody = Awaited<ReturnType<ScenarioDefinition["run"]>>;

async function withCleanup(
  ctx: ScenarioContext,
  scenario: string,
  fn: (userId: string, email: string) => Promise<RunBody>
): Promise<RunBody> {
  const email = `${ctx.artifactPrefix}-${scenario.toLowerCase()}-${Date.now()}@homolog.test`;
  const user = await seedTestUser({
    email,
    nomeArtistico: `PH ${scenario}`,
    nomeCompleto: `PH Engine ${scenario}`,
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
    return { status: "pass", asserts, errors: [], warnings, artifacts };
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
      artifacts.cleanup = await cleanupTeUserArtifacts(user.userId);
    } catch (ce: unknown) {
      warnings.push(`cleanup: ${ce instanceof Error ? ce.message : String(ce)}`);
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

export const ph01Scenarios: ScenarioDefinition[] = [
  def(
    "PH01-001",
    "Cupom com paymentId marcado used no aceite",
    "AppointmentAccepted marca cupons vinculados mesmo com paymentId",
    async (ctx) =>
      withCleanup(ctx, "PH01-001", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1)[0];
        const code = `PH01_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("SERVICE"),
            discountType: "service",
            discountValue: 0,
            serviceType: "sessao",
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 7 * 864e5),
          },
        });
        const booked = await redeemServiceCouponOfficial({
          userId,
          cupomCode: code,
          data: slot.data,
          hora: slot.hora,
          servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1, preco: 0 }],
        });
        const appr = await approveAppointment(booked.appointmentId, "aceito", {
          type: "test-engine",
        });
        asserts.push({ name: "approve", ok: appr.ok, message: appr.ok ? undefined : (appr as any).error });
        const after = await prisma.coupon.findFirst({
          where: { code },
          select: { used: true, appointmentId: true },
        });
        asserts.push({
          name: "assertCouponUsedOnAccept",
          ok: after?.used === true,
          evidence: { after },
          message: after?.used ? undefined : "cupom deveria estar used=true após aceite",
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),

  def(
    "PH01-002",
    "Cupom não reutilizável após concluído",
    "normalizeStale não libera cupom quando agendamento concluído",
    async (ctx) =>
      withCleanup(ctx, "PH01-002", async (userId) => {
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
          description: "PH01-002 agendamento",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        await approveAppointment(apt!.id, "aceito", { type: "test-engine" });
        const code = `PH02_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("SERVICE"),
            discountType: "service",
            discountValue: 0,
            serviceType: "sessao",
            appointmentId: apt!.id,
            assignedUserId: userId,
            used: false,
            expiresAt: new Date(Date.now() + 7 * 864e5),
          },
        });
        const svc = await prisma.service.findFirst({ where: { appointmentId: apt!.id } });
        await completeService({
          serviceId: svc!.id,
          deliveryAudioUrl: "https://example.com/ph01.wav",
          deliveryAudioFormat: "wav",
          actor: { type: "test-engine" },
        });
        const coupon = await prisma.coupon.findFirst({
          where: { appointmentId: apt!.id },
          orderBy: { createdAt: "desc" },
        });
        if (coupon) {
          await normalizeStaleCouponAppointmentLink(coupon.id);
          const after = await prisma.coupon.findUnique({
            where: { id: coupon.id },
            select: { appointmentId: true, used: true },
          });
          asserts.push({
            name: "assertStaleNormalizeKeepsLinkOnConcluido",
            ok: after?.appointmentId === apt!.id,
            evidence: { after, appointmentId: apt!.id },
            message: "cupom não deve ser liberado após agendamento concluído",
          });
        } else {
          asserts.push({
            name: "assertCouponExists",
            ok: false,
            message: "nenhum cupom vinculado ao agendamento",
          });
        }
        asserts.push(await assertAppointment({ appointmentId: apt!.id, statusIn: ["concluido"] }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "PH01-003",
    "Reparo de serviços incompletos",
    "createServicesForAppointmentIfMissing completa linhas faltantes por tipo",
    async (ctx) =>
      withCleanup(ctx, "PH01-003", async (userId) => {
        const asserts: AssertResult[] = [];
        const slot = futureSlots(1)[0];
        const meta = await writeCarrinhoPaymentMetadata({
          userId,
          scenario: "PH01-003",
          runId: ctx.runId,
          items: [
            {
              data: slot.data,
              hora: slot.hora,
              tipo: "sessao",
              servicos: [
                { id: "sessao", nome: "Sessão", quantidade: 1 },
                { id: "mix", nome: "Mix", quantidade: 1 },
              ],
            },
          ],
        });
        await dispatchOfficialPaymentReceived({
          userId,
          asaasPaymentId: meta.asaasId,
          description: "PH01-003 carrinho multi",
        });
        const apt = await prisma.appointment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        asserts.push({
          name: "assertAppointmentCreated",
          ok: Boolean(apt?.id),
          evidence: { aptId: apt?.id },
        });
        if (!apt) {
          return { status: "fail", asserts, errors: ["agendamento não criado"], warnings: [], artifacts: {} };
        }
        await prisma.service.deleteMany({
          where: { appointmentId: apt.id, tipo: "mix" },
        });
        const before = await prisma.service.count({ where: { appointmentId: apt.id } });
        const created = await createServicesForAppointmentIfMissing({
          appointmentId: apt.id,
          userId,
          services: [
            { id: "sessao", nome: "Sessão", quantidade: 1 },
            { id: "mix", nome: "Mix", quantidade: 1 },
          ],
          beats: [],
          logPrefix: "[PH01-003]",
        });
        const after = await prisma.service.count({ where: { appointmentId: apt.id } });
        asserts.push({
          name: "assertPartialHeal",
          ok: before === 1 && created >= 1 && after === 2,
          evidence: { before, created, after },
          message: `esperado heal 1→2, got ${before}→${after} (+${created})`,
        });
        asserts.push(await assertService({ appointmentId: apt.id, minCount: 2 }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "PH01-004",
    "Validação dinâmica de data de nascimento",
    "Ano máximo = ano atual − idade mínima",
    async (ctx) =>
      withCleanup(ctx, "PH01-004", async () => {
        const asserts: AssertResult[] = [];
        const maxYear = getBirthDateMaxYear();
        const tooYoung = `${new Date().getFullYear()}-06-15`;
        const valid = `${maxYear}-06-15`;
        const young = validateBirthDateString(tooYoung);
        const ok = validateBirthDateString(valid);
        asserts.push({
          name: "assertRejectsTooYoung",
          ok: young.valid === false,
          evidence: { tooYoung, maxYear, young },
        });
        asserts.push({
          name: "assertAcceptsMinAge",
          ok: ok.valid === true,
          evidence: { valid, maxYear },
        });
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { maxYear } };
      })
  ),

  def(
    "PH01-005",
    "Cupom SERVICE canônico atribuído",
    "Cupom de serviço avulso resolve como SERVICE para Minha Conta",
    async (ctx) =>
      withCleanup(ctx, "PH01-005", async (userId) => {
        const asserts: AssertResult[] = [];
        const code = `PH05_${generateCouponCode()}`;
        const coupon = await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("SERVICE"),
            discountType: "service",
            discountValue: 0,
            serviceType: "captacao",
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 30 * 864e5),
          },
        });
        const canonical = resolveCanonicalCouponType(coupon);
        asserts.push({
          name: "assertCanonicalService",
          ok: canonical === "SERVICE",
          evidence: { coupon, canonical },
          message: canonical === "SERVICE" ? undefined : `tipo canônico=${canonical}`,
        });
        asserts.push({
          name: "assertServiceTypeSet",
          ok: coupon.serviceType === "captacao",
          evidence: { serviceType: coupon.serviceType },
        });
        asserts.push(await assertCoupon({ userId, minCount: 1 }));
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
      })
  ),

  def(
    "GL01-001",
    "Checkout ignora preços do cliente",
    "IDs e quantidades são precificados exclusivamente pelo catálogo do servidor",
    async (ctx) =>
      withCleanup(ctx, "GL01-001", async (userId) => {
        const calculation = await calculateServerCheckout({
          userId,
          services: [{ id: "sessao", quantidade: 2 }],
          beats: [{ id: "beat1", quantidade: 1 }],
        });
        const asserts: AssertResult[] = [
          {
            name: "assertServerCatalogTotal",
            ok: calculation.subtotal === 230 && calculation.total === 230,
            evidence: {
              subtotal: calculation.subtotal,
              prices: [...calculation.services, ...calculation.beats].map((i) => ({
                id: i.id,
                price: i.preco,
              })),
            },
            message: `total autoritativo esperado 230, obtido ${calculation.total}`,
          },
        ];
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "GL01-002",
    "Cupom exige owner e serviço exato",
    "SERVICE não pode ser usado por outro usuário nem em serviço diferente",
    async (ctx) =>
      withCleanup(ctx, "GL01-002", async (userId) => {
        const other = await seedTestUser({
          email: `${ctx.artifactPrefix}-gl01-owner-${Date.now()}@homolog.test`,
          nomeArtistico: "GL Owner",
          nomeCompleto: "GL Owner Test",
        });
        const code = `GL01_${generateCouponCode()}`;
        await prisma.coupon.create({
          data: {
            code,
            couponType: toPersistedCouponType("SERVICE"),
            discountType: "service",
            discountValue: 0,
            serviceType: "captacao",
            assignedUserId: userId,
            expiresAt: new Date(Date.now() + 7 * 864e5),
          },
        });
        try {
          const correct = await validateCouponAndGetTotal(
            code,
            55,
            [{ preco: 55, quantidade: 1 }],
            [],
            {
              userId,
              mode: "service-redemption",
              selectedServiceIds: ["captacao"],
            }
          );
          const wrongService = await validateCouponAndGetTotal(
            code,
            40,
            [{ preco: 40, quantidade: 1 }],
            [],
            {
              userId,
              mode: "service-redemption",
              selectedServiceIds: ["sessao"],
            }
          );
          const wrongOwner = await validateCouponAndGetTotal(
            code,
            55,
            [{ preco: 55, quantidade: 1 }],
            [],
            {
              userId: other.userId,
              mode: "service-redemption",
              selectedServiceIds: ["captacao"],
            }
          );
          const asserts: AssertResult[] = [
            { name: "assertCorrectServiceAllowed", ok: correct.ok },
            { name: "assertWrongServiceBlocked", ok: !wrongService.ok },
            { name: "assertWrongOwnerBlocked", ok: !wrongOwner.ok },
          ];
          return { status: "pass", asserts, errors: [], warnings: [], artifacts: { code } };
        } finally {
          await cleanupTeUserArtifacts(other.userId);
        }
      })
  ),

  def(
    "GL01-003",
    "Webhook resolve somente operação exata",
    "Asaas ID/operationId prevalecem; userId e recência nunca são fallback",
    async (ctx) =>
      withCleanup(ctx, "GL01-003", async (userId) => {
        const asaasId = `pay_gl01_${Date.now()}`;
        const expiresAt = new Date(Date.now() + 864e5);
        const exact = await prisma.paymentMetadata.create({
          data: {
            userId,
            asaasId,
            metadata: JSON.stringify({ tipo: "agendamento", chargedAmount: 40 }),
            expiresAt,
          },
        });
        await prisma.paymentMetadata.create({
          data: {
            userId,
            metadata: JSON.stringify({ tipo: "plano", amount: 799.99 }),
            expiresAt,
          },
        });
        const identity = await resolvePaymentOperationIdentity({
          asaasPaymentId: asaasId,
          externalReference: userId,
        });
        let unknownRejected = false;
        try {
          await resolvePaymentOperationIdentity({
            asaasPaymentId: `unknown_${Date.now()}`,
            externalReference: userId,
          });
        } catch {
          unknownRejected = true;
        }
        const asserts: AssertResult[] = [
          {
            name: "assertExactOperation",
            ok: identity.operationId === exact.id && identity.userId === userId,
            evidence: { identity, exactId: exact.id },
          },
          { name: "assertUserIdFallbackRejected", ok: unknownRejected },
        ];
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),

  def(
    "GL01-004",
    "Webhook rejeita valor divergente",
    "Valor recebido deve coincidir com chargedAmount calculado no servidor",
    async (ctx) =>
      withCleanup(ctx, "GL01-004", async () => {
        let mismatchRejected = false;
        try {
          assertWebhookAmountMatchesMetadata({ chargedAmount: 230 }, 1);
        } catch {
          mismatchRejected = true;
        }
        assertWebhookAmountMatchesMetadata({ chargedAmount: 230 }, 230);
        const asserts: AssertResult[] = [
          { name: "assertAmountMismatchRejected", ok: mismatchRejected },
          { name: "assertExactAmountAccepted", ok: true },
        ];
        return { status: "pass", asserts, errors: [], warnings: [], artifacts: {} };
      })
  ),
];

export const PH01_IDS: ScenarioId[] = ph01Scenarios.map((s) => s.id);
