"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  Badge,
  Button,
  Card,
  Callout,
  EmptyState,
  Field,
  LoadingBlock,
  PageHeader,
  Textarea,
  COPY,
} from "@/components/design-system";

interface Pergunta {
  id: string;
  question: string;
  userName: string | null;
  userEmail: string | null;
  userId: string | null;
  answer: string | null;
  answeredAt: string | null;
  answeredBy: string | null;
  published: boolean;
  status: string;
  createdAt: string;
  user: {
    id: string;
    nomeCompleto: string;
    nomeArtistico: string;
    email: string;
    telefone: string;
  } | null;
}

export default function AdminFaqPendentesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      carregarPerguntas();
    }
  }, [user]);

  async function carregarPerguntas() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/faq/pendentes");
      if (res.ok) {
        const data = await res.json();
        setPerguntas(data.perguntas || []);
      }
    } catch (err) {
      console.error("Erro ao carregar perguntas:", err);
    } finally {
      setLoading(false);
    }
  }

  async function responderPergunta(questionId: string) {
    if (!resposta.trim()) {
      setMensagem("A resposta é obrigatória");
      return;
    }

    try {
      setMensagem(null);
      const res = await fetch("/api/admin/faq/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          answer: resposta,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem("Pergunta respondida com sucesso!");
        setRespondendoId(null);
        setResposta("");
        carregarPerguntas();
      } else {
        setMensagem(data.error || "Erro ao responder pergunta");
      }
    } catch (err) {
      setMensagem("Erro ao responder pergunta");
    }
  }

  async function publicarPergunta(questionId: string, publish: boolean) {
    try {
      const res = await fetch("/api/admin/faq/publicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          publish,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem(publish ? "Pergunta publicada no FAQ!" : "Pergunta removida do FAQ");
        carregarPerguntas();
      } else {
        setMensagem(data.error || "Erro ao publicar pergunta");
      }
    } catch (err) {
      setMensagem("Erro ao publicar pergunta");
    }
  }

  if (authLoading || loading) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perguntas Pendentes do FAQ"
        icon="help"
        actions={
          <Button variant="secondary" onClick={() => router.push("/admin/faq")}>
            {COPY.actions.back}
          </Button>
        }
      />

      {mensagem && (
        <Callout
          intent={
            mensagem.includes("sucesso") || mensagem.includes("publicada")
              ? "success"
              : "error"
          }
        >
          {mensagem}
        </Callout>
      )}

      {perguntas.length === 0 ? (
        <EmptyState title="Nenhuma pergunta pendente no momento." />
      ) : (
        <div className="space-y-4">
          {perguntas.map((pergunta) => (
            <Card key={pergunta.id} className="!p-6">
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-zinc-100">Pergunta</h3>
                  <Badge intent="pending">Pendente</Badge>
                </div>
                <p className="text-zinc-300 whitespace-pre-wrap">{pergunta.question}</p>
              </div>

              <Card className="!bg-zinc-900/50 mb-4">
                <h4 className="text-sm font-semibold text-zinc-400 mb-2">Informações do Usuário</h4>
                <div className="space-y-1 text-sm text-zinc-300">
                  <p><strong>Nome:</strong> {pergunta.userName || pergunta.user?.nomeArtistico || pergunta.user?.nomeCompleto || "Não informado"}</p>
                  <p><strong>Email:</strong> {pergunta.userEmail || pergunta.user?.email || "Não informado"}</p>
                  {pergunta.user?.telefone && (
                    <p><strong>Telefone:</strong> {pergunta.user.telefone}</p>
                  )}
                  {pergunta.userId && (
                    <p><strong>ID do Usuário:</strong> {pergunta.userId}</p>
                  )}
                  <p><strong>Data:</strong> {new Date(pergunta.createdAt).toLocaleString("pt-BR")}</p>
                </div>
              </Card>

              {respondendoId === pergunta.id ? (
                <div className="space-y-3">
                  <Field label="Resposta">
                    <Textarea
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder="Digite a resposta para esta pergunta..."
                      rows={6}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button variant="success" size="md" onClick={() => responderPergunta(pergunta.id)}>
                      Enviar Resposta
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setRespondendoId(null);
                        setResposta("");
                      }}
                    >
                      {COPY.actions.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setRespondendoId(pergunta.id);
                      setResposta("");
                    }}
                  >
                    Responder Pergunta
                  </Button>
                </div>
              )}

              {pergunta.answer && (
                <Callout intent="success" title="Resposta" className="mt-4">
                  <p className="whitespace-pre-wrap">{pergunta.answer}</p>
                  <div className="mt-2 flex gap-2">
                    {!pergunta.published && (
                      <Button variant="primary" size="sm" onClick={() => publicarPergunta(pergunta.id, true)}>
                        Publicar no FAQ
                      </Button>
                    )}
                    {pergunta.published && (
                      <Button variant="secondary" size="sm" onClick={() => publicarPergunta(pergunta.id, false)}>
                        Remover do FAQ
                      </Button>
                    )}
                  </div>
                </Callout>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
