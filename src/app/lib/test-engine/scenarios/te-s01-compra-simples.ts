/**
 * TE-S01 — Compra simples (agendamento) via pipeline oficial.
 */
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
import type { ScenarioContext, ScenarioDefinition } from "@/app/lib/test-engine/types";

function futureSlot(): { data: string; hora: string } {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  d.setHours(14, 0, 0, 0);
  const data = d.toISOString().slice(0, 10);
  return { data, hora: "14:00" };
}

export const teS01CompraSimples: ScenarioDefinition = {
  id: "TE-S01",
  name: "Compra simples",
  description:
    "Registro (seed) → PaymentMetadata oficial → webhook canônico → Appointment + Service",
  status: "implemented",
  async run(ctx: ScenarioContext) {
    const asserts = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const artifacts: Record<string, unknown> = {};

    try {
      const email = `${ctx.artifactPrefix}-s01-${Date.now()}@homolog.test`;
      const user = await seedTestUser({ email });
      artifacts.userId = user.userId;
      artifacts.email = user.email;

      const slot = futureSlot();
      const meta = await writeAgendamentoPaymentMetadata({
        userId: user.userId,
        data: slot.data,
        hora: slot.hora,
      });
      artifacts.asaasId = meta.asaasId;
      artifacts.metadataId = meta.metadataId;

      const webhookResult = await dispatchOfficialPaymentReceived({
        userId: user.userId,
        asaasPaymentId: meta.asaasId,
      });
      artifacts.webhookResult = webhookResult;

      const payment = await findLatestPaymentByAsaasId(meta.asaasId);
      asserts.push(
        await assertPayment({
          asaasId: meta.asaasId,
          userId: user.userId,
          status: "approved",
        })
      );

      const appointmentId =
        (webhookResult as { agendamentoFinalId?: number | null })?.agendamentoFinalId ??
        payment?.appointmentId ??
        undefined;

      asserts.push(
        await assertAppointment({
          appointmentId: appointmentId ?? undefined,
          userId: user.userId,
          statusIn: ["pendente", "aceito", "confirmado"],
        })
      );

      asserts.push(
        await assertService({
          appointmentId: appointmentId ?? undefined,
          userId: user.userId,
          minCount: 1,
        })
      );

      asserts.push(await assertMinhaConta({ userId: user.userId }));

      const failed = asserts.filter((a) => !a.ok);
      if (failed.length) {
        return {
          status: "fail" as const,
          asserts,
          errors: failed.map((f) => f.message || f.name),
          warnings,
          artifacts,
        };
      }

      return {
        status: "pass" as const,
        asserts,
        errors,
        warnings,
        artifacts,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(message);
      return {
        status: "error" as const,
        asserts,
        errors,
        warnings,
        artifacts,
      };
    }
  },
};
