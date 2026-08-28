/**
 * Mutações administrativas de bloqueio (Controle de Agendamento).
 * Rascunho: create com ativo=false; publicação: PATCH confirmar.
 * Liberar slot já publicado NÃO apaga na hora — vai para unpublish (aplica no confirmar).
 */
import {
  OPERATIONAL_HOURS,
  type CalendarDayState,
  type CalendarDayVisual,
  getCalendarDayState,
  normalizeHourLabel,
  resolveCalendarDayVisual,
} from "@/app/lib/calendar-day-state";

export type AdminBlockedSlot = {
  id: string;
  data: string;
  hora: string;
  ativo?: boolean;
};

export type SlotRef = { data: string; hora: string };

export type AdminSlotMutationPlan = {
  create: SlotRef[];
  deleteNow: AdminBlockedSlot[];
  unpublish: AdminBlockedSlot[];
  skippedOccupied: SlotRef[];
  skippedAlreadyBlocked: SlotRef[];
  skippedNotBlocked: SlotRef[];
  daysTouched: string[];
};

export function slotKey(data: string, hora: string): string {
  return `${String(data).slice(0, 10)}|${normalizeHourLabel(hora)}`;
}

/** Seleção persistente por ISO date (sobrevive à troca de mês). */
export function toggleIsoInList(list: string[], iso: string): string[] {
  const key = iso.slice(0, 10);
  return list.includes(key) ? list.filter((d) => d !== key) : [...list, key];
}

export function appointmentOccupiedHours(state: CalendarDayState): Set<string> {
  return new Set(
    [
      ...state.presencialHours,
      ...state.productionHours,
      ...state.completedHours,
    ].map(normalizeHourLabel)
  );
}

export function isAppointmentOccupiedHour(
  state: CalendarDayState,
  hora: string
): boolean {
  return appointmentOccupiedHours(state).has(normalizeHourLabel(hora));
}

function blockedIndex(slots: AdminBlockedSlot[]): Map<string, AdminBlockedSlot> {
  const map = new Map<string, AdminBlockedSlot>();
  for (const s of slots) {
    map.set(slotKey(s.data, s.hora), s);
  }
  return map;
}

function uniqueDays(targets: SlotRef[]): string[] {
  return [...new Set(targets.map((t) => t.data.slice(0, 10)))].sort();
}

export function planBlockSlots(params: {
  targets: SlotRef[];
  dayStates: Record<string, CalendarDayState>;
  blockedSlots: AdminBlockedSlot[];
}): AdminSlotMutationPlan {
  const existing = blockedIndex(params.blockedSlots);
  const create: SlotRef[] = [];
  const skippedOccupied: SlotRef[] = [];
  const skippedAlreadyBlocked: SlotRef[] = [];

  for (const t of params.targets) {
    const data = t.data.slice(0, 10);
    const hora = normalizeHourLabel(t.hora);
    const state = getCalendarDayState(params.dayStates, data);
    if (isAppointmentOccupiedHour(state, hora)) {
      skippedOccupied.push({ data, hora });
      continue;
    }
    if (existing.has(slotKey(data, hora))) {
      skippedAlreadyBlocked.push({ data, hora });
      continue;
    }
    create.push({ data, hora });
  }

  return {
    create,
    deleteNow: [],
    unpublish: [],
    skippedOccupied,
    skippedAlreadyBlocked,
    skippedNotBlocked: [],
    daysTouched: uniqueDays(create.concat(skippedOccupied, skippedAlreadyBlocked)),
  };
}

export function planUnblockSlots(params: {
  targets: SlotRef[];
  blockedSlots: AdminBlockedSlot[];
}): AdminSlotMutationPlan {
  const existing = blockedIndex(params.blockedSlots);
  const deleteNow: AdminBlockedSlot[] = [];
  const unpublish: AdminBlockedSlot[] = [];
  const skippedNotBlocked: SlotRef[] = [];

  for (const t of params.targets) {
    const data = t.data.slice(0, 10);
    const hora = normalizeHourLabel(t.hora);
    const slot = existing.get(slotKey(data, hora));
    if (!slot) {
      skippedNotBlocked.push({ data, hora });
      continue;
    }
    if (slot.ativo === false) deleteNow.push(slot);
    else unpublish.push(slot);
  }

  return {
    create: [],
    deleteNow,
    unpublish,
    skippedOccupied: [],
    skippedAlreadyBlocked: [],
    skippedNotBlocked,
    daysTouched: uniqueDays(
      [...deleteNow, ...unpublish, ...skippedNotBlocked].map((s) => ({
        data: s.data,
        hora: s.hora,
      }))
    ),
  };
}

export function expandDaysToSlots(
  dates: string[],
  eligibleHours: readonly string[] = OPERATIONAL_HOURS
): SlotRef[] {
  const hours = eligibleHours.map((h) => normalizeHourLabel(h));
  const out: SlotRef[] = [];
  for (const raw of dates) {
    const data = raw.slice(0, 10);
    for (const hora of hours) out.push({ data, hora });
  }
  return out;
}

export function planBlockDays(params: {
  dates: string[];
  eligibleHours?: readonly string[];
  dayStates: Record<string, CalendarDayState>;
  blockedSlots: AdminBlockedSlot[];
}): AdminSlotMutationPlan {
  return planBlockSlots({
    targets: expandDaysToSlots(params.dates, params.eligibleHours),
    dayStates: params.dayStates,
    blockedSlots: params.blockedSlots,
  });
}

export function planUnblockDays(params: {
  dates: string[];
  blockedSlots: AdminBlockedSlot[];
}): AdminSlotMutationPlan {
  const wanted = new Set(params.dates.map((d) => d.slice(0, 10)));
  const targets = params.blockedSlots
    .filter((s) => wanted.has(s.data.slice(0, 10)))
    .map((s) => ({ data: s.data, hora: s.hora }));
  return planUnblockSlots({
    targets,
    blockedSlots: params.blockedSlots,
  });
}

export function formatAdminMutationNotice(
  plan: AdminSlotMutationPlan,
  kind: "block" | "unblock"
): string {
  const lines: string[] = [];
  if (kind === "block") {
    const days = plan.daysTouched.length;
    lines.push(
      days === 1
        ? "1 dia atualizado."
        : `${Math.max(days, plan.create.length > 0 ? 1 : days)} dia(s) atualizado(s).`
    );
    if (plan.create.length) {
      lines.push(
        plan.create.length === 1
          ? "1 horário marcado para bloqueio (rascunho)."
          : `${plan.create.length} horários marcados para bloqueio (rascunho).`
      );
    }
    if (plan.skippedOccupied.length) {
      lines.push(
        `${plan.skippedOccupied.length} horário(s) com agendamentos existentes foram preservados.`
      );
    }
    if (plan.skippedAlreadyBlocked.length) {
      lines.push(
        `${plan.skippedAlreadyBlocked.length} horário(s) já estavam bloqueados.`
      );
    }
    if (!plan.create.length && plan.skippedOccupied.length) {
      lines.push("Nenhum horário livre para bloquear.");
    }
  } else {
    const n = plan.deleteNow.length + plan.unpublish.length;
    lines.push(
      n === 1
        ? "1 bloqueio administrativo removido do rascunho."
        : `${n} bloqueios administrativos no rascunho de liberação.`
    );
    if (plan.unpublish.length) {
      lines.push(
        `${plan.unpublish.length} já publicados serão liberados só após Confirmar e Publicar Mudanças.`
      );
    }
    if (plan.skippedNotBlocked.length) {
      lines.push(
        `${plan.skippedNotBlocked.length} horário(s) não tinham bloqueio administrativo.`
      );
    }
  }
  return lines.filter(Boolean).join(" ");
}

/** Visual Admin incluindo rascunho e excluindo liberações pendentes de publicar. */
export function resolveAdminDayVisualWithDraft(params: {
  state: CalendarDayState;
  date: string;
  blockedSlots: AdminBlockedSlot[];
  pendingUnpublishKeys: Iterable<string>;
}): CalendarDayVisual {
  const pending = new Set(params.pendingUnpublishKeys);
  const fromAdmin = params.blockedSlots
    .filter((s) => s.data.slice(0, 10) === params.date.slice(0, 10))
    .map((s) => normalizeHourLabel(s.hora));
  const blockedHours = [
    ...new Set([...params.state.blockedHours, ...fromAdmin]),
  ].filter((h) => !pending.has(slotKey(params.date, h)));

  return resolveCalendarDayVisual({
    activePresencialHours: params.state.presencialHours,
    activeProductionHours: params.state.productionHours,
    completedHours: params.state.completedHours,
    blockedHours,
  });
}
