"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import QuickActions from "./components/QuickActions";
import {
  useFeedback,
  PageHeader,
  Card,
  Button,
  Input,
  EmptyState,
  LoadingBlock,
} from "@/components/design-system";

type ChatMessage = {
  id: string;
  role: "user" | "ai" | "human" | "system";
  content: string;
};

type ChatMode = "ai" | "waiting_human" | "human";

type ChatSession = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastReadAt?: string | null;
  unreadCount?: number;
  _count: {
    messages: number;
  };
};

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notifyError } = useFeedback();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("ai");
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // 🔒 Verificar autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Carregar conversas ao montar
  useEffect(() => {
    if (user && !authLoading) {
      carregarConversas();
    }
  }, [user, authLoading]);

  // Carregar conversas
  async function carregarConversas() {
    try {
      setLoadingSessions(true);
      const res = await fetch("/api/chat/sessions", {
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Erro ao carregar conversas:", res.status, errorData);
        // Não lançar erro, apenas logar e continuar com array vazio
        setSessions([]);
        return;
      }

      const data = await res.json();
      setSessions(data.sessions || []);

      // Se não houver conversas ou não houver conversa selecionada, mostrar mensagem inicial
      if ((data.sessions || []).length === 0 && !currentSessionId) {
        if (messages.length === 0) {
          iniciarNovaConversa();
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar conversas:", error);
      // Não quebrar a aplicação, apenas logar o erro
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  // Iniciar nova conversa
  function iniciarNovaConversa() {
    setCurrentSessionId(null);
    setMessages([
      {
        id: "welcome",
        role: "ai",
        content:
          "Olá! 👋 Sou o suporte da THouse Rec. Posso te ajudar com preços, planos, agendamentos ou funcionamento do estúdio.",
      },
    ]);
    setChatMode("ai");
  }

  // Mostrar mensagem inicial se não houver mensagens e não houver conversa selecionada
  useEffect(() => {
    if (messages.length === 0 && !loading && !loadingSessions && user && !currentSessionId) {
      iniciarNovaConversa();
    }
  }, [user, loading, loadingSessions, currentSessionId]);

  // Carregar mensagens de uma conversa
  async function carregarConversa(sessionId: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Erro ao carregar mensagens");
      }

      const data = await res.json();
      setMessages(data.messages || []);
      setCurrentSessionId(sessionId);

      // Verificar status da sessão
      if (data.session?.adminAccepted) {
        setChatMode("human");
      } else if (data.session?.status === "pending_human" || data.session?.humanRequested) {
        setChatMode("waiting_human");
      } else {
        setChatMode("ai");
      }

      // Atualizar lista de sessões para remover badge de não lido
      // Aguardar um pouco para garantir que lastReadAt foi atualizado
      setTimeout(async () => {
        await carregarConversas();
        // Forçar atualização do hook também
        window.dispatchEvent(new Event('chat-updated'));
      }, 1000);
    } catch (error) {
      console.error("Erro ao carregar conversa:", error);
      notifyError("Erro ao carregar conversa. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Atualizar mensagens quando admin responde (polling)
  useEffect(() => {
    if (!currentSessionId || chatMode === "ai") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/messages?sessionId=${currentSessionId}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          const newMessages = data.messages || [];
          
          // Atualizar mensagens se houver novas
          if (newMessages.length !== messages.length) {
            setMessages(newMessages);
            // Recarregar lista de conversas para atualizar badge de não lidas
            await carregarConversas();
          }

          // Verificar se admin aceitou
          if (data.session?.adminAccepted && chatMode === "waiting_human") {
            setChatMode("human");
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar mensagens:", error);
      }
    }, 60000); // Atualizar a cada 1 minuto

    return () => clearInterval(interval);
  }, [currentSessionId, chatMode, messages.length]);

  // Atualizar lista de conversas periodicamente quando não há sessão aberta
  useEffect(() => {
    if (currentSessionId) return; // Não atualizar se há sessão aberta (já atualiza no polling acima)

    const interval = setInterval(() => {
      carregarConversas();
    }, 60000); // Atualizar a cada 1 minuto quando não há sessão aberta

    return () => clearInterval(interval);
  }, [currentSessionId]);

  // Deletar conversa
  async function deletarConversa(sessionId: string) {
    try {
      const res = await fetch(`/api/chat/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Erro ao deletar conversa");
      }

      // Remover da lista
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // Se era a conversa atual, iniciar nova
      if (currentSessionId === sessionId) {
        iniciarNovaConversa();
      }

      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Erro ao deletar conversa:", error);
      notifyError("Erro ao deletar conversa. Tente novamente.");
    }
  }

  // Deletar múltiplas conversas
  async function deletarConversasSelecionadas() {
    if (selectedSessions.size === 0) return;

    try {
      // Deletar uma por uma
      const promises = Array.from(selectedSessions).map((sessionId) =>
        fetch(`/api/chat/sessions?sessionId=${sessionId}`, {
          method: "DELETE",
          credentials: "include",
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        throw new Error("Algumas conversas não puderam ser deletadas");
      }

      // Remover da lista
      setSessions((prev) => prev.filter((s) => !selectedSessions.has(s.id)));

      // Se a conversa atual foi deletada, iniciar nova
      if (currentSessionId && selectedSessions.has(currentSessionId)) {
        iniciarNovaConversa();
      }

      // Limpar seleção
      setSelectedSessions(new Set());
      setSelectionMode(false);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error("Erro ao deletar conversas:", error);
      notifyError("Erro ao deletar conversas. Tente novamente.");
    }
  }

  // Alternar seleção de uma conversa
  function toggleSessionSelection(sessionId: string) {
    setSelectedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }

  // Selecionar todas as conversas
  function selecionarTodas() {
    setSelectedSessions(new Set(sessions.map((s) => s.id)));
  }

  // Desselecionar todas
  function desselecionarTodas() {
    setSelectedSessions(new Set());
  }

  // ===============================
  // ENVIO ÚNICO (INPUT + BOTÕES)
  // ===============================
  async function enviarMensagem(texto?: string) {
    const mensagem = (texto ?? input).trim();
    if (!mensagem || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: mensagem,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    // Se estiver em modo humano, enviar mensagem diretamente para o admin
    if (chatMode === "human" && currentSessionId) {
      try {
        setLoading(true);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message: mensagem,
            sessionId: currentSessionId,
          }),
        });

        if (res.ok) {
          // Recarregar mensagens para garantir sincronização
          await carregarConversa(currentSessionId);
        } else {
          throw new Error("Erro ao enviar mensagem");
        }
      } catch (error) {
        console.error("Erro ao enviar mensagem para admin:", error);
        notifyError("Erro ao enviar mensagem. Tente novamente.");
        // Remover mensagem do estado se falhou
        setMessages(messages);
      } finally {
        setLoading(false);
      }
    } else if (chatMode === "ai") {
      responderIA(updatedMessages);
    } else {
      // Modo waiting_human - apenas salvar mensagem
      try {
        setLoading(true);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message: mensagem,
            sessionId: currentSessionId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.sessionId && !currentSessionId) {
            setCurrentSessionId(data.sessionId);
          }
          // Recarregar conversas para atualizar lista
          await carregarConversas();
        }
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        notifyError("Erro ao enviar mensagem. Tente novamente.");
        setMessages(messages);
      } finally {
        setLoading(false);
      }
    }
  }

  // ===============================
  // RESPOSTA DA IA
  // ===============================
  async function responderIA(updatedMessages: ChatMessage[]) {
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content || "",
          })),
          sessionId: currentSessionId || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Erro na API do chat:", res.status, errorData);

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        throw new Error(errorData.error || `Erro ${res.status}`);
      }

      const data = await res.json();

      if (!data.reply) {
        console.error("Resposta vazia da API:", data);
        throw new Error("Resposta vazia");
      }

      // Se recebeu um sessionId, atualizar
      if (data.sessionId) {
        if (!currentSessionId) {
          setCurrentSessionId(data.sessionId);
        }
        // Recarregar conversas para atualizar a lista e mostrar a nova conversa
        await carregarConversas();
      }

      const respostaIA: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: data.reply,
      };

      setMessages((prev) => [...prev, respostaIA]);

      if (
        data.reply ===
        "Vou chamar um atendente humano para te ajudar melhor com isso."
      ) {
        setChatMode("waiting_human");
      }

      // Recarregar conversas para atualizar contagem (se ainda não foi recarregado)
      if (!data.sessionId) {
        await carregarConversas();
      }
    } catch (error: any) {
      console.error("Erro ao responder IA:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: "Tivemos um problema técnico. Pode tentar novamente?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Formatar data para exibição
  function formatarData(data: string) {
    const date = new Date(data);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    if (date.toDateString() === hoje.toDateString()) {
      return "Hoje";
    } else if (date.toDateString() === ontem.toDateString()) {
      return "Ontem";
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }

  // ⏳ Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-zinc-100">
        <LoadingBlock label="Carregando..." />
      </main>
    );
  }

  // 🔒 Se não estiver autenticado, não mostrar nada (redirecionará)
  if (!user) {
    return null;
  }

  return (
    <main className="relative mx-auto max-w-7xl px-4 py-10 text-zinc-100 overflow-x-hidden">
      {/* Imagem de fundo da página Chat */}
      <div
        className="fixed inset-0 z-0 bg-no-repeat bg-zinc-900 page-bg-image"
        style={{
          backgroundImage: "url(/chat-bg.png.png)",
          ["--page-bg-size" as string]: "cover",
          ["--page-bg-position" as string]: "center center",
        }}
        aria-hidden
      />
      <div className="relative z-10 space-y-4">
      <PageHeader title="Suporte THouse Rec" className="justify-center lg:justify-start text-center lg:text-left" />
      {/* CONTAINER PRINCIPAL - RESPONSIVO (COLUNAS NO DESKTOP, EMPILHADO NO MOBILE) */}
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[70vh]">
        {/* COLUNA ESQUERDA - CHAT */}
        <div className="flex-1 flex flex-col min-h-[60vh] lg:min-h-0">
          <div className="relative w-full rounded-2xl border border-red-500 bg-zinc-950 flex-1 flex flex-col min-h-0 overflow-hidden" style={{ borderWidth: "1px" }}>
            {/* HISTÓRICO */}
            <div className="chat-scroll flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "ml-auto bg-red-600 text-white"
                      : msg.role === "ai"
                      ? "bg-zinc-800 text-zinc-200"
                      : "bg-emerald-700 text-white"
                  }`}
                >
                  {msg.content}
                </div>
              ))}

              {loading && (
                <div className="text-xs text-zinc-400">
                  Suporte digitando…
                </div>
              )}
            </div>

            {/* BOTÕES RÁPIDOS */}
            {chatMode === "ai" && (
              <div className="px-4 pt-3">
                <QuickActions onSend={enviarMensagem} />
              </div>
            )}

            {/* INPUT */}
            <div className="flex gap-2 p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensagem();
                  }
                }}
                placeholder="Digite sua mensagem..."
                className="flex-1"
              />

              <Button variant="primary" size="md" onClick={() => enviarMensagem()}>
                Enviar
              </Button>
            </div>
          </div>

          {/* STATUS HUMANO */}
          {chatMode === "waiting_human" && (
            <div className="mt-3 rounded-lg border border-yellow-600 bg-yellow-900/30 px-4 py-2 text-center text-xs text-yellow-300">
              👤 Um atendente humano foi acionado. Aguarde um momento.
            </div>
          )}
          {chatMode === "human" && (
            <div className="mt-3 rounded-lg border border-green-600 bg-green-900/30 px-4 py-2 text-center text-xs text-green-300">
              ✅ Você está conversando com um atendente humano. Pode enviar sua mensagem.
            </div>
          )}
        </div>

        {/* COLUNA DIREITA - CONVERSAS ANTIGAS (ABAIXO NO MOBILE, LADO DIREITO NO DESKTOP) */}
        <div className="w-full lg:w-80 flex flex-col min-h-[40vh] lg:min-h-0 mt-6 lg:mt-0">
          <h2 className="mb-4 text-center lg:text-left text-2xl font-semibold text-white">
            Conversas
          </h2>
          <div className="rounded-2xl border border-red-500 bg-zinc-950 flex flex-col flex-1 min-h-0 overflow-hidden" style={{ borderWidth: "1px" }}>
            <div className="p-4 border-b border-red-500/30">
            {selectionMode ? (
              <div className="space-y-2">
                {selectedSessions.size > 0 && (
                  <Button variant="danger" size="sm" fullWidth onClick={() => setShowBulkDeleteConfirm(true)}>
                    Deletar ({selectedSessions.size})
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedSessions(new Set());
                  }}
                >
                  Cancelar
                </Button>
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="secondary" size="xs" className="flex-1" onClick={selecionarTodas}>
                    Marcar todas
                  </Button>
                  <Button variant="secondary" size="xs" className="flex-1" onClick={desselecionarTodas}>
                    Desmarcar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button variant="primary" size="sm" fullWidth onClick={iniciarNovaConversa}>
                  + Nova
                </Button>
                <Button variant="secondary" size="sm" fullWidth onClick={() => setSelectionMode(true)}>
                  Selecionar todos
                </Button>
              </div>
            )}
          </div>

          <div className="chat-scroll flex-1 overflow-y-auto min-h-0">
            {loadingSessions ? (
              <LoadingBlock label="Carregando..." />
            ) : sessions.length === 0 ? (
              <EmptyState icon="chat" title="Nenhuma conversa ainda" className="border-none bg-transparent py-6" />
            ) : (
              <div className="p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`mb-2 rounded-lg border p-3 transition-all ${
                      selectionMode
                        ? selectedSessions.has(session.id)
                          ? "border-red-500 bg-red-500/20"
                          : "border-zinc-700 bg-zinc-900"
                        : currentSessionId === session.id
                        ? "border-red-500 bg-red-500/10 cursor-pointer"
                        : "border-zinc-700 bg-zinc-900 hover:border-red-500/50 cursor-pointer"
                    }`}
                  >
                    <div
                      className="flex items-start justify-between"
                      onClick={() => {
                        if (selectionMode) {
                          toggleSessionSelection(session.id);
                        } else {
                          carregarConversa(session.id);
                        }
                      }}
                    >
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedSessions.has(session.id)}
                          onChange={() => toggleSessionSelection(session.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 mr-2 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-500 focus:ring-2 cursor-pointer"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-zinc-300 font-medium truncate">
                            {formatarData(session.updatedAt)}
                          </div>
                          {typeof session.unreadCount === 'number' && session.unreadCount > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold">
                              {session.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {session._count.messages} mensagens
                        </div>
                      </div>
                      {!selectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(session.id);
                          }}
                          className="ml-2 text-zinc-500 hover:text-red-500 transition-colors text-xs"
                          title="Deletar conversa"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {/* Confirmação de deletar */}
                    {showDeleteConfirm === session.id && (
                      <div className="mt-3 p-3 rounded-lg bg-zinc-800 border border-red-500/50">
                        <p className="text-xs text-zinc-300 mb-3">
                          Você tem certeza que quer apagar essa conversa?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            size="xs"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletarConversa(session.id);
                            }}
                          >
                            Sim
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(null);
                            }}
                          >
                            Não
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Confirmação de deletar múltiplas conversas */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="border-red-500 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-400 mb-3">
              Confirmar exclusão
            </h3>
            <p className="text-sm text-zinc-300 mb-4">
              Você tem certeza que quer apagar {selectedSessions.size} conversa{selectedSessions.size > 1 ? "s" : ""}?
            </p>
            <div className="flex gap-3">
              <Button variant="danger" size="sm" className="flex-1" onClick={deletarConversasSelecionadas}>
                Sim
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowBulkDeleteConfirm(false)}>
                Não
              </Button>
            </div>
          </Card>
        </div>
      )}
      </div>
    </main>
  );
}
