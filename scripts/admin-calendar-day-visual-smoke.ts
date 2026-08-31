/**
 * Paleta visual dos DIAS no calendário Admin (Controle de Agendamento).
 * Não substitui a regra pública (`resolvePublicDayVisual`).
 */
import assert from "node:assert/strict";
import {
  OPERATIONAL_HOURS,
  computeCalendarDayStates,
  getCalendarDayState,
  parseStudioDateTime,
  resolveCalendarDayVisual,
  resolvePublicDayVisual,
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

const D = "2026-09-10";

{
  const states = computeCalendarDayStates({ appointments: [] });
  const state = getCalendarDayState(states, D);
  assert.equal(state.visual, "livre");
  assert.equal(resolvePublicDayVisual(state), "livre");
  ok("1. dia totalmente livre => verde (admin e público)");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(D, "14:00", { tipo: "sessao" })],
  });
  assert.equal(states[D]?.visual, "parcial");
  ok("2. Sessão => amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(D, "14:00", { tipo: "captacao" })],
  });
  assert.equal(states[D]?.visual, "parcial");
  ok("3. Captação => amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: [],
    blockedSlots: [{ data: D, hora: "18:00" }],
  });
  assert.equal(states[D]?.visual, "parcial");
  assert.equal(resolvePublicDayVisual(states[D]!), "parcial");
  ok("4. um horário bloqueado e nenhum serviço => amarelo admin");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(D, "10:00", { tipo: "sessao" })],
    blockedSlots: [{ data: D, hora: "18:00" }],
  });
  assert.equal(states[D]?.visual, "parcial");
  ok("5. Sessão + bloqueio => amarelo");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(D, "22:00", { tipo: "mix", id: 2 })],
  });
  assert.equal(states[D]?.visual, "entrega");
  assert.equal(resolvePublicDayVisual(states[D]!), "parcial");
  ok("6. Produção somente => roxo admin; público permanece parcial");
}

{
  const states = computeCalendarDayStates({
    appointments: [
      apt(D, "10:00", { tipo: "sessao", id: 1 }),
      apt(D, "22:00", { tipo: "mix", id: 2 }),
    ],
  });
  assert.equal(states[D]?.visual, "parcial_entrega");
  ok("7. Produção + Sessão => amarelo + roxo");
}

{
  const states = computeCalendarDayStates({
    appointments: [
      apt(D, "10:00", { tipo: "captacao", id: 1 }),
      apt(D, "22:00", { tipo: "mix", id: 2 }),
    ],
  });
  assert.equal(states[D]?.visual, "parcial_entrega");
  ok("8. Produção + Captação => amarelo + roxo");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(D, "22:00", { tipo: "mix", id: 2 })],
    blockedSlots: [{ data: D, hora: "18:00" }],
  });
  assert.equal(states[D]?.visual, "parcial_entrega");
  ok("9. Produção + bloqueio => amarelo + roxo");
}

{
  const states = computeCalendarDayStates({
    appointments: [
      apt(D, "10:00", { tipo: "sessao", id: 1 }),
      apt(D, "22:00", { tipo: "mix", id: 2 }),
    ],
    blockedSlots: [{ data: D, hora: "18:00" }],
  });
  assert.equal(states[D]?.visual, "parcial_entrega");
  ok("10. Produção + Sessão + bloqueio => amarelo + roxo");
}

{
  const allBlocked = OPERATIONAL_HOURS.map((hora) => ({ data: D, hora }));
  const fullBlocked = computeCalendarDayStates({
    appointments: [],
    blockedSlots: allBlocked,
  });
  assert.equal(fullBlocked[D]?.visual, "ocupado");

  const allDone = computeCalendarDayStates({
    appointments: OPERATIONAL_HOURS.map((h, i) =>
      apt(D, h, { status: "concluido", id: i + 1 })
    ),
  });
  assert.equal(allDone[D]?.visual, "concluido");

  assert.equal(
    resolveCalendarDayVisual({
      activePresencialHours: [...OPERATIONAL_HOURS],
      activeProductionHours: [],
      completedHours: [],
      blockedHours: [],
    }),
    "ocupado"
  );
  assert.equal(
    resolveCalendarDayVisual({
      activePresencialHours: [],
      activeProductionHours: [],
      completedHours: [...OPERATIONAL_HOURS],
      blockedHours: [],
    }),
    "concluido"
  );
  ok("11. Concluído/Ocupado mantêm prioridade quando não há livres");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(D, "22:00", { tipo: "mix" })],
  });
  assert.equal(states[D]?.visual, "entrega");
  assert.equal(resolvePublicDayVisual(states[D]!), "parcial");
  ok("12. calendário público NÃO usa a paleta admin (produção só = parcial público)");
}

console.log(
  JSON.stringify({ reportId: "admin-calendar-day-visual", pass: true }, null, 2)
);
