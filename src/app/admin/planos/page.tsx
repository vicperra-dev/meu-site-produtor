"use client";

import { useEffect, useState } from "react";
import { LoadingBlock, useFeedback } from "@/components/design-system";
import { PartnershipCouponsPanel } from "./PartnershipCouponsPanel";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import {
  couponCategoryLabel,
  resolveCouponCategoryFromRow,
} from "@/app/lib/domain/coupon-category";

interface UserPlan {
  id: string;
  planId: string;
  planName: string;
  modo: string;
  amount: number;
  status: string;
  startDate: string;
  endDate?: string;
  user: {
    nomeArtistico: string;
    email: string;
  };
  createdAt: string;
}

interface Cupom {
  id: string;
  code: string;
  couponType: string;
  discountType: string;
  discountValue: number;
  serviceType: string | null;
  used: boolean;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: {
    nomeArtistico: string;
    email: string;
  };
  userPlan: {
    id: string;
    planId: string;
    planName: string;
    endDate: string | null;
    status?: string;
  } | null;
  appointmentId: number | null;
}

export default function AdminPlanosPage() {
  const { notifySuccess, notifyError, ask, askDelete } = useFeedback();
  const [planos, setPlanos] = useState<UserPlan[]>([]);
  const [planosFiltrados, setPlanosFiltrados] = useState<UserPlan[]>([]);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [cuponsFiltrados, setCuponsFiltrados] = useState<Cupom[]>([]);
  const [busca, setBusca] = useState("");
  const [buscaCupons, setBuscaCupons] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"planos" | "cupons">("planos");
  const [loading, setLoading] = useState(true);
  const [excluindoCupomId, setExcluindoCupomId] = useState<string | null>(null);
  const [adicionandoAContaAppointmentId, setAdicionandoAContaAppointmentId] = useState<number | null>(null);

  useEffect(() => {
    carregarPlanos();
    carregarCupons();
  }, []);

  useDomainRefresh(["planos", "cupons"], async () => {
    await carregarPlanos();
    await carregarCupons();
  });

  useEffect(() => {
    if (busca.trim() === "") {
      setPlanosFiltrados(planos);
    } else {
      const termo = busca.toLowerCase();
      const filtrados = planos.filter(
        (p) =>
          p.user.nomeArtistico.toLowerCase().includes(termo) ||
          p.user.email.toLowerCase().includes(termo)
      );
      setPlanosFiltrados(filtrados);
    }
  }, [busca, planos]);

  useEffect(() => {
    if (buscaCupons.trim() === "") {
      setCuponsFiltrados(cupons);
    } else {
      const termo = buscaCupons.toLowerCase();
      const filtrados = cupons.filter(
        (c) =>
          c.user.nomeArtistico.toLowerCase().includes(termo) ||
          c.user.email.toLowerCase().includes(termo) ||
          c.code.toLowerCase().includes(termo)
      );
      setCuponsFiltrados(filtrados);
    }
  }, [buscaCupons, cupons]);

  async function carregarPlanos() {
    try {
      const res = await fetch("/api/admin/planos");
      if (res.ok) {
        const data = await res.json();
        setPlanos(data.planos || []);
        setPlanosFiltrados(data.planos || []);
      }
    } catch (err) {
      console.error("Erro ao carregar planos", err);
    } finally {
      setLoading(false);
    }
  }

  async function carregarCupons() {
    try {
      const res = await fetch("/api/admin/cupons", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        console.log("[Admin Planos] Cupons carregados:", data.cupons?.length || 0);
        setCupons(data.cupons || []);
        setCuponsFiltrados(data.cupons || []);
      } else {
        console.error("Erro ao carregar cupons:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Erro ao carregar cupons", err);
    }
  }

  async function liberarCupom(cupomCode: string) {
    if (!(await ask(`Liberar o cupom ${cupomCode}?`, "O cupom voltará a ficar disponível para uso."))) {
      return;
    }

    try {
      const res = await fetch("/api/admin/cupons/liberar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cupomCode }),
      });
      
      if (res.ok) {
        const data = await res.json();
        notifySuccess(data.message);
        carregarCupons(); // Recarregar cupons após liberação
      } else {
        const error = await res.json();
        notifyError(`Erro: ${error.error || "Erro ao liberar cupom"}`);
      }
    } catch (err) {
      console.error("Erro ao liberar cupom", err);
      notifyError("Erro ao liberar cupom");
    }
  }

  async function excluirCupom(cupomId: string, codigo: string) {
    if (
      !(await askDelete(
        `Excluir o cupom "${codigo}" do banco?`,
        "Esta ação não pode ser desfeita."
      ))
    )
      return;
    try {
      setExcluindoCupomId(cupomId);
      const res = await fetch(`/api/admin/cupons?id=${encodeURIComponent(cupomId)}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        await carregarCupons();
      } else {
        notifyError(data.error || "Erro ao excluir cupom.");
      }
    } catch (err) {
      console.error("Erro ao excluir cupom", err);
      notifyError("Erro ao excluir cupom.");
    } finally {
      setExcluindoCupomId(null);
    }
  }

  async function adicionarCuponsAMinhaConta(c: Cupom) {
    const aid = c.appointmentId;
    if (aid == null) {
      notifyError("Este cupom não está vinculado a um agendamento.");
      return;
    }
    try {
      setAdicionandoAContaAppointmentId(aid);
      const res = await fetch("/api/admin/cupons/adicionar-a-conta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: aid }),
      });
      const data = await res.json();
      if (res.ok) {
        notifySuccess(data.message || "Cupons vinculados à Minha Conta do usuário.");
        await carregarCupons();
      } else {
        notifyError(data.error || "Erro ao vincular cupons.");
      }
    } catch (err) {
      console.error("Erro ao adicionar cupons à conta", err);
      notifyError("Erro ao vincular cupons.");
    } finally {
      setAdicionandoAContaAppointmentId(null);
    }
  }

  if (loading) {
    return <LoadingBlock label="Carregando planos..." />;
  }

  function getServiceName(serviceType: string | null): string {
    if (!serviceType) return "N/A";
    const names: Record<string, string> = {
      sessao: "Sessão",
      captacao: "Captação",
      sonoplastia: "Sonoplastia",
      mix: "Mixagem",
      master: "Masterização",
      mix_master: "Mix + Master",
      beat1: "1 Beat",
      beat2: "2 Beats",
      beat3: "3 Beats",
      beat4: "4 Beats",
      producao_completa: "Produção Completa",
      percent_servicos: "10% em serviços avulsos",
      percent_beats: "10% em beats",
    };
    return names[serviceType] || serviceType;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Planos e Cupons</h1>
        <p className="text-zinc-400">Gerenciar planos assinados e cupons gerados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-700">
        <button
          onClick={() => setAbaAtiva("planos")}
          className={`px-4 py-2 font-semibold transition-colors ${
            abaAtiva === "planos"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Planos
        </button>
        <button
          onClick={() => setAbaAtiva("cupons")}
          className={`px-4 py-2 font-semibold transition-colors ${
            abaAtiva === "cupons"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Cupons
        </button>
      </div>

      {/* Conteúdo da Aba Planos */}
      {abaAtiva === "planos" && (
        <>
          {/* Input de Busca Planos */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email do usuário..."
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
            {busca && (
              <p className="mt-2 text-sm text-zinc-400">
                {planosFiltrados.length} plano(s) encontrado(s)
              </p>
            )}
          </div>

          {planosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 text-center text-zinc-400">
          Nenhum plano encontrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-800/50">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Plano</th>
                <th className="px-4 py-3 text-left">Modo</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Período</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {planosFiltrados.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-100">{p.user.nomeArtistico}</div>
                    <div className="text-xs text-zinc-400">{p.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{p.planName}</td>
                  <td className="px-4 py-3 text-zinc-300 capitalize">{p.modo}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-400">
                    R$ {p.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      p.status === "active" ? "bg-green-500/20 text-green-300" :
                      p.status === "cancelled" ? "bg-red-500/20 text-red-300" :
                      "bg-gray-500/20 text-gray-300"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-300">
                    <div>Início: {new Date(p.startDate).toLocaleDateString("pt-BR")}</div>
                    {(() => {
                      // Calcular fim do plano baseado no startDate + 1 mês (não usar endDate do banco que pode estar errado)
                      const startDate = new Date(p.startDate);
                      
                      // Calcular fim do plano: startDate + 1 mês
                      const ano = startDate.getFullYear();
                      const mes = startDate.getMonth();
                      const dia = startDate.getDate();
                      
                      let novoMes = mes + 1;
                      let novoAno = ano;
                      if (novoMes > 11) {
                        novoMes = 0;
                        novoAno++;
                      }
                      const ultimoDiaDoMes = new Date(novoAno, novoMes + 1, 0).getDate();
                      const diaFinal = Math.min(dia, ultimoDiaDoMes);
                      const fimPlano = new Date(novoAno, novoMes, diaFinal);
                      
                      // Calcular fim dos cupons: startDate + 2 meses
                      let novoMes2 = mes + 2;
                      let novoAno2 = ano;
                      if (novoMes2 > 11) {
                        novoMes2 = novoMes2 - 12;
                        novoAno2++;
                      }
                      const ultimoDiaDoMes2 = new Date(novoAno2, novoMes2 + 1, 0).getDate();
                      const diaFinal2 = Math.min(dia, ultimoDiaDoMes2);
                      const fimCupons = new Date(novoAno2, novoMes2, diaFinal2);
                      
                      return (
                        <>
                          <div>Fim do Plano: {fimPlano.toLocaleDateString("pt-BR")}</div>
                          <div className="text-zinc-500 mt-1">
                            Fim dos Cupons: {fimCupons.toLocaleDateString("pt-BR")}
                          </div>
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {/* Conteúdo da Aba Cupons */}
      {abaAtiva === "cupons" && (
        <>
          <PartnershipCouponsPanel />
          {/* Input de Busca Cupons */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
            <input
              type="text"
              value={buscaCupons}
              onChange={(e) => setBuscaCupons(e.target.value)}
              placeholder="Buscar por nome, email ou código do cupom..."
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
            {buscaCupons && (
              <p className="text-sm text-zinc-400">
                {cuponsFiltrados.length} cupom(ns) encontrado(s)
              </p>
            )}
          </div>

          {cuponsFiltrados.length === 0 ? (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 text-center text-zinc-400">
              Nenhum cupom encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-800/50">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Usuário</th>
                    <th className="px-4 py-3 text-left">Código</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Serviço</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Criado em</th>
                    <th className="px-4 py-3 text-left">Válido até</th>
                    <th className="px-4 py-3 text-left">Usado em</th>
                    <th className="px-4 py-3 text-left">Plano</th>
                    <th className="px-4 py-3 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {cuponsFiltrados.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-100">{c.user.nomeArtistico}</div>
                        <div className="text-xs text-zinc-400">{c.user.email}</div>
                        {c.user.email === "N/A" && (
                          <div className="text-xs text-amber-400 mt-0.5">Cupom órfão (sem usuário/agendamento)</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-300">{c.code}</span>
                          {c.used && (
                            <button
                              onClick={() => liberarCupom(c.code)}
                              className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition-colors"
                              title="Forçar liberação do cupom"
                            >
                              🔓 Liberar
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          c.couponType === "plano" ? "bg-green-500/20 text-green-300" :
                          c.couponType === "reembolso" ? "bg-blue-500/20 text-blue-300" :
                          "bg-gray-500/20 text-gray-300"
                        }`}>
                          {couponCategoryLabel(resolveCouponCategoryFromRow(c))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {c.serviceType ? getServiceName(c.serviceType) : 
                         c.discountType === "percent" ? `${c.discountValue}%` :
                         c.discountType === "fixed" ? `R$ ${c.discountValue.toFixed(2)}` :
                         "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          c.userPlan?.status === "cancelled" ? "bg-zinc-500/20 text-zinc-300" :
                          c.used ? "bg-red-500/20 text-red-300" :
                          c.appointmentId ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-green-500/20 text-green-300"
                        }`}>
                          {c.userPlan?.status === "cancelled" ? "Inativo" : c.used ? "Usado" : c.appointmentId ? "Pendente" : "Disponível"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        {c.usedAt ? new Date(c.usedAt).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        {c.userPlan ? (
                          <div>
                            <div>{c.userPlan.planName}</div>
                            {c.userPlan.status === "cancelled" && (
                              <span className="text-red-400 font-semibold">Plano cancelado</span>
                            )}
                            {c.userPlan.endDate && (
                              <div className="text-zinc-500">
                                Fim: {new Date(c.userPlan.endDate).toLocaleDateString("pt-BR")}
                              </div>
                            )}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {c.appointmentId != null && (
                            <button
                              type="button"
                              onClick={() => adicionarCuponsAMinhaConta(c)}
                              disabled={adicionandoAContaAppointmentId === c.appointmentId}
                              className="text-xs bg-emerald-600/80 hover:bg-emerald-600 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                              title="Vincular os cupons deste agendamento à Minha Conta do usuário que pagou"
                            >
                              {adicionandoAContaAppointmentId === c.appointmentId ? "Vinculando…" : "Adicionar à Minha Conta"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => excluirCupom(c.id, c.code)}
                            disabled={excluindoCupomId === c.id}
                            className="text-xs bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                            title="Excluir cupom do banco"
                          >
                            {excluindoCupomId === c.id ? "Excluindo…" : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
