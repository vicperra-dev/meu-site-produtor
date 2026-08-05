/**
 * BUG-001 — Smoke: calendário civil, timezone estúdio, cores, produções sucessivas.
 */
import assert from "node:assert/strict";
import {
  computeCalendarDayStates,
  daysInMonth,
  findLastFreeOperationalHour,
  formatStudioDateLong,
  isLeapYear,
  isValidIsoDate,
  parseStudioDateTime,
  resolveCalendarDayVisual,
  toIsoDateStudio,
  getHourStudio,
  OPERATIONAL_HOURS,
} from "../src/app/lib/calendar-day-state";

function ok(label: string) {
  console.log("PASS", label);
}

// Civil calendar
assert.equal(daysInMonth(2026, 2), 28);
assert.equal(daysInMonth(2024, 2), 29);
assert.equal(daysInMonth(2026, 4), 30);
assert.equal(daysInMonth(2026, 1), 31);
assert.equal(isLeapYear(2024), true);
assert.equal(isLeapYear(2026), false);
assert.equal(isValidIsoDate("2026-02-29"), false);
assert.equal(isValidIsoDate("2024-02-29"), true);
ok("civil calendar 28/29/30/31");

// No UTC shift on display of YYYY-MM-DD
const long = formatStudioDateLong("2026-08-05");
assert.match(long, /5/);
assert.doesNotMatch(long, /\b4\b/);
ok(`formatStudioDateLong → ${long}`);

// parse / read roundtrip BRT
const dt = parseStudioDateTime("2026-08-05", "14:00");
assert.equal(toIsoDateStudio(dt), "2026-08-05");
assert.equal(getHourStudio(dt), "14:00");
ok("parseStudioDateTime roundtrip America/Sao_Paulo");

// Partial presencial = amarelo
{
  const states = computeCalendarDayStates({
    appointments: [
      { data: parseStudioDateTime("2026-08-10", "14:00"), duracaoMinutos: 60, tipo: "sessao", id: 1 },
    ],
  });
  assert.equal(states["2026-08-10"]?.visual, "parcial");
  ok("parcial amarelo");
}

// Produção sozinha = roxo; ocupa último livre (22:00)
{
  const states = computeCalendarDayStates({
    appointments: [
      { data: parseStudioDateTime("2026-08-11", "22:00"), duracaoMinutos: 60, tipo: "mix", id: 2 },
    ],
  });
  assert.equal(states["2026-08-11"]?.visual, "entrega");
  assert.deepEqual(states["2026-08-11"]?.productionHours, ["22:00"]);
  ok("entrega roxo @ 22:00");
}

// Duas produções → 22:00 e 21:00
{
  const states = computeCalendarDayStates({
    appointments: [
      { data: parseStudioDateTime("2026-08-12", "22:00"), duracaoMinutos: 60, tipo: "mix", id: 3 },
      { data: parseStudioDateTime("2026-08-12", "22:00"), duracaoMinutos: 60, tipo: "master", id: 4 },
    ],
  });
  assert.deepEqual(states["2026-08-12"]?.productionHours, ["21:00", "22:00"]);
  assert.equal(states["2026-08-12"]?.visual, "entrega");
  ok("produções sucessivas último livre");
}

// Presencial + produção com livres = parcial_entrega
{
  const states = computeCalendarDayStates({
    appointments: [
      { data: parseStudioDateTime("2026-08-13", "10:00"), duracaoMinutos: 60, tipo: "sessao", id: 5 },
      { data: parseStudioDateTime("2026-08-13", "22:00"), duracaoMinutos: 60, tipo: "mix", id: 6 },
    ],
  });
  assert.equal(states["2026-08-13"]?.visual, "parcial_entrega");
  ok("parcial_entrega");
}

// Dia cheio = vermelho (ocupado) — prioridade máxima
{
  const blocked = OPERATIONAL_HOURS.map((hora) => ({
    data: "2026-08-14",
    hora,
  }));
  const states = computeCalendarDayStates({
    appointments: [],
    blockedSlots: blocked,
  });
  assert.equal(states["2026-08-14"]?.visual, "ocupado");
  ok("dia cheio vermelho");
}

// Visual helper: full occupied set
assert.equal(
  resolveCalendarDayVisual({
    presencialHours: [...OPERATIONAL_HOURS],
    blockedHours: [],
    productionHours: [],
  }),
  "ocupado"
);
ok("resolveCalendarDayVisual ocupado");

assert.equal(
  findLastFreeOperationalHour(new Set(OPERATIONAL_HOURS.slice(0, -1))),
  "22:00"
);
ok("findLastFreeOperationalHour");

console.log(JSON.stringify({ reportId: "BUG-001-calendar-smoke", pass: true }, null, 2));
