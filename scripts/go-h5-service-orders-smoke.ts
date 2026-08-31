/**
 * Smoke GO-H5 — Ordens de Serviço + regra universal.
 */
import {
  exigeAgendamentoNoCheckout,
  isCouponsOnlyAgendamentoPayment,
} from "../src/app/lib/agendamento-payment-rules";
import {
  countServiceOrders,
  expandPurchaseToServiceOrders,
  COMMERCIAL_PRODUCT_COMPOSITION,
} from "../src/app/lib/service-orders";

type Line = { id: string; quantidade: number };

const cases: Array<[string, Line[], Line[], number]> = [
  ["1 sessao", [{ id: "sessao", quantidade: 1 }], [], 1],
  ["2 sessoes", [{ id: "sessao", quantidade: 2 }], [], 2],
  ["1 mix", [{ id: "mix", quantidade: 1 }], [], 1],
  ["mix_master", [{ id: "mix_master", quantidade: 1 }], [], 2],
  ["sessao+beat", [{ id: "sessao", quantidade: 1 }], [{ id: "beat1", quantidade: 1 }], 2],
  ["producao_completa", [], [{ id: "producao_completa", quantidade: 1 }], 7],
  ["beat2", [], [{ id: "beat2", quantidade: 1 }], 2],
];

console.log("producao_completa composition", COMMERCIAL_PRODUCT_COMPOSITION.producao_completa);

for (const [label, s, b, expectOrders] of cases) {
  const orders = countServiceOrders(s, b);
  const checkout = exigeAgendamentoNoCheckout(s, b);
  const coupons = isCouponsOnlyAgendamentoPayment({}, s, b);
  const ok =
    orders === expectOrders &&
    checkout === (expectOrders === 1) &&
    coupons === (expectOrders >= 2);
  console.log(label, {
    orders,
    expectOrders,
    checkout,
    coupons,
    types: expandPurchaseToServiceOrders(s, b).map((o) => o.serviceType),
    ok,
  });
  if (!ok) process.exitCode = 1;
}
