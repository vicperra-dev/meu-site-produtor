/**
 * GO-H10C — Smoke: valores internos de reembolso + estados de assinatura.
 */
import assert from "node:assert/strict";
import {
  getInternalRefundUnit,
  getPlanDefinition,
  PLAN_DEFINITIONS,
} from "../src/app/lib/plan-definitions";
import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  subscriptionAllowsBenefitRenewal,
} from "../src/app/lib/subscription-states";

assert.equal(getInternalRefundUnit("bronze", "sessao"), 30);
assert.equal(getInternalRefundUnit("bronze", "captacao"), 50);
assert.equal(getInternalRefundUnit("bronze", "mix"), 100);
assert.equal(getInternalRefundUnit("prata", "master"), 75);
assert.equal(getInternalRefundUnit("prata", "beat1"), 145);
assert.equal(getInternalRefundUnit("prata", "percent_servicos"), 10);
assert.equal(getInternalRefundUnit("ouro", "captacao"), 40);
assert.equal(getInternalRefundUnit("ouro", "mix"), 90);
assert.equal(getInternalRefundUnit("ouro", "beat1"), 120);
assert.equal(getInternalRefundUnit("ouro", "percent_beats"), 10);

for (const id of ["bronze", "prata", "ouro"] as const) {
  assert.ok(getPlanDefinition(id)?.internalRefundValues);
  assert.ok(PLAN_DEFINITIONS[id].internalRefundValues.sessao > 0);
}

assert.deepEqual(
  [...SUBSCRIPTION_STATUSES].sort(),
  ["active", "cancelled", "delinquent", "expired", "pending", "suspended"].sort()
);
assert.equal(SUBSCRIPTION_STATUS_LABELS.active, "Ativa");
assert.equal(SUBSCRIPTION_STATUS_LABELS.delinquent, "Inadimplente");
assert.equal(subscriptionAllowsBenefitRenewal("active"), true);
assert.equal(subscriptionAllowsBenefitRenewal("delinquent"), false);
assert.equal(subscriptionAllowsBenefitRenewal("suspended"), false);

// Exemplo de cálculo: Prata 449.99 − (sessão 30 + captação 50) = 369.99
const paid = 449.99;
const used = getInternalRefundUnit("prata", "sessao") + getInternalRefundUnit("prata", "captacao");
const refund = Math.max(0, Math.round((paid - used) * 100) / 100);
assert.equal(refund, 369.99);

console.log("[go-h10c] PASS — reembolso interno + estados de Assinatura.");
