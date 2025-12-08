"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

interface Agendamento {
  id: number;
  data: string;
  duracaoMinutos: number;
  tipo: string;
  observacoes?: string | null;
  status: string;
  userId: number;
  // se depois você adicionar relação com User no Prisma, dá pra puxar nome/email aqui
}

// 👉 troque pelo email real do Victor
const ADMIN_EMAIL = "vicperra@gmail.com";

type Aba = "agenda" | "planos" | "projetos";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [abaAtiva, setAbaAtiva] = useState<Aba>("agenda");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.email !== ADMIN_EMAIL) {
      router.push("/");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    async function carregar() {
      try {
        const r = await fetch("/api/agendamentos?all=true");
        if (!r.ok) {
          setErro("Erro ao carregar agendamentos.");
          return;
        }
        const d = await r.json();
        setAgendamentos(d.agendamentos || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar agendamentos.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const agPorDia = useMemo(() => {
    const mapa: Record<
      string,
      { label: string; itens: { hora: string; ag: Agendamento }[] }
    > = {};

    agendamentos.forEach((ag) => {
      const d = new Date(ag.data);
      const diaKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const diaLabel = d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
      const hora = d.toTimeString().slice(0, 5); // HH:MM

      if (!mapa[diaKey]) {
        mapa[diaKey] = { label: diaLabel, itens: [] };
      }
      mapa[diaKey].itens.push({ hora, ag });
    });

    return Object.entries(mapa)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, value]) => ({
        dia: key,
        label: value.label,
        itens: value.itens.sort((x, y) => (x.hora < y.hora ? -1 : 1)),
      }));
  }, [agendamentos]);

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        <h1 className="mb-2 text-2xl font-semibold">
          Painel administrativo — THouse Rec
        </h1>
        <p className="mb-6 text-sm text-zinc-400">
          Aqui você, Tremv, controla a agenda, acompanha planos ativos
          e organiza os projetos avulsos. A ideia é ter uma visão clara
          do que está marcado, quem tem plano e quais trabalhos estão em andamento.
        </p>

        {/* ABAS */}
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setAbaAtiva("agenda")}
            className={`rounded-full px-4 py-2 border ${
              abaAtiva === "agenda"
                ? "border-red-500 bg-red-600/20 text-red-200"
                : "border-zinc-600 bg-zinc-900 hover:border-red-500/60"
            }`}
          >
            Agenda
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("planos")}
            className={`rounded-full px-4 py-2 border ${
              abaAtiva === "planos"
                ? "border-red-500 bg-red-600/20 text-red-200"
                : "border-zinc-600 bg-zinc-900 hover:border-red-500/60"
            }`}
          >
            Planos
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("projetos")}
            className={`rounded-full px-4 py-2 border ${
              abaAtiva === "projetos"
                ? "border-red-500 bg-red-600/20 text-red-200"
                : "border-zinc-600 bg-zinc-900 hover:border-red-500/60"
            }`}
          >
            Projetos avulsos
          </button>
        </div>

        {carregando && (
          <p className="text-sm text-zinc-400">Carregando dados...</p>
        )}
        {erro && (
          <p className="mb-4 rounded border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            {erro}
          </p>
        )}

        {!carregando && abaAtiva === "agenda" && (
          <AgendaAdminView agPorDia={agPorDia} />
        )}

        {!carregando && abaAtiva === "planos" && (
          <PlanosAdminView />
        )}

        {!carregando && abaAtiva === "projetos" && (
          <ProjetosAdminView />
        )}
      </main>
    </>
  );
}

/* ---------- AGENDA (ADMIN) ---------- */

function AgendaAdminView({
  agPorDia,
}: {
  agPorDia: {
    dia: string;
    label: string;
    itens: { hora: string; ag: Agendamento }[];
  }[];
}) {
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-4 text-sm">
        <h2 className="mb-2 text-lg font-semibold">
          Visão geral da agenda
        </h2>
        <p className="text-xs text-zinc-300">
          Esta visão mostra todos os horários já reservados pelos
          usuários, organizados por dia. A ideia é que, em versões
          futuras, você possa também marcar horários como bloqueados
          (pausa, almoço, compromissos pessoais) ou reabrir horários,
          sempre sincronizado com o calendário que os clientes enxergam
          na aba de agendamento.
        </p>
      </div>

      {agPorDia.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Nenhum agendamento futuro encontrado.
        </p>
      ) : (
        <div className="space-y-5">
          {agPorDia.map((dia) => (
            <section
              key={dia.dia}
              className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-4"
            >
              <h3 className="mb-3 text-lg font-semibold capitalize">
                {dia.label}
              </h3>
              <div className="space-y-2 text-sm">
                {dia.itens.map(({ hora, ag }) => (
                  <div
                    key={ag.id}
                    className="flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {hora} — {ag.tipo}
                      </p>
                      {ag.observacoes && (
                        <p className="mt-1 line-clamp-3 text-xs text-zinc-400">
                          {ag.observacoes}
                        </p>
                      )}
                    </div>
                    <span className="mt-1 self-start rounded-full border border-zinc-600 px-3 py-1 text-[11px] uppercase tracking-wide md:mt-0">
                      Status: {ag.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- PLANOS (ADMIN) ---------- */

function PlanosAdminView() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-4 text-sm">
        <h2 className="mb-2 text-lg font-semibold">
          Controle de planos e recorrência
        </h2>
        <p className="text-xs text-zinc-300">
          Aqui será o painel para acompanhar quais contas assinaram
          planos mensais ou anuais, quem está ativo, quem pediu
          cancelamento ou reembolso e como está o fluxo de recorrência.
          É o lugar para você ter a fotografia de quem está caminhando
          com você de forma contínua.
        </p>
        <p className="mt-2 text-xs text-yellow-300">
          Importante: os pedidos de ativação, cancelamento ou mudança de
          plano poderão ter um prazo de até 48 horas úteis (segunda a
          sexta) para serem processados e refletidos tanto aqui quanto na
          área do usuário.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-950/70 p-4 text-sm">
        <p className="text-xs text-zinc-400">
          Nesta primeira versão, ainda não temos o cadastro real de
          planos integrado ao banco (ainda vamos criar os modelos de
          assinatura). Mas este espaço já está reservado para:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-300">
          <li>Lista de usuários com plano ativo (Bronze / Prata / Ouro).</li>
          <li>Histórico de pagamento e status (ativo, em atraso, cancelado).</li>
          <li>Pedidos de cancelamento ou reembolso para avaliar.</li>
          <li>Links rápidos para entrar em contato com artistas de plano.</li>
        </ul>
      </div>
    </section>
  );
}

/* ---------- PROJETOS AVULSOS (ADMIN) ---------- */

function ProjetosAdminView() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-4 text-sm">
        <h2 className="mb-2 text-lg font-semibold">
          Projetos avulsos e trabalhos em andamento
        </h2>
        <p className="text-xs text-zinc-300">
          Esta aba é pensada para você acompanhar os projetos avulsos
          que nasceram a partir de agendamentos únicos: músicas,
          EPs ou trabalhos pontuais que não estão amarrados a um plano
          recorrente. Você consegue ver o que está em produção, o que
          está em revisão e o que já foi entregue.
        </p>
        <p className="mt-2 text-xs text-yellow-300">
          Lembrete importante: ao receber um novo pedido de projeto
          (agendamento + descrição), você pode estabelecer um prazo
          interno de até 48 horas úteis (segunda a sexta) para confirmar
          se aceita o projeto, alinhar escopo com o artista e combinar
          os próximos passos.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-950/70 p-4 text-sm">
        <p className="text-xs text-zinc-400">
          Em versões futuras, este painel pode ser alimentado por:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-300">
          <li>Lista de projetos avulsos ativos, com nome do artista e tipo.</li>
          <li>Status por projeto (em produção, mixando, masterizando, entregue).</li>
          <li>Prazo combinado de entrega e próximos marcos.</li>
          <li>Links diretos para os arquivos finais ou previews.</li>
        </ul>
      </div>
    </section>
  );
}
