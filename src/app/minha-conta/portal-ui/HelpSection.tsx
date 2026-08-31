"use client";

/**
 * Portal do Cliente — Ajuda.
 * Mantém a listagem de perguntas do usuário ao FAQ (mesmos dados de
 * /api/meus-dados) e adiciona atalhos: FAQ público, chat e contato.
 */

import {
  Badge,
  Card,
  EmptyState,
  Grid,
  Icon,
  IconName,
  Section,
  formatDateTime,
} from "@/components/design-system";
import type { FAQQuestion } from "./types";

const LINKS: Array<{ href: string; icon: IconName; title: string; desc: string }> = [
  {
    href: "/faq",
    icon: "help",
    title: "FAQ",
    desc: "Perguntas frequentes e envio de novas dúvidas",
  },
  {
    href: "/chat",
    icon: "chat",
    title: "Abrir chat",
    desc: "Fale com o estúdio pelo chat da plataforma",
  },
  {
    href: "/contato",
    icon: "external",
    title: "Contato",
    desc: "Canais de contato e solicitação de suporte",
  },
  {
    href: "/agendamento",
    icon: "calendar",
    title: "Agendar serviço",
    desc: "Sessões, mixagem, masterização, beats e mais",
  },
];

export function HelpSection({ faqQuestions }: { faqQuestions: FAQQuestion[] }) {
  const naoLidas = faqQuestions.filter((p) => p.status === "respondida" && !p.readAt).length;

  return (
    <div className="space-y-6">
      <Section title="Ajuda" icon="help" description="Suporte, dúvidas e links úteis.">
        <Grid cols={4}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 group"
            >
              <span className="flex w-9 h-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-red-400 transition-colors mb-2">
                <Icon name={l.icon} className="w-4 h-4" />
              </span>
              <p className="text-sm font-semibold text-zinc-100">{l.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{l.desc}</p>
            </a>
          ))}
        </Grid>
      </Section>

      <Section
        title="Minhas perguntas ao FAQ"
        icon="chat"
        actions={
          naoLidas > 0 ? (
            <Badge intent="error">{naoLidas} nova{naoLidas > 1 ? "s" : ""} resposta{naoLidas > 1 ? "s" : ""}</Badge>
          ) : undefined
        }
      >
        {faqQuestions.length === 0 ? (
          <EmptyState
            icon="chat"
            title="Você não enviou nenhuma pergunta ao FAQ"
            description="Envie dúvidas pela página do FAQ; as respostas aparecem aqui."
          />
        ) : (
          <div className="space-y-3">
            {faqQuestions.map((pergunta) => {
              const isRecusada = pergunta.status === "recusada" || pergunta.blocked;
              return (
                <Card
                  key={pergunta.id}
                  className={
                    isRecusada
                      ? "!border-red-500/40 !bg-red-500/5"
                      : pergunta.status === "pendente"
                      ? "!border-orange-500/40 !bg-orange-500/5"
                      : "!border-emerald-500/40 !bg-emerald-500/5"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-100 mb-1">
                        {pergunta.question}
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Enviada em: {formatDateTime(pergunta.createdAt)}
                      </p>
                      {isRecusada ? (
                        <div className="text-xs text-red-400 mt-1.5 space-y-1">
                          <p>Esta pergunta foi recusada pela administração.</p>
                          {pergunta.blockedReason && (
                            <p className="text-red-300 pl-2 border-l-2 border-red-500/50">
                              <strong>Motivo:</strong> {pergunta.blockedReason}
                            </p>
                          )}
                        </div>
                      ) : pergunta.published && pergunta.faq ? (
                        <p className="text-xs text-sky-400 mt-1.5">Publicada no FAQ público</p>
                      ) : null}
                    </div>
                    <Badge
                      intent={
                        isRecusada ? "error" : pergunta.status === "pendente" ? "pending" : "success"
                      }
                    >
                      {isRecusada
                        ? "Recusada"
                        : pergunta.status === "pendente"
                        ? "Pendente"
                        : "Respondida"}
                    </Badge>
                  </div>
                  {pergunta.answer && (
                    <div className="mt-3 rounded-lg bg-zinc-900/60 border border-zinc-800 p-3">
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Resposta:</p>
                      <p className="text-sm text-zinc-200">{pergunta.answer}</p>
                      {pergunta.answeredAt && (
                        <p className="text-[11px] text-zinc-500 mt-2">
                          Respondida em: {formatDateTime(pergunta.answeredAt)}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
