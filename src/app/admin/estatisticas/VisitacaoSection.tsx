"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Callout, Button, useFeedback } from "@/components/design-system";

type VisitacaoPayload = {
  hoje: {
    visualizacoes: number;
    visitantesUnicos: number;
    sessoes: number;
    pageviewsLogados: number;
    pageviewsAnonimos: number;
  };
  ultimos7Dias: { visualizacoes: number; visitantesUnicos: number; sessoes: number };
  ultimos30Dias: { visualizacoes: number; visitantesUnicos: number; sessoes: number };
  porDia: Array<{
    data: string;
    visualizacoes: number;
    logados: number;
    anonimos: number;
  }>;
  porPagina: Array<{ path: string; label: string; visualizacoes: number }>;
  logadosVsAnonimos: { logados: number; anonimos: number };
};

function formatIsoBr(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function VisitacaoSection() {
  const { notifySuccess, notifyError, ask } = useFeedback();
  const [data, setData] = useState<VisitacaoPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const res = await fetch("/api/admin/stats/visitacao", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        setErro(json.error || `Erro ${res.status}`);
        return;
      }
      setData(json);
    } catch {
      setErro("Falha ao carregar visitação.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function limparVisitacao() {
    const ok = await ask(
      "Tem certeza que deseja apagar todas as estatísticas de visitação?",
      "Essa ação removerá visualizações, visitantes e sessões registradas no Analytics da THouse. Usuários, pagamentos, agendamentos e demais dados do sistema não serão alterados.",
      true
    );
    if (!ok) return;
    setPurging(true);
    try {
      const res = await fetch("/api/admin/stats/visitacao", {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(json.error || "Não foi possível limpar a visitação.");
        return;
      }
      notifySuccess("Estatísticas de visitação apagadas", `${json.deleted ?? 0} registro(s) removido(s).`);
      await carregar();
    } catch {
      notifyError("Falha ao limpar estatísticas de visitação.");
    } finally {
      setPurging(false);
    }
  }

  if (loading) {
    return (
      <Card className="!p-6">
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Visitação</h2>
        <p className="text-sm text-zinc-400">Carregando pageviews…</p>
      </Card>
    );
  }

  if (erro) {
    return (
        <Callout intent="warning" title="Visitação indisponível">
        {erro} Aplique a migration PageView no banco local para ativar este painel.
      </Callout>
    );
  }

  if (!data) return null;

  const h = data.hoje;

  return (
    <Card className="!p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Visitação por página</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Visitantes anônimos usam um identificador aleatório. Não confundir com usuários cadastrados.
            Origem atual: WEB (preparado para APP). Acessos de administradores não entram nestes números.
          </p>
        </div>
        <div className="space-y-1 text-right">
          <Button
            variant="danger"
            onClick={() => void limparVisitacao()}
            disabled={purging}
          >
            {purging ? "Limpando…" : "Limpar estatísticas de visitação"}
          </Button>
          <p className="text-xs text-zinc-500 max-w-xs">
            Remove apenas os dados de visitação. Não afeta contas, pagamentos ou agendamentos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Visualizações hoje" value={h.visualizacoes} tone="text-red-400" />
        <StatCard label="Visitantes únicos hoje" value={h.visitantesUnicos} tone="text-amber-300" />
        <StatCard label="Sessões hoje" value={h.sessoes} tone="text-yellow-300" />
        <StatCard label="Pageviews logados (hoje)" value={h.pageviewsLogados} tone="text-green-400" />
        <StatCard label="Pageviews anônimos (hoje)" value={h.pageviewsAnonimos} tone="text-sky-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <PeriodCard title="Últimos 7 dias" stats={data.ultimos7Dias} />
        <PeriodCard title="Últimos 30 dias" stats={data.ultimos30Dias} />
        <div className="bg-zinc-900/50 rounded-lg p-4">
          <div className="text-zinc-400 mb-2">Logados vs anônimos (30 dias)</div>
          <div className="text-lg font-semibold text-green-400">
            {data.logadosVsAnonimos.logados} logados
          </div>
          <div className="text-lg font-semibold text-sky-400">
            {data.logadosVsAnonimos.anonimos} anônimos
          </div>
        </div>
      </div>

      <div className="h-72">
        <p className="text-sm font-semibold text-zinc-200 mb-2">Visualizações por dia (30 dias)</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.porDia.map((d) => ({ ...d, dia: formatIsoBr(d.data) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="dia" stroke="#a1a1aa" fontSize={11} />
            <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
            />
            <Legend />
            <Bar dataKey="logados" name="Logados" fill="#4ade80" />
            <Bar dataKey="anonimos" name="Anônimos" fill="#38bdf8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-200 mb-3">Páginas mais acessadas (30 dias)</p>
        {data.porPagina.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma visualização registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="text-left py-2">Página</th>
                  <th className="text-left py-2">Path</th>
                  <th className="text-right py-2">Visualizações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.porPagina.map((row) => (
                  <tr key={row.path}>
                    <td className="py-2 text-zinc-100">{row.label}</td>
                    <td className="py-2 font-mono text-zinc-400">{row.path}</td>
                    <td className="py-2 text-right font-semibold text-zinc-100">
                      {row.visualizacoes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4">
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

function PeriodCard({
  title,
  stats,
}: {
  title: string;
  stats: { visualizacoes: number; visitantesUnicos: number; sessoes: number };
}) {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4 space-y-1">
      <div className="text-zinc-400">{title}</div>
      <div className="text-zinc-100">{stats.visualizacoes} visualizações</div>
      <div className="text-zinc-300">{stats.visitantesUnicos} visitantes únicos</div>
      <div className="text-zinc-300">{stats.sessoes} sessões</div>
    </div>
  );
}
