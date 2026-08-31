"use client";

import { useEffect, useState } from "react";
import {
  useFeedback,
  LoadingBlock,
  EmptyState,
  ErrorState,
  PageHeader,
  Card,
  SearchInput,
  Select,
  Button,
  Badge,
  Callout,
} from "@/components/design-system";

interface PlanoUsuario {
  id: string;
  planId: string;
  planName: string;
  modo: string;
  amount: number;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  subscription?: {
    id: string;
    status: string;
    paymentMethod: string;
    billingDay: number;
    nextBillingDate: string;
    lastBillingDate: string | null;
  } | null;
}

interface CupomUsuario {
  id: string;
  code: string;
  couponType: string; // "plano" ou "reembolso"
  discountType: string;
  discountValue: number;
  serviceType: string | null;
  used: boolean;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Usuario {
  id: string;
  nomeCompleto: string;
  nomeArtistico: string;
  email: string;
  telefone: string;
  cpf?: string | null;
  pais: string;
  estado: string;
  cidade: string;
  bairro: string;
  dataNascimento: string;
  estilosMusicais?: string | null;
  nacionalidade?: string | null;
  foto?: string | null;
  role: string;
  blocked: boolean;
  blockedAt?: string;
  blockedReason?: string;
  createdAt: string;
  _count: {
    appointments: number;
    payments: number;
    userPlans: number;
    services: number;
  };
  lastLogin?: {
    ipAddress: string;
    userAgent: string;
    createdAt: string;
  };
  loginCount: number;
  failedLoginCount: number;
  senhaTemporaria?: string;
  planos?: PlanoUsuario[];
  cupons?: CupomUsuario[];
}

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

export default function AdminUsuariosPage() {
  const { notifySuccess, notifyError, ask } = useFeedback();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erroUsuarios, setErroUsuarios] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    if (busca.trim() === "") {
      setUsuariosFiltrados(usuarios);
    } else {
      const termo = busca.toLowerCase();
      const filtrados = usuarios.filter(
        (u) =>
          u.nomeCompleto.toLowerCase().includes(termo) ||
          u.nomeArtistico.toLowerCase().includes(termo) ||
          u.email.toLowerCase().includes(termo) ||
          u.telefone.includes(termo)
      );
      setUsuariosFiltrados(filtrados);
    }
  }, [busca, usuarios]);

  async function carregarUsuarios() {
    try {
      const res = await fetch("/api/admin/usuarios", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsuarios(data.usuarios || []);
        setUsuariosFiltrados(data.usuarios || []);
        setErroUsuarios(null);
      } else {
        setErroUsuarios(data.error || `Erro ${res.status} ao carregar usuários`);
        setUsuarios([]);
        setUsuariosFiltrados([]);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários", err);
      setErroUsuarios("Falha ao conectar. Verifique se está logado como admin.");
      setUsuarios([]);
      setUsuariosFiltrados([]);
    } finally {
      setLoading(false);
    }
  }

  async function atualizarUsuario(id: string, updates: { role?: string; blocked?: boolean; blockedReason?: string }) {
    try {
      const res = await fetch(`/api/admin/usuarios?id=${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await carregarUsuarios();
      }
    } catch (err) {
      console.error("Erro ao atualizar usuário", err);
    }
  }

  async function resetarSenha(userId: string, email: string) {
    if (
      !(await ask(
        `Tem certeza que deseja resetar a senha de ${email}?`,
        "Uma nova senha temporária será gerada."
      ))
    ) {
      return;
    }

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reset-password" }),
      });

      if (res.ok) {
        const data = await res.json();
        const senhaTemporaria = data.senhaTemporaria;
        
        // Atualizar o estado local para mostrar a senha
        setUsuarios(prev => prev.map(u => 
          u.id === userId ? { ...u, senhaTemporaria } : u
        ));
        setUsuariosFiltrados(prev => prev.map(u => 
          u.id === userId ? { ...u, senhaTemporaria } : u
        ));

        notifySuccess(
          "Senha resetada com sucesso!",
          `Nova senha temporária: ${senhaTemporaria} — copie e envie para o usuário.`
        );
      } else {
        notifyError("Erro ao resetar senha.");
      }
    } catch (err) {
      console.error("Erro ao resetar senha", err);
      notifyError("Erro ao resetar senha.");
    }
  }

  if (loading) {
    return <LoadingBlock label="Carregando usuários..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        subtitle="Gerenciar clientes, permissões e histórico de logins"
        icon="user"
      />

      {/* Input de Busca */}
      <Card>
        <SearchInput
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome completo, nome artístico, email ou telefone..."
        />
        {busca && (
          <p className="mt-2 text-sm text-zinc-400">
            {usuariosFiltrados.length} usuário(s) encontrado(s)
          </p>
        )}
      </Card>

      {erroUsuarios ? (
        <ErrorState
          title="Erro ao carregar usuários"
          description={erroUsuarios}
          onRetry={() => { setErroUsuarios(null); carregarUsuarios(); }}
        />
      ) : usuariosFiltrados.length === 0 ? (
        <EmptyState title="Nenhum usuário encontrado." />
      ) : (
        <div className="space-y-4">
          {usuariosFiltrados.map((u) => {
            const idade = calcularIdade(u.dataNascimento);
            const menorIdade = idade < 18;
            return (
              <Card
                key={u.id}
                className={`!p-6 ${u.blocked ? "!border-red-700/50 !bg-red-950/10" : ""}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Informações Básicas */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      {u.nomeArtistico}
                      {menorIdade && <Badge intent="warning">Menor de idade</Badge>}
                    </h3>
                    <div className="text-sm text-zinc-400 space-y-1">
                      <div><strong className="text-zinc-300">Nome Completo:</strong> {u.nomeCompleto}</div>
                      <div><strong className="text-zinc-300">Email:</strong> {u.email}</div>
                      <div><strong className="text-zinc-300">Telefone:</strong> {u.telefone}</div>
                      <div><strong className="text-zinc-300">CPF:</strong> {u.cpf ? u.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : <span className="text-yellow-400">Não cadastrado</span>}</div>
                      <div><strong className="text-zinc-300">Idade:</strong> {idade} anos</div>
                      <div><strong className="text-zinc-300">Data de Nascimento:</strong> {new Date(u.dataNascimento).toLocaleDateString("pt-BR")}</div>
                      {u.senhaTemporaria && (
                        <Callout intent="warning" title="Senha Temporária:" className="mt-2">
                          <div className="font-mono text-sm text-amber-200">{u.senhaTemporaria}</div>
                          <div className="mt-1">Esta senha foi gerada agora. Envie para o usuário.</div>
                        </Callout>
                      )}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-zinc-300">Endereço</h4>
                    <div className="text-sm text-zinc-400 space-y-1">
                      <div>{u.bairro}, {u.cidade}</div>
                      <div>{u.estado}, {u.pais}</div>
                      {u.nacionalidade && (
                        <div><strong className="text-zinc-300">Nacionalidade:</strong> {u.nacionalidade}</div>
                      )}
                      {u.estilosMusicais && (
                        <div><strong className="text-zinc-300">Estilos:</strong> {u.estilosMusicais}</div>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas e Ações */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge intent={u.role === "ADMIN" ? "error" : "info"}>{u.role}</Badge>
                      {u.blocked ? (
                        <Badge intent="error" dot>Bloqueado</Badge>
                      ) : (
                        <Badge intent="success" dot>Ativo</Badge>
                      )}
                    </div>
                    <div className="text-sm text-zinc-400 space-y-1">
                      <div>📅 Agendamentos: {u._count.appointments}</div>
                      <div>💰 Pagamentos: {u._count.payments}</div>
                      <div>⭐ Planos: {u._count.userPlans}</div>
                      <div>🎵 Serviços: {u._count.services}</div>
                      <div>✓ Logins: {u.loginCount} | ✗ Falhas: {u.failedLoginCount}</div>
                    </div>
                    {u.lastLogin && (
                      <div className="text-xs text-zinc-500">
                        Último login: {new Date(u.lastLogin.createdAt).toLocaleString("pt-BR")}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex gap-2">
                        <Select
                          value={u.role}
                          onChange={(e) => atualizarUsuario(u.id, { role: e.target.value })}
                          className="!px-2 !py-1 text-xs"
                          options={[
                            { value: "USER", label: "USER" },
                            { value: "ADMIN", label: "ADMIN" },
                          ]}
                        />
                        <Button
                          variant={u.blocked ? "success" : "danger"}
                          size="xs"
                          onClick={() => atualizarUsuario(u.id, { blocked: !u.blocked, blockedReason: !u.blocked ? "Bloqueado pelo admin" : undefined })}
                        >
                          {u.blocked ? "Liberar" : "Bloquear"}
                        </Button>
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        icon="lock"
                        fullWidth
                        onClick={() => resetarSenha(u.id, u.email)}
                      >
                        Resetar Senha
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
