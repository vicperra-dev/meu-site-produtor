"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const QUICK_TOPICS = [
  "pagamento",
  "agendamento",
  "planos",
  "Pix",
  "login",
  "erro",
];

export default function FAQPage() {
  const [query, setQuery] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);

  const [userQuestion, setUserQuestion] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [askMessage, setAskMessage] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  // Buscar FAQs na API
  async function fetchFaqs(term: string) {
    try {
      setLoading(true);
      const url = term
        ? `/api/faq/search?q=${encodeURIComponent(term)}`
        : "/api/faq/search";

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Erro ao buscar FAQs");
      }
      const data = await res.json();
      const allFaqs: FAQ[] = data.faqs || [];

      // SEM busca -> mostra só 8 principais
      // COM busca -> mostra tudo
      const filtered = term ? allFaqs : allFaqs.slice(0, 8);
      setFaqs(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Carregar FAQs iniciais
  useEffect(() => {
    fetchFaqs("");
  }, []);

  // Atualizar FAQs quando a query mudar (com pequeno “delay”)
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchFaqs(query);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setAskMessage(null);

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
          userName,
          userEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar dúvida");
      }

      setAskMessage(
        "Dúvida enviada com sucesso! Ela será analisada e poderá aparecer aqui em breve."
      );
      setUserQuestion("");
      // mantém nome e e-mail para próximos envios
    } catch (e: any) {
      console.error(e);
      setAskMessage(
        e?.message ||
          "Erro ao enviar sua dúvida. Tente novamente em alguns instantes."
      );
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        {/* TÍTULO + TEXTO INTRODUTÓRIO */}
        <section className="mb-7">
          <h1 className="text-4xl text-center md:text-5xl font-bold text-zinc-100">
            Suporte / Ouvidoria / FAQ
          </h1>
          <p className="mt-4 text-center text-sm md:text-base text-zinc-300">
            Aqui você encontra respostas para dúvidas frequentes sobre
            agendamentos, planos, pagamentos, produção musical e uso do site.
            Você também pode enviar sua própria pergunta para que a equipe da
            THouse Rec — e a comunidade — ajudem a construir uma base de
            conhecimento cada vez mais completa, evitando que você precise
            sempre usar o chat ou o contato direto.
          </p>
        </section>

        {/* BUSCA + ATALHOS POR ASSUNTO */}
        <section className="mb-8">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Buscar por dúvida, erro ou palavra-chave
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: pagamento, agendamento, Pix, plano Prata, login..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm outline-none focus:border-red-500"
          />

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setQuery(topic)}
                className="rounded-full border border-zinc-600 px-3 py-1 text-zinc-300 hover:border-red-500 hover:text-red-300"
              >
                {topic}
              </button>
            ))}
          </div>

          <p className="mt-2 text-[11px] text-zinc-500">
            Use os atalhos acima ou digite termos como{" "}
            <strong>“pagamento”</strong>, <strong>“agenda”</strong>,{" "}
            <strong>“plano Ouro”</strong> ou <strong>“erro”</strong>. Mesmo as
            respostas que não aparecem na lista abaixo podem ser encontradas
            pela busca.
          </p>
        </section>

        {/* LISTA DE FAQS (EM CIMA) */}
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Respostas rápidas</h2>

          {loading && (
            <p className="text-xs text-zinc-400 mb-4">
              Carregando respostas...
            </p>
          )}

          {!loading && faqs.length === 0 && (
            <p className="text-sm text-zinc-400">
              Não encontramos nenhuma resposta com esse termo. Tente outras
              palavras ou use a ouvidoria abaixo para enviar sua dúvida.
            </p>
          )}

          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="group rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 text-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-left text-red-400">
                  <span>{faq.question}</span>
                  <span className="ml-3 text-xs text-zinc-500 group-open:hidden">
                    ver resposta
                  </span>
                  <span className="ml-3 text-xs text-zinc-500 hidden group-open:inline">
                    ocultar
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* FORMULÁRIO DE DÚVIDA DO USUÁRIO (OUVIDORIA) - EM BAIXO */}
        <section className="mb-4 rounded-2xl border border-zinc-700 bg-zinc-950/70 p-5">
          <h2 className="mb-3 text-xl md:text-2xl font-semibold text-center">
            Não achou sua resposta? Envie sua dúvida.
          </h2>
          <p className="mb-4 text-sm md:text-base text-zinc-300 text-center">
            Descreva seu problema ou pergunta com o máximo de detalhes possível.
            Sua dúvida será registrada na ouvidoria e poderá se transformar em
            uma nova resposta do FAQ, ajudando outras pessoas que tenham a mesma
            questão.
          </p>

          <form onSubmit={handleAsk} className="space-y-3 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">
                  Seu nome (opcional)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">
                  Seu e-mail (opcional, para resposta direta)
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">
                Sua dúvida
              </label>
              <textarea
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                rows={4}
                placeholder="Explique o que está acontecendo: em que tela, que mensagem aparece, se já testou outra forma de acesso, etc."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </div>

            {askMessage && (
              <p className="text-xs text-zinc-300 text-center">{askMessage}</p>
            )}

            <button
              type="submit"
              disabled={askLoading}
              className={`mt-2 w-full rounded-full px-6 py-3 text-sm font-semibold ${
                askLoading
                  ? "cursor-wait bg-zinc-800 text-zinc-500"
                  : "bg-red-600 text-white hover:bg-red-500"
              }`}
            >
              {askLoading
                ? "Enviando sua dúvida..."
                : "Enviar dúvida para a ouvidoria"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
