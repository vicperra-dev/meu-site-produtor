/**
 * BUG-001 — Smoke: calendário civil, timezone, legendas admin/user, concluído azul.
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
  toUserDayVisual,
  getHourStudio,
  OPERATIONAL_HOURS,
  calendarDayCellStyle,
  isIsoDatePastStudio,
} from "../src/app/lib/calendar-day-state";

function ok(label: string) {
  console.log("PASS", label);
}

// Civil calendar
assert.equal(daysInMonth(2026, 2), 28);
assert.equal(daysInMonth(2024, 2), 29);
assert.equal(daysInMonth(2026, 4), 30);
assert.equal(daysInMonth(2026, 1), 31);
assert.equal(daysInMonth(2025, 12), 31);
assert.equal(isLeapYear(2024), true);
assert.equal(isLeapYear(2026), false);
assert.equal(isValidIsoDate("2026-02-29"), false);
assert.equal(isValidIsoDate("2024-02-29"), true);
assert.equal(isValidIsoDate("2025-12-31"), true);
assert.equal(isValidIsoDate("2026-01-01"), true);
ok("civil calendar 28/29/30/31 + virada ano");

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
      {
        data: parseStudioDateTime("2026-08-10", "14:00"),
        duracaoMinutos: 60,
        tipo: "sessao",
        status: "aceito",
        id: 1,
      },
    ],
  });
  assert.equal(states["2026-08-10"]?.visual, "parcial");
  assert.equal(toUserDayVisual("parcial"), "parcial");
  ok("parcial amarelo (admin Serviço / user Ocupado)");
}

// Produção sozinha = roxo; ocupa último livre (22:00)
{
  const states = computeCalendarDayStates({
    appointments: [
      {
        data: parseStudioDateTime("2026-08-11", "22:00"),
        duracaoMinutos: 60,
        tipo: "mix",
        status: "aceito",
        id: 2,
      },
    ],
  });
  assert.equal(states["2026-08-11"]?.visual, "entrega");
  assert.deepEqual(states["2026-08-11"]?.productionHours, ["22:00"]);
  assert.equal(toUserDayVisual("entrega"), "parcial");
  ok("entrega roxo @ 22:00 → user amarelo");
}

// Duas produções → 22:00 e 21:00
{
  const states = computeCalendarDayStates({
    appointments: [
      {
        data: parseStudioDateTime("2026-08-12", "22:00"),
        duracaoMinutos: 60,
        tipo: "mix",
        status: "aceito",
        id: 3,
      },
      {
        data: parseStudioDateTime("2026-08-12", "22:00"),
        duracaoMinutos: 60,
        tipo: "master",
        status: "aceito",
        id: 4,
      },
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
      {
        data: parseStudioDateTime("2026-08-13", "10:00"),
        duracaoMinutos: 60,
        tipo: "sessao",
        status: "aceito",
        id: 5,
      },
      {
        data: parseStudioDateTime("2026-08-13", "22:00"),
        duracaoMinutos: 60,
        tipo: "mix",
        status: "aceito",
        id: 6,
      },
    ],
  });
  assert.equal(states["2026-08-13"]?.visual, "parcial_entrega");
  ok("parcial_entrega");
}

// Dia cheio = vermelho (ocupado)
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
  assert.equal(toUserDayVisual("ocupado"), "ocupado");
  ok("dia cheio vermelho");
}

// Dia totalmente concluído = azul (admin); user = amarelo
{
  const apts = OPERATIONAL_HOURS.map((hora, i) => ({
    data: parseStudioDateTime("2026-08-15", hora),
    duracaoMinutos: 60,
    tipo: "sessao",
    status: "concluido",
    id: 100 + i,
  }));
  const states = computeCalendarDayStates({ appointments: apts });
  assert.equal(states["2026-08-15"]?.visual, "concluido");
  assert.equal(states["2026-08-15"]?.allCompleted, true);
  assert.equal(toUserDayVisual("concluido"), "parcial");
  assert.equal(toUserDayVisual("concluido", { past: true }), "ocupado");
  ok("dia concluído azul admin / amarelo user / vermelho passado");
}

// Cancelamento/recusa não ocupam
{
  const states = computeCalendarDayStates({
    appointments: [
      {
        data: parseStudioDateTime("2026-08-16", "14:00"),
        duracaoMinutos: 60,
        tipo: "sessao",
        status: "cancelado",
        id: 7,
      },
      {
        data: parseStudioDateTime("2026-08-16", "15:00"),
        duracaoMinutos: 60,
        tipo: "sessao",
        status: "recusado",
        id: 8,
      },
      {
        data: parseStudioDateTime("2026-08-16", "16:00"),
        duracaoMinutos: 60,
        tipo: "sessao",
        status: "pendente",
        id: 9,
      },
    ],
  });
  assert.equal(states["2026-08-16"], undefined);
  ok("cancelado/recusado/pendente não ocupam");
}

// Aceite ocupa
{
  const states = computeCalendarDayStates({
    appointments: [
      {
        data: parseStudioDateTime("2026-08-17", "14:00"),
        duracaoMinutos: 60,
        tipo: "sessao",
        status: "aceito",
        id: 10,
      },
    ],
  });
  assert.deepEqual(states["2026-08-17"]?.presencialHours, ["14:00"]);
  ok("aceite ocupa horário");
}

assert.equal(
  resolveCalendarDayVisual({
    activePresencialHours: [...OPERATIONAL_HOURS],
    activeProductionHours: [],
    completedHours: [],
    blockedHours: [],
  }),
  "ocupado"
);
ok("resolveCalendarDayVisual ocupado");

assert.equal(
  resolveCalendarDayVisual({
    activePresencialHours: [],
    activeProductionHours: [],
    completedHours: [...OPERATIONAL_HOURS],
    blockedHours: [],
  }),
  "concluido"
);
ok("resolveCalendarDayVisual concluido");

assert.equal(
  findLastFreeOperationalHour(new Set(OPERATIONAL_HOURS.slice(0, -1))),
  "22:00"
);
ok("findLastFreeOperationalHour");

{
  const yesterday = "2026-08-25";
  const now = new Date("2026-08-26T15:00:00.000-03:00");
  assert.equal(isIsoDatePastStudio(yesterday, now), true);
  assert.equal(isIsoDatePastStudio("2026-08-26", now), false);
  assert.equal(isIsoDatePastStudio("2026-08-27", now), false);
  const userPast = calendarDayCellStyle("livre", { past: true, audience: "user" });
  assert.match(userPast.className, /red/);
  assert.doesNotMatch(userPast.className, /green/);
  const adminPastLivre = calendarDayCellStyle("livre", { past: true, audience: "admin" });
  assert.match(adminPastLivre.className, /zinc/);
  assert.doesNotMatch(adminPastLivre.className, /red/);
  const userToday = calendarDayCellStyle("livre", { past: false, audience: "user" });
  assert.match(userToday.className, /green/);
  const userOccupiedFuture = calendarDayCellStyle("parcial", {
    past: false,
    audience: "user",
  });
  assert.match(userOccupiedFuture.className, /yellow/);
  assert.equal(toUserDayVisual("livre", { past: true }), "ocupado");
  ok("cliente: passado vermelho; hoje verde; admin passado livre não vermelho");
}

{
  const almostMidnightUtc = new Date("2026-08-26T02:30:00.000Z");
  assert.equal(toIsoDateStudio(almostMidnightUtc), "2026-08-25");
  assert.equal(isIsoDatePastStudio("2026-08-25", almostMidnightUtc), false);
  assert.equal(isIsoDatePastStudio("2026-08-24", almostMidnightUtc), true);
  const afterMidnightSp = new Date("2026-08-26T03:30:00.000Z");
  assert.equal(toIsoDateStudio(afterMidnightSp), "2026-08-26");
  assert.equal(isIsoDatePastStudio("2026-08-25", afterMidnightSp), true);
  ok("fuso America/Sao_Paulo: UTC não vira o dia civil");
}

console.log(
  JSON.stringify({ reportId: "BUG-001-calendar-smoke", pass: true }, null, 2)
);
