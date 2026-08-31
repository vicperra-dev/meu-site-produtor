/**
 * Smoke GO-H8 — categorias de cupom, Pedido Raiz, consumo imediato (regras).
 */
import {
  resolveCouponCategory,
  couponCategoryLabel,
  categoryFromServiceType,
} from "../src/app/lib/domain/coupon-category";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("PASS:", msg);
  }
}

console.log("=== GO-H8 categorias ===");
assert(resolveCouponCategory({ canonicalType: "SERVICE", serviceType: "sessao" }) === "servico", "2 Sessões → Serviço");
assert(resolveCouponCategory({ canonicalType: "SERVICE", serviceType: "captacao" }) === "servico", "Captação → Serviço");
assert(resolveCouponCategory({ canonicalType: "SERVICE", serviceType: "beat1" }) === "producao", "Beat → Produção");
assert(resolveCouponCategory({ canonicalType: "SERVICE", serviceType: "mix" }) === "producao", "Mix → Produção");
assert(resolveCouponCategory({ canonicalType: "SERVICE", serviceType: "master" }) === "producao", "Master → Produção");
assert(resolveCouponCategory({ canonicalType: "REBOOK", serviceType: "sessao" }) === "reembolso", "Cancelamento → Reembolso");
assert(resolveCouponCategory({ canonicalType: "REFUND", serviceType: null }) === "reembolso", "REFUND → Reembolso");
assert(resolveCouponCategory({ canonicalType: "PLAN", discountType: "service", serviceType: "sessao" }) === "servico", "Plano serviço presencial");
assert(resolveCouponCategory({ canonicalType: "PLAN", discountType: "service", serviceType: "mix" }) === "producao", "Plano produção");
assert(resolveCouponCategory({ canonicalType: "DISCOUNT", discountType: "percent" }) === "desconto", "Promoção → Desconto");
assert(couponCategoryLabel("servico") === "Serviço", "label Serviço");
assert(categoryFromServiceType("producao_completa") === "producao", "produção completa");

console.log("\n=== GO-H8 Produção Completa matrix ===");
const pc = ["sessao", "sessao", "captacao", "captacao", "beat1", "mix", "master"];
const expected = ["servico", "servico", "servico", "servico", "producao", "producao", "producao"];
pc.forEach((st, i) => {
  const cat = resolveCouponCategory({ canonicalType: "SERVICE", serviceType: st });
  assert(cat === expected[i], `PC[${i}] ${st} → ${expected[i]} (got ${cat})`);
});

if (failed > 0) {
  console.error(`\nGO-H8 FAIL (${failed})`);
  process.exit(1);
}
console.log("\nGO-H8 PASS");
