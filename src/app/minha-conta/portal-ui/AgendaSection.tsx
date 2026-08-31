"use client";

/**
 * Portal do Cliente — Próximos agendamentos + calendário visual
 * + lista completa de agendamentos.
 */

import { useMemo, useState } from "react";
import {
  Card,
  EmptyState,
  Icon,
  Section,
  StatusBadge,
  Button,
  cx,
  formatDate,
  formatTime,
} from "@/components/design-system";
import type { Agendamento } from "./types";
import { AppointmentCard } from "./AppointmentCard";

function proximos(agendamentos: Agendamento[]): Agendamento[] {
  return agendamentos
    .filter((a) => a.status === "pendente")
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
}

/** Calendário mensal simples destacando dias com agendamento. */
function MiniCalendar({ agendamentos }: { agendamentos: Agendamento[] }) {
  const [offset, setOffset] = useState(0);
  const base = new Date();
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);

  const marcados = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of agendamentos) {
      const d = new Date(a.data);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [agendamentos]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const hoje = new Date();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-200 capitalize">
          {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={() => setOffset((o) => o - 1)} aria-label="Mês anterior">
            <Icon name="chevron-right" className="w-3.5 h-3.5 rotate-180" />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setOffset((o) => o + 1)} aria-label="Próximo mês">
            <Icon name="chevron-right" className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-zinc-600 py-1">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <span key={`e${i}`} />;
          const key = `${month.getFullYear()}-${month.getMonth()}-${day}`;
          const count = marcados.get(key) ?? 0;
          const isHoje =
            day === hoje.getDate() &&
            month.getMonth() === hoje.getMonth() &&
            month.getFullYear() === hoje.getFullYear();
          return (
            <span
              key={key}
              title={count > 0 ? `${count} agendamento(s)` : undefined}
              className={cx(
                "relative flex items-center justify-center rounded-lg py-1.5 text-xs",
                isHoje && "ring-1 ring-red-500/60 font-bold text-red-300",
                count > 0
                  ? "bg-red-500/15 text-red-200 font-semibold"
                  : "text-zinc-500"
              )}
            >
              {day}
              {count > 0 && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-red-400" />
              )}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

export function AgendaSection({
  agendamentos,
  onChanged,
  focusId,
}: {
  agendamentos: Agendamento[];
  onChanged: () => Promise<void> | void;
  focusId?: number | null;
}) {
  const futuros = proximos(agendamentos);
  const mostrarCalendario = futuros.length > 1;

  return (
    <div className="space-y-6">
      <Section
        title="Próximos agendamentos"
        icon="calendar"
        description={
          futuros.length > 0
            ? `${futuros.length} pendente${futuros.length > 1 ? "s" : ""} de aprovação`
            : "Somente agendamentos com status Pendente"
        }
      >
        {futuros.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Nenhum agendamento pendente"
            description="Quando houver solicitações aguardando aprovação, elas aparecerão aqui."
            action={
              <a
                href="/agendamento"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                <Icon name="calendar" className="w-4 h-4" />
                Agendar agora
              </a>
            }
          />
        ) : (
          <div className={cx("grid gap-3", mostrarCalendario && "lg:grid-cols-[1fr,290px]")}>
            <div className="space-y-2">
              {futuros.map((a) => (
                <Card key={a.id} className="flex flex-wrap items-center gap-3">
                  <span className="flex flex-col items-center justify-center w-14 rounded-lg bg-zinc-800 border border-zinc-700 py-1.5">
                    <span className="text-[10px] uppercase text-zinc-500 leading-none">
                      {new Date(a.data).toLocaleDateString("pt-BR", { month: "short" })}
                    </span>
                    <span className="text-lg font-bold text-zinc-100 leading-tight">
                      {new Date(a.data).getDate()}
                    </span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{a.tipo}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(a.data)} às {formatTime(a.data)} · {a.duracaoMinutos} min
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                  <a
                    href={`/minha-conta?tab=agendamentos&apt=${a.id}`}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                  >
                    Ver detalhes
                    <Icon name="chevron-right" className="w-3 h-3" />
                  </a>
                </Card>
              ))}
            </div>
            {mostrarCalendario && <MiniCalendar agendamentos={futuros} />}
          </div>
        )}
      </Section>

      <Section title="Todos os agendamentos" icon="history">
        {agendamentos.length === 0 ? (
          <EmptyState icon="calendar" title="Você não possui agendamentos" />
        ) : (
          <div className="space-y-3">
            {agendamentos.map((a) => (
              <AppointmentCard
                key={a.id}
                agendamento={a}
                onChanged={onChanged}
                defaultExpanded={focusId === a.id}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
