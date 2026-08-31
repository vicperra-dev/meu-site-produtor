/**
 * Homologação deve reutilizar o fluxo real de Sessão/Captação + cronômetro.
 * Sem DB: valida gates, cascata esperada e data civil America/Sao_Paulo.
 */
import { isTransitionAllowed } from "../src/app/lib/domain/state-machine/guards";
import { deriveAppointmentStatusFromServiceStatuses } from "../src/app/lib/domain/statuses";
import {
  formatStudioDatePtBR,
  formatStudioTimePtBR,
  parseStudioDateTime,
} from "../src/app/lib/calendar-time";
import {
  hasOperationalTimer,
  resolveOperationalStartWrite,
  resolveServiceTiming,
} from "../src/app/lib/service-timing";

function must(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

must(hasOperationalTimer("sessao"), "homologação sessão tem timer");
must(hasOperationalTimer("captacao"), "homologação captação tem timer");
must(!hasOperationalTimer("mix"), "mix sem timer");

must(isTransitionAllowed("appointment", "aceito", "em_andamento"), "apt Começar");
must(isTransitionAllowed("service", "aceito", "em_andamento"), "svc Iniciar");
must(
  !isTransitionAllowed("service", "pendente", "em_andamento"),
  "pendente não pula aceito — ensure deve aceitar antes"
);

const now = new Date("2026-08-29T18:00:00.000Z");
const start = resolveOperationalStartWrite({
  tipo: "sessao",
  existingStartedAt: null,
  now,
});
must(start?.getTime() === now.getTime(), "startedAt da homologação = mesmo write do fluxo real");

const running = resolveServiceTiming(
  {
    tipo: "sessao",
    status: "em_andamento",
    startedAt: now.toISOString(),
  },
  new Date(now.getTime() + 90_000)
);
must(running.running && running.elapsedSeconds === 90, "cronômetro lê startedAt, não origin HOMOLOGATION");

const slot = parseStudioDateTime("2026-08-29", "14:00");
must(formatStudioDatePtBR(slot) === "29/08/2026", "data Serviços Gerais = Appointment.data BRT");
must(formatStudioTimePtBR(slot) === "14:00", "hora Serviços Gerais = Appointment.data BRT");

const createdAt = new Date("2026-08-29T12:03:00.000Z");
must(
  formatStudioTimePtBR(createdAt) !== "14:00",
  "createdAt da homologação não é o horário do agendamento 14:00"
);

must(
  deriveAppointmentStatusFromServiceStatuses("aceito", ["em_andamento"]) === "em_andamento",
  "B: Iniciar no Service espelha Appointment em_andamento"
);

const underHour = resolveServiceTiming(
  {
    tipo: "sessao",
    status: "em_andamento",
    startedAt: now.toISOString(),
  },
  new Date(now.getTime() + 40 * 60_000)
);
must(!underHour.exceeded && underHour.suggestedOvertimeAmountCents === 0, "overtime < 1h");

const overHour = resolveServiceTiming(
  {
    tipo: "sessao",
    status: "em_andamento",
    startedAt: now.toISOString(),
  },
  new Date(now.getTime() + 80 * 60_000)
);
must(overHour.exceeded && overHour.excessSeconds === 20 * 60, "overtime > 1h vermelho");
must(overHour.suggestedOvertimeAmountCents > 0, "adicional sugerido na homologação");

const frozen = resolveServiceTiming(
  {
    tipo: "sessao",
    status: "concluido",
    startedAt: now.toISOString(),
    completedAt: new Date(now.getTime() + 80 * 60_000).toISOString(),
    actualDurationSeconds: 80 * 60,
    suggestedOvertimeAmountCents: overHour.suggestedOvertimeAmountCents,
  },
  new Date(now.getTime() + 200 * 60_000)
);
must(frozen.frozen && frozen.elapsedSeconds === 80 * 60, "duração congelada nas duas telas");
must(frozen.suggestedOvertimeAmountCents === overHour.suggestedOvertimeAmountCents, "snapshot overtime");

console.log("[homologation-operational-flow-smoke] PASS");
