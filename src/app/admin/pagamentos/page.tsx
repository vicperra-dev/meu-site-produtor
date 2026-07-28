"use client";

import { useEffect, useState } from "react";
import { LoadingBlock, useFeedback } from "@/components/design-system";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import { couponOriginLabel, type CouponOrigin } from "@/app/lib/coupon-origin";
import {
  paymentRefundStatusClass,
  type PaymentRefundStatus,
} from "@/app/lib/payment-refund-status";

interface UserInfo {
  id: string;
  nomeArtistico: string;
  nomeSocial?: string | null;
  email: string;
  telefone?: string;
  cpf?: string | null;
  pais?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  cep?: string | null;
  dataNascimento?: string | Date | null;
  sexo?: string | null;
  genero?: string | null;
  generoOutro?: string | null;
  nacionalidade?: string | null;
  createdAt?: string | Date;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  paymentMethod?: string | null;
  planId?: string | null;
  serviceId?: string | null;
  mercadopagoId?: string | null;
  asaasId?: string | null;
  user: UserInfo;
  createdAt: string;
  updatedAt: string;
  modoTransacao?: "teste" | "real";
  statusReembolso?: PaymentRefundStatus;
  label?: string;
  refundAmount?: number | null;
  refundProcessedAt?: string | null;
  refundUserConfirmedAt?: string | null;
  refundAsaasStatus?: string | null;
  pagamentoComCupom?: boolean;
  cupomUtilizado?: {
    id: string;
    code: string;
    origem: CouponOrigin;
  } | null;
}

export default function AdminPagamentosPage() {
  const { notifyError, askDelete } = useFeedback();
  const [pagamentos, setPagamentos] = useState<Payment[]>([]);
  const [pagamentosFiltrados, setPagamentosFiltrados] = useState<Payment[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [pagamentoExpandido, setPagamentoExpandido] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  useEffect(() => {
    carregarPagamentos();
  }, []);

  useDomainRefresh("pagamentos", () => carregarPagamentos());

  useEffect(() => {
    if (busca.trim() === "") {
      setPagamentosFiltrados(pagamentos);
      return;
    }
    const termo = busca.toLowerCase();
    setPagamentosFiltrados(
      pagamentos.filter(
        (p) =>
          p.user.nomeArtistico.toLowerCase().includes(termo) ||
          p.user.email.toLowerCase().includes(termo) ||
          (p.user.cpf && p.user.cpf.toLowerCase().includes(termo)) ||
          (p.user.telefone && p.user.telefone.toLowerCase().includes(termo)) ||
          (p.mercadopagoId && p.mercadopagoId.toLowerCase().includes(termo)) ||
          (p.asaasId && p.asaasId.toLowerCase().includes(termo)) ||
          p.id.toLowerCase().includes(termo)
      )
    );
  }, [busca, pagamentos]);

  async function carregarPagamentos() {
    try {
      const res = await fetch("/api/admin/pagamentos");
      if (res.ok) {
        const data = await res.json();
        setPagamentos(data.pagamentos || []);
        setPagamentosFiltrados(data.pagamentos || []);
      }
    } catch (err) {
      console.error("Erro ao carregar pagamentos", err);
    } finally {
      setLoading(false);
    }
  }

  const calcularIdade = (dataNascimento: string | Date | null | undefined): number | null => {
    if (!dataNascimento) return null;
    const data = typeof dataNascimento === "string" ? new Date(dataNascimento) : dataNascimento;
    if (isNaN(data.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mes = hoje.getMonth() - data.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) {
      idade--;
    }
    return idade;
  };

  const formatarCPF = (cpf: string | null | undefined): string => {
    if (!cpf) return "-";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatarCEP = (cep: string | null | undefined): string => {
    if (!cep) return "-";
    return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const formatarTelefone = (telefone: string | null | undefined): string => {
    if (!telefone) return "-";
    return telefone;
  };

  async function excluirPagamento(id: string) {
    if (
      !(await askDelete(
        "Excluir este pagamento do banco de dados?",
        "Pagamentos reais ou vinculados serão bloqueados pela API (422). Esta ação não pode ser desfeita."
      ))
    ) {
      return;
    }
    try {
      setExcluindoId(id);
      const res = await fetch(`/api/admin/pagamentos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        await carregarPagamentos();
      } else {
        notifyError(data.error || "Erro ao excluir pagamento.");
      }
    } catch (err) {
      console.error("Erro ao excluir pagamento", err);
      notifyError("Erro ao excluir pagamento.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loading) {
    return <LoadingBlock label="Carregando pagamentos..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Pagamentos</h1>
        <p className="text-zinc-400">Visualizar transações e acionar ações administrativas via API</p>
      </div>

      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, email, CPF, telefone, ID do pagamento ou Asaas..."
          className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
        />
        {busca && (
          <p className="mt-2 text-sm text-zinc-400">
            {pagamentosFiltrados.length} pagamento(s) encontrado(s)
          </p>
        )}
      </div>

      {pagamentosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 text-center text-zinc-400">
          Nenhum pagamento encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {pagamentosFiltrados.map((p) => {
            const idade = calcularIdade(p.user.dataNascimento);
            const isMenor = idade !== null && idade < 18;
            const isExpandido = pagamentoExpandido === p.id;
            const modoTransacao = p.modoTransacao ?? "real";
            const statusReembolso = p.statusReembolso ?? "nao_reembolsado";
            const labelReembolso = p.label ?? "Sem reembolso";

            return (
              <div
                key={p.id}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setPagamentoExpandido(isExpandido ? null : p.id)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-zinc-100">{p.user.nomeArtistico}</h3>
                        {isMenor && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-300">
                            Menor de idade
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">{p.user.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            modoTransacao === "teste"
                              ? "bg-violet-500/20 text-violet-200"
                              : "bg-sky-500/20 text-sky-200"
                          }`}
                        >
                          {modoTransacao === "teste" ? "Teste" : "Real"}
                        </span>
                        {p.pagamentoComCupom && p.cupomUtilizado ? (
                          <span className="text-xs text-amber-300">
                            Cupom: <span className="font-mono">{p.cupomUtilizado.code}</span>
                            <span className="text-zinc-500 ml-1">
                              ({couponOriginLabel(p.cupomUtilizado.origem)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Pagamento direto (sem cupom)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-400">
                          {p.currency} {p.amount.toFixed(2).replace(".", ",")}
                        </p>
                        <p className="text-xs text-zinc-400 capitalize">{p.type}</p>
                      </div>

                      <div className="text-right space-y-1">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            p.status === "approved"
                              ? "bg-green-500/20 text-green-300"
                              : p.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : p.status === "rejected"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-gray-500/20 text-gray-300"
                          }`}
                        >
                          {p.status === "approved"
                            ? "Aprovado"
                            : p.status === "pending"
                              ? "Pendente"
                              : p.status === "rejected"
                                ? "Rejeitado"
                                : p.status}
                        </span>
                        {statusReembolso !== "nao_reembolsado" && (
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${paymentRefundStatusClass(statusReembolso)}`}
                          >
                            {labelReembolso}
                          </span>
                        )}
                        <p className="text-xs text-zinc-400">
                          {new Date(p.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {p.status === "pending" || p.status === "rejected" || p.status === "refunded" || p.status === "reembolsado" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              excluirPagamento(p.id);
                            }}
                            disabled={excluindoId === p.id}
                            className="text-xs bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {excluindoId === p.id ? "Excluindo..." : "Excluir"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          {isExpandido ? "▼" : "▶"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpandido && (
                  <div className="border-t border-zinc-700 p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-red-400 mb-2">Informações do Pagamento</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-zinc-400">ID do Pagamento:</span>
                          <p className="text-zinc-200 font-mono text-xs">{p.id}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">ID Asaas:</span>
                          <p className="text-zinc-200 font-mono text-xs">{p.asaasId || "-"}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">ID legado (MP):</span>
                          <p className="text-zinc-200 font-mono text-xs">{p.mercadopagoId || "-"}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Valor:</span>
                          <p className="text-zinc-200 font-semibold">
                            {p.currency} {p.amount.toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Status:</span>
                          <p className="text-zinc-200 capitalize">{p.status}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Tipo:</span>
                          <p className="text-zinc-200 capitalize">{p.type}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Modo:</span>
                          <p className="text-zinc-200">
                            {modoTransacao === "teste" ? "Teste (simulado)" : "Real (Asaas)"}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Reembolso:</span>
                          <p className="text-zinc-200">
                            {statusReembolso === "nao_reembolsado" ? (
                              "Não reembolsado"
                            ) : (
                              <>
                                {labelReembolso}
                                {p.refundAmount != null && p.refundAmount > 0 && (
                                  <span className="text-zinc-500 ml-1">
                                    (R$ {p.refundAmount.toFixed(2).replace(".", ",")})
                                  </span>
                                )}
                                {p.refundAsaasStatus && (
                                  <span className="text-zinc-500 ml-1">
                                    · Asaas: {p.refundAsaasStatus}
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Cupom utilizado:</span>
                          <p className="text-zinc-200">
                            {p.cupomUtilizado ? (
                              <>
                                <span className="font-mono">{p.cupomUtilizado.code}</span>
                                <span className="text-zinc-500 ml-1">
                                  ({couponOriginLabel(p.cupomUtilizado.origem)})
                                </span>
                              </>
                            ) : (
                              "Não"
                            )}
                          </p>
                        </div>
                        {p.paymentMethod && (
                          <div>
                            <span className="text-zinc-400">Forma de Pagamento:</span>
                            <p className="text-zinc-200 capitalize">
                              {p.paymentMethod === "cartao_credito"
                                ? "Cartão de Crédito"
                                : p.paymentMethod === "cartao_debito"
                                  ? "Cartão de Débito"
                                  : p.paymentMethod === "pix"
                                    ? "Pix"
                                    : p.paymentMethod === "boleto"
                                      ? "Boleto Bancário"
                                      : p.paymentMethod}
                            </p>
                          </div>
                        )}
                        {p.planId && (
                          <div>
                            <span className="text-zinc-400">ID do Plano:</span>
                            <p className="text-zinc-200">{p.planId}</p>
                          </div>
                        )}
                        {p.serviceId && (
                          <div>
                            <span className="text-zinc-400">ID do Serviço:</span>
                            <p className="text-zinc-200">{p.serviceId}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-zinc-400">Criado em:</span>
                          <p className="text-zinc-200">
                            {new Date(p.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Atualizado em:</span>
                          <p className="text-zinc-200">
                            {new Date(p.updatedAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-red-400 mb-2">Informações do Cliente</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-zinc-400">Nome Artístico:</span>
                          <p className="text-zinc-200">{p.user.nomeArtistico}</p>
                        </div>
                        {p.user.nomeSocial && (
                          <div>
                            <span className="text-zinc-400">Nome Social:</span>
                            <p className="text-zinc-200">{p.user.nomeSocial}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-zinc-400">Email:</span>
                          <p className="text-zinc-200">{p.user.email}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Telefone:</span>
                          <p className="text-zinc-200">{formatarTelefone(p.user.telefone)}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">CPF:</span>
                          <p className="text-zinc-200">{formatarCPF(p.user.cpf)}</p>
                        </div>
                        {p.user.dataNascimento && (
                          <>
                            <div>
                              <span className="text-zinc-400">Data de Nascimento:</span>
                              <p className="text-zinc-200">
                                {new Date(p.user.dataNascimento).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            {idade !== null && (
                              <div>
                                <span className="text-zinc-400">Idade:</span>
                                <p className="text-zinc-200">{idade} anos</p>
                              </div>
                            )}
                          </>
                        )}
                        {p.user.sexo && (
                          <div>
                            <span className="text-zinc-400">Sexo:</span>
                            <p className="text-zinc-200 capitalize">
                              {p.user.sexo.replace("_", " ")}
                            </p>
                          </div>
                        )}
                        {p.user.genero && (
                          <div>
                            <span className="text-zinc-400">Gênero:</span>
                            <p className="text-zinc-200 capitalize">
                              {p.user.genero === "outro" && p.user.generoOutro
                                ? p.user.generoOutro
                                : p.user.genero.replace("_", " ")}
                            </p>
                          </div>
                        )}
                        {p.user.pais && (
                          <div>
                            <span className="text-zinc-400">País:</span>
                            <p className="text-zinc-200">{p.user.pais}</p>
                          </div>
                        )}
                        {p.user.estado && (
                          <div>
                            <span className="text-zinc-400">Estado:</span>
                            <p className="text-zinc-200">{p.user.estado}</p>
                          </div>
                        )}
                        {p.user.cidade && (
                          <div>
                            <span className="text-zinc-400">Cidade:</span>
                            <p className="text-zinc-200">{p.user.cidade}</p>
                          </div>
                        )}
                        {p.user.bairro && (
                          <div>
                            <span className="text-zinc-400">Bairro:</span>
                            <p className="text-zinc-200">{p.user.bairro}</p>
                          </div>
                        )}
                        {p.user.cep && (
                          <div>
                            <span className="text-zinc-400">CEP:</span>
                            <p className="text-zinc-200">{formatarCEP(p.user.cep)}</p>
                          </div>
                        )}
                        {p.user.nacionalidade && (
                          <div>
                            <span className="text-zinc-400">Nacionalidade:</span>
                            <p className="text-zinc-200">{p.user.nacionalidade}</p>
                          </div>
                        )}
                        {p.user.createdAt && (
                          <div>
                            <span className="text-zinc-400">Conta criada em:</span>
                            <p className="text-zinc-200">
                              {new Date(p.user.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
