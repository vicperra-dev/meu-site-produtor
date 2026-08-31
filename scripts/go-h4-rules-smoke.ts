/**
 * Smoke GO-H4 — pacotes, regras de checkout e calendário.
 */
import {
  exigeAgendamentoNoCheckout,
  isCouponsOnlyAgendamentoPayment,
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
} from "../src/app/lib/agendamento-payment-rules";
import { expandAgendamentoItemToCouponTypes } from "../src/app/lib/service-catalog";
import { OFFICIAL_PACKAGE_COMPOSITION } from "../src/app/lib/package-composition";
import {
  computeCalendarDayStates,
  PRODUCTION_DELIVERY_HOUR,
} from "../src/app/lib/calendar-day-state";

type Line = { id: string; quantidade: number };

const cases: Array<[string, Line[], Line[]]> = [
  ["sessao", [{ id: "sessao", quantidade: 1 }], []],
  ["mix", [{ id: "mix", quantidade: 1 }], []],
  ["mix_master", [{ id: "mix_master", quantidade: 1 }], []],
  ["producao_completa", [], [{ id: "producao_completa", quantidade: 1 }]],
  ["beat2", [], [{ id: "beat2", quantidade: 1 }]],
];

console.log("PRODUCTION_SCHEDULE_DEFAULT_HOUR", PRODUCTION_SCHEDULE_DEFAULT_HOUR);
console.log("PRODUCTION_DELIVERY_HOUR", PRODUCTION_DELIVERY_HOUR);
console.log("producao_completa composition", OFFICIAL_PACKAGE_COMPOSITION.producao_completa);

for (const [label, s, b] of cases) {
  const first = s[0] || b[0];
  console.log(label, {
    checkout: exigeAgendamentoNoCheckout(s, b),
    couponsOnly: isCouponsOnlyAgendamentoPayment({}, s, b),
    coupons: expandAgendamentoItemToCouponTypes(first.id, 1, first.id),
  });
}

const states = computeCalendarDayStates({
  appointments: [
    { data: "2026-08-10T14:00:00-03:00", duracaoMinutos: 60, tipo: "sessao" },
    { data: "2026-08-10T22:00:00-03:00", duracaoMinutos: 60, tipo: "mix" },
    { data: "2026-08-11T22:00:00-03:00", duracaoMinutos: 60, tipo: "beat1" },
  ],
  blockedSlots: [],
});
console.log("day 10 visual (expect parcial_entrega)", states["2026-08-10"]?.visual);
console.log("day 11 visual (expect entrega)", states["2026-08-11"]?.visual);
console.log("day 10 occupied", states["2026-08-10"]?.occupiedHours);
