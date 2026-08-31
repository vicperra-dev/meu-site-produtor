/**
 * Stubs TE-S02 … TE-S13 — estrutura extensível (TE-01B não implementa todos).
 */
import type { ScenarioDefinition, ScenarioId } from "@/app/lib/test-engine/types";

const STUBS: { id: ScenarioId; name: string; description: string }[] = [
  { id: "TE-S02", name: "Compra carrinho", description: "Checkout carrinho → webhook carrinho" },
  { id: "TE-S03", name: "Compra cancelada", description: "Cancelamento user/admin pós-compra" },
  { id: "TE-S04", name: "Pagamento não confirmado", description: "Evento sem RECEIVED — sem Appointment" },
  { id: "TE-S05", name: "Webhook duplicado", description: "Dois PAYMENT_RECEIVED — F1/F3" },
  { id: "TE-S06", name: "Cupom", description: "Emissão/uso de cupom oficial" },
  { id: "TE-S07", name: "Reembolso", description: "Fluxo de reembolso/cupom pós-cancel" },
  { id: "TE-S08", name: "Entrega", description: "Aceite → andamento → concluido+URL" },
  { id: "TE-S09", name: "Cliente completo", description: "Jornada conta + entrega" },
  { id: "TE-S10", name: "Administrador completo", description: "Ops Service + stats" },
  { id: "TE-S11", name: "Fluxo completo", description: "S09+S10 E2E" },
  { id: "TE-S12", name: "Metadata expirada / órfão", description: "Webhook sem metadata útil" },
  { id: "TE-S13", name: "Aceite sem Service prévio", description: "ensureServices no aceite" },
];

function makeStub(def: (typeof STUBS)[number]): ScenarioDefinition {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    status: "stub",
    async run() {
      return {
        status: "stub",
        asserts: [],
        errors: [],
        warnings: [`${def.id} registrado mas ainda não implementado (TE-01B estrutura apenas).`],
        artifacts: { stub: true },
      };
    },
  };
}

export const stubScenarios: ScenarioDefinition[] = STUBS.map(makeStub);
