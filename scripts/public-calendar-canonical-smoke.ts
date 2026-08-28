/**
 * Calendário público — regra canônica de horários/dias (verde / amarelo / vermelho).
 */
import assert from "node:assert/strict";
import {
  OPERATIONAL_HOURS,
  computeCalendarDayStates,
  getCalendarDayState,
  isPublicDaySelectable,
  isPublicHourSelectable,
  parseStudioDateTime,
  publicHourSlotPresentation,
  resolvePublicDayVisual,
  resolvePublicHourKind,
} from "../src/app/lib/calendar-day-state";

function ok(label: string) {
  console.log("PASS", label);
}

function apt(
  date: string,
  hour: string,
  opts?: { tipo?: string; status?: string; id?: number }
) {
  return {
    data: parseStudioDateTime(date, hour),
    duracaoMinutos: 60,
    tipo: opts?.tipo ?? "sessao",
    status: opts?.status ?? "aceito",
    id: opts?.id ?? 1,
  };
}

function blocked(date: string, hours: string[]) {
  return hours.map((hora) => ({ data: date, hora }));
}

const DATE = "2026-08-28";
const ALL = [...OPERATIONAL_HOURS];

{
  const states = computeCalendarDayStates({ appointments: [] });
  const state = getCalendarDayState(states, DATE);
  assert.equal(resolvePublicDayVisual(state), "livre");
  assert.equal(isPublicDaySelectable("livre"), true);
  ok("1. todos livres => dia verde");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(DATE, "14:00")],
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicHourKind("14:00", state), "occupied");
  assert.equal(resolvePublicDayVisual(state), "parcial");
  ok("2. um ocupado + restantes livres => dia amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: [],
    blockedSlots: blocked(DATE, ["14:00"]),
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicHourKind("14:00", state), "blocked");
  assert.notEqual(resolvePublicHourKind("14:00", state), "occupied");
  assert.equal(resolvePublicDayVisual(state), "parcial");
  ok("3. um bloqueado + restantes livres => dia amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(DATE, "10:00", { id: 1 }), apt(DATE, "11:00", { id: 2 })],
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicDayVisual(state), "parcial");
  ok("4. vários ocupados + pelo menos um livre => dia amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: [],
    blockedSlots: blocked(DATE, ["10:00", "11:00", "12:00"]),
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicDayVisual(state), "parcial");
  ok("5. vários bloqueados + pelo menos um livre => dia amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(DATE, "10:00")],
    blockedSlots: blocked(DATE, ["22:00"]),
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicHourKind("10:00", state), "occupied");
  assert.equal(resolvePublicHourKind("22:00", state), "blocked");
  assert.equal(resolvePublicDayVisual(state), "parcial");
  ok("6. mistura ocupado + bloqueado + livre => dia amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: ALL.map((h, i) => apt(DATE, h, { id: i + 1 })),
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicDayVisual(state), "ocupado");
  assert.equal(isPublicDaySelectable("ocupado"), false);
  ok("7. todos ocupados => dia vermelho");
}

{
  const states = computeCalendarDayStates({
    appointments: [],
    blockedSlots: blocked(DATE, ALL),
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicDayVisual(state), "ocupado");
  for (const h of ALL) {
    assert.equal(resolvePublicHourKind(h, state), "blocked");
  }
  ok("8. todos bloqueados => dia vermelho");
}

{
  const occupiedHours = ALL.slice(0, 6);
  const blockedHours = ALL.slice(6);
  const states = computeCalendarDayStates({
    appointments: occupiedHours.map((h, i) => apt(DATE, h, { id: i + 1 })),
    blockedSlots: blocked(DATE, blockedHours),
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicDayVisual(state), "ocupado");
  ok("9. ocupado + bloqueado preenchendo todos => dia vermelho");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(DATE, "15:00")],
  });
  const state = states[DATE]!;
  const kind = resolvePublicHourKind("15:00", state);
  assert.equal(kind, "occupied");
  assert.equal(isPublicHourSelectable(kind), false);
  const slot = publicHourSlotPresentation(kind);
  assert.equal(slot.disabled, true);
  assert.match(slot.className, /yellow/);
  ok("10. horário ocupado => amarelo e não clicável");
}

{
  const states = computeCalendarDayStates({
    appointments: [],
    blockedSlots: blocked(DATE, ["16:00"]),
  });
  const state = states[DATE]!;
  const kind = resolvePublicHourKind("16:00", state);
  assert.equal(kind, "blocked");
  assert.equal(isPublicHourSelectable(kind), false);
  const slot = publicHourSlotPresentation(kind);
  assert.equal(slot.disabled, true);
  assert.match(slot.className, /red/);
  assert.doesNotMatch(slot.className, /yellow/);
  ok("11. horário bloqueado pelo admin => vermelho e não clicável");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(DATE, "15:00")],
    blockedSlots: blocked(DATE, ["16:00"]),
  });
  const state = states[DATE]!;
  const kind = resolvePublicHourKind("17:00", state);
  assert.equal(kind, "available");
  assert.equal(isPublicHourSelectable(kind), true);
  const slot = publicHourSlotPresentation(kind);
  assert.equal(slot.disabled, false);
  assert.match(slot.className, /green/);
  ok("12. horário disponível => verde e clicável");
}

{
  assert.equal(isPublicDaySelectable("ocupado"), false);
  ok("13. dia vermelho => não clicável");
}

{
  assert.equal(isPublicDaySelectable("parcial"), true);
  ok("14. dia amarelo => ainda clicável");
}

{
  const captacaoHours = ["10:00", "11:00", "12:00"];
  const sessaoHours = ALL;
  const states = computeCalendarDayStates({
    appointments: [],
    blockedSlots: blocked(DATE, ["10:00"]),
  });
  const state = states[DATE]!;
  assert.equal(
    resolvePublicDayVisual(state, { eligibleHours: sessaoHours }),
    "parcial"
  );
  assert.equal(
    resolvePublicDayVisual(state, { eligibleHours: captacaoHours }),
    "parcial"
  );

  const statesFullBlockShort = computeCalendarDayStates({
    appointments: [],
    blockedSlots: blocked(DATE, captacaoHours),
  });
  const short = statesFullBlockShort[DATE]!;
  assert.equal(
    resolvePublicDayVisual(short, { eligibleHours: captacaoHours }),
    "ocupado"
  );
  assert.equal(
    resolvePublicDayVisual(short, { eligibleHours: sessaoHours }),
    "parcial"
  );
  ok("15. serviços com horários elegíveis distintos => cálculo correto");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(DATE, "14:00")],
    blockedSlots: blocked(DATE, ["14:00"]),
  });
  const state = states[DATE]!;
  assert.equal(resolvePublicHourKind("14:00", state), "blocked");
  ok("bloqueio no mesmo horário de reserva => vermelho, não amarelo");
}

console.log(
  JSON.stringify({ reportId: "public-calendar-canonical", pass: true }, null, 2)
);
