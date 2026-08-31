/**
 * Smoke GO-H6 — Laboratório: presets, regra 1 vs 2+ Ordens, seleção livre.
 */
import { LAB_PRESETS } from "../src/app/lib/homologation/presets";
import { CHECKOUT_CATALOG, type CanonicalServiceId } from "../src/app/lib/service-catalog";
import {
  countServiceOrders,
  purchaseOpensImmediateSchedule,
  purchaseEmitsServiceOrderCoupons,
} from "../src/app/lib/service-orders";

type Line = { id: string; quantidade: number };

function qtyToLines(qty: Partial<Record<CanonicalServiceId, number>>) {
  const servicos: Line[] = [];
  const beats: Line[] = [];
  for (const id of Object.keys(CHECKOUT_CATALOG) as CanonicalServiceId[]) {
    const n = qty[id] || 0;
    if (n < 1) continue;
    const item = CHECKOUT_CATALOG[id];
    const line = { id, quantidade: n };
    if (item.category === "beat") beats.push(line);
    else servicos.push(line);
  }
  return { servicos, beats };
}

const cases: Array<[string, Line[], Line[], number, boolean]> = [
  ["1 ordem", [{ id: "sessao", quantidade: 1 }], [], 1, true],
  ["2 ordens", [{ id: "sessao", quantidade: 2 }], [], 2, false],
  ["3 ordens", [{ id: "sessao", quantidade: 1 }, { id: "mix", quantidade: 1 }, { id: "master", quantidade: 1 }], [], 3, false],
  ["repetidos", [{ id: "sessao", quantidade: 2 }], [], 2, false],
  ["misturados", [{ id: "sessao", quantidade: 1 }, { id: "captacao", quantidade: 1 }], [{ id: "beat1", quantidade: 1 }], 3, false],
  ["producao", [], [{ id: "producao_completa", quantidade: 1 }], 7, false],
];

let failed = 0;

console.log("=== GO-H6 presets ===");
for (const p of LAB_PRESETS) {
  console.log(`- ${p.id}: ${p.label}${p.scenarioId ? ` → ${p.scenarioId}` : ""}`);
}
if (LAB_PRESETS.length < 8) {
  console.error("FAIL: esperava >= 8 presets");
  failed++;
}

console.log("\n=== GO-H6 regras (mesmas do checkout) ===");
for (const [label, s, b, expectOrders, expectImmediate] of cases) {
  const orders = countServiceOrders(s, b);
  const immediate = purchaseOpensImmediateSchedule(s, b);
  const coupons = purchaseEmitsServiceOrderCoupons(s, b);
  const ok =
    orders === expectOrders &&
    immediate === expectImmediate &&
    coupons === !expectImmediate &&
    immediate === (orders === 1) &&
    coupons === (orders >= 2);
  console.log(label, { orders, expectOrders, immediate, coupons, ok });
  if (!ok) failed++;
}

console.log("\n=== GO-H6 presets → ordens ===");
for (const p of LAB_PRESETS) {
  if (!p.qty) continue;
  const { servicos, beats } = qtyToLines(p.qty);
  const orders = countServiceOrders(servicos, beats);
  console.log(p.id, { orders, immediate: purchaseOpensImmediateSchedule(servicos, beats) });
}

if (failed > 0) {
  console.error(`\nGO-H6 FAIL (${failed})`);
  process.exit(1);
}
console.log("\nGO-H6 PASS");
