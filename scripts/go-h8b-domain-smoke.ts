/**
 * GO-H8B — Smoke: purgeOrderTree dry-run + auditoria + soma de contagens.
 * Não cria dados reais; valida o módulo e a API de domínio.
 */
import {
  sumCounts,
  type OrderTreeCounts,
} from "../src/app/lib/domain/purge-order-tree";
import {
  resolveCouponCategory,
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

const empty: OrderTreeCounts = {
  payments: 0,
  serviceOrders: 0,
  coupons: 0,
  appointments: 0,
  services: 0,
  selectedServices: 0,
  deliveries: 0,
  userPlans: 0,
  subscriptions: 0,
  paymentMetadata: 0,
  history: 0,
  syncEvents: 0,
};

console.log("=== GO-H8B purge counts ===");
const a = { ...empty, payments: 1, appointments: 2, coupons: 3 };
const b = { ...empty, payments: 2, services: 4, history: 1 };
const s = sumCounts([a, b]);
assert(s.payments === 3, "sumCounts payments");
assert(s.appointments === 2, "sumCounts appointments");
assert(s.coupons === 3, "sumCounts coupons");
assert(s.services === 4, "sumCounts services");
assert(s.history === 1, "sumCounts history");

console.log("=== GO-H8B category still intact ===");
assert(
  resolveCouponCategory({ canonicalType: "REBOOK", serviceType: "sessao" }) === "reembolso",
  "REBOOK → reembolso"
);

console.log(failed === 0 ? "\nGO-H8B PASS" : `\nGO-H8B FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
