"use client";

/**
 * GO-03A — Toolbar: pesquisa instantânea (PARTE 3) + filtros rápidos (PARTE 4).
 * Estado persistido na URL pelo ServicosBoard; aqui somente apresentação/eventos.
 */
import { Icons, PERIOD_FILTERS, SORT_OPTIONS, TYPE_FILTERS } from "./meta";

export interface ToolbarState {
  search: string;
  periodo: string;
  tipo: string;
  pagamento: string;
  cliente: string;
  sort: string;
}

export function Toolbar({
  state,
  onChange,
  clientes,
  resultCount,
  searchPlaceholder = "Pesquisar por nome, email, ID, serviço, tipo, pagamento, data ou status…",
  noun = "serviço",
  paymentOptions,
  typeFilters,
}: {
  state: ToolbarState;
  onChange: (patch: Partial<ToolbarState>) => void;
  clientes: string[];
  resultCount: number;
  searchPlaceholder?: string;
  noun?: string;
  /** Sobrescreve opções do select de pagamento (value/label). */
  paymentOptions?: { value: string; label: string }[];
  /** Sobrescreve os chips de tipo (value/label). */
  typeFilters?: { value: string; label: string }[];
}) {
  const tipos = typeFilters ?? TYPE_FILTERS.map((t) => ({ value: t.value, label: t.label }));
  const pagamentos =
    paymentOptions ?? [
      { value: "aprovado", label: "Aprovado" },
      { value: "pendente", label: "Pendente" },
      { value: "reembolsado", label: "Reembolsado" },
      { value: "sem_pagamento", label: "Sem pagamento" },
    ];
  const hasFilters =
    state.search ||
    (state.periodo && state.periodo !== "todos") ||
    state.tipo ||
    state.pagamento ||
    state.cliente;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3 sm:p-4">
      {/* Pesquisa */}
      <div className="relative">
        <Icons.search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={state.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-zinc-600 bg-zinc-900 py-2 pl-9 pr-9 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-red-500 focus:outline-none"
        />
        {state.search && (
          <button
            type="button"
            onClick={() => onChange({ search: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 hover:text-zinc-200"
            aria-label="Limpar pesquisa"
          >
            <Icons.x className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          <Icons.filter className="w-3 h-3" /> Período
        </span>
        {PERIOD_FILTERS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange({ periodo: p.value })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              (state.periodo || "todos") === p.value
                ? "border-red-500/60 bg-red-500/15 text-red-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          <Icons.music className="w-3 h-3" /> Tipo
        </span>
        <button
          type="button"
          onClick={() => onChange({ tipo: "" })}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !state.tipo
              ? "border-red-500/60 bg-red-500/15 text-red-300"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          }`}
        >
          Todos
        </button>
        {tipos.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange({ tipo: state.tipo === t.value ? "" : t.value })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              state.tipo === t.value
                ? "border-red-500/60 bg-red-500/15 text-red-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <Icons.card className="w-3 h-3" />
          Pagamento
          <select
            value={state.pagamento}
            onChange={(e) => onChange({ pagamento: e.target.value })}
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {pagamentos.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <Icons.user className="w-3 h-3" />
          Cliente
          <select
            value={state.cliente}
            onChange={(e) => onChange({ cliente: e.target.value })}
            className="max-w-[180px] rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Ordenar
          <select
            value={state.sort || "date_desc"}
            onChange={(e) => onChange({ sort: e.target.value })}
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={() =>
                onChange({ search: "", periodo: "todos", tipo: "", pagamento: "", cliente: "" })
              }
              className="text-xs text-zinc-500 underline-offset-2 hover:text-red-400 hover:underline"
            >
              Limpar filtros
            </button>
          )}
          <span className="text-xs tabular-nums text-zinc-500">
            {resultCount} {noun}
            {resultCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
