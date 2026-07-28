/**
 * OP-02B / GO-01 — Homologation scenarios smoke (catálogo + SKUs oficiais).
 * Não executa DB; valida que todos os cenários exigidos existem.
 */
import {
  HOMOLOGATION_SCENARIOS,
  OFFICIAL_SKU_SCENARIO_IDS,
  type HomologationScenarioId,
} from "../src/app/lib/homologation/scenarios";

const REQUIRED: HomologationScenarioId[] = [
  ...OFFICIAL_SKU_SCENARIO_IDS,
  "plano_bronze",
  "plano_bronze_anual",
  "plano_prata",
  "plano_prata_anual",
  "plano_ouro",
  "plano_ouro_anual",
  "cupom_desconto",
  "cupom_remarcacao",
  "refund_approved",
  "refund_failed",
  "refund_pending",
  "refund_timeout",
];

const ids = new Set(HOMOLOGATION_SCENARIOS.map((s) => s.id));
const missing = REQUIRED.filter((id) => !ids.has(id));
const refundOutcomes = ["APPROVED", "FAILED", "PENDING", "TIMEOUT"] as const;
const refundOk = refundOutcomes.every((o) =>
  HOMOLOGATION_SCENARIOS.some((s) => s.refundOutcome === o || s.id === `refund_${o.toLowerCase()}`)
);

if (missing.length || !refundOk) {
  console.error("[homologation-scenarios] FAIL", { missing, refundOk });
  process.exit(1);
}

console.log(
  `[homologation-scenarios] PASS — ${HOMOLOGATION_SCENARIOS.length} cenários (${REQUIRED.length} obrigatórios)`
);
