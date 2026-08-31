"use client";

import { useEffect, useState } from "react";
import {
  useFeedback,
  LoadingBlock,
  EmptyState,
  PageHeader,
  Card,
  Button,
  Input,
  SearchInput,
  Field,
  Textarea,
  StatusBadge,
  Callout,
  COPY,
} from "@/components/design-system";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  views: number;
  createdAt: string;
}

interface UserQuestion {
  id: string;
  question: string;
  userName?: string;
  userEmail?: string;
  userId?: string;
  status: string;
  answer?: string;
  answeredAt?: string;
  createdAt: string;
  published: boolean;
  blocked?: boolean;
  faqId?: string;
  user?: {
    nomeArtistico?: string;
    nomeCompleto?: string;
    email?: string;
  };
  faq?: {
    id: string;
    question: string;
  };
}

export default function AdminFaqPage() {
  const { notify, notifySuccess, notifyError, ask } = useFeedback();
  const [abaAtiva, setAbaAtiva] = useState<"faqs" | "perguntas" | "recusadas">("faqs");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [perguntas, setPerguntas] = useState<UserQuestion[]>([]);
  const [perguntasRecusadas, setPerguntasRecusadas] = useState<UserQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarTodas, setMostrarTodas] = useState(false); // Por padrão, mostrar apenas as 5 mais visualizadas
  
  // Estados para criar nova FAQ
  const [novaPergunta, setNovaPergunta] = useState("");
  const [novaResposta, setNovaResposta] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  
  // Estados para editar FAQ
  const [editandoFaq, setEditandoFaq] = useState<FAQ | null>(null);
  const [editPergunta, setEditPergunta] = useState("");
  const [editResposta, setEditResposta] = useState("");
  
  // Estados para responder pergunta
  const [respondendoPergunta, setRespondendoPergunta] = useState<UserQuestion | null>(null);
  const [respostaTexto, setRespostaTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"pendente" | "respondida" | "todas">("pendente");

  useEffect(() => {
    if (abaAtiva === "faqs") {
      carregarFAQs();
    } else if (abaAtiva === "perguntas") {
      carregarPerguntas();
    } else if (abaAtiva === "recusadas") {
      carregarPerguntasRecusadas();
    }
  }, [abaAtiva, busca, mostrarTodas, filtroStatus]);

  async function carregarFAQs() {
    try {
      setLoading(true);
      const url = `/api/admin/faq?todas=${mostrarTodas}${busca ? `&q=${encodeURIComponent(busca)}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFaqs(data.faqs || []);
      }
    } catch (err) {
      console.error("Erro ao carregar FAQs", err);
    } finally {
      setLoading(false);
    }
  }

  async function carregarPerguntas() {
    try {
      setLoading(true);
      const url = `/api/admin/faq/pendentes?status=${filtroStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPerguntas(data.perguntas || []);
      }
    } catch (err) {
      console.error("Erro ao carregar perguntas", err);
    } finally {
      setLoading(false);
    }
  }

  async function carregarPerguntasRecusadas() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/faq/recusadas");
      if (res.ok) {
        const data = await res.json();
        setPerguntasRecusadas(data.perguntas || []);
      }
    } catch (err) {
      console.error("Erro ao carregar perguntas recusadas", err);
    } finally {
      setLoading(false);
    }
  }

  async function criarFAQ() {
    if (!novaPergunta || !novaResposta) return;

    try {
      const res = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: novaPergunta, answer: novaResposta }),
      });

      if (res.ok) {
        setNovaPergunta("");
        setNovaResposta("");
        setMostrarForm(false);
        await carregarFAQs();
      }
    } catch (err) {
      console.error("Erro ao criar FAQ", err);
    }
  }

  async function deletarFAQ(id: string) {
    if (!(await ask("Tem certeza que deseja deletar esta FAQ?", undefined, true))) return;

    try {
      const res = await fetch(`/api/admin/faq?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await carregarFAQs();
      }
    } catch (err) {
      console.error("Erro ao deletar FAQ", err);
    }
  }

  function iniciarEdicao(faq: FAQ) {
    setEditandoFaq(faq);
    setEditPergunta(faq.question);
    setEditResposta(faq.answer);
  }

  function cancelarEdicao() {
    setEditandoFaq(null);
    setEditPergunta("");
    setEditResposta("");
  }

  async function salvarEdicao() {
    if (!editandoFaq || !editPergunta.trim() || !editResposta.trim()) {
      notify("Preencha pergunta e resposta");
      return;
    }

    try {
      const res = await fetch(`/api/admin/faq?id=${editandoFaq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: editPergunta,
          answer: editResposta,
        }),
      });

      if (res.ok) {
        await carregarFAQs();
        cancelarEdicao();
      } else {
        const data = await res.json();
        notifyError(data.error || "Erro ao atualizar FAQ");
      }
    } catch (err) {
      console.error("Erro ao atualizar FAQ", err);
      notifyError("Erro ao atualizar FAQ. Tente novamente.");
    }
  }

  function iniciarResposta(pergunta: UserQuestion) {
    setRespondendoPergunta(pergunta);
    setRespostaTexto(pergunta.answer || "");
  }

  function cancelarResposta() {
    setRespondendoPergunta(null);
    setRespostaTexto("");
  }

  async function salvarResposta() {
    if (!respondendoPergunta || !respostaTexto.trim()) {
      notify("Digite uma resposta");
      return;
    }

    try {
      const res = await fetch("/api/admin/faq/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: respondendoPergunta.id,
          answer: respostaTexto,
        }),
      });

      if (res.ok) {
        await carregarPerguntas();
        cancelarResposta();
        notifySuccess("Resposta enviada com sucesso!");
      } else {
        const data = await res.json();
        notifyError(data.error || "Erro ao responder pergunta");
      }
    } catch (err) {
      console.error("Erro ao responder pergunta", err);
      notifyError("Erro ao responder pergunta. Tente novamente.");
    }
  }

  async function toggleBanco(pergunta: UserQuestion) {
    // Se já está no banco, remover
    if (pergunta.published && (pergunta.faqId || pergunta.faq?.id)) {
      if (
        !(await ask(
          "Deseja REMOVER esta pergunta do banco de FAQs?",
          `Pergunta: ${pergunta.question}\n\nEla será removida do banco público, mas a resposta permanecerá.`,
          true
        ))
      ) {
        return;
      }

      try {
        const res = await fetch("/api/admin/faq/remover-do-banco", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: pergunta.id,
          }),
        });

        if (res.ok) {
          await carregarPerguntas();
          await carregarFAQs(); // Atualizar também a lista de FAQs do banco
          notifySuccess("Pergunta removida do banco de FAQs com sucesso!");
        } else {
          const data = await res.json();
          notifyError(data.error || "Erro ao remover do banco");
        }
      } catch (err) {
        console.error("Erro ao remover do banco", err);
        notifyError("Erro ao remover do banco. Tente novamente.");
      }
    } else {
      // Se não está no banco, adicionar
      if (!pergunta.answer) {
        notify("A pergunta precisa ter uma resposta antes de ser adicionada ao banco");
        return;
      }

      if (
        !(await ask(
          "Deseja adicionar esta pergunta ao banco de FAQs?",
          `Pergunta: ${pergunta.question}\nResposta: ${pergunta.answer.substring(0, 100)}...`
        ))
      ) {
        return;
      }

      try {
        const res = await fetch("/api/admin/faq/adicionar-ao-banco", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: pergunta.id,
            question: pergunta.question,
            answer: pergunta.answer,
          }),
        });

        if (res.ok) {
          await carregarPerguntas();
          await carregarFAQs(); // Atualizar também a lista de FAQs do banco
          notifySuccess("Pergunta adicionada ao banco de FAQs com sucesso!");
        } else {
          const data = await res.json();
          notifyError(data.error || "Erro ao adicionar ao banco");
        }
      } catch (err) {
        console.error("Erro ao adicionar ao banco", err);
        notifyError("Erro ao adicionar ao banco. Tente novamente.");
      }
    }
  }

  async function associarPerguntaAoUsuario(pergunta: UserQuestion) {
    if (pergunta.userEmail) {
      const titulo = pergunta.userId
        ? `Reassociar esta pergunta ao usuário com email ${pergunta.userEmail}?`
        : `Associar esta pergunta ao usuário com email ${pergunta.userEmail}?`;
      const descricao = pergunta.userId
        ? `Isso atualizará a associação e fará com que a pergunta apareça na página "Minha Conta" do usuário.`
        : `Isso fará com que a pergunta apareça na página "Minha Conta" do usuário.`;

      if (await ask(titulo, descricao)) {
        await associarPerguntaPorEmail(pergunta.id, pergunta.userEmail);
      }
    } else {
      notify("Esta pergunta não tem email associado. Não é possível associar automaticamente.");
    }
  }

  async function associarPerguntaPorEmail(questionId: string, userEmail: string) {
    try {
      const res = await fetch("/api/admin/faq/associar-pergunta-por-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          userEmail,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await carregarPerguntas();
        notifySuccess(
          `Pergunta associada ao usuário ${data.pergunta.userEmail} com sucesso!`,
          `A pergunta agora deve aparecer na página "Minha Conta" do usuário.`
        );
        console.log(`[Admin FAQ] Pergunta associada:`, data.pergunta);
      } else {
        const errorData = await res.json();
        notifyError(errorData.error || "Erro ao associar pergunta");
        console.error("[Admin FAQ] Erro ao associar:", errorData);
      }
    } catch (err) {
      console.error("Erro ao associar pergunta", err);
      notifyError("Erro ao associar pergunta. Tente novamente.");
    }
  }

  async function associarPergunta(questionId: string, userId: string) {
    try {
      const res = await fetch("/api/admin/faq/associar-pergunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          userId,
        }),
      });

      if (res.ok) {
        await carregarPerguntas();
        notifySuccess("Pergunta associada ao usuário com sucesso!");
      } else {
        const data = await res.json();
        notifyError(data.error || "Erro ao associar pergunta");
      }
    } catch (err) {
      console.error("Erro ao associar pergunta", err);
      notifyError("Erro ao associar pergunta. Tente novamente.");
    }
  }

  async function recusarPergunta(pergunta: UserQuestion) {
    if (
      !(await ask(
        "Recusar esta pergunta?",
        "A pergunta será movida para a lista de recusadas."
      ))
    ) {
      return;
    }

    try {
      const res = await fetch("/api/admin/faq/recusar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: pergunta.id,
          motivo: undefined,
        }),
      });

      if (res.ok) {
        await carregarPerguntas();
        await carregarPerguntasRecusadas(); // Atualizar lista de recusadas também
        notifySuccess("Pergunta recusada com sucesso!");
      } else {
        const data = await res.json();
        notifyError(data.error || "Erro ao recusar pergunta");
      }
    } catch (err) {
      console.error("Erro ao recusar pergunta", err);
      notifyError("Erro ao recusar pergunta. Tente novamente.");
    }
  }

  async function excluirPergunta(pergunta: UserQuestion) {
    if (
      !(await ask(
        "Tem certeza que deseja EXCLUIR permanentemente esta pergunta?",
        `"${pergunta.question.substring(0, 50)}..."\n\nEsta ação não pode ser desfeita!`,
        true
      ))
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/faq/excluir?id=${pergunta.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (abaAtiva === "recusadas") {
          await carregarPerguntasRecusadas();
        } else {
          await carregarPerguntas();
        }
        notifySuccess("Pergunta excluída com sucesso!");
      } else {
        const data = await res.json();
        notifyError(data.error || "Erro ao excluir pergunta");
      }
    } catch (err) {
      console.error("Erro ao excluir pergunta", err);
      notifyError("Erro ao excluir pergunta. Tente novamente.");
    }
  }

  async function reaceitarPergunta(pergunta: UserQuestion) {
    if (
      !(await ask(
        "Deseja reaceitar esta pergunta?",
        `"${pergunta.question.substring(0, 50)}..."\n\nA pergunta voltará a aparecer na lista de pendentes.`
      ))
    ) {
      return;
    }

    try {
      const res = await fetch("/api/admin/faq/reaceitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: pergunta.id,
        }),
      });

      if (res.ok) {
        await carregarPerguntasRecusadas();
        notifySuccess("Pergunta reaceita com sucesso! Ela voltou para a lista de pendentes.");
      } else {
        const data = await res.json();
        notifyError(data.error || "Erro ao reaceitar pergunta");
      }
    } catch (err) {
      console.error("Erro ao reaceitar pergunta", err);
      notifyError("Erro ao reaceitar pergunta. Tente novamente.");
    }
  }

  if (loading && faqs.length === 0 && perguntas.length === 0) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQ"
        subtitle="Gerenciar perguntas frequentes e responder solicitações"
        icon="help"
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-700">
        <button
          onClick={() => setAbaAtiva("faqs")}
          className={`px-4 py-2 font-semibold transition-colors ${
            abaAtiva === "faqs"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          FAQs do Banco ({faqs.length})
        </button>
        <button
          onClick={() => setAbaAtiva("perguntas")}
          className={`px-4 py-2 font-semibold transition-colors ${
            abaAtiva === "perguntas"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Perguntas Enviadas ({perguntas.filter(p => p.status === "pendente" && !(p.blocked ?? false)).length} pendentes)
        </button>
        <button
          onClick={() => setAbaAtiva("recusadas")}
          className={`px-4 py-2 font-semibold transition-colors ${
            abaAtiva === "recusadas"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Recusadas ({perguntasRecusadas.length})
        </button>
      </div>

      {/* Conteúdo da Aba FAQs */}
      {abaAtiva === "faqs" && (
        <>
          {/* Busca e Controles */}
          <div className="flex gap-3 items-center">
            <SearchInput
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por pergunta ou resposta..."
              className="flex-1"
            />
            <Button
              variant={mostrarTodas ? "secondary" : "outline"}
              size="md"
              onClick={() => setMostrarTodas(!mostrarTodas)}
            >
              {mostrarTodas ? "Ocultar Todas" : "Mostrar Todas"}
            </Button>
            <Button variant="primary" size="md" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? COPY.actions.cancel : "+ Nova FAQ"}
            </Button>
          </div>

          {mostrarForm && (
            <Card className="!p-6 space-y-4">
              <h3 className="text-lg font-semibold text-zinc-100">Criar Nova FAQ</h3>
              <Field label="Pergunta">
                <Input
                  type="text"
                  value={novaPergunta}
                  onChange={(e) => setNovaPergunta(e.target.value)}
                  placeholder="Digite a pergunta"
                />
              </Field>
              <Field label="Resposta">
                <Textarea
                  value={novaResposta}
                  onChange={(e) => setNovaResposta(e.target.value)}
                  rows={4}
                  placeholder="Digite a resposta"
                />
              </Field>
              <Button variant="success" size="md" onClick={criarFAQ}>
                Criar FAQ
              </Button>
            </Card>
          )}

          {/* Lista de FAQs */}
          <div className="space-y-4">
            {faqs.length === 0 ? (
              <EmptyState
                title={busca ? "Nenhuma FAQ encontrada para esta busca." : "Nenhuma FAQ encontrada. Crie a primeira!"}
              />
            ) : (
              faqs.map((faq) => (
                <Card key={faq.id} className="!p-6">
                  {editandoFaq?.id === faq.id ? (
                    <div className="space-y-4">
                      <Field label="Pergunta">
                        <Input
                          type="text"
                          value={editPergunta}
                          onChange={(e) => setEditPergunta(e.target.value)}
                        />
                      </Field>
                      <Field label="Resposta">
                        <Textarea
                          value={editResposta}
                          onChange={(e) => setEditResposta(e.target.value)}
                          rows={4}
                        />
                      </Field>
                      <div className="flex gap-2">
                        <Button variant="success" size="md" onClick={salvarEdicao}>
                          {COPY.actions.save}
                        </Button>
                        <Button variant="secondary" size="md" onClick={cancelarEdicao}>
                          {COPY.actions.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-zinc-100 mb-2">{faq.question}</h3>
                          <p className="text-sm text-zinc-300">{faq.answer}</p>
                          <div className="mt-2 text-xs text-zinc-400">
                            {faq.views} visualizações
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="xs" onClick={() => iniciarEdicao(faq)}>
                            {COPY.actions.edit}
                          </Button>
                          <Button variant="danger" size="xs" onClick={() => deletarFAQ(faq.id)}>
                            {COPY.actions.delete}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Conteúdo da Aba Perguntas Enviadas */}
      {abaAtiva === "perguntas" && (
        <>
          {/* Filtro de Status */}
          <div className="flex gap-2">
            <Button
              variant={filtroStatus === "pendente" ? "primary" : "secondary"}
              size="md"
              onClick={() => setFiltroStatus("pendente")}
              className={filtroStatus === "pendente" ? "!bg-orange-600 hover:!bg-orange-500" : ""}
            >
              Pendentes ({perguntas.filter(p => p.status === "pendente").length})
            </Button>
            <Button
              variant={filtroStatus === "respondida" ? "success" : "secondary"}
              size="md"
              onClick={() => setFiltroStatus("respondida")}
            >
              Respondidas ({perguntas.filter(p => p.status === "respondida").length})
            </Button>
            <Button
              variant={filtroStatus === "todas" ? "secondary" : "outline"}
              size="md"
              onClick={() => setFiltroStatus("todas")}
            >
              Todas ({perguntas.length})
            </Button>
          </div>

          {/* Lista de Perguntas */}
          <div className="space-y-4">
            {perguntas.length === 0 ? (
              <EmptyState title="Nenhuma pergunta encontrada." />
            ) : (
              perguntas.map((pergunta) => (
                <Card
                  key={pergunta.id}
                  className={`!p-6 ${
                    pergunta.status === "pendente" ? "!border-orange-500/50 !bg-orange-500/10" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{pergunta.question}</h3>
                      <div className="text-sm text-zinc-400 space-y-1">
                        <div>
                          {pergunta.userName || pergunta.user?.nomeArtistico || pergunta.user?.nomeCompleto || "Usuário anônimo"}
                          {pergunta.userEmail || pergunta.user?.email ? ` (${pergunta.userEmail || pergunta.user?.email})` : ""}
                        </div>
                        <div>{new Date(pergunta.createdAt).toLocaleString("pt-BR")}</div>
                        {pergunta.status === "respondida" && pergunta.answeredAt && (
                          <div className="text-green-400">
                            Respondida em: {new Date(pergunta.answeredAt).toLocaleString("pt-BR")}
                          </div>
                        )}
                        {pergunta.published && pergunta.faq && (
                          <div className="text-blue-400">
                            Publicada no FAQ: {pergunta.faq.question.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={pergunta.status} />
                  </div>

                  {pergunta.answer && (
                    <Callout intent="info" title="Resposta:" className="mt-4">
                      {pergunta.answer}
                    </Callout>
                  )}

                  <div className="mt-4 flex gap-2 flex-wrap">
                    {pergunta.status === "pendente" && (
                      <Button variant="success" size="md" onClick={() => iniciarResposta(pergunta)}>
                        {pergunta.answer ? "Editar Resposta" : "Responder"}
                      </Button>
                    )}
                    {pergunta.status === "pendente" && (
                      <Button variant="secondary" size="md" onClick={() => recusarPergunta(pergunta)}>
                        {COPY.actions.reject}
                      </Button>
                    )}
                    <Button variant="danger" size="md" onClick={() => excluirPergunta(pergunta)}>
                      {COPY.actions.delete}
                    </Button>
                    {pergunta.status === "respondida" && (
                      <Button
                        variant={pergunta.published && (pergunta.faqId || pergunta.faq?.id) ? "danger" : "secondary"}
                        size="md"
                        onClick={() => toggleBanco(pergunta)}
                      >
                        {pergunta.published && (pergunta.faqId || pergunta.faq?.id) ? "Remover do Banco" : "Adicionar ao Banco"}
                      </Button>
                    )}
                    {pergunta.userEmail && (
                      <Button variant="outline" size="md" onClick={() => associarPerguntaAoUsuario(pergunta)}>
                        {pergunta.userId ? "Reassociar ao Usuário" : "Associar ao Usuário"}
                      </Button>
                    )}
                    {respondendoPergunta?.id === pergunta.id && (
                      <div className="flex-1 space-y-2 w-full">
                        <Textarea
                          value={respostaTexto}
                          onChange={(e) => setRespostaTexto(e.target.value)}
                          rows={4}
                          placeholder="Digite a resposta..."
                        />
                        <div className="flex gap-2">
                          <Button variant="success" size="md" onClick={salvarResposta}>
                            Salvar Resposta
                          </Button>
                          <Button variant="secondary" size="md" onClick={cancelarResposta}>
                            {COPY.actions.cancel}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Conteúdo da Aba Recusadas */}
      {abaAtiva === "recusadas" && (
        <>
          <Callout intent="info">
            Perguntas recusadas (bloqueadas). Você pode reaceitar ou excluir permanentemente.
          </Callout>

          <div className="space-y-4">
            {perguntasRecusadas.length === 0 ? (
              <EmptyState title="Nenhuma pergunta recusada encontrada." />
            ) : (
              perguntasRecusadas.map((pergunta) => (
                <Card
                  key={pergunta.id}
                  className="!p-6 !border-red-500/50 !bg-red-500/10"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{pergunta.question}</h3>
                      <div className="text-sm text-zinc-400 space-y-1">
                        <div>
                          {pergunta.userName || pergunta.user?.nomeArtistico || pergunta.user?.nomeCompleto || "Usuário anônimo"}
                          {pergunta.userEmail || pergunta.user?.email ? ` (${pergunta.userEmail || pergunta.user?.email})` : ""}
                        </div>
                        <div>{new Date(pergunta.createdAt).toLocaleString("pt-BR")}</div>
                      </div>
                    </div>
                    <StatusBadge status="recusada" />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="success" size="md" onClick={() => reaceitarPergunta(pergunta)}>
                      Reaceitar
                    </Button>
                    <Button variant="danger" size="md" onClick={() => excluirPergunta(pergunta)}>
                      {COPY.actions.delete}
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
