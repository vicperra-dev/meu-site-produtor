"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Input, Select } from "@/components/design-system";
import { formatBRL } from "@/components/design-system/tokens";
import { formatDurationPt, type OperationalTimingStats } from "@/app/lib/service-timing";
import type {
  TimingClientSummary,
  TimingHistoryItem,
  TimingPeriodFilter,
  TimingSort,
  TimingTipoFilter,
} from "@/app/lib/admin-stats-timing";

type OvertimeBuckets = {
  sessao: OperationalTimingStats;
  captacao: OperationalTimingStats;
  todos: OperationalTimingStats;
};

type UserHit = { id: string; nomeArtistico: string; email: string };

function emptyOvertimeUi(): OperationalTimingStats {
  return {
    withTiming: 0,
    exceededCount: 0,
    exceededPercent: 0,
    avgDurationSeconds: null,
    totalExcessSeconds: 0,
    suggestedOvertimeTotalCents: 0,
    suggestedOvertimeAvgCents: null,
  };
}

function Metric({
  value,
  label,
  hint,
  tone = "zinc",
}: {
  value: string;
  label: string;
  hint?: string;
  tone?: "zinc" | "sky" | "red" | "amber";
}) {
  const valueClass =
    tone === "sky"
      ? "text-sky-400"
      : tone === "red"
        ? "text-red-400"
        : tone === "amber"
          ? "text-amber-300"
          : "text-zinc-100";
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4">
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
      {hint ? <div className="text-xs text-zinc-500 mt-1">{hint}</div> : null}
    </div>
  );
}

export function OperationalTimingStatsPanel({ overtime }: { overtime?: OvertimeBuckets | null }) {
  const buckets = overtime || {
    sessao: emptyOvertimeUi(),
    captacao: emptyOvertimeUi(),
    todos: emptyOvertimeUi(),
  };
  const [filtroGeral, setFiltroGeral] = useState<TimingTipoFilter>("todos");

  const [userQuery, setUserQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserHit | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [tipoCliente, setTipoCliente] = useState<TimingTipoFilter>("todos");
  const [periodoCliente, setPeriodoCliente] = useState<TimingPeriodFilter>("todos");
  const [sortCliente, setSortCliente] = useState<TimingSort>("recent");
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [items, setItems] = useState<TimingHistoryItem[]>([]);
  const [summary, setSummary] = useState<TimingClientSummary | null>(null);

  const geral = buckets[filtroGeral] || emptyOvertimeUi();

  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!boxRef.current?.contains(ev.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = userQuery.trim();
    if (selected && q === `${selected.nomeArtistico} — ${selected.email}`) {
      setSuggestions([]);
      return;
    }
    if (q.length < 1) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/admin/usuarios/buscar?q=${encodeURIComponent(q)}`, {
            credentials: "include",
          });
          const data = await res.json().catch(() => ({}));
          setSuggestions(Array.isArray(data.usuarios) ? data.usuarios : []);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userQuery, selected]);

  useEffect(() => {
    if (!selected?.id) {
      setItems([]);
      setSummary(null);
      return;
    }
    let cancelled = false;
    setLoadingCliente(true);
    const params = new URLSearchParams({
      timingCliente: "1",
      timingUserId: selected.id,
      timingTipo: tipoCliente,
      timingPeriod: periodoCliente,
      timingSort: sortCliente,
    });
    void (async () => {
      try {
        const res = await fetch(`/api/admin/stats/detalhadas?${params}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const payload = data.overtimeCliente;
        setItems(Array.isArray(payload?.items) ? payload.items : []);
        setSummary(payload?.summary || null);
      } catch {
        if (!cancelled) {
          setItems([]);
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoadingCliente(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id, tipoCliente, periodoCliente, sortCliente]);

  function pickUser(u: UserHit) {
    setSelected(u);
    setUserQuery(`${u.nomeArtistico} — ${u.email}`);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function clearUser() {
    setSelected(null);
    setUserQuery("");
    setItems([]);
    setSummary(null);
  }

  return (
    <>
      <Card className="!p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-zinc-100">Cronômetro operacional</h2>
          <div className="w-48">
            <Select
              value={filtroGeral}
              onChange={(e) => setFiltroGeral(e.target.value as TimingTipoFilter)}
              options={[
                { value: "todos", label: "Todos" },
                { value: "sessao", label: "Sessão" },
                { value: "captacao", label: "Captação" },
              ]}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Métricas agregadas de Sessão e Captação com timing registrado. O adicional sugerido por
          tempo excedido não entra em receita, faturamento ou pagamentos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtroGeral === "todos" ? (
            <>
              <Metric
                tone="sky"
                value={String(buckets.sessao.withTiming)}
                label="Sessões concluídas"
              />
              <Metric
                tone="sky"
                value={String(buckets.captacao.withTiming)}
                label="Captações concluídas"
              />
              <Metric
                value={
                  buckets.sessao.avgDurationSeconds == null
                    ? "—"
                    : formatDurationPt(buckets.sessao.avgDurationSeconds)
                }
                label="Tempo médio Sessão"
              />
              <Metric
                value={
                  buckets.captacao.avgDurationSeconds == null
                    ? "—"
                    : formatDurationPt(buckets.captacao.avgDurationSeconds)
                }
                label="Tempo médio Captação"
              />
            </>
          ) : (
            <Metric
              tone="sky"
              value={String(geral.withTiming)}
              label={filtroGeral === "sessao" ? "Sessões concluídas" : "Captações concluídas"}
            />
          )}
          {filtroGeral !== "todos" ? (
            <Metric
              value={geral.avgDurationSeconds == null ? "—" : formatDurationPt(geral.avgDurationSeconds)}
              label="Duração média"
            />
          ) : (
            <Metric
              value={geral.avgDurationSeconds == null ? "—" : formatDurationPt(geral.avgDurationSeconds)}
              label="Duração média geral"
            />
          )}
          <Metric
            tone="red"
            value={String(geral.exceededCount)}
            label="Ultrapassaram o tempo"
            hint={`${geral.exceededPercent.toFixed(1)}%`}
          />
          <Metric
            value={geral.totalExcessSeconds === 0 ? "—" : formatDurationPt(geral.totalExcessSeconds)}
            label="Total excedido"
          />
          <Metric
            tone="amber"
            value={formatBRL(geral.suggestedOvertimeTotalCents / 100)}
            label="Adicional sugerido total"
            hint="Não é receita"
          />
          <Metric
            value={
              geral.suggestedOvertimeAvgCents == null
                ? "—"
                : formatBRL(geral.suggestedOvertimeAvgCents / 100)
            }
            label="Adicional sugerido médio"
          />
        </div>
      </Card>

      <Card className="!p-6">
        <h2 className="text-xl font-bold text-zinc-100 mb-1">Histórico de tempo por cliente</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Cada linha é um serviço concluído com duração real gravada. Data e horário vêm do
          agendamento.
        </p>

        <div ref={boxRef} className="relative max-w-lg mb-4">
          <label className="mb-1 block text-xs font-medium text-zinc-400">Cliente</label>
          <Input
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              if (selected) setSelected(null);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Buscar por nome ou e-mail"
            autoComplete="off"
          />
          {searching && <p className="mt-1 text-[11px] text-zinc-500">Buscando…</p>}
          {selected && (
            <button
              type="button"
              className="mt-1 text-[11px] text-zinc-400 underline"
              onClick={clearUser}
            >
              Limpar seleção
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
              {suggestions.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => pickUser(u)}
                  >
                    {u.nomeArtistico} — {u.email}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!selected ? (
          <p className="text-sm text-zinc-500">
            Selecione um cliente para visualizar o histórico individual de Sessões e Captações.
          </p>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-base font-semibold text-zinc-100">{selected.nomeArtistico}</p>
              <p className="text-sm text-zinc-400">{selected.email}</p>
            </div>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="w-40">
                <Select
                  value={tipoCliente}
                  onChange={(e) => setTipoCliente(e.target.value as TimingTipoFilter)}
                  options={[
                    { value: "todos", label: "Todos" },
                    { value: "sessao", label: "Sessão" },
                    { value: "captacao", label: "Captação" },
                  ]}
                />
              </div>
              <div className="w-44">
                <Select
                  value={periodoCliente}
                  onChange={(e) => setPeriodoCliente(e.target.value as TimingPeriodFilter)}
                  options={[
                    { value: "todos", label: "Todo o período" },
                    { value: "hoje", label: "Hoje" },
                    { value: "7d", label: "Últimos 7 dias" },
                    { value: "mes", label: "Este mês" },
                  ]}
                />
              </div>
              <div className="w-48">
                <Select
                  value={sortCliente}
                  onChange={(e) => setSortCliente(e.target.value as TimingSort)}
                  options={[
                    { value: "recent", label: "Mais recentes" },
                    { value: "oldest", label: "Mais antigos" },
                    { value: "duration", label: "Maior duração" },
                    { value: "excess", label: "Maior tempo excedido" },
                  ]}
                />
              </div>
            </div>

            {loadingCliente ? (
              <p className="text-sm text-zinc-500">Carregando histórico…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhuma Sessão ou Captação concluída com tempo registrado para este cliente.
              </p>
            ) : (
              <>
                {summary && (
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Metric tone="sky" value={String(summary.sessaoCount)} label="Sessões" />
                    <Metric tone="sky" value={String(summary.captacaoCount)} label="Captações" />
                    <Metric
                      value={
                        summary.avgSessaoSeconds == null
                          ? "—"
                          : formatDurationPt(summary.avgSessaoSeconds)
                      }
                      label="Tempo médio Sessão"
                    />
                    <Metric
                      value={
                        summary.avgCaptacaoSeconds == null
                          ? "—"
                          : formatDurationPt(summary.avgCaptacaoSeconds)
                      }
                      label="Tempo médio Captação"
                    />
                    <Metric
                      tone="red"
                      value={`${summary.exceededCount} de ${summary.withTiming}`}
                      label="Serviços excedidos"
                    />
                    <Metric
                      value={
                        summary.totalExcessSeconds === 0
                          ? "—"
                          : formatDurationPt(summary.totalExcessSeconds)
                      }
                      label="Tempo excedido acumulado"
                    />
                    <Metric
                      tone="amber"
                      value={formatBRL(summary.suggestedOvertimeTotalCents / 100)}
                      label="Adicional sugerido acumulado"
                      hint="Não é receita"
                    />
                  </div>
                )}
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.serviceId}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-zinc-100">{item.tipoLabel}</p>
                        <p className="text-[11px] font-mono text-zinc-600">
                          {item.appointmentId != null ? `Ag. #${item.appointmentId}` : ""}{" "}
                          {item.serviceId.slice(0, 8)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">
                        Data: {item.dateLabel} · Horário: {item.timeLabel}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-xs text-zinc-300">
                        <li>Duração contratada: {formatDurationPt(item.contractedSeconds)}</li>
                        <li>Duração real: {formatDurationPt(item.actualDurationSeconds)}</li>
                        <li className={item.excessSeconds > 0 ? "text-red-300/90" : undefined}>
                          Tempo excedido:{" "}
                          {item.excessSeconds > 0
                            ? formatDurationPt(item.excessSeconds)
                            : "nenhum"}
                        </li>
                        <li>
                          Adicional sugerido: {formatBRL(item.suggestedOvertimeAmountCents / 100)}
                        </li>
                        <li className="text-zinc-500">Status: {item.status}</li>
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}
