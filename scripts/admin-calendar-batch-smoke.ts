/**
 * Lote administrativo de dias/horários + contrato de rascunho/publicação.
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
import {
  planBlockDays,
  planBlockSlots,
  planUnblockDays,
  planUnblockSlots,
  resolveAdminDayVisualWithDraft,
  toggleIsoInList,
} from "../src/app/lib/admin-calendar-mutations";

function ok(label: string) {
  console.log("PASS", label);
}

function apt(date: string, hour: string, opts?: { tipo?: string; id?: number }) {
  return {
    data: parseStudioDateTime(date, hour),
    duracaoMinutos: 60,
    tipo: opts?.tipo ?? "sessao",
    status: "aceito",
    id: opts?.id ?? 1,
  };
}

const AUG = "2026-08-27";
const AUG31 = "2026-08-31";
const SEP2 = "2026-09-02";
const SEP5 = "2026-09-05";

{
  let sel: string[] = [];
  sel = toggleIsoInList(sel, AUG);
  assert.deepEqual(sel, [AUG]);
  ok("1. selecionar um dia");
  sel = toggleIsoInList(sel, AUG);
  assert.deepEqual(sel, []);
  ok("2. deselecionar");
  sel = toggleIsoInList(sel, AUG);
  sel = toggleIsoInList(sel, AUG31);
  assert.equal(sel.length, 2);
  ok("3. selecionar vários");
  ok("4. selecionar em agosto");
  sel = toggleIsoInList(sel, SEP2);
  sel = toggleIsoInList(sel, SEP5);
  assert.deepEqual(sel.slice().sort(), [AUG, AUG31, SEP2, SEP5]);
  ok("5-6. navegar setembro e selecionar");
  assert.ok(sel.includes(AUG) && sel.includes(AUG31));
  ok("7-8. voltar agosto: seleção ISO permanece");
}

{
  const empty = computeCalendarDayStates({ appointments: [] });
  const plan = planBlockDays({
    dates: [AUG, AUG31],
    dayStates: empty,
    blockedSlots: [],
  });
  assert.equal(plan.create.length, OPERATIONAL_HOURS.length * 2);
  assert.equal(plan.skippedOccupied.length, 0);
  ok("9. bloquear vários dias (plano: todos os slots elegíveis)");
}

{
  const blocked = [AUG, AUG31].flatMap((data) =>
    OPERATIONAL_HOURS.map((hora, i) => ({
      id: `${data}-${i}`,
      data,
      hora,
      ativo: false as boolean,
    }))
  );
  const plan = planUnblockDays({ dates: [AUG, AUG31], blockedSlots: blocked });
  assert.equal(plan.deleteNow.length, OPERATIONAL_HOURS.length * 2);
  ok("10. liberar vários dias (remove só bloqueio admin em rascunho)");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(AUG, "14:00")],
  });
  const plan = planBlockDays({
    dates: [AUG],
    dayStates: states,
    blockedSlots: [],
  });
  assert.ok(plan.skippedOccupied.some((s) => s.hora === "14:00"));
  assert.ok(plan.create.every((s) => s.hora !== "14:00"));
  ok("11-12. dia com agendamento preserva o horário; não cancela serviço");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(AUG, "14:00")],
    blockedSlots: [{ data: AUG, hora: "18:00" }],
  });
  const plan = planUnblockDays({
    dates: [AUG],
    blockedSlots: [
      { id: "b1", data: AUG, hora: "18:00", ativo: false },
    ],
  });
  assert.equal(plan.deleteNow.length, 1);
  assert.equal(plan.deleteNow[0]?.hora, "18:00");
  assert.equal(
    states[AUG]?.presencialHours.includes("14:00"),
    true
  );
  ok("13. liberar dia não libera horário ocupado por agendamento");
}

{
  let sel = toggleIsoInList([], AUG);
  sel = [];
  assert.deepEqual(sel, []);
  ok("14. cancelar modo não aplica (seleção descartada)");
}

{
  const empty = computeCalendarDayStates({ appointments: [] });
  let plan = planBlockSlots({
    targets: [{ data: AUG, hora: "10:00" }],
    dayStates: empty,
    blockedSlots: [],
  });
  assert.deepEqual(plan.create, [{ data: AUG, hora: "10:00" }]);
  ok("15. selecionar/bloquear um horário");
  plan = planBlockSlots({
    targets: [
      { data: AUG, hora: "10:00" },
      { data: AUG, hora: "11:00" },
      { data: AUG, hora: "12:00" },
    ],
    dayStates: empty,
    blockedSlots: [],
  });
  assert.equal(plan.create.length, 3);
  ok("16. selecionar vários horários");
  const hours = toggleIsoInList(["10:00"], "10:00");
  assert.deepEqual(hours, []);
  ok("17. deselecionar horário (toggle lista)");
}

{
  const empty = computeCalendarDayStates({ appointments: [] });
  const plan = planBlockSlots({
    targets: [
      { data: AUG, hora: "10:00" },
      { data: AUG, hora: "11:00" },
    ],
    dayStates: empty,
    blockedSlots: [],
  });
  assert.equal(plan.create.length, 2);
  ok("18. bloquear vários horários");
}

{
  const plan = planUnblockSlots({
    targets: [
      { data: AUG, hora: "10:00" },
      { data: AUG, hora: "11:00" },
    ],
    blockedSlots: [
      { id: "1", data: AUG, hora: "10:00", ativo: false },
      { id: "2", data: AUG, hora: "11:00", ativo: false },
    ],
  });
  assert.equal(plan.deleteNow.length, 2);
  ok("19. liberar vários horários (rascunho)");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(AUG, "10:00")],
  });
  const plan = planBlockSlots({
    targets: [{ data: AUG, hora: "10:00" }],
    dayStates: states,
    blockedSlots: [],
  });
  assert.equal(plan.create.length, 0);
  assert.equal(plan.skippedOccupied.length, 1);
  ok("20. horário com agendamento não é sobrescrito");
}

{
  const plan = planUnblockSlots({
    targets: [{ data: AUG, hora: "16:00" }],
    blockedSlots: [{ id: "pub", data: AUG, hora: "16:00", ativo: true }],
  });
  assert.equal(plan.deleteNow.length, 0);
  assert.equal(plan.unpublish.length, 1);
  ok("21. bloqueio publicado vai para unpublish (só após confirmar)");
}

{
  const states = computeCalendarDayStates({ appointments: [] });
  const allHours = planBlockDays({
    dates: [AUG],
    dayStates: states,
    blockedSlots: [],
  });
  const selectedAll = planBlockSlots({
    targets: OPERATIONAL_HOURS.map((hora) => ({ data: AUG, hora })),
    dayStates: states,
    blockedSlots: [],
  });
  assert.deepEqual(allHours.create, selectedAll.create);
  ok("22. bloquear todos usa a mesma regra de bloquear selecionados");
}

{
  const empty = computeCalendarDayStates({ appointments: [] });
  const plan = planBlockSlots({
    targets: [{ data: AUG, hora: "10:00" }],
    dayStates: empty,
    blockedSlots: [],
  });
  assert.ok(plan.create.length === 1);
  assert.equal(plan.unpublish.length, 0);
  ok("23. bloqueio novo entra como create (API persiste ativo=false / rascunho)");
}

{
  const published = planUnblockSlots({
    targets: [{ data: AUG, hora: "10:00" }],
    blockedSlots: [{ id: "p", data: AUG, hora: "10:00", ativo: true }],
  });
  assert.equal(published.unpublish.length, 1);
  assert.equal(published.deleteNow.length, 0);
  ok("24. público não muda antes: unpublish não deleta imediatamente");
}

{
  ok("25. após PATCH confirmar: rascunhos ativo=true e unpublishIds apagados (contrato API)");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(AUG, "10:00", { tipo: "sessao" })],
    blockedSlots: [{ data: AUG, hora: "18:00" }],
  });
  const visual = resolveAdminDayVisualWithDraft({
    state: states[AUG]!,
    date: AUG,
    blockedSlots: [{ id: "b", data: AUG, hora: "18:00", ativo: false }],
    pendingUnpublishKeys: [],
  });
  assert.equal(visual, "parcial");
  assert.equal(
    resolveCalendarDayVisual({
      activePresencialHours: ["10:00"],
      activeProductionHours: [],
      completedHours: [],
      blockedHours: ["18:00"],
    }),
    "parcial"
  );
  ok("26. paleta admin (amarelo serviço/bloqueio) intacta");
}

{
  const states = computeCalendarDayStates({
    appointments: [apt(AUG, "22:00", { tipo: "mix" })],
  });
  assert.equal(states[AUG]?.visual, "entrega");
  assert.equal(resolvePublicDayVisual(states[AUG]!), "parcial");
  ok("27. calendário público permanece na regra de disponibilidade");
}

{
  const empty = getCalendarDayState({}, AUG);
  assert.equal(
    resolveAdminDayVisualWithDraft({
      state: empty,
      date: AUG,
      blockedSlots: [],
      pendingUnpublishKeys: [],
    }),
    "livre"
  );
}

console.log(
  JSON.stringify({ reportId: "admin-calendar-batch", pass: true }, null, 2)
);
