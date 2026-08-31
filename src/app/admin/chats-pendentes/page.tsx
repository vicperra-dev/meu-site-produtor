"use client";

import { useEffect, useState } from "react";
import {
  useFeedback,
  LoadingBlock,
  EmptyState,
  PageHeader,
  Card,
  SearchInput,
  Input,
  Button,
} from "@/components/design-system";

interface ChatMessage {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  status: string;
  humanRequested: boolean;
  adminAccepted: boolean;
  user: {
    nomeArtistico: string;
    email: string;
  };
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminChatsPendentesPage() {
  const { notifySuccess, notifyError, ask } = useFeedback();
  const [sessoes, setSessoes] = useState<ChatSession[]>([]);
  const [sessoesFiltradas, setSessoesFiltradas] = useState<ChatSession[]>([]);
  const [sessaoAtual, setSessaoAtual] = useState<ChatSession | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarSessoes();
    const interval = setInterval(carregarSessoes, 60000); // Atualizar a cada 1 minuto
    return () => clearInterval(interval);
  }, []);

  // Atualizar mensagens quando uma sessão está aberta
  useEffect(() => {
    if (!sessaoAtual?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/chat?sessionId=${sessaoAtual.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            setSessaoAtual(data.session);
          }
        }
      } catch (err) {
        console.error("Erro ao atualizar sessão:", err);
      }
    }, 60000); // Atualizar mensagens a cada 1 minuto quando em chat ativo

    return () => clearInterval(interval);
  }, [sessaoAtual?.id]);

  useEffect(() => {
    if (busca.trim() === "") {
      setSessoesFiltradas(sessoes);
    } else {
      const termo = busca.toLowerCase();
      const filtradas = sessoes.filter(
        (s) =>
          s.user.nomeArtistico.toLowerCase().includes(termo) ||
          s.user.email.toLowerCase().includes(termo)
      );
      setSessoesFiltradas(filtradas);
    }
  }, [busca, sessoes]);

  async function carregarSessoes() {
    try {
      const res = await fetch("/api/admin/chat");
      if (res.ok) {
        const data = await res.json();
        // Carregar todas as sessões (pendentes, aceitas e recusadas)
        const todas = (data.sessions || []).filter(
          (s: ChatSession) =>
            s.humanRequested || 
            (s.status === "rejected" || s.status === "recusado") ||
            s.adminAccepted
        );
        setSessoes(todas);
        setSessoesFiltradas(todas);
      }
    } catch (err) {
      console.error("Erro ao carregar sessões", err);
    } finally {
      setLoading(false);
    }
  }

  async function carregarSessao(sessionId: string) {
    try {
      const res = await fetch(`/api/admin/chat?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessaoAtual(data.session);
      }
    } catch (err) {
      console.error("Erro ao carregar sessão", err);
    }
  }

  async function aceitarSolicitacao(sessionId: string) {
    try {
      const res = await fetch("/api/admin/chat?action=accept", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatSessionId: sessionId }),
      });

      if (res.ok) {
        await carregarSessoes();
        if (sessaoAtual?.id === sessionId) {
          const updated = await fetch(`/api/admin/chat?sessionId=${sessionId}`);
          if (updated.ok) {
            const data = await updated.json();
            setSessaoAtual(data.session);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao aceitar solicitação", err);
      notifyError("Erro ao aceitar solicitação. Tente novamente.");
    }
  }

  async function recusarSolicitacao(sessionId: string) {
    try {
      const res = await fetch("/api/admin/chat?action=reject", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId: sessionId,
        }),
      });

      if (res.ok) {
        await carregarSessoes();
        if (sessaoAtual?.id === sessionId) {
          const updated = await fetch(`/api/admin/chat?sessionId=${sessionId}`);
          if (updated.ok) {
            const data = await updated.json();
            setSessaoAtual(data.session);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao recusar solicitação", err);
      notifyError("Erro ao recusar solicitação. Tente novamente.");
    }
  }

  async function terminarAtendimento(sessionId: string) {
    if (
      !(await ask(
        "Tem certeza que deseja terminar o atendimento humano?",
        "A IA voltará a funcionar para este chat."
      ))
    ) {
      return;
    }

    try {
      const res = await fetch("/api/admin/chat?action=end", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId: sessionId,
        }),
      });

      if (res.ok) {
        // Enviar mensagem de agradecimento
        await fetch("/api/admin/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatSessionId: sessionId,
            content: "Obrigado por procurar o atendimento humano! Qualquer dúvida é só nos procurar novamente. A IA voltou a funcionar para te ajudar.",
          }),
        });

        await carregarSessoes();
        if (sessaoAtual?.id === sessionId) {
          const updated = await fetch(`/api/admin/chat?sessionId=${sessionId}`);
          if (updated.ok) {
            const data = await updated.json();
            setSessaoAtual(data.session);
          }
        }
        notifySuccess("Atendimento humano finalizado com sucesso!");
      } else {
        const data = await res.json();
        notifyError(data.error || "Erro ao terminar atendimento");
      }
    } catch (err) {
      console.error("Erro ao terminar atendimento", err);
      notifyError("Erro ao terminar atendimento. Tente novamente.");
    }
  }

  async function enviarMensagem() {
    if (!sessaoAtual || !novaMensagem.trim()) return;

    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId: sessaoAtual.id,
          content: novaMensagem,
        }),
      });

      if (res.ok) {
        setNovaMensagem("");
        await carregarSessoes();
        // Recarregar sessão atual
        await carregarSessao(sessaoAtual.id);
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem", err);
      notifyError("Erro ao enviar mensagem. Tente novamente.");
    }
  }

  const [abaAtiva, setAbaAtiva] = useState<"pendentes" | "aceitos" | "recusados">("pendentes");

  const solicitacoesPendentes = sessoesFiltradas.filter(
    (s) => s.humanRequested && !s.adminAccepted && s.status !== "rejected" && s.status !== "recusado"
  );
  const solicitacoesAceitas = sessoesFiltradas.filter(
    (s) => s.adminAccepted && s.status === "open"
  );
  const solicitacoesRecusadas = sessoesFiltradas.filter(
    (s) => s.status === "rejected" || s.status === "recusado"
  );

  // Filtrar sessões baseado na aba ativa
  const sessoesParaMostrar = 
    abaAtiva === "pendentes" ? solicitacoesPendentes :
    abaAtiva === "aceitos" ? solicitacoesAceitas :
    solicitacoesRecusadas;

  if (loading) {
    return <LoadingBlock label="Carregando chats pendentes..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chats Pendentes"
        subtitle="Gerencie solicitações de atendimento humano e chats recusados"
        icon="chat"
      />

      {/* Abas */}
      <div className="flex gap-2 border-b border-zinc-700">
        <button
          onClick={() => setAbaAtiva("pendentes")}
          className={`px-4 py-2 font-semibold transition ${
            abaAtiva === "pendentes"
              ? "border-b-2 border-orange-500 text-orange-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Pendentes ({solicitacoesPendentes.length})
        </button>
        <button
          onClick={() => setAbaAtiva("aceitos")}
          className={`px-4 py-2 font-semibold transition ${
            abaAtiva === "aceitos"
              ? "border-b-2 border-green-500 text-green-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Aceitos ({solicitacoesAceitas.length})
        </button>
        <button
          onClick={() => setAbaAtiva("recusados")}
          className={`px-4 py-2 font-semibold transition ${
            abaAtiva === "recusados"
              ? "border-b-2 border-red-500 text-red-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Recusados ({solicitacoesRecusadas.length})
        </button>
      </div>

      {/* Input de Busca */}
      <Card>
        <SearchInput
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou email do usuário..."
        />
        {busca && (
          <p className="mt-2 text-sm text-zinc-400">
            {sessoesFiltradas.length} chat(s) encontrado(s)
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Chats */}
        <div className="space-y-4">
          {/* Lista baseada na aba ativa */}
          <div>
            <h2 className={`text-lg font-semibold mb-3 ${
              abaAtiva === "pendentes" ? "text-orange-400" :
              abaAtiva === "aceitos" ? "text-green-400" :
              "text-red-400"
            }`}>
              {abaAtiva === "pendentes" && `Solicitações Pendentes (${solicitacoesPendentes.length})`}
              {abaAtiva === "aceitos" && `Chats Aceitos (${solicitacoesAceitas.length})`}
              {abaAtiva === "recusados" && `Solicitações Recusadas (${solicitacoesRecusadas.length})`}
            </h2>
            {sessoesParaMostrar.length === 0 ? (
              <EmptyState
                icon="chat"
                title={
                  abaAtiva === "pendentes"
                    ? "Nenhuma solicitação pendente"
                    : abaAtiva === "aceitos"
                    ? "Nenhum chat aceito"
                    : "Nenhuma solicitação recusada"
                }
              />
            ) : (
              <div className="space-y-2">
                {sessoesParaMostrar.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border p-4 cursor-pointer transition ${
                      sessaoAtual?.id === s.id
                        ? "border-red-500 bg-red-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-red-500/50"
                    }`}
                    onClick={() => carregarSessao(s.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-zinc-100">{s.user.nomeArtistico}</div>
                        <div className="text-xs text-zinc-400">{s.user.email}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-orange-500 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solicitações Recusadas */}
          <div>
            <h2 className="text-lg font-semibold text-red-400 mb-3">
              Solicitações Recusadas ({solicitacoesRecusadas.length})
            </h2>
            {solicitacoesRecusadas.length === 0 ? (
              <EmptyState icon="chat" title="Nenhuma solicitação recusada" />
            ) : (
              <div className="space-y-2">
                {solicitacoesRecusadas.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border p-4 cursor-pointer transition ${
                      sessaoAtual?.id === s.id
                        ? "border-red-500 bg-red-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-red-500/50"
                    }`}
                    onClick={() => carregarSessao(s.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-zinc-100">{s.user.nomeArtistico}</div>
                        <div className="text-xs text-zinc-400">{s.user.email}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-red-500 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Visualização de Chat */}
        <Card className="!p-6">
          {sessaoAtual ? (
            <div className="space-y-4 h-[70vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-700">
                <div>
                  <h3 className="font-semibold text-zinc-100">{sessaoAtual.user.nomeArtistico}</h3>
                  <p className="text-xs text-zinc-400">{sessaoAtual.user.email}</p>
                </div>
                <div className="flex gap-2">
                  {!sessaoAtual.adminAccepted && sessaoAtual.humanRequested && (
                    <>
                      <Button variant="success" size="xs" onClick={() => aceitarSolicitacao(sessaoAtual.id)}>
                        Aceitar
                      </Button>
                      <Button variant="danger" size="xs" onClick={() => recusarSolicitacao(sessaoAtual.id)}>
                        Recusar
                      </Button>
                    </>
                  )}
                  {sessaoAtual.adminAccepted && (
                    <Button variant="secondary" size="xs" onClick={() => terminarAtendimento(sessaoAtual.id)}>
                      Terminar Atendimento
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {sessaoAtual.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      msg.senderType === "user"
                        ? "ml-auto bg-red-600 text-white"
                        : msg.senderType === "admin"
                        ? "bg-emerald-700 text-white"
                        : "bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    {msg.content}
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {sessaoAtual.adminAccepted && (
                <div className="flex gap-2 pt-4 border-t border-zinc-700">
                  <Input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        enviarMensagem();
                      }
                    }}
                    placeholder="Digite sua resposta..."
                    className="flex-1"
                  />
                  <Button variant="primary" size="md" onClick={enviarMensagem}>
                    Enviar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[70vh] items-center justify-center text-zinc-400">
              Selecione um chat para visualizar
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
