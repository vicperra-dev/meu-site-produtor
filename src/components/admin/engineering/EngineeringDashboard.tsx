"use client";

import { useMemo, useState } from "react";
import type { EngineeringData, DashboardSection, DomainFilter } from "./types";
import { SECTIONS, DOMAIN_FILTERS } from "./types";
import { EngineeringOverviewCard } from "./EngineeringOverviewCard";
import { GuardianStatusCard } from "./GuardianStatusCard";
import { DecisionCard } from "./DecisionCard";
import { ExecutionCard } from "./ExecutionCard";
import { HealthCard } from "./HealthCard";
import { RefactorCard } from "./RefactorCard";
import { DebtCard } from "./DebtCard";
import { RoadmapCard } from "./RoadmapCard";
import { TimelineCard } from "./TimelineCard";
import { ADRCard } from "./ADRCard";
import { KnowledgeGraphCard } from "./KnowledgeGraphCard";
import { EvolutionCard } from "./EvolutionCard";
import { HumanReportCard } from "./HumanReportCard";
import { DeployCard } from "./DeployCard";
import { CtoCard } from "./CtoCard";
import { Badge } from "./shared";

export function EngineeringDashboard({ data }: { data: EngineeringData }) {
  const [section, setSection] = useState<DashboardSection>("overview");
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<DomainFilter>("all");

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ type: string; label: string; detail?: string }> = [];

    const adrs = (data.architectureDecisions as { decisions?: Array<{ id?: string; title?: string }> })?.decisions ?? [];
    adrs.forEach((a) => {
      if (a.id?.toLowerCase().includes(q) || a.title?.toLowerCase().includes(q)) {
        results.push({ type: "ADR", label: a.id ?? "", detail: a.title });
      }
    });

    const entities = (data.knowledgeGraph as { entities?: Array<{ name?: string; files?: string[]; flows?: string[]; guardianChecks?: string[] }> })?.entities ?? [];
    entities.forEach((e) => {
      if (e.name?.toLowerCase().includes(q)) results.push({ type: "Entidade", label: e.name ?? "" });
      e.files?.forEach((f) => {
        if (f.toLowerCase().includes(q)) results.push({ type: "Arquivo", label: f, detail: e.name });
      });
      e.flows?.forEach((f) => {
        if (f.toLowerCase().includes(q)) results.push({ type: "Fluxo", label: f, detail: e.name });
      });
      e.guardianChecks?.forEach((c) => {
        if (c.toLowerCase().includes(q)) results.push({ type: "Check", label: c, detail: e.name });
      });
    });

    const sources = data.sources.filter((s) => s.name.toLowerCase().includes(q));
    sources.forEach((s) => results.push({ type: "Script/Report", label: s.name, detail: s.path }));

    return results.slice(0, 20);
  }, [data, search]);

  const loadedCount = data.sources.filter((s) => s.loaded).length;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Sidebar */}
      <aside className="lg:w-56 shrink-0">
        <nav className="sticky top-24 space-y-1 rounded-xl border border-zinc-700/80 bg-zinc-800/40 p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                section === s.id
                  ? "bg-red-600 text-white"
                  : "text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100"
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <p className="mt-3 px-2 text-[10px] text-zinc-500">
          {loadedCount}/{data.sources.length} relatórios carregados
        </p>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-red-700/40 bg-gradient-to-br from-red-500/10 to-zinc-900/80 p-4 sm:p-5">
          <h1 className="text-lg font-bold text-zinc-100 sm:text-xl">THouse Engineering Dashboard</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Painel consolidado · Atualizado {new Date(data.loadedAt).toLocaleString("pt-BR")}
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Pesquisar arquivo, ADR, check, entidade, fluxo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-500/60 focus:outline-none"
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as DomainFilter)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-red-500/60 focus:outline-none"
          >
            {DOMAIN_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {domain !== "all" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Filtro ativo: <strong>{DOMAIN_FILTERS.find((f) => f.id === domain)?.label}</strong> — cards de dívida e refatoração priorizam este domínio na V1.
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/40 p-4">
            <p className="mb-2 text-xs font-medium text-zinc-400">Resultados da busca</p>
            <div className="flex flex-wrap gap-2">
              {searchResults.map((r, i) => (
                <Badge key={i} tone="info">
                  {r.type}: {r.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {section === "overview" && (
          <div className="space-y-4">
            <EngineeringOverviewCard data={data} />
            <div className="grid gap-4 lg:grid-cols-2">
              <GuardianStatusCard data={data} />
              <DecisionCard data={data} />
            </div>
            <CtoCard data={data} />
            <HumanReportCard data={data} />
          </div>
        )}

        {section === "guardian" && (
          <div className="space-y-4">
            <GuardianStatusCard data={data} />
            <DecisionCard data={data} />
            <TimelineCard data={data} />
          </div>
        )}

        {section === "execution" && (
          <div className="space-y-4">
            <ExecutionCard data={data} />
            <TimelineCard data={data} />
          </div>
        )}

        {section === "quality" && (
          <div className="space-y-4">
            <HealthCard data={data} />
            <DebtCard data={data} />
          </div>
        )}

        {section === "refactor" && (
          <div className="space-y-4">
            <RefactorCard data={data} />
            <DebtCard data={data} />
          </div>
        )}

        {section === "architecture" && (
          <div className="space-y-4">
            <CtoCard data={data} />
            <ADRCard data={data} search={search} />
            <EvolutionCard data={data} />
          </div>
        )}

        {section === "knowledge" && (
          <KnowledgeGraphCard data={data} search={search} />
        )}

        {section === "roadmap" && (
          <div className="space-y-4">
            <RoadmapCard data={data} />
            <ExecutionCard data={data} />
          </div>
        )}

        {section === "deploy" && (
          <div className="space-y-4">
            <DeployCard data={data} />
            <GuardianStatusCard data={data} />
            <DecisionCard data={data} />
          </div>
        )}

        {/* Sources footer */}
        <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
          <summary className="cursor-pointer text-zinc-400">Fontes JSON consumidas</summary>
          <ul className="mt-2 space-y-0.5">
            {data.sources.map((s) => (
              <li key={s.path} className={s.loaded ? "text-zinc-400" : "text-zinc-600 line-through"}>
                {s.loaded ? "✓" : "✗"} {s.path}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
