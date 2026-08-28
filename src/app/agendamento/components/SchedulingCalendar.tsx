"use client";

/**
 * Calendário operacional compartilhado (agendamento comum + cupom).
 * Usuário: Livre / Ocupado / Indisponível — sem roxo/azul (BUG-001).
 */
import { useCallback, useMemo, useState } from "react";
import {
  USER_DAY_LEGEND,
  ADMIN_DAY_LEGEND,
  type CalendarDayState,
  getCalendarDayState,
  OPERATIONAL_HOURS,
  calendarDayCellStyle,
  toUserDayVisual,
  resolvePublicDayVisual,
  resolvePublicHourKind,
  isPublicDaySelectable,
  isPublicHourSelectable,
  publicHourSlotPresentation,
  isIsoDatePastStudio,
  isStudioDateTimePast,
  isoDateFromParts,
  formatStudioMonthYear,
  daysInMonth,
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
  /** Admin (homologação) mantém paleta operacional; cliente usa vermelho para datas passadas. */
  audience?: "user" | "admin";
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
  audience = "user",
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

  const year = dataBase.getFullYear();
  const month = dataBase.getMonth() + 1;
  const ultimoDiaDoMes = daysInMonth(year, month);
  const primeiroDiaSemana = new Date(year, month - 1, 1).getDay();

  const dias: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  for (let d = 1; d <= ultimoDiaDoMes; d++) {
    const dataDia = new Date(year, month - 1, d);
    dias.push(dataDia >= DATA_MINIMA ? d : null);
  }

  function podeIrMesAnterior() {
    const prev = new Date(year, month - 2, 1);
    return prev >= new Date(DATA_MINIMA.getFullYear(), DATA_MINIMA.getMonth(), 1);
  }

  const selectedDayState = dataSelecionada
    ? getCalendarDayState(dayStates, dataSelecionada)
    : null;

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
          <span className="font-semibold text-green-400">Verde</span>: Livre ·{" "}
          <span className="font-semibold text-yellow-400">Amarelo</span>: Ocupado ·{" "}
          <span className="font-semibold text-red-400">Vermelho</span>: Indisponível
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
            <span>{formatStudioMonthYear(year, month)}</span>
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
              const isoDate = isoDateFromParts(year, month, dia);
              const dataDia = new Date(year, month - 1, dia);
              if (dataDia < DATA_MINIMA) return <div key={idx} />;

              const state = getCalendarDayState(dayStates, isoDate);
              const past = isIsoDatePastStudio(isoDate);
              const userVisual =
                audience === "user"
                  ? resolvePublicDayVisual(state, {
                      past,
                      eligibleHours: operationalHours,
                    })
                  : toUserDayVisual(state.visual, { past });
              const daySelectable =
                audience === "user"
                  ? isPublicDaySelectable(userVisual, past)
                  : !(past || userVisual === "ocupado");
              const selected = dataSelecionada === isoDate;
              const cell = calendarDayCellStyle(state.visual, {
                past,
                selected,
                audience,
                dayState: audience === "user" ? state : undefined,
                eligibleHours: operationalHours,
              });
              const disabled = !daySelectable;
              const dayTitle = past
                ? "Data passada"
                : USER_DAY_LEGEND.find((l) => l.visual === userVisual)?.label;

              return (
                <button
                  key={isoDate}
                  type="button"
                  disabled={disabled}
                  aria-disabled={disabled}
                  aria-label={dayTitle ? `${dia}, ${dayTitle}` : String(dia)}
                  onClick={() => {
                    if (disabled) return;
                    if (selected) {
                      onDataChange(null);
                      onHoraChange(null);
                    } else {
                      onDataChange(isoDate);
                      onHoraChange(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (disabled && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                    }
                  }}
                  style={cell.style}
                  className={[
                    "rounded-md border px-1 py-1 text-center text-xs transition",
                    disabled ? "cursor-not-allowed" : "cursor-pointer",
                    cell.className,
                  ].join(" ")}
                  title={dayTitle}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-zinc-400">
            {(audience === "admin" ? ADMIN_DAY_LEGEND : USER_DAY_LEGEND).map((item) => (
              <span key={item.visual} className="inline-flex items-center gap-1">
                <span
                  className={`h-2.5 w-2.5 rounded-sm border ${item.swatch}`}
                />{" "}
                {item.label}
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
                  const kind = selectedDayState
                    ? resolvePublicHourKind(h, selectedDayState)
                    : "available";
                  const passado = isStudioDateTimePast(dataSelecionada, h);
                  const selected = horaSelecionada === h;
                  const hourSelectable = isPublicHourSelectable(kind, passado);
                  const slot = publicHourSlotPresentation(kind, {
                    past: passado,
                    selected,
                  });
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={!hourSelectable}
                      aria-disabled={!hourSelectable}
                      onClick={() => {
                        if (!hourSelectable) return;
                        onHoraChange(selected ? null : h);
                      }}
                      className={[
                        "rounded-md border px-2 py-2 text-sm transition",
                        slot.className,
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
