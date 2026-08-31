"use client";

/**
 * FAQ — GO-03F: Design System (PageHeader, Section, Card, Button, Input,
 * Textarea, EmptyState, LoadingBlock, Callout).
 * Lógica de busca, listagem e envio de dúvidas mantida integralmente.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  PageHeader,
  Section,
  Card,
  Button,
  Input,
  Textarea,
  EmptyState,
  LoadingBlock,
  Callout,
  LinkButton,
} from "@/components/design-system";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  views?: number;
  createdAt?: string;
}

const QUICK_TOPICS = [
  "pagamento",
  "agendamento",
  "planos",
  "Pix",
  "login",
  "erro",
];

// Função para capitalizar primeira letra de cada palavra
const capitalizeWords = (str: string) => {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

function FaqItem({
  faq,
  expanded,
  onToggle,
}: {
  faq: FAQ;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card interactive onClick={onToggle} className="max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <span className="flex-1 text-left text-sm text-zinc-200">{faq.question}</span>
        <span className="text-xs text-zinc-400">{expanded ? "▼" : "▶"}</span>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-zinc-800 pt-3 text-sm text-zinc-300 leading-relaxed text-left">
          {faq.answer}
        </div>
      )}
    </Card>
  );
}

export default function FAQPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [frequentFaqs, setFrequentFaqs] = useState<FAQ[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [allFaqs, setAllFaqs] = useState<FAQ[]>([]);
  const [totalFaqs, setTotalFaqs] = useState(0);
  const [loadingAll, setLoadingAll] = useState(false);
  const [faqsInicializadas, setFaqsInicializadas] = useState(false);

  const [userQuestion, setUserQuestion] = useState("");
  const [userName, setUserName] = useState("");
  const [askMessage, setAskMessage] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  // Preencher dados do usuário logado
  useEffect(() => {
    if (user) {
      setUserName(user.nomeArtistico || "");
    }
  }, [user]);

  // Buscar FAQs na API
  async function fetchFaqs(term: string) {
    try {
      setLoading(true);
      const url = term
        ? `/api/faq/search?q=${encodeURIComponent(term)}`
        : "/api/faq/search";

      console.log("Buscando FAQs com termo:", term, "URL:", url);
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const urlWithCache = `${url}${url.includes("?") ? "&" : "?"}t=${timestamp}`;
      const res = await fetch(urlWithCache, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar FAQs");
      }
      const data = await res.json();
      let allFaqs: FAQ[] = data.faqs || [];
      console.log("FAQs encontradas:", allFaqs.length);
      // Atualizar total se disponível na paginação (apenas quando não há busca)
      if (data.pagination?.total && !term) {
        setTotalFaqs(data.pagination.total);
      }

      // SEM busca -> exclui FAQs frequentes e mostra 8 principais diferentes
      if (!term) {
        const frequentIds = frequentFaqs.map(f => f.id);
        allFaqs = allFaqs.filter(faq => !frequentIds.includes(faq.id));
        console.log("FAQs após excluir frequentes:", allFaqs.length);
      }

      // SEM busca -> mostra só 8 principais (já filtradas)
      // COM busca -> mostra tudo
      const filtered = term ? allFaqs : allFaqs.slice(0, 8);
      setFaqs(filtered);
      console.log("FAQs filtradas para exibição:", filtered.length);
    } catch (e) {
      console.error("Erro ao buscar FAQs:", e);
    } finally {
      setLoading(false);
    }
  }

  // Buscar FAQs mais frequentes (já ordenadas por views pela API)
  async function fetchFrequentFaqs() {
    try {
      console.log("Buscando FAQs frequentes...");
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/faq/search?limit=5&t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      console.log("Resposta da API de FAQs frequentes:", res.status, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log("Dados recebidos:", data);
        const frequent = (data.faqs || []).slice(0, 5);
        console.log("FAQs frequentes processadas:", frequent.length, frequent);
        setFrequentFaqs(frequent);
        // Atualizar total se disponível na paginação
        if (data.pagination?.total) {
          setTotalFaqs(data.pagination.total);
        }
      } else {
        const errorText = await res.text();
        console.error("Erro ao buscar FAQs frequentes:", res.status, errorText);
      }
    } catch (e) {
      console.error("Erro ao buscar FAQs frequentes:", e);
    }
  }

  // Buscar todas as FAQs
  async function fetchAllFaqs() {
    try {
      setLoadingAll(true);
      console.log("Buscando todas as FAQs...");
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      // Usar limit alto (200) para garantir que pegue todas as FAQs
      // Ordenar por data (mais recentes primeiro) para ver as novas FAQs
      const res = await fetch(`/api/faq/search?limit=200&q=&t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        const all = data.faqs || [];
        console.log("Todas as FAQs recebidas:", all.length, "Total no banco:", data.pagination?.total);
        setAllFaqs(all);
        // Atualizar total usando a paginação (mais preciso)
        if (data.pagination?.total) {
          setTotalFaqs(data.pagination.total);
        }
        setShowAllFaqs(true);
      } else {
        console.error("Erro ao buscar todas as FAQs:", res.status);
      }
    } catch (e) {
      console.error("Erro ao buscar todas as FAQs:", e);
    } finally {
      setLoadingAll(false);
    }
  }

  // Buscar apenas o total de FAQs (sem carregar todas)
  async function fetchTotalFaqs() {
    try {
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/faq/search?limit=1&t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        // Usar o total da paginação, não o tamanho do array
        setTotalFaqs(data.pagination?.total || 0);
      }
    } catch (e) {
      console.error("Erro ao buscar total de FAQs:", e);
    }
  }

  // Carregar FAQs iniciais
  useEffect(() => {
    console.log("🔄 Carregando FAQs iniciais...");
    fetchFrequentFaqs();
    fetchTotalFaqs();
    
    // Atualização automática a cada 15 minutos (900000ms)
    const interval = setInterval(() => {
      console.log("🔄 Atualização automática (15 minutos)...");
      fetchFrequentFaqs();
      fetchTotalFaqs();
      // Atualizar FAQs principais apenas se não houver busca ativa
      setQuery((currentQuery) => {
        if (!currentQuery.trim()) {
          fetchFaqs("");
        }
        return currentQuery;
      });
      // Se estiver mostrando todas as FAQs, atualizar também
      setShowAllFaqs((currentShowAll) => {
        if (currentShowAll) {
          fetchAllFaqs();
        }
        return currentShowAll;
      });
    }, 900000); // 15 minutos = 900000ms
    
    return () => clearInterval(interval);
  }, []); // Carregar apenas uma vez ao montar o componente

  // Atualizar FAQs quando a query mudar
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchFaqs(query);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  // Recarregar FAQs quando as frequentes mudarem (para excluir as frequentes)
  // Ajustado para evitar atualizações desnecessárias - só atualiza no carregamento inicial
  useEffect(() => {
    // Só atualizar uma vez quando as FAQs frequentes forem carregadas pela primeira vez
    if (!query.trim() && frequentFaqs.length > 0 && !faqsInicializadas) {
      fetchFaqs("");
      setFaqsInicializadas(true);
    }
  }, [frequentFaqs, query, faqsInicializadas]); // Adicionar faqsInicializadas como dependência

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setAskMessage(null);

    // ✅ Verificar se usuário está logado
    if (!user) {
      setAskMessage("Você precisa estar logado para enviar uma pergunta. Faça login e tente novamente.");
      return;
    }

    // Validar nome
    if (!userName.trim()) {
      setAskMessage("O nome é obrigatório.");
      return;
    }

    // Validar pergunta
    if (!userQuestion.trim()) {
      setAskMessage("A pergunta é obrigatória.");
      return;
    }

    if (userQuestion.trim().length < 10) {
      setAskMessage("Descreva sua dúvida com pelo menos 10 caracteres.");
      return;
    }

    setAskLoading(true);
    try {
      const res = await fetch("/api/faq/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userQuestion,
          userName, // Email será usado automaticamente da conta logada
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Você precisa estar logado para enviar uma pergunta.");
        }
        throw new Error(data.error || "Erro ao enviar dúvida");
      }

      setAskMessage(
        "Dúvida enviada com sucesso! Ela será analisada e poderá aparecer aqui em breve."
      );
      setUserQuestion("");
      setUserName(user.nomeArtistico || "");
    } catch (e: unknown) {
      console.error(e);
      setAskMessage(
        e instanceof Error
          ? e.message
          : "Erro ao enviar sua dúvida. Tente novamente em alguns instantes."
      );
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-4xl px-4 sm:px-6 py-4 text-zinc-100 overflow-x-hidden">
      {/* Imagem de fundo da página FAQ */}
      <div
        className="fixed inset-0 z-0 bg-no-repeat bg-zinc-900 page-bg-image page-bg-image-faq"
        style={{
          backgroundImage: "url(/faq-bg.png.png)",
          ["--page-bg-size" as string]: "cover",
          ["--page-bg-position" as string]: "center 15%",
        }}
        aria-hidden
      />

      <div className="relative z-10 space-y-8">
        {/* TÍTULO + TEXTO INTRODUTÓRIO */}
        <PageHeader
          className="justify-center text-center"
          title="Suporte / Ouvidoria / FAQ"
          subtitle="Aqui você encontra respostas para dúvidas frequentes sobre agendamentos, planos, pagamentos, produção musical e uso do site. Você também pode enviar sua própria pergunta para que a equipe da THouse Rec — e a comunidade — ajudem a construir uma base de conhecimento cada vez mais completa."
        />

        {/* BUSCA + ATALHOS */}
        <Section title="Buscar por dúvida, erro ou palavra-chave">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: pagamento, agendamento, Pix, plano Prata, login..."
          />

          <div className="flex flex-wrap gap-2">
            {QUICK_TOPICS.map((topic) => (
              <Button
                key={topic}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setQuery(topic)}
              >
                {capitalizeWords(topic)}
              </Button>
            ))}
          </div>
        </Section>

        {/* PERGUNTAS FREQUENTES - Mostrar apenas quando não há busca ativa */}
        {!query.trim() && (
          <Section
            title={frequentFaqs.length > 0 ? "Perguntas Frequentes" : undefined}
            actions={
              frequentFaqs.length > 0 && (
                <Button variant="secondary" size="sm" icon="refresh" onClick={fetchFrequentFaqs}>
                  Recarregar
                </Button>
              )
            }
          >
            {frequentFaqs.length > 0 ? (
              <div className="space-y-3">
                {frequentFaqs.map((faq) => (
                  <FaqItem
                    key={faq.id}
                    faq={faq}
                    expanded={expandedFaq === faq.id}
                    onToggle={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="help"
                title="Nenhuma pergunta frequente encontrada"
                description="Clique no botão abaixo para ver todas as perguntas disponíveis."
                action={
                  <Button variant="secondary" size="sm" icon="refresh" onClick={fetchFrequentFaqs}>
                    Recarregar
                  </Button>
                }
              />
            )}
          </Section>
        )}

        {/* LISTA DE FAQS */}
        <Section title={query.trim() ? `Resultados para "${query}"` : "Respostas rápidas"}>
          {loading && <LoadingBlock label="Carregando respostas..." />}

          {!loading && query.trim() && faqs.length === 0 && (
            <EmptyState
              icon="search"
              title={`Nenhuma resposta encontrada para "${query}"`}
              description="Tente usar outras palavras-chave ou verifique a ortografia."
            />
          )}

          {!loading && !query.trim() && faqs.length === 0 && (
            <EmptyState
              icon="box"
              title="Nenhuma pergunta encontrada no banco de dados"
              description={
                <>
                  Execute o seed para popular o banco: <code className="bg-zinc-800 px-2 py-1 rounded">npm run seed</code>
                </>
              }
            />
          )}

          {!loading && faqs.length > 0 && (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <FaqItem
                  key={faq.id}
                  faq={faq}
                  expanded={expandedFaq === faq.id}
                  onToggle={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Seção de todas as perguntas - Sempre visível, conteúdo toggle */}
        <Section
          title={`Todas as Perguntas (${totalFaqs || allFaqs.length || 0})`}
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                onClick={() => {
                  console.log("🔄 Recarregando FAQs...");
                  fetchFrequentFaqs();
                  fetchTotalFaqs();
                  // Se estiver mostrando todas as FAQs, recarregar também
                  if (showAllFaqs) {
                    fetchAllFaqs();
                  } else {
                    // Se não estiver mostrando, recarregar as FAQs principais
                    if (!query.trim()) {
                      fetchFaqs("");
                    }
                  }
                }}
              >
                Recarregar
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={loadingAll}
                onClick={() => {
                  if (showAllFaqs) {
                    setShowAllFaqs(false);
                  } else {
                    // Sempre recarregar do servidor para pegar FAQs novas
                    fetchAllFaqs();
                  }
                }}
              >
                {loadingAll ? "Carregando..." : showAllFaqs ? "Ocultar" : "Mostrar todas"}
              </Button>
            </>
          }
        >
          {showAllFaqs && (
            <>
              {loadingAll ? (
                <LoadingBlock label="Carregando todas as perguntas..." />
              ) : allFaqs.length === 0 ? (
                <EmptyState
                  icon="box"
                  title="Nenhuma pergunta encontrada no banco de dados"
                  description={
                    <>
                      Execute o seed: <code className="bg-zinc-800 px-2 py-1 rounded">npm run seed</code>
                    </>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {allFaqs.map((faq) => (
                    <FaqItem
                      key={faq.id}
                      faq={faq}
                      expanded={expandedFaq === faq.id}
                      onToggle={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </Section>

        {/* OUVIDORIA */}
        <Section>
          <Card>
            <h2 className="mb-3 text-xl md:text-2xl font-semibold text-center">
              Não achou sua resposta? Envie sua dúvida.
            </h2>

            {!user ? (
              <Callout intent="warning" align="center">
                <p className="mb-3">Você precisa estar logado para enviar uma pergunta.</p>
                <LinkButton href="/login" variant="primary" size="md">
                  Fazer login
                </LinkButton>
              </Callout>
            ) : (
              <form onSubmit={handleAsk} className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Seu e-mail"
                    value={user.email}
                    disabled
                    title="O email da sua conta será usado automaticamente"
                    className="text-zinc-400 cursor-not-allowed"
                  />
                </div>

                <Textarea
                  rows={4}
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="Explique sua dúvida com detalhes..."
                  required
                />

                {askMessage && (
                  <Callout intent={askMessage.includes("sucesso") ? "success" : "error"}>
                    {askMessage}
                  </Callout>
                )}

                <Button type="submit" variant="primary" fullWidth size="md" loading={askLoading}>
                  {askLoading ? "Enviando..." : "Enviar dúvida"}
                </Button>
              </form>
            )}
          </Card>
        </Section>
      </div>
    </main>
  );
}
