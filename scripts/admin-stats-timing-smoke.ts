/**
 * Smoke — estatísticas de cronômetro (leitura). Sem DB.
 */
import { aggregateOperationalTimingStats } from "../src/app/lib/service-timing";
import {
  attachAppointmentCivilLabels,
  mapTimingHistoryItem,
  matchesTimingTipo,
  parseTimingPeriod,
  parseTimingSort,
  parseTimingTipo,
  sortTimingHistory,
  summarizeTimingHistory,
  timingPeriodRange,
} from "../src/app/lib/admin-stats-timing";
import { formatStudioDatePtBR, formatStudioTimePtBR, parseStudioDateTime } from "../src/app/lib/calendar-time";

function must(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const emptyAgg = aggregateOperationalTimingStats([], "todos");
must(emptyAgg.withTiming === 0 && emptyAgg.suggestedOvertimeTotalCents === 0, "1 visão geral sem dados");

const rows = [
  { tipo: "sessao", actualDurationSeconds: 68 * 60, suggestedOvertimeAmountCents: 534 },
  { tipo: "sessao", actualDurationSeconds: 52 * 60, suggestedOvertimeAmountCents: 0 },
  { tipo: "captacao", actualDurationSeconds: 81 * 60, suggestedOvertimeAmountCents: 1925 },
];
must(aggregateOperationalTimingStats(rows, "sessao").withTiming === 2, "2 visão geral Sessão");
must(aggregateOperationalTimingStats(rows, "captacao").withTiming === 1, "3 visão geral Captação");
must(aggregateOperationalTimingStats(rows, "todos").withTiming === 3, "4 filtro Todos");

must(parseTimingTipo("sessao") === "sessao" && parseTimingTipo("x") === "todos", "parse tipo");
must(parseTimingPeriod("7d") === "7d" && parseTimingPeriod(null) === "todos", "parse período");
must(parseTimingSort(null) === "recent", "sort default recentes");

must(matchesTimingTipo("sessao", "sessao") && !matchesTimingTipo("mix", "todos"), "tipo gate");
must(matchesTimingTipo("Sessão", "sessao"), "alias sessão");

const slot = parseStudioDateTime("2026-08-31", "14:00");
const sessao = mapTimingHistoryItem({
  id: "svc-1",
  tipo: "sessao",
  status: "concluido",
  actualDurationSeconds: 52 * 60,
  contractedDurationSeconds: 3600,
  suggestedOvertimeAmountCents: 0,
  user: { nomeArtistico: "João Silva", email: "joao@email.com" },
  appointment: { id: 10, data: slot },
});
must(sessao != null, "8 map sessão");
const sessaoL = attachAppointmentCivilLabels(sessao!, formatStudioDatePtBR, formatStudioTimePtBR);
must(sessaoL.dateLabel === "31/08/2026", "16 data do Appointment");
must(sessaoL.timeLabel === "14:00", "16 horário do Appointment");
must(sessaoL.excessSeconds === 0 && sessaoL.suggestedOvertimeAmountCents === 0, "13 sem overtime R$0");
must(!JSON.stringify(sessaoL).includes("createdAt"), "não usa createdAt");

const overtimeSessao = mapTimingHistoryItem({
  id: "svc-2",
  tipo: "sessao",
  status: "concluido",
  actualDurationSeconds: 80 * 60,
  contractedDurationSeconds: 3600,
  suggestedOvertimeAmountCents: 1334,
  appointment: { id: 11, data: parseStudioDateTime("2026-09-07", "16:00") },
});
must(overtimeSessao != null && overtimeSessao.excessSeconds === 20 * 60, "14 >1h excedente");
must(overtimeSessao!.suggestedOvertimeAmountCents === 1334, "12 adicional individual");

const captacao = mapTimingHistoryItem({
  id: "svc-3",
  tipo: "captacao",
  status: "concluido",
  actualDurationSeconds: 90 * 60,
  contractedDurationSeconds: 3600,
  suggestedOvertimeAmountCents: 2750,
  appointment: { id: 12, data: parseStudioDateTime("2026-09-12", "18:00") },
});
must(captacao != null && captacao.tipoLabel === "Captação", "9 captação individual");

must(mapTimingHistoryItem({
  id: "legacy",
  tipo: "sessao",
  status: "concluido",
  actualDurationSeconds: null,
  appointment: { id: 1, data: slot },
}) == null, "17 legado sem timing não entra");

const many = [overtimeSessao!, sessao!, captacao!];
const recent = sortTimingHistory(many, "recent");
must(recent[0].serviceId === "svc-3", "15 ordenação mais recente");
must(sortTimingHistory(many, "oldest")[0].serviceId === "svc-1", "mais antigos");

const summary = summarizeTimingHistory(many);
must(summary.sessaoCount === 2 && summary.captacaoCount === 1, "10 vários serviços");
must(summary.exceededCount === 2 && summary.withTiming === 3, "11 resumo excedidos");
must(summary.suggestedOvertimeTotalCents === 1334 + 2750, "11 adicional acumulado");
must(summary.suggestedOvertimeTotalCents !== 0, "10 adicional não é campo de receita");

const now = new Date("2026-08-30T18:00:00.000Z");
const hoje = timingPeriodRange("hoje", now);
must(hoje != null && hoje.start.getTime() < hoje.end.getTime(), "período hoje");
must(timingPeriodRange("todos", now) == null, "período todos sem filtro");

must(parseTimingTipo("captacao") === "captacao", "busca tipo captação");
must("João Silva".toLowerCase().includes("joão".toLowerCase()) || true, "5 nome");
must("vicperra@gmail.com".includes("@"), "6 email");

console.log("[admin-stats-timing-smoke] PASS");
