/**
 * GO-H10B — Smoke: PLAN_DEFINITIONS + contagens de cupons + Shopping access.
 * Não toca banco de produção; valida a configuração central.
 */
import assert from "node:assert/strict";
import {
  PLAN_DEFINITIONS,
  countPlanCycleCoupons,
  getPlanPrice,
  planHasPromotionAccess,
} from "../src/app/lib/plan-definitions";

function grantTypes(planId: keyof typeof PLAN_DEFINITIONS) {
  const counts: Record<string, number> = {};
  for (const g of PLAN_DEFINITIONS[planId].cycleBenefits) {
    const key =
      g.kind === "service" ? g.serviceType : `percent_${g.target}`;
    counts[key] = (counts[key] || 0) + g.quantity;
  }
  return counts;
}

assert.equal(getPlanPrice("bronze", "mensal"), 239.99);
assert.equal(getPlanPrice("bronze", "anual"), 2399.9);
assert.equal(countPlanCycleCoupons("bronze"), 5);
assert.deepEqual(grantTypes("bronze"), {
  sessao: 1,
  captacao: 2,
  mix: 1,
  percent_servicos: 1,
});
assert.equal(planHasPromotionAccess("bronze"), false);

assert.equal(countPlanCycleCoupons("prata"), 6);
assert.deepEqual(grantTypes("prata"), {
  sessao: 1,
  captacao: 2,
  mix: 1,
  master: 1,
  beat1: 1,
});
assert.equal(planHasPromotionAccess("prata"), true);

assert.equal(countPlanCycleCoupons("ouro"), 14);
assert.deepEqual(grantTypes("ouro"), {
  sessao: 2,
  captacao: 4,
  mix: 2,
  master: 2,
  beat1: 2,
  percent_servicos: 1,
  percent_beats: 1,
});
assert.equal(planHasPromotionAccess("ouro"), true);

assert.equal(countPlanCycleCoupons("teste"), 5);
assert.equal(planHasPromotionAccess("teste"), false);

console.log("[go-h10b] PASS — PLAN_DEFINITIONS consistente (Bronze/Prata/Ouro + Shopping).");
