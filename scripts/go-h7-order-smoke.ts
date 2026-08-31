/**
 * Smoke GO-H7 — Pedido de Homologação (origin HOMOLOGATION).
 * Valida identidade + regras de Ordens sem bater no banco (unitário).
 * Para E2E DB: use a UI / API autenticada em staging.
 */
import {
  detectPaymentGatewayProvider,
  newHomologationPaymentId,
  paymentProviderPersistFields,
} from "../src/app/lib/payment-provider/identity";
import {
  countServiceOrders,
  purchaseOpensImmediateSchedule,
  purchaseEmitsServiceOrderCoupons,
} from "../src/app/lib/service-orders";
import { CHECKOUT_CATALOG, totalPricedCheckoutItems, priceCheckoutItems } from "../src/app/lib/service-catalog";
import { HOMOLOGATION_ORIGIN } from "../src/app/lib/homologation/create-order";

type Line = { id: string; quantidade: number };

const cases: Array<[string, Line[], Line[], number]> = [
  ["1 Sessão", [{ id: "sessao", quantidade: 1 }], [], 1],
  ["2 Sessões", [{ id: "sessao", quantidade: 2 }], [], 2],
  ["Sessão + Beat", [{ id: "sessao", quantidade: 1 }], [{ id: "beat1", quantidade: 1 }], 2],
  ["Beat", [], [{ id: "beat1", quantidade: 1 }], 1],
  ["Mixagem", [{ id: "mix", quantidade: 1 }], [], 1],
  ["Produção Completa", [], [{ id: "producao_completa", quantidade: 1 }], 7],
  ["Mix + Master", [{ id: "mix_master", quantidade: 1 }], [], 2],
];

let failed = 0;

console.log("=== GO-H7 identity ===");
{
  const id = newHomologationPaymentId();
  const detected = detectPaymentGatewayProvider(id);
  const fields = paymentProviderPersistFields({
    providerPaymentId: id,
    metadata: { provider: HOMOLOGATION_ORIGIN, origin: HOMOLOGATION_ORIGIN },
  });
  const ok =
    id.startsWith("homo_pay_") &&
    detected === "HOMOLOGATION" &&
    fields.provider === "HOMOLOGATION" &&
    fields.asaasId === null;
  console.log({ id, detected, fields, ok });
  if (!ok) failed++;

  const sim = paymentProviderPersistFields({
    providerPaymentId: "sim_pay_test",
  });
  if (sim.provider !== "SIMULATION") {
    console.error("FAIL: Simulation identity broken");
    failed++;
  }
}

console.log("\n=== GO-H7 regras (iguais ao checkout real) ===");
for (const [label, s, b, expectOrders] of cases) {
  const orders = countServiceOrders(s, b);
  const immediate = purchaseOpensImmediateSchedule(s, b);
  const coupons = purchaseEmitsServiceOrderCoupons(s, b);
  const pricedS = priceCheckoutItems(
    s.map((x) => ({ id: x.id, quantidade: x.quantidade })),
    "service"
  );
  const pricedB = priceCheckoutItems(
    b.map((x) => ({ id: x.id, quantidade: x.quantidade })),
    "beat"
  );
  const total = totalPricedCheckoutItems([...pricedS, ...pricedB]);
  const ok =
    orders === expectOrders &&
    immediate === (orders === 1) &&
    coupons === (orders >= 2) &&
    total > 0 &&
    total !== 5; // Pedido Homologação usa catálogo, não R$5 simbólico
  console.log(label, { orders, expectOrders, immediate, coupons, total, ok });
  if (!ok) failed++;
}

console.log("\n=== GO-H7 catalog sanity ===");
{
  const n = Object.keys(CHECKOUT_CATALOG).length;
  console.log("catalog items", n);
  if (n < 10) failed++;
  if (HOMOLOGATION_ORIGIN !== "HOMOLOGATION") failed++;
}

if (failed > 0) {
  console.error(`\nGO-H7 FAIL (${failed})`);
  process.exit(1);
}
console.log("\nGO-H7 PASS");
