"use client";

import { useEffect, useState, useCallback } from "react";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import {
  LoadingBlock,
  ErrorState,
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  Callout,
} from "@/components/design-system";
import { VisitacaoSection } from "./VisitacaoSection";
import { OperationalTimingStatsPanel } from "./OperationalTimingStatsPanel";
import type { OperationalTimingStats } from "@/app/lib/service-timing";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Estatisticas {
  usuarios: {
    total: number;
    comConta: number;
    semConta: number;
    porcentagemComConta: number;
  };
  pagamentos: {
    total: number;
    porUsuarios: number;
    porNaoUsuarios: number;
    valorTotal: number;
  };
  planos: {
    total: number;
    ativos: number;
    inativos: number;
  };
  agendamentos: {
    total: number;
    totalAtivos: number;
    totalCancelados: number;
    hoje: number;
    hojeCancelados: number;
    estaSemana: number;
    estaSemanaCancelados: number;
    esteMes: number;
    esteMesCancelados: number;
  };
  servicos: {
    total: number;
    pendentes: number;
    aceitos: number;
    emAndamento?: number;
    concluidos?: number;
    cancelados?: number;
    recusados?: number;
  };
  usoDiario: {
    data: string;
    usuarios: number;
  }[];
  overtimeOperacional?: {
    sessao: OperationalTimingStats;
    captacao: OperationalTimingStats;
    todos: OperationalTimingStats;
  };
}

type Periodo = "diario" | "semanal" | "mensal" | "anual";

function formatMesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatDataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

export default function AdminEstatisticasPage() {
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [graficoUsuarios, setGraficoUsuarios] = useState(false);
  const [graficoPagamentos, setGraficoPagamentos] = useState(false);
  const [graficoPlanos, setGraficoPlanos] = useState(false);
  const [graficoAgendamentos, setGraficoAgendamentos] = useState(false);
  const [graficoServicos, setGraficoServicos] = useState(false);

  const [periodoUsuarios, setPeriodoUsuarios] = useState<Periodo>("mensal");
  const [periodoPagamentos, setPeriodoPagamentos] = useState("mensal");
  const [mesPagamentos, setMesPagamentos] = useState(formatMesAtual());
  const [filtroPagamentos, setFiltroPagamentos] = useState("todos");
  const [filtrosPagamentosLista, setFiltrosPagamentosLista] = useState<{ id: string; label: string }[]>([{ id: "todos", label: "Todos" }]);
  const [periodoPlanos, setPeriodoPlanos] = useState("mensal");
  const [mesPlanos, setMesPlanos] = useState(formatMesAtual());
  const [periodoAgendamentos, setPeriodoAgendamentos] = useState<Periodo>("mensal");
  const [dataUsuarios, setDataUsuarios] = useState(formatDataHoje());
  const [mesUsuarios, setMesUsuarios] = useState(formatMesAtual());
  const [anoUsuarios, setAnoUsuarios] = useState(String(new Date().getFullYear()));
  const [dataAgendamentos, setDataAgendamentos] = useState(formatDataHoje());
  const [mesAgendamentos, setMesAgendamentos] = useState(formatMesAtual());
  const [periodoServicos, setPeriodoServicos] = useState<Periodo>("mensal");
  const [dataServicos, setDataServicos] = useState(formatDataHoje());
  const [mesServicos, setMesServicos] = useState(formatMesAtual());

  const [dadosGrafico, setDadosGrafico] = useState<unknown>(null);
  const [loadingGrafico, setLoadingGrafico] = useState(false);
  const [qualGrafico, setQualGrafico] = useState<string | null>(null);

  // SYNC-01A — atualização via Domain Sync (sem polling 45s)
  useDomainRefresh("estatisticas", () => carregarEstatisticas());

  useEffect(() => {
    void carregarEstatisticas();
  }, []);

  useEffect(() => {
    if (graficoPagamentos && filtrosPagamentosLista.length <= 1) {
      fetch("/api/admin/stats/graficos?secao=filtros-pagamentos", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => data.filtros?.length && setFiltrosPagamentosLista(data.filtros))
        .catch(() => {});
    }
  }, [graficoPagamentos, filtrosPagamentosLista.length]);

  async function carregarEstatisticas() {
    try {
      setErro(null);
      const res = await fetch("/api/admin/stats/detalhadas", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStats(data);
      } else {
        setStats(null);
        setErro(data.error || `Erro ${res.status} ao carregar estatísticas`);
      }
    } catch (err) {
      console.error("Erro ao carregar estatísticas", err);
      setStats(null);
      setErro("Falha ao conectar. Verifique se está logado como admin.");
    } finally {
      setLoading(false);
    }
  }

  const buscarGrafico = useCallback(
    async (secao: string, periodo?: string, mes?: string, data?: string, ano?: string, filtro?: string) => {
      setQualGrafico(secao);
      setLoadingGrafico(true);
      setDadosGrafico(null);
      try {
        const params = new URLSearchParams({ secao });
        if (periodo) params.set("periodo", periodo);
        if (mes) params.set("mes", mes);
        if (data) params.set("data", data);
        if (ano) params.set("ano", ano);
        if (filtro) params.set("filtro", filtro);
        const res = await fetch(`/api/admin/stats/graficos?${params}`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) setDadosGrafico(json);
        else setDadosGrafico({ error: json.error || "Erro ao carregar" });
      } catch {
        setDadosGrafico({ error: "Falha ao carregar dados" });
      } finally {
        setLoadingGrafico(false);
      }
    },
    []
  );

  if (loading) {
    return <LoadingBlock label="Carregando estatísticas..." />;
  }

  if (erro) {
    return (
      <ErrorState
        title="Erro ao carregar estatísticas"
        description={erro}
        onRetry={() => {
          setErro(null);
          setLoading(true);
          carregarEstatisticas();
        }}
        className="max-w-md mx-auto"
      />
    );
  }

  const safeStats = stats ?? {
    usuarios: { total: 0, comConta: 0, semConta: 0, porcentagemComConta: 0 },
    pagamentos: { total: 0, porUsuarios: 0, porNaoUsuarios: 0, valorTotal: 0 },
    planos: { total: 0, ativos: 0, inativos: 0 },
    agendamentos: {
      total: 0,
      totalAtivos: 0,
      totalCancelados: 0,
      hoje: 0,
      hojeCancelados: 0,
      estaSemana: 0,
      estaSemanaCancelados: 0,
      esteMes: 0,
      esteMesCancelados: 0,
    },
    servicos: {
      total: 0,
      pendentes: 0,
      aceitos: 0,
      emAndamento: 0,
      concluidos: 0,
      cancelados: 0,
      recusados: 0,
    },
    usoDiario: [] as { data: string; usuarios: number }[],
    overtimeOperacional: {
      sessao: emptyOvertimeUi(),
      captacao: emptyOvertimeUi(),
      todos: emptyOvertimeUi(),
    },
  };

  const isEmptyPlatform =
    safeStats.usuarios.total === 0 &&
    safeStats.pagamentos.total === 0 &&
    safeStats.agendamentos.total === 0 &&
    safeStats.servicos.total === 0;

  const servicosComFallback = {
    ...safeStats.servicos,
    emAndamento: safeStats.servicos.emAndamento ?? 0,
    concluidos: safeStats.servicos.concluidos ?? 0,
    cancelados: safeStats.servicos.cancelados ?? 0,
    recusados: safeStats.servicos.recusados ?? 0,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Estatísticas do Site"
        subtitle="Visão geral completa do uso da plataforma"
        icon="star"
      />

      <VisitacaoSection />

      {isEmptyPlatform && (
        <Callout intent="info" title="Nenhum dado operacional ainda">
          Indicadores e gráficos aparecerão automaticamente assim que houver
          usuários, pagamentos, agendamentos ou serviços na plataforma.
        </Callout>
      )}

      {/* Usuários */}
      <Card className="!p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-zinc-100">👥 Usuários</h2>
          <Button variant="secondary" onClick={() => setGraficoUsuarios((v) => !v)}>
            {graficoUsuarios ? "Ocultar gráfico" : "Ver gráfico"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{safeStats.usuarios.total}</div>
            <div className="text-sm text-zinc-400 mt-1">Total de Usuários</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{safeStats.usuarios.comConta}</div>
            <div className="text-sm text-zinc-400 mt-1">Com Conta</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{safeStats.usuarios.semConta}</div>
            <div className="text-sm text-zinc-400 mt-1">Sem Conta</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-400">
              {(safeStats.usuarios.porcentagemComConta ?? 0).toFixed(1)}%
            </div>
            <div className="text-sm text-zinc-400 mt-1">% com Conta</div>
          </div>
        </div>
        {graficoUsuarios && (
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="w-48">
                <Select
                  value={periodoUsuarios}
                  onChange={(e) => setPeriodoUsuarios(e.target.value as Periodo)}
                  options={[
                    { value: "diario", label: "Diário (por hora)" },
                    { value: "semanal", label: "Semanal (por dia)" },
                    { value: "mensal", label: "Mensal (por dia)" },
                    { value: "anual", label: "Anual (por mês)" },
                  ]}
                />
              </div>
              {periodoUsuarios === "diario" && (
                <Input
                  type="date"
                  value={dataUsuarios}
                  onChange={(e) => setDataUsuarios(e.target.value)}
                  className="!w-auto"
                />
              )}
              {periodoUsuarios === "mensal" && (
                <Input
                  type="month"
                  value={mesUsuarios}
                  onChange={(e) => setMesUsuarios(e.target.value)}
                  className="!w-auto"
                />
              )}
              {periodoUsuarios === "anual" && (
                <Input
                  type="number"
                  min={2020}
                  max={2030}
                  value={anoUsuarios}
                  onChange={(e) => setAnoUsuarios(e.target.value)}
                  className="!w-24"
                />
              )}
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() =>
                  buscarGrafico(
                    "usuarios",
                    periodoUsuarios,
                    periodoUsuarios === "mensal" ? mesUsuarios : undefined,
                    periodoUsuarios === "diario" ? dataUsuarios : undefined,
                    periodoUsuarios === "anual" ? anoUsuarios : undefined
                  )
                }
              >
                Atualizar
              </Button>
            </div>
            {qualGrafico === "usuarios" && (
              <>
                {loadingGrafico && <LoadingBlock />}
                {!loadingGrafico && dadosGrafico && "error" in (dadosGrafico as { error?: string }) && (
                  <Callout intent="error">{(dadosGrafico as { error: string }).error}</Callout>
                )}
                {!loadingGrafico && dadosGrafico && "buckets" in (dadosGrafico as { buckets?: unknown[] }) && (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(dadosGrafico as { buckets: { label: string; valor: number }[] }).buckets}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
                        <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
                        <YAxis stroke="#a1a1aa" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }} />
                        <Bar dataKey="valor" fill="#22c55e" name="Novos usuários" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Pagamentos */}
      <Card className="!p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-zinc-100">💰 Pagamentos</h2>
          <Button variant="secondary" onClick={() => setGraficoPagamentos((v) => !v)}>
            {graficoPagamentos ? "Ocultar gráfico" : "Ver gráfico"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{safeStats.pagamentos.total}</div>
            <div className="text-sm text-zinc-400 mt-1">Total de Pagamentos</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{safeStats.pagamentos.porUsuarios}</div>
            <div className="text-sm text-zinc-400 mt-1">Por Usuários</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{safeStats.pagamentos.porNaoUsuarios}</div>
            <div className="text-sm text-zinc-400 mt-1">Por Não Usuários</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-400">R$ {safeStats.pagamentos.valorTotal.toFixed(2)}</div>
            <div className="text-sm text-zinc-400 mt-1">Valor Total</div>
          </div>
        </div>
        {graficoPagamentos && (
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <span className="text-zinc-400 text-sm">Mês:</span>
              <Input
                type="month"
                value={mesPagamentos}
                onChange={(e) => setMesPagamentos(e.target.value)}
                className="!w-auto"
              />
              <span className="text-zinc-400 text-sm">Filtro:</span>
              <div className="w-48">
                <Select
                  value={filtroPagamentos}
                  onChange={(e) => setFiltroPagamentos(e.target.value)}
                  options={filtrosPagamentosLista.map((f) => ({ value: f.id, label: f.label }))}
                />
              </div>
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => buscarGrafico("pagamentos", "mensal", mesPagamentos, undefined, undefined, filtroPagamentos)}
              >
                Atualizar
              </Button>
            </div>
            {qualGrafico === "pagamentos" && (
              <>
                {loadingGrafico && <LoadingBlock />}
                {!loadingGrafico && dadosGrafico && "error" in (dadosGrafico as { error?: string }) && (
                  <Callout intent="error">{(dadosGrafico as { error: string }).error}</Callout>
                )}
                {!loadingGrafico && dadosGrafico && "buckets" in (dadosGrafico as { buckets?: unknown[] }) && (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(dadosGrafico as { buckets: { label: string; valor: number; valorTotal: number }[] }).buckets}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
                        <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
                        <YAxis stroke="#a1a1aa" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }} />
                        <Legend />
                        <Bar dataKey="valor" fill="#22c55e" name="Quantidade" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="valorTotal" fill="#3b82f6" name="Valor (R$)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Planos */}
      <Card className="!p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-zinc-100">⭐ Planos</h2>
          <Button variant="secondary" onClick={() => setGraficoPlanos((v) => !v)}>
            {graficoPlanos ? "Ocultar gráfico" : "Ver gráfico"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{safeStats.planos.total}</div>
            <div className="text-sm text-zinc-400 mt-1">Total de Planos</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{safeStats.planos.ativos}</div>
            <div className="text-sm text-zinc-400 mt-1">Planos Ativos</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{safeStats.planos.inativos}</div>
            <div className="text-sm text-zinc-400 mt-1">Planos Inativos</div>
          </div>
        </div>
        {graficoPlanos && (
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-zinc-400 text-sm">Mês:</span>
              <Input
                type="month"
                value={mesPlanos}
                onChange={(e) => setMesPlanos(e.target.value)}
                className="!w-auto"
              />
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => buscarGrafico("planos", "mensal", mesPlanos)}
              >
                Atualizar
              </Button>
            </div>
            {qualGrafico === "planos" && (
              <>
                {loadingGrafico && <LoadingBlock />}
                {!loadingGrafico && dadosGrafico && "error" in (dadosGrafico as { error?: string }) && (
                  <Callout intent="error">{(dadosGrafico as { error: string }).error}</Callout>
                )}
                {!loadingGrafico && dadosGrafico && "buckets" in (dadosGrafico as { buckets?: unknown[] }) && (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(dadosGrafico as { buckets: { label: string; assinados: number; cancelados: number }[] }).buckets}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
                        <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
                        <YAxis stroke="#a1a1aa" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }} />
                        <Legend />
                        <Bar dataKey="assinados" fill="#22c55e" name="Assinados" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancelados" fill="#ef4444" name="Cancelados / não renovados" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Agendamentos */}
      <Card className="!p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-zinc-100">📅 Agendamentos</h2>
          <Button variant="secondary" onClick={() => setGraficoAgendamentos((v) => !v)}>
            {graficoAgendamentos ? "Ocultar gráfico" : "Ver gráfico"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{safeStats.agendamentos.total}</div>
            <div className="text-sm text-zinc-400 mt-1">Total</div>
            <div className="text-xs text-zinc-500 mt-2 flex gap-2">
              <span className="text-green-400">{safeStats.agendamentos.totalAtivos} ativos</span>
              <span className="text-orange-400">{safeStats.agendamentos.totalCancelados} cancelados</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{safeStats.agendamentos.hoje}</div>
            <div className="text-xs text-orange-400 font-medium">{safeStats.agendamentos.hojeCancelados} cancelados</div>
            <div className="text-sm text-zinc-400 mt-1">Hoje</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{safeStats.agendamentos.estaSemana}</div>
            <div className="text-xs text-orange-400 font-medium">{safeStats.agendamentos.estaSemanaCancelados} cancelados</div>
            <div className="text-sm text-zinc-400 mt-1">Esta Semana</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{safeStats.agendamentos.esteMes}</div>
            <div className="text-xs text-orange-400 font-medium">{safeStats.agendamentos.esteMesCancelados} cancelados</div>
            <div className="text-sm text-zinc-400 mt-1">Este Mês</div>
          </div>
        </div>
        {graficoAgendamentos && (
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="w-48">
                <Select
                  value={periodoAgendamentos}
                  onChange={(e) => setPeriodoAgendamentos(e.target.value as Periodo)}
                  options={[
                    { value: "diario", label: "Diário (por hora)" },
                    { value: "semanal", label: "Semanal (por dia)" },
                    { value: "mensal", label: "Mensal (por dia)" },
                  ]}
                />
              </div>
              {periodoAgendamentos === "diario" && (
                <Input
                  type="date"
                  value={dataAgendamentos}
                  onChange={(e) => setDataAgendamentos(e.target.value)}
                  className="!w-auto"
                />
              )}
              {periodoAgendamentos === "mensal" && (
                <Input
                  type="month"
                  value={mesAgendamentos}
                  onChange={(e) => setMesAgendamentos(e.target.value)}
                  className="!w-auto"
                />
              )}
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => {
                  if (periodoAgendamentos === "diario") {
                    buscarGrafico("agendamentos", "diario", undefined, dataAgendamentos);
                  } else if (periodoAgendamentos === "semanal") {
                    buscarGrafico("agendamentos", "semanal");
                  } else {
                    buscarGrafico("agendamentos", "mensal", mesAgendamentos);
                  }
                }}
              >
                Atualizar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (periodoAgendamentos === "diario") {
                    buscarGrafico("agendamentos-servicos", "diario", undefined, dataAgendamentos);
                  } else if (periodoAgendamentos === "semanal") {
                    buscarGrafico("agendamentos-servicos", "semanal");
                  } else {
                    buscarGrafico("agendamentos-servicos", "mensal", mesAgendamentos);
                  }
                }}
              >
                Por tipo de serviço
              </Button>
            </div>
            {(qualGrafico === "agendamentos" || qualGrafico === "agendamentos-servicos") && (
              <>
                {loadingGrafico && <LoadingBlock />}
                {!loadingGrafico && dadosGrafico && "error" in (dadosGrafico as { error?: string }) && (
                  <Callout intent="error">{(dadosGrafico as { error: string }).error}</Callout>
                )}
                {!loadingGrafico && qualGrafico === "agendamentos" && dadosGrafico && "buckets" in (dadosGrafico as { buckets?: unknown[] }) && (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(dadosGrafico as { buckets: { label: string; valor: number }[] }).buckets}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
                        <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
                        <YAxis stroke="#a1a1aa" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }} />
                        <Bar dataKey="valor" fill="#8b5cf6" name="Agendamentos" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {!loadingGrafico && qualGrafico === "agendamentos-servicos" && dadosGrafico && "series" in (dadosGrafico as { series?: { tipo: string; pontos: { label: string; valor: number }[] }[] }) && (() => {
                  const { series } = dadosGrafico as { series: { tipo: string; pontos: { label: string; valor: number }[] }[] };
                  const labels = Array.from(new Set(series.flatMap((s) => s.pontos.map((p) => p.label)))).sort();
                  const cores = ["#8b5cf6", "#22c55e", "#3b82f6", "#eab308", "#ef4444", "#ec4899"];
                  const data = labels.map((label) => {
                    const row: Record<string, string | number> = { label };
                    series.forEach((s) => {
                      const p = s.pontos.find((x) => x.label === label);
                      row[s.tipo] = p ? p.valor : 0;
                    });
                    return row;
                  });
                  return (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
                          <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
                          <YAxis stroke="#a1a1aa" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }} />
                          <Legend />
                          {series.map((s, i) => (
                            <Bar key={s.tipo} dataKey={s.tipo} fill={cores[i % cores.length]} name={s.tipo} stackId="a" radius={[0, 0, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Serviços - estatísticas + gráfico e análise por tipo */}
      <Card className="!p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-zinc-100">🎵 Serviços</h2>
          <Button variant="secondary" onClick={() => setGraficoServicos((v) => !v)}>
            {graficoServicos ? "Ocultar análises" : "Ver gráfico e por tipo"}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{servicosComFallback.total}</div>
            <div className="text-sm text-zinc-400 mt-1">Total</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{servicosComFallback.pendentes}</div>
            <div className="text-sm text-zinc-400 mt-1">Pendentes</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{servicosComFallback.aceitos}</div>
            <div className="text-sm text-zinc-400 mt-1">Aceitos</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-sky-400">{servicosComFallback.emAndamento}</div>
            <div className="text-sm text-zinc-400 mt-1">Em andamento</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-rose-400">{servicosComFallback.recusados}</div>
            <div className="text-sm text-zinc-400 mt-1">Recusados</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-400">{servicosComFallback.cancelados}</div>
            <div className="text-sm text-zinc-400 mt-1">Cancelados</div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-emerald-400">{servicosComFallback.concluidos}</div>
            <div className="text-sm text-zinc-400 mt-1">Concluídos</div>
          </div>
        </div>
        {graficoServicos && (
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <div className="w-48">
                <Select
                  value={periodoServicos}
                  onChange={(e) => setPeriodoServicos(e.target.value as Periodo)}
                  options={[
                    { value: "diario", label: "Diário (por hora)" },
                    { value: "semanal", label: "Semanal (por dia)" },
                    { value: "mensal", label: "Mensal (por dia)" },
                  ]}
                />
              </div>
              {periodoServicos === "diario" && (
                <Input
                  type="date"
                  value={dataServicos}
                  onChange={(e) => setDataServicos(e.target.value)}
                  className="!w-auto"
                />
              )}
              {periodoServicos === "mensal" && (
                <Input
                  type="month"
                  value={mesServicos}
                  onChange={(e) => setMesServicos(e.target.value)}
                  className="!w-auto"
                />
              )}
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() =>
                  buscarGrafico(
                    "servicos",
                    periodoServicos,
                    periodoServicos === "mensal" ? mesServicos : undefined,
                    periodoServicos === "diario" ? dataServicos : undefined
                  )
                }
              >
                Gráfico por período
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  buscarGrafico(
                    "servicos-tipos",
                    periodoServicos,
                    periodoServicos === "mensal" ? mesServicos : undefined,
                    periodoServicos === "diario" ? dataServicos : undefined
                  )
                }
              >
                Por tipo de serviço
              </Button>
            </div>
            {(qualGrafico === "servicos" || qualGrafico === "servicos-tipos") && (
              <>
                {loadingGrafico && <LoadingBlock />}
                {!loadingGrafico && dadosGrafico && "error" in (dadosGrafico as { error?: string }) && (
                  <Callout intent="error">{(dadosGrafico as { error: string }).error}</Callout>
                )}
                {!loadingGrafico && qualGrafico === "servicos" && dadosGrafico && "buckets" in (dadosGrafico as { buckets?: unknown[] }) && (
                  <div className="h-72 w-full mb-6">
                    <p className="text-zinc-400 text-sm mb-2">Serviços solicitados por período (por status)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(dadosGrafico as { buckets: { label: string; pendentes: number; aceitos: number; concluidos: number; cancelados: number; recusados: number }[] }).buckets}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
                        <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
                        <YAxis stroke="#a1a1aa" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b" }} />
                        <Legend />
                        <Bar dataKey="pendentes" stackId="a" fill="#eab308" name="Pendentes" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="aceitos" stackId="a" fill="#22c55e" name="Aceitos" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="emAndamento" stackId="a" fill="#0ea5e9" name="Em andamento" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="concluidos" stackId="a" fill="#10b981" name="Concluídos" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="cancelados" stackId="a" fill="#f97316" name="Cancelados" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="recusados" stackId="a" fill="#ef4444" name="Recusados" radius={[0, 0, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {!loadingGrafico && qualGrafico === "servicos-tipos" && dadosGrafico && "tipos" in (dadosGrafico as { tipos?: unknown[] }) && (() => {
                  const { tipos } = dadosGrafico as { tipos: { tipo: string; total: number; pendentes: number; aceitos: number; concluidos: number; cancelados: number; recusados: number; primeiraData: string | null; ultimaData: string | null }[] };
                  const formatDt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
                  return (
                    <div className="overflow-x-auto">
                      <p className="text-zinc-400 text-sm mb-2">Serviços por tipo (quantidade e datas no período)</p>
                      <table className="w-full text-sm text-left text-zinc-300 border border-zinc-600 rounded-lg overflow-hidden">
                        <thead className="bg-zinc-700/80 text-zinc-200">
                          <tr>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2">Pendentes</th>
                            <th className="px-3 py-2">Aceitos</th>
                            <th className="px-3 py-2">Concluídos</th>
                            <th className="px-3 py-2">Cancelados</th>
                            <th className="px-3 py-2">Recusados</th>
                            <th className="px-3 py-2">Primeira data</th>
                            <th className="px-3 py-2">Última data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tipos.length === 0 ? (
                            <tr><td colSpan={9} className="px-3 py-4 text-zinc-500">Nenhum serviço no período.</td></tr>
                          ) : (
                            tipos.map((row) => (
                              <tr key={row.tipo} className="border-t border-zinc-600 hover:bg-zinc-700/30">
                                <td className="px-3 py-2 font-medium">{row.tipo}</td>
                                <td className="px-3 py-2">{row.total}</td>
                                <td className="px-3 py-2">{row.pendentes}</td>
                                <td className="px-3 py-2">{row.aceitos}</td>
                                <td className="px-3 py-2">{row.concluidos}</td>
                                <td className="px-3 py-2">{row.cancelados}</td>
                                <td className="px-3 py-2">{row.recusados}</td>
                                <td className="px-3 py-2">{formatDt(row.primeiraData)}</td>
                                <td className="px-3 py-2">{formatDt(row.ultimaData)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </Card>

      <OperationalTimingStatsPanel overtime={safeStats.overtimeOperacional} />
    </div>
  );
}
