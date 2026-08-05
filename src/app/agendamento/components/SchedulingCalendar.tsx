"use client";

/**
 * Calendário operacional compartilhado (agendamento comum + cupom).
 * Cores e ocupação vêm de dayStates calculados no backend (GO-H4).
 */
import { useCallback, useMemo, useState } from "react";
import {
  CALENDAR_LEGEND,
  type CalendarDayState,
  getCalendarDayState,
  OPERATIONAL_HOURS,
  calendarDayCellStyle,
  isIsoDatePastStudio,
  isStudioDateTimePast,
  isoDateFromParts,
  formatStudioMonthYear,
} from "@/app/lib/calendar-day-state";
import {
  PRODUCTION_DELIVERY_DATE_MESSAGE,
  serviceNeedsStudioHours,
} from "@/app/agendamento/scheduling-shared";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import { useIntelligentRefresh } from "@/app/hooks/useIntelligentRefresh";

export type SchedulingCalendarProps = {
  serviceType?: string | null;
  serviceName?: string | null;
  /** Força modo produção (sem horários). Se omitido, deriva do serviceType. */
  showHours?: boolean;
  dataSelecionada: string | null;
  horaSelecionada: string | null;
  onDataChange: (value: string | null) => void;
  onHoraChange: (value: string | null) => void;
  /** Título opcional acima do bloco */
  title?: string;
  className?: string;
};

export function SchedulingCalendar({
  serviceType,
  serviceName,
  showHours,
  dataSelecionada,
  horaSelecionada,
  onDataChange,
  onHoraChange,
  title = "Agendamento virtual",
  className = "",
}: SchedulingCalendarProps) {
  const precisaHora =
    showHours ?? serviceNeedsStudioHours(serviceType, serviceName);
  const somenteDataProducao = !precisaHora;

  const DATA_MINIMA = useMemo(
    () => new Date(new Date().getFullYear(), 0, 1),
    []
  );

  const [dataBase, setDataBase] = useState(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return primeiroDia < DATA_MINIMA ? DATA_MINIMA : primeiroDia;
  });

  const [dayStates, setDayStates] = useState<Record<string, CalendarDayState>>({});
  const [operationalHours, setOperationalHours] = useState<string[]>([
    ...OPERATIONAL_HOURS,
  ]);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/agendamentos/disponibilidade?" + Date.now(),
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.dayStates && typeof data.dayStates === "object") {
        setDayStates(data.dayStates);
      }
      if (Array.isArray(data.operationalHours) && data.operationalHours.length) {
        setOperationalHours(data.operationalHours);
      }
    } catch (err) {
      console.error("[SchedulingCalendar] falha ao carregar estado:", err);
    }
  }, []);

  useIntelligentRefresh(carregar, [dataBase]);
  useDomainRefresh("agenda", () => carregar());

  const ultimoDiaDoMes = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth() + 1,
    0
  ).getDate();
  const primeiroDiaSemana = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    1
  ).getDay();

  const dias: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  for (let d = 1; d <= ultimoDiaDoMes; d++) {
    const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), d);
    dias.push(dataDia >= DATA_MINIMA ? d : null);
  }

  function podeIrMesAnterior() {
    const prev = new Date(dataBase.getFullYear(), dataBase.getMonth() - 1, 1);
    return prev >= new Date(DATA_MINIMA.getFullYear(), DATA_MINIMA.getMonth(), 1);
  }

  const occupiedForSelected = useMemo(() => {
    if (!dataSelecionada) return new Set<string>();
    return new Set(getCalendarDayState(dayStates, dataSelecionada).occupiedHours);
  }, [dayStates, dataSelecionada]);

  return (
    <div
      className={`relative space-y-6 p-6 md:p-8 ${className}`}
      style={{
        background:
          "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <h2
        className="text-center text-3xl font-semibold text-red-400"
        style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
      >
        {title}
      </h2>

      {somenteDataProducao ? (
        <p
          className="text-center text-sm leading-relaxed text-white md:text-base"
          style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
        >
          {PRODUCTION_DELIVERY_DATE_MESSAGE}
        </p>
      ) : (
        <p
          className="text-center text-sm leading-relaxed text-white md:text-base"
          style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
        >
          Escolha o dia e o horário da sua sessão.
          <br />
          <span className="font-semibold text-green-400">Verde</span>: livres ·{" "}
          <span className="font-semibold text-yellow-400">Amarelo</span>:
          Sessão/Captação ·{" "}
          <span className="font-semibold text-purple-400">Roxo</span>: produção ·{" "}
          <span className="font-semibold text-yellow-300">Amarelo/Roxo</span>:
          ambos ·{" "}
          <span className="font-semibold text-red-400">Vermelho</span>: sem
          horários livres
        </p>
      )}

      <div className={`grid gap-6 ${precisaHora ? "md:grid-cols-[1.2fr,1fr]" : ""}`}>
        <div>
          <div className="mb-3 flex items-center justify-between text-base font-semibold text-zinc-200">
            <button
              type="button"
              onClick={() =>
                setDataBase(
                  (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
                )
              }
              disabled={!podeIrMesAnterior()}
              className={`rounded-full border border-zinc-700 px-3 py-1 transition ${
                podeIrMesAnterior()
                  ? "cursor-pointer hover:border-red-500"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              ◀
            </button>
            <span>
              {formatStudioMonthYear(
                dataBase.getFullYear(),
                dataBase.getMonth() + 1
              )}
            </span>
            <button
              type="button"
              onClick={() =>
                setDataBase(
                  (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
                )
              }
              className="rounded-full border border-zinc-700 px-3 py-1 hover:border-red-500"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[10px] text-zinc-400">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={i} className="py-1 text-center">
                {d}
              </div>
            ))}
            {dias.map((dia, idx) => {
              if (!dia) return <div key={idx} />;
              const isoDate = isoDateFromParts(
                dataBase.getFullYear(),
                dataBase.getMonth() + 1,
                dia
              );
              const dataDia = new Date(
                dataBase.getFullYear(),
                dataBase.getMonth(),
                dia
              );
              if (dataDia < DATA_MINIMA) return <div key={idx} />;

              const state = getCalendarDayState(dayStates, isoDate);
              const past = isIsoDatePastStudio(isoDate);
              const selected = dataSelecionada === isoDate;
              const cell = calendarDayCellStyle(state.visual, {
                past,
                selected,
              });

              return (
                <button
                  key={isoDate}
                  type="button"
                  disabled={past}
                  onClick={() => {
                    if (past) return;
                    if (selected) {
                      onDataChange(null);
                      onHoraChange(null);
                    } else {
                      onDataChange(isoDate);
                      onHoraChange(null);
                    }
                  }}
                  style={cell.style}
                  className={[
                    "rounded-md border px-1 py-1 text-center text-xs transition",
                    cell.className,
                  ].join(" ")}
                  title={
                    CALENDAR_LEGEND.find((l) => l.visual === state.visual)
                      ?.label
                  }
                >
                  {dia}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-zinc-400">
            {CALENDAR_LEGEND.map((item) => (
              <span key={item.visual} className="inline-flex items-center gap-1">
                <span
                  className={`h-2.5 w-2.5 rounded-sm border ${
                    item.visual === "livre"
                      ? "bg-green-500"
                      : item.visual === "parcial"
                        ? "bg-yellow-500"
                        : item.visual === "entrega"
                          ? "bg-purple-500"
                          : item.visual === "ocupado"
                            ? "bg-red-500"
                            : "border-yellow-500/50"
                  }`}
                  style={
                    item.visual === "parcial_entrega"
                      ? {
                          background:
                            "linear-gradient(135deg, rgba(234,179,8,0.9) 50%, rgba(147,51,234,0.9) 50%)",
                        }
                      : undefined
                  }
                />{" "}
                {item.color}
              </span>
            ))}
          </div>
        </div>

        {precisaHora && (
          <div>
            <p className="mb-3 text-sm font-semibold text-zinc-200">
              {dataSelecionada
                ? "Horários disponíveis"
                : "Selecione um dia no calendário"}
            </p>
            {dataSelecionada && (
              <div className="grid grid-cols-3 gap-2">
                {operationalHours.map((h) => {
                  const ocupado = occupiedForSelected.has(h);
                  const passado = isStudioDateTimePast(dataSelecionada, h);
                  const selected = horaSelecionada === h;
                  const disabled = ocupado || passado;
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={disabled}
                      onClick={() => onHoraChange(selected ? null : h)}
                      className={[
                        "rounded-md border px-2 py-2 text-sm transition",
                        disabled
                          ? "cursor-not-allowed border-zinc-800 bg-zinc-900/50 text-zinc-600"
                          : selected
                            ? "border-red-500 bg-red-600/30 text-white"
                            : "border-zinc-700 bg-zinc-900/40 text-zinc-200 hover:border-red-500",
                      ].join(" ")}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
