/**
 * Smoke GO-H4.3 — pendente não ocupa; pacotes vs unitários.
 */
import {
  exigeAgendamentoNoCheckout,
  isCouponsOnlyAgendamentoPayment,
} from "../src/app/lib/agendamento-payment-rules";
import { expandAgendamentoItemToCouponTypes } from "../src/app/lib/service-catalog";
import { OFFICIAL_PACKAGE_COMPOSITION } from "../src/app/lib/package-composition";
import { computeCalendarDayStates } from "../src/app/lib/calendar-day-state";
import { appointmentReservesCalendar } from "../src/app/lib/domain/statuses";

type Line = { id: string; quantidade: number };

console.log("pendente reserves?", appointmentReservesCalendar("pendente"));
console.log("aceito reserves?", appointmentReservesCalendar("aceito"));
console.log("producao_completa", OFFICIAL_PACKAGE_COMPOSITION.producao_completa);

const unit: Line[] = [{ id: "mix", quantidade: 1 }];
const pkg: Line[] = [{ id: "mix_master", quantidade: 1 }];
console.log("mix unit", {
  checkout: exigeAgendamentoNoCheckout(unit, []),
  couponsOnly: isCouponsOnlyAgendamentoPayment({}, unit, []),
});
console.log("mix_master pkg", {
  checkout: exigeAgendamentoNoCheckout(pkg, []),
  couponsOnly: isCouponsOnlyAgendamentoPayment({}, pkg, []),
  coupons: expandAgendamentoItemToCouponTypes("mix_master", 1),
});

const states = computeCalendarDayStates({
  appointments: [
    { data: "2026-09-01T14:00:00", duracaoMinutos: 60, tipo: "sessao", status: "pendente" },
    { data: "2026-09-02T14:00:00", duracaoMinutos: 60, tipo: "sessao", status: "aceito" },
    { data: "2026-09-03T22:00:00", duracaoMinutos: 60, tipo: "mix", status: "pendente" },
    { data: "2026-09-03T22:00:00", duracaoMinutos: 60, tipo: "mix", status: "aceito" },
  ],
});
console.log("sep1 pendente visual (expect livre/undefined)", states["2026-09-01"]?.visual ?? "livre");
console.log("sep2 aceito visual (expect parcial)", states["2026-09-02"]?.visual);
console.log("sep3 mix aceito visual (expect entrega)", states["2026-09-03"]?.visual);
