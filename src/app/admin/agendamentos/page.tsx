"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";

interface Agendamento {
  id: number;
  data: string;
  duracaoMinutos: number;
  tipo: string;
  observacoes?: string | null;
  status: string;
}

// serviços avulsos (mesmos valores da Home)
const SERVICOS = [
  { id: "captacao", nome: "Captação", preco: 60 },
  { id: "mix", nome: "Mixagem", preco: 80 },
  { id: "master", nome: "Masterização", preco: 70 },
  { id: "mix_master", nome: "Mix + Master", preco: 130 },
  { id: "sonoplastia", nome: "Sonoplastia", preco: 300 },
];

// pacotes / beats
const PACOTES = [
  { id: "beat1", nome: "1 Beat", preco: 120 },
  { id: "beat2", nome: "2 Beats", preco: 220 },
  { id: "beat3", nome: "3 Beats", preco: 330 },
  { id: "beat4", nome: "4 Beats", preco: 400 },
  { id: "beat_mix_master", nome: "Beat + Mix + Master", preco: 220 },
  {
    id: "producao_completa",
    nome: "Produção completa (4h + beat + mix + master)",
    preco: 320,
  },
];

// horários de funcionamento: 10h às 22h
const HORARIOS_PADRAO = Array.from({ length: 13 }).map((_, i) => {
  const h = 10 + i; // 10 até 22
  return `${h.toString().padStart(2, "0")}:00`;
});

// planos para a seção expansível
const PLANOS = [
  {
    id: "bronze",
    nome: "Plano Bronze",
    descricao: "Para quem quer começar a gravar com frequência.",
    preco: "R$ 280,00 / mês (exemplo)",
    itens: [
      "2h de captação por mês",
      "1 mix por mês",
      "Prioridade padrão na agenda",
      "Acesso ao suporte básico por email",
    ],
  },
  {
    id: "prata",
    nome: "Plano Prata",
    descricao: "Ideal para artistas que lançam com regularidade.",
    preco: "R$ 520,00 / mês (exemplo)",
    itens: [
      "4h de captação por mês",
      "2 mixes por mês",
      "1 master por mês",
      "Prioridade intermediária na agenda",
      "Acompanhamento criativo em 1 faixa por mês",
    ],
  },
  {
    id: "ouro",
    nome: "Plano Ouro",
    descricao: "Para quem quer trampo contínuo e acompanhamento próximo.",
    preco: "R$ 900,00 / mês (exemplo)",
    itens: [
      "8h de captação por mês",
      "4 mixes por mês",
      "2 masters por mês",
      "Prioridade máxima na agenda",
      "Sessões de direção de produção",
      "Descontos em beats exclusivos",
    ],
  },
];

export default function AgendamentoPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [quantServicos, setQuantServicos] = useState<Record<string, number>>(
    {}
  );
  const [quantPacotes, setQuantPacotes] = useState<Record<string, number>>({});
  const [observacoes, setObservacoes] = useState("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  // calendário
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dataSelecionada, setDataSelecionada] = useState<string>("");
  const [horaSelecionada, setHoraSelecionada] = useState<string>("");

  const [mostrarPlanos, setMostrarPlanos] = useState(false);

  const duracaoMinutos = 60; // padrão por hora

  // carregar todos os agendamentos futuros para colorir o calendário
  useEffect(() => {
    async function carregar() {
      const r = await fetch("/api/agendamentos?all=true");
      if (!r.ok) return;
      const d = await r.json();
      setAgendamentos(d.agendamentos || []);
    }
    carregar();
  }, []);

  // mapa dia -> horários ocupados
  const horariosOcupadosPorDia = useMemo(() => {
    const mapa: Record<string, Set<string>> = {};
    agendamentos.forEach((a) => {
      const d = new Date(a.data);
      const dia = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const hora = d.toTimeString().slice(0, 5); // HH:MM
      if (!mapa[dia]) mapa[dia] = new Set();
      mapa[dia].add(hora);
    });
    return mapa;
  }, [agendamentos]);

  // gerar dias do mês para o calendário
  const diasDoMes = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // queremos segunda como início da semana
    const getWeekDayIndex = (d: Date) => {
      const js = d.getDay(); // 0 = domingo
      return (js + 6) % 7; // 0 = segunda
    };

    const days: { date: Date; iso: string }[] = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        iso: date.toISOString().slice(0, 10),
      });
    }

    const leadingBlanks = getWeekDayIndex(firstDay);
    const blanks = Array.from({ length: leadingBlanks });

    return { blanks, days };
  }, [currentMonth]);

  // total de itens, valor e lista resumida para exibição e envio
  const { totalItens, totalValor, itensResumo } = useMemo(() => {
    let itens = 0;
    let valor = 0;
    const resumo: { label: string; quantidade: number; preco: number }[] = [];

    for (const s of SERVICOS) {
      const q = quantServicos[s.id] || 0;
      if (q > 0) {
        itens += q;
        valor += q * s.preco;
        resumo.push({ label: s.nome, quantidade: q, preco: s.preco });
      }
    }

    for (const p of PACOTES) {
      const q = quantPacotes[p.id] || 0;
      if (q > 0) {
        itens += q;
        valor += q * p.preco;
        resumo.push({ label: p.nome, quantidade: q, preco: p.preco });
      }
    }

    return { totalItens: itens, totalValor: valor, itensResumo: resumo };
  }, [quantServicos, quantPacotes]);

  // define data selecionada padrão (hoje) se ainda vazia
  useEffect(() => {
    if (!dataSelecionada) {
      const hoje = new Date();
      const iso = hoje.toISOString().slice(0, 10);
      setDataSelecionada(iso);
    }
  }, [dataSelecionada]);

  function atualizarQuantidade(
    tipo: "servico" | "pacote",
    id: string,
    novaQtd: number
  ) {
    const qtd = Math.max(0, novaQtd);
    if (tipo === "servico") {
      setQuantServicos((prev) => ({ ...prev, [id]: qtd }));
    } else {
      setQuantPacotes((prev) => ({ ...prev, [id]: qtd }));
    }
  }

  function mudarMes(delta: number) {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }

  async function handleAgendar(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("");

    if (!user) {
      setMensagem("Você precisa estar logado para agendar.");
      return;
    }

    if (!dataSelecionada || !horaSelecionada) {
      setMensagem("Escolha uma data e um horário na agenda.");
      return;
    }

    if (totalItens === 0) {
      setMensagem(
        "Selecione pelo menos um serviço ou pacote para agendar."
      );
      return;
    }

    setCarregando(true);

    const itensTexto = itensResumo
      .map(
        (i) =>
          `${i.quantidade}x ${i.label} (R$ ${i.preco},00 cada)`
      )
      .join("\n- ");

    const tipoDescricao = `Agendamento THouse Rec — ${totalItens} item(ns)`;
    const obsFinal =
      `Itens selecionados:\n- ${itensTexto}\n\nValor estimado: R$ ${totalValor},00\n\n` +
      `Observações do cliente:\n${observacoes || "Nenhuma."}`;

    const res = await fetch("/api/agendamentos", {
      method: "POST",
      body: JSON.stringify({
        userId: user.id,
        data: dataSelecionada,
        hora: horaSelecionada,
        duracaoMinutos,
        tipo: tipoDescricao,
        observacoes: obsFinal,
      }),
    });

    setCarregando(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMensagem(d.error || "Erro ao criar agendamento.");
      return;
    }

    setMensagem(
      "Agendamento enviado! Agora você será direcionado para a área de planos/pagamentos para finalizar."
    );

    // recarrega agendamentos para atualizar agenda
    const r = await fetch("/api/agendamentos?all=true");
    if (r.ok) {
      const d = await r.json();
      setAgendamentos(d.agendamentos || []);
    }

    // limpa seleção de horários e quantidades (mantém data)
    setHoraSelecionada("");
    setQuantServicos({});
    setQuantPacotes({});
    setObservacoes("");

    // futuramente você pode trocar para /pagamentos
    router.push("/planos");
  }

  const nomeMes = currentMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-10 text-zinc-100">
        {/* Título + explicação */}
        <section className="mb-10">
          <h1 className="mb-4 text-3xl font-semibold">
            Crie sua própria música na{" "}
            <span className="text-red-500">THouse Rec</span>
          </h1>
          <p className="text-sm leading-relaxed text-zinc-300">
            Na THouse Rec, cada sessão é pensada para tirar a sua ideia do
            papel e transformar em som com identidade. Aqui você monta o
            seu agendamento escolhendo os serviços avulsos ou pacotes que
            fazem sentido para o seu momento — da captação até a
            masterização, passando por beats personalizados e direção de
            produção. Depois de selecionar o que precisa, você escolhe a
            melhor data e horário na agenda e segue para a etapa de
            pagamento, sempre com transparência nos valores e na forma de
            trabalho do Tremv.
          </p>
        </section>

        <form onSubmit={handleAgendar} className="space-y-8">
          {/* Serviços avulsos */}
          <section className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-5">
            <h2 className="mb-3 text-lg font-semibold">
              Serviços de estúdio avulsos
            </h2>
            <p className="mb-4 text-xs text-zinc-400">
              Selecione os serviços que você precisa para esta etapa do
              seu som. Você pode combinar captação, mix, master, mix +
              master e sonoplastia, ajustando as quantidades conforme a
              quantidade de faixas que deseja trabalhar.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {SERVICOS.map((s) => {
                const q = quantServicos[s.id] || 0;
                const isMixMaster = s.id === "mix_master"; // 👈 identifica o card Mix + Master

                return (
                  <div
                    key={s.id}
                    className={
                      "rounded-xl border border-zinc-700 bg-zinc-900/70 flex flex-col gap-2 " +
                      (isMixMaster 
                        ? "max-w-[260px] mx-auto w-full p-2 text-xs" 
                        : "p-3 text-sm")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-xs text-red-400">
                        R$ {s.preco},00
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">
                        Quantidade
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            atualizarQuantidade("servico", s.id, q - 1)
                          }
                          className="h-7 w-7 rounded-full border border-zinc-600 text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={q}
                          onChange={(e) =>
                            atualizarQuantidade(
                              "servico",
                              s.id,
                              Number(e.target.value)
                            )
                          }
                          className="w-12 rounded bg-zinc-900 border border-zinc-700 text-center text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            atualizarQuantidade("servico", s.id, q + 1)
                        }
                        className="h-7 w-7 rounded-full border border-zinc-600 text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

          {/* Beats e pacotes */}
          <section className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-5">
            <h2 className="mb-3 text-lg font-semibold">
              Beats e pacotes especiais
            </h2>
            <p className="mb-4 text-xs text-zinc-400">
              Se você quer um beat personalizado ou já tem em mente uma
              produção completa, use os pacotes abaixo. Você pode combinar
              pacotes com serviços avulsos para montar o fluxo ideal de
              trabalho com o Tremv.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {PACOTES.map((p) => {
                const q = quantPacotes[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-3 text-sm flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.nome}</span>
                      <span className="text-xs text-red-400">
                        R$ {p.preco},00
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">
                        Quantidade
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            atualizarQuantidade(
                              "pacote",
                              p.id,
                              q - 1
                            )
                          }
                          className="h-7 w-7 rounded-full border border-zinc-600 text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={q}
                          onChange={(e) =>
                            atualizarQuantidade(
                              "pacote",
                              p.id,
                              Number(e.target.value)
                            )
                          }
                          className="w-12 rounded bg-zinc-900 border border-zinc-700 text-center text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            atualizarQuantidade(
                              "pacote",
                              p.id,
                              q + 1
                            )
                          }
                          className="h-7 w-7 rounded-full border border-zinc-600 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Comentários adicionais */}
          <section className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-5">
            <h2 className="mb-2 text-lg font-semibold">
              Comentários adicionais
            </h2>
            <p className="mb-2 text-xs text-zinc-400">
              Conte um pouco mais sobre o que você quer construir nesta
              sessão: referências de som, artistas que te inspiram, clima da
              música, tema das letras ou qualquer detalhe técnico que faça
              diferença na hora de produzir.
            </p>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </section>

          {/* Agenda: mês, dias, horários */}
          <section className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-5">
            <h2 className="mb-3 text-lg font-semibold">
              Escolha data e horário na agenda
            </h2>
            <p className="mb-3 text-xs text-zinc-400">
              Use a agenda abaixo para escolher o melhor dia e horário para
              a sua sessão. Horários em{" "}
              <span className="text-red-400">vermelho</span> já estão
              ocupados. Horários em{" "}
              <span className="text-green-400">verde</span> estão livres.
              O estúdio funciona, em geral, de 10h às 22h, e futuros
              bloqueios de horário (como almoço ou compromissos do Victor)
              poderão ser ajustados pelo próprio estúdio.
            </p>

            {/* Navegação do mês */}
            <div className="mb-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => mudarMes(-1)}
                className="rounded-full border border-zinc-600 px-3 py-1 hover:bg-zinc-800"
              >
                Mês anterior
              </button>
              <span className="font-medium capitalize">{nomeMes}</span>
              <button
                type="button"
                onClick={() => mudarMes(1)}
                className="rounded-full border border-zinc-600 px-3 py-1 hover:bg-zinc-800"
              >
                Próximo mês
              </button>
            </div>

            {/* Cabeçalho do calendário */}
            <div className="mb-2 grid grid-cols-7 text-center text-[11px] text-zinc-400">
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            {/* Grade de dias */}
            <div className="mb-4 grid grid-cols-7 gap-1 text-sm">
              {diasDoMes.blanks.map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {diasDoMes.days.map(({ date, iso }) => {
                const isSelected = dataSelecionada === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDataSelecionada(iso)}
                    className={`h-9 rounded-lg border text-center text-xs ${
                      isSelected
                        ? "border-red-500 bg-red-600/20"
                        : "border-zinc-700 bg-zinc-900/60 hover:border-red-500/70"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Horários do dia selecionado */}
            <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
              {HORARIOS_PADRAO.map((h) => {
                const ocupados =
                  horariosOcupadosPorDia[dataSelecionada] || new Set();
                const estaOcupado = ocupados.has(h);
                const selecionado = horaSelecionada === h;

                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() =>
                      !estaOcupado ? setHoraSelecionada(h) : null
                    }
                    className={[
                      "rounded-lg border px-3 py-2 font-medium",
                      estaOcupado
                        ? "border-red-700 bg-red-900/60 text-red-200 cursor-not-allowed"
                        : selecionado
                        ? "border-green-500 bg-green-600/20 text-green-300"
                        : "border-zinc-700 bg-zinc-900/60 hover:border-green-500/70",
                    ].join(" ")}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Seção de planos / cursos com expansão */}
          <section className="rounded-2xl border border-indigo-500/40 bg-zinc-950/70 p-5 text-sm">
            <h2 className="mb-2 text-lg font-semibold">
              Quer aprofundar e produzir com frequência?
            </h2>
            <p className="mb-3 text-xs text-zinc-300">
              Se você já sabe que quer manter uma rotina de lançamentos, os
              planos da THouse Rec podem te dar mais horas de estúdio, melhor
              custo-benefício e acompanhamento mais próximo do Tremv. Além
              dos agendamentos avulsos, os planos ajudam a organizar sua
              carreira musical com mais previsibilidade.
            </p>
            <button
              type="button"
              onClick={() => setMostrarPlanos((v) => !v)}
              className="mb-3 inline-flex rounded-full border border-indigo-400 px-4 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
            >
              {mostrarPlanos ? "Fechar planos" : "Ver planos sugeridos"}
            </button>

            {mostrarPlanos && (
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-xs">
                {PLANOS.map((plano) => (
                  <div
                    key={plano.id}
                    className="rounded-xl border border-indigo-500/50 bg-zinc-900/80 p-3 flex flex-col gap-2"
                  >
                    <h3 className="text-sm font-semibold mb-1">
                      {plano.nome}
                    </h3>
                    <p className="text-[11px] text-zinc-300">
                      {plano.descricao}
                    </p>
                    <p className="text-[11px] text-indigo-200 font-semibold">
                      {plano.preco}
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-zinc-300">
                      {plano.itens.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                    <Link
                      href="/planos"
                      className="mt-2 inline-flex justify-center rounded-full border border-indigo-400 px-3 py-1 text-[11px] font-semibold text-indigo-100 hover:bg-indigo-500/20"
                    >
                      Saber mais
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Resumo final + valor total */}
          <section className="rounded-2xl border border-yellow-500/40 bg-zinc-950/70 p-5 text-sm">
            <h2 className="mb-3 text-lg font-semibold">
              Resumo do que você selecionou
            </h2>

            {itensResumo.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Você ainda não selecionou nenhum serviço ou pacote. Use as
                caixas acima para montar seu agendamento antes de confirmar.
              </p>
            ) : (
              <>
                <ul className="mb-3 space-y-1 text-xs text-zinc-200">
                  {itensResumo.map((item, idx) => (
                    <li key={idx}>
                      {item.quantidade}x {item.label} — R$ {item.preco},00
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-yellow-300">
                  Total estimado: R$ {totalValor},00
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Este é um valor estimado com base nos serviços selecionados.
                  Ajustes podem ocorrer conforme a complexidade real do
                  trabalho, sempre combinados com você antes da finalização.
                </p>
              </>
            )}
          </section>

          {/* Botão de confirmar + lembretes + mensagem */}
          <section className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-5 text-sm space-y-3">
            <button
              type="submit"
              disabled={carregando}
              className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
                carregando
                  ? "cursor-wait bg-zinc-800 text-zinc-500"
                  : "bg-red-600 text-white hover:bg-red-500"
              }`}
            >
              {carregando
                ? "Enviando agendamento..."
                : "Confirmar agendamento e ir para pagamentos"}
            </button>

            {mensagem && (
              <p className="text-xs text-red-300">{mensagem}</p>
            )}

            <p className="text-[11px] text-zinc-500">
              Ao confirmar o agendamento, você declara estar de acordo com
              as condições de uso da THouse Rec, incluindo direitos
              autorais, prazos de entrega e política de remarcação. Esses
              pontos serão detalhados nos contratos e termos disponíveis na
              página de serviços/contratos.
            </p>
          </section>

          {/* FAQ e Suporte */}
          <section className="rounded-2xl border border-zinc-600/60 bg-zinc-950/70 p-5 text-sm">
            <h2 className="mb-2 text-lg font-semibold">
              Ficou com alguma dúvida?
            </h2>
            <p className="mb-3 text-xs text-zinc-300">
              Se ainda restou qualquer dúvida sobre como funcionam os
              agendamentos, planos, pagamentos ou o processo de produção,
              você pode consultar o FAQ ou falar diretamente com o estúdio
              pelo chat ou pelos contatos diretos.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link
                href="/faq"
                className="rounded-full border border-zinc-500 px-4 py-2 hover:bg-zinc-800"
              >
                Ver FAQ
              </Link>
              <Link
                href="/chat"
                className="rounded-full border border-zinc-500 px-4 py-2 hover:bg-zinc-800"
              >
                Abrir chat de suporte
              </Link>
              <Link
                href="/contato"
                className="rounded-full border border-zinc-500 px-4 py-2 hover:bg-zinc-800"
              >
                Ver contatos diretos
              </Link>
            </div>
          </section>
        </form>
      </main>
    </>
  );
}
