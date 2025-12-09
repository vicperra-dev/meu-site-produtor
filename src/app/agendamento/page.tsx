"use client";

import React, { useState } from "react";
import Header from "../components/Header";

type Servico = {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
};

type Plano = {
  id: string;
  nome: string;
  mensal: number;
  anual: number;
  descricao: string;
  beneficios: { label: string; included: boolean }[];
};

// Serviços de estúdio (ordem e valores conforme combinado)
const SERVICOS_ESTUDIO: Servico[] = [
  { id: "captacao", nome: "Captação", preco: 50 },
  { id: "sonoplastia", nome: "Sonoplastia (a partir de)", preco: 320 },
  { id: "mix", nome: "Mixagem", preco: 110 },
  { id: "master", nome: "Masterização", preco: 60 },
  { id: "mix_master", nome: "Mix + Master", preco: 160 },
];

// Beats e pacotes
const BEATS_PACOTES: Servico[] = [
  { id: "beat1", nome: "1 Beat", preco: 150 },
  { id: "beat2", nome: "2 Beats", preco: 250 },
  { id: "beat3", nome: "3 Beats", preco: 350 },
  { id: "beat4", nome: "4 Beats", preco: 400 },
  { id: "beat_mix_master", nome: "Beat + Mix + Master", preco: 280 },
  {
    id: "producao_completa",
    nome: "Produção Completa (4h + beat + mix + master)",
    preco: 400,
  },
];

// Planos
const PLANOS: Plano[] = [
  {
    id: "bronze",
    nome: "Plano Bronze",
    mensal: 149.99,
    anual: 1499.99,
    descricao: "Para quem está começando a gravar com frequência.",
    beneficios: [
      { label: "1h de captação por mês", included: true },
      { label: "1 mix por mês", included: true },
      { label: "1 master por mês", included: true },
      { label: "Prioridade na agenda", included: false },
      { label: "Sessão de direção de produção", included: false },
      { label: "Desconto em beats exclusivos", included: false },
    ],
  },
  {
    id: "prata",
    nome: "Plano Prata",
    mensal: 349.99,
    anual: 3499.99,
    descricao: "Para artistas que lançam com regularidade.",
    beneficios: [
      { label: "2h de captação por mês", included: true },
      { label: "2 mix & master por mês", included: true },
      { label: "1 beat por mês", included: true },
      { label: "Prioridade intermediária na agenda", included: true },
      { label: "Sessão de direção de produção", included: false },
      { label: "Desconto em beats exclusivos", included: false },
    ],
  },
  {
    id: "ouro",
    nome: "Plano Ouro",
    mensal: 549.99,
    anual: 5499.99,
    descricao: "Para quem quer acompanhamento contínuo com o Tremv.",
    beneficios: [
      { label: "4h de captação por mês", included: true },
      { label: "2 produções completas por mês", included: true },
      { label: "2 beats por mês", included: true },
      { label: "Prioridade máxima na agenda", included: true },
      { label: "Sessão de direção de produção", included: true },
      { label: "Desconto em beats exclusivos", included: true },
    ],
  },
];

// Horários padrão: 10h às 22h
const HORARIOS_PADRAO = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

export default function AgendamentoPage() {
  const [quantidadesServicos, setQuantidadesServicos] = useState<
    Record<string, number>
  >({});
  const [quantidadesBeats, setQuantidadesBeats] = useState<
    Record<string, number>
  >({});
  const [comentarios, setComentarios] = useState("");
  const [dataBase, setDataBase] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);
  const [modoPlano, setModoPlano] = useState<"mensal" | "anual">("mensal");
  const [mostrarPlanos, setMostrarPlanos] = useState(false);

  // horários ocupados (mock por enquanto)
  const horariosOcupadosPorDia: Record<string, Set<string>> = {};

  const ultimoDiaDoMes = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth() + 1,
    0
  ).getDate();
  const primeiroDiaSemana = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    1
  ).getDay(); // 0 = domingo

  const dias: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  for (let d = 1; d <= ultimoDiaDoMes; d++) dias.push(d);

  const handleQuantServico = (
    id: string,
    delta: number,
    tipo: "estudio" | "beat"
  ) => {
    if (tipo === "estudio") {
      setQuantidadesServicos((prev) => {
        const atual = prev[id] || 0;
        const novo = Math.max(0, atual + delta);
        return { ...prev, [id]: novo };
      });
    } else {
      setQuantidadesBeats((prev) => {
        const atual = prev[id] || 0;
        const novo = Math.max(0, atual + delta);
        return { ...prev, [id]: novo };
      });
    }
  };

  const totalServicos = SERVICOS_ESTUDIO.reduce((acc, s) => {
    const q = quantidadesServicos[s.id] || 0;
    return acc + q * s.preco;
  }, 0);

  const totalBeats = BEATS_PACOTES.reduce((acc, s) => {
    const q = quantidadesBeats[s.id] || 0;
    return acc + q * s.preco;
  }, 0);

  const totalGeral = totalServicos + totalBeats;

  const dataFormatada =
    dataSelecionada && new Date(dataSelecionada).toLocaleDateString("pt-BR");

  const handleMesAnterior = () => {
    setDataBase(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleProximoMes = () => {
    setDataBase(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handleSelecionarDia = (dia: number | null) => {
    if (!dia) return;
    const d = new Date(
      dataBase.getFullYear(),
      dataBase.getMonth(),
      dia
    ).toISOString();
    const onlyDate = d.slice(0, 10);
    setDataSelecionada(onlyDate);
    setHoraSelecionada(null);
  };

  const handleConfirmar = () => {
    if (!dataSelecionada || !horaSelecionada || totalGeral <= 0) {
      alert(
        "Antes de confirmar, escolha pelo menos um serviço, uma data e um horário."
      );
      return;
    }

    console.log("Agendamento:", {
      servicos: quantidadesServicos,
      beats: quantidadesBeats,
      comentarios,
      dataSelecionada,
      horaSelecionada,
      totalGeral,
    });

    alert(
      "Agendamento preparado! Em breve vamos integrar com a área de pagamentos."
    );
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        {/* =========================================================
            TÍTULO / INTRODUÇÃO
        ========================================================== */}
        <section className="mb-10">
          <h1 className="mb-5 text-center text-3xl font-semibold md:text-5xl">
            Crie sua própria música na{" "}
            <span className="text-red-500">THouse Rec</span>
          </h1>
          <p className="text-sm text-center leading-relaxed text-zinc-300 md:text-base">
            Aqui você monta sua sessão de estúdio do seu jeito: escolhendo
            serviços avulsos, pacotes de beats, data e horário no calendário. A
            ideia é deixar o agendamento o mais claro e direto possível, para
            que você foque na parte mais importante: a música.
          </p>
        </section>

        {/* =========================================================
            SERVIÇOS DE ESTÚDIO E AVULSOS
        ========================================================== */}
        <section className="mb-10">
          <div className="space-y-3 rounded-2xl border border-red-700/40 bg-zinc-950 p-6">
            <h2 className="text-center text-3xl font-semibold text-red-400">
              Serviços de Estúdio e Avulsos
            </h2>
            <p className="text-sm text-center leading-relaxed text-zinc-300 md:text-base">
              Selecione os serviços que você deseja para essa sessão. Você pode
              combinar captação, mix, master, sonoplastia e outras opções para
              montar um fluxo de trabalho completo ou apenas o que precisa no
              momento.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {SERVICOS_ESTUDIO.map((s) => {
                const qtd = quantidadesServicos[s.id] || 0;
                const isMixMaster = s.id === "mix_master";

                const cardClass =
                  "flex items-center justify-between rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-sm" +
                  (isMixMaster
                    ? " md:col-span-full md:w-110 md:max-w-lg md:mx-auto md:flex-col md:gap-3 md:text-center"
                    : "");

                const infoClass =
                  "font-semibold text-zinc-100" +
                  (isMixMaster ? " text-center w-full" : "");

                return (
                  <div key={s.id} className={cardClass}>
                    <div className={isMixMaster ? "w-full" : ""}>
                      <p className={infoClass}>{s.nome}</p>
                      <p className="text-xs text-red-300">
                        R$ {s.preco.toFixed(2).replace(".", ",")}
                        {s.id === "captacao" && " / hora"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantServico(s.id, -1, "estudio")
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 text-xs hover:border-red-500"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{qtd}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantServico(s.id, 1, "estudio")
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-red-600 text-xs hover:bg-red-600 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-yellow-600/60 bg-yellow-950/40 p-4 text-sm leading-relaxed text-yellow-100 md:text-base">
              <p className= "space-y-3">
                <strong>Direito à sessão:</strong> quando o tempo de estúdio é
                usado para revisar arranjos, tirar dúvidas, orientar direção
                criativa ou ajustar mix/master sem captação, é cobrado um
                adicional de <strong>R$ 40/hora</strong>, exceto quando já houver
                captação paga.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            BEATS E PACOTES ESPECIAIS
        ========================================================== */}
        <section className="mb-5">
          <div className="space-y-3 rounded-2xl border border-red-700/40 bg-zinc-950 p-6">
            <h2 className="text-center text-3xl font-semibold text-red-400">
              Beats e Pacotes Especiais
            </h2>
            <p className="text-sm text-center leading-relaxed text-zinc-300 md:text-base">
              Se você já tem uma ideia de sonoridade ou quer um beat exclusivo,
              pode selecionar aqui os pacotes de beats e produções completas.
              Esses valores podem ser combinados com os serviços de estúdio para
              fechar um projeto completo.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {BEATS_PACOTES.map((s) => {
                const qtd = quantidadesBeats[s.id] || 0;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-zinc-100">{s.nome}</p>
                      <p className="text-xs text-red-300">
                        R$ {s.preco.toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantServico(s.id, -1, "beat")}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 text-xs hover:border-red-500"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{qtd}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantServico(s.id, 1, "beat")}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-red-600 text-xs hover:bg-red-600 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            COMENTÁRIOS ADICIONAIS
        ========================================================== */}
        <section className="mb-10">
          <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg text-center font-semibold text-red-400">
              Comentários adicionais sobre o seu projeto
            </h2>
            <p className="text-sm text-center text-zinc-300 md:text-base">
              Use este espaço para descrever o que você quer fazer: estilo de
              som, referência de artista, clima da música, se já tem letra ou se
              ainda está montando a ideia. Quanto mais contexto, mais fácil
              alinhar a sessão com o que você busca.
            </p>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-red-500"
              placeholder="Descreva o projeto, referências, mood, tipo de beat, objetivos, etc."
            />
          </div>
        </section>

        {/* =========================================================
            AGENDAMENTO VIRTUAL (CALENDÁRIO + HORÁRIOS)
        ========================================================== */}
        <section className="mb-10">
          <div className="space-y-6 rounded-2xl border border-red-700/40 bg-zinc-950 p-6">
            <h2 className="text-center text-3xl font-semibold text-red-400">
              Agendamento virtual
            </h2>

            <p className="text-sm text-center leading-relaxed text-zinc-300 md:text-base">
              Agora escolha o dia e o horário da sua sessão. Os horários
              disponíveis aparecem em destaque, e conforme o sistema for sendo
              integrado com a agenda real do estúdio, horários ocupados também
              aparecerão como indisponíveis.
            </p>

            <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
              {/* Calendário */}
              <div>
                <div className="mb-3 flex items-center justify-between text-base font-semibold text-zinc-200">
                  <button
                    type="button"
                    onClick={handleMesAnterior}
                    className="rounded-full border border-zinc-700 px-3 py-1 hover:border-red-500"
                  >
                    ◀
                  </button>
                  <span>
                    {dataBase.toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={handleProximoMes}
                    className="rounded-full border border-zinc-700 px-3 py-1 hover:border-red-500"
                  >
                    ▶
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-[10px] text-zinc-300">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, idx) => (
                    <div
                      key={`${idx}-${d}`} // <<< chave única agora
                      className="py-1 text-center text-[10px] text-zinc-400"
                    >
                      {d}
                    </div>
                  ))}

                  {dias.map((dia, idx) => {
                    if (dia === null) return <div key={idx} />;

                    const d = new Date(
                      dataBase.getFullYear(),
                      dataBase.getMonth(),
                      dia
                    )
                      .toISOString()
                      .slice(0, 10);

                    const selecionado = dataSelecionada === d;

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelecionarDia(dia)}
                        className={[
                          "rounded-md border px-1 py-1 text-center text-xs",
                          selecionado
                            ? "border-green-500 bg-green-600/20 text-green-300"
                            : "border-zinc-700 bg-zinc-900 hover:border-red-500/70",
                        ].join(" ")}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horários do dia selecionado */}
              <div className="space-y-3 text-xs">
                <p className="font-semibold text-zinc-200">
                  Horários do dia{" "}
                  {dataSelecionada ? dataFormatada : "(selecione um dia)"}
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
                  {HORARIOS_PADRAO.map((h) => {
                    const ocupados =
                      horariosOcupadosPorDia[dataSelecionada || ""] ||
                      new Set<string>();
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
                            ? "cursor-not-allowed border-red-700 bg-red-900/60 text-red-200"
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
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            TRABALHOS EXTERNOS
        ========================================================== */}
        <section className="mb-10">
          <p className="text-xs text-center leading-relaxed text-zinc-300 md:text-sm">
            Qualquer trabalho à parte, como <strong>técnico de som</strong>,{" "}
            <strong>técnico de mixagem</strong>,{" "}
            <strong>mestre de cerimônia</strong> e outras funções relacionadas
            pode ser solicitado diretamente com o estúdio. Para combinar esse
            tipo de serviço, envie uma mensagem pela página de{" "}
            <a
              href="/contato"
              className="font-semibold text-red-400 underline underline-offset-4 hover:text-red-300"
            >
              contato
            </a>
            .
          </p>
        </section>

        {/* =========================================================
            PLANOS (COLAPSÁVEL)
        ========================================================== */}
        <section className="mb-10">
          <div className="space-y-4 rounded-2xl border border-red-700/40 bg-zinc-950 p-6 text-sm">
            <h2 className="text-center text-lg font-semibold text-red-400">
              Quer aprofundar e produzir com frequência?
            </h2>

            <p className="mx-auto max-w-3xl text-center text-xs text-zinc-300 md:text-sm">
              Se você já sabe que quer manter uma rotina de lançamentos, os
              planos da THouse Rec garantem mais horas de estúdio, melhor
              custo-benefício e prioridade na agenda. Produzir com consistência
              muda completamente o ritmo da sua carreira.
            </p>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setMostrarPlanos((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-red-600 bg-red-600/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-600/20"
              >
                {mostrarPlanos ? "Fechar planos" : "Ver planos disponíveis"}
              </button>
            </div>

            {mostrarPlanos && (
              <>
                {/* Toggle Mensal / Anual */}
                <div className="flex justify-center">
                  <div className="inline-flex rounded-full border border-red-700/60 bg-zinc-900 p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setModoPlano("mensal")}
                      className={`rounded-full px-4 py-1 font-semibold ${
                        modoPlano === "mensal"
                          ? "bg-red-600 text-white"
                          : "text-zinc-300 hover:text-red-300"
                      }`}
                    >
                      Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoPlano("anual")}
                      className={`rounded-full px-4 py-1 font-semibold ${
                        modoPlano === "anual"
                          ? "bg-red-600 text-white"
                          : "text-zinc-300 hover:text-red-300"
                      }`}
                    >
                      Anual
                    </button>
                  </div>
                </div>

                {/* GRID DOS PLANOS */}
                <div className="grid gap-4 md:grid-cols-3">
                  {PLANOS.map((plano) => {
                    const valorBase =
                      modoPlano === "mensal" ? plano.mensal : plano.anual;

                    const precoFormatado =
                      modoPlano === "mensal"
                        ? `R$ ${valorBase.toFixed(2).replace(".", ",")} / mês`
                        : `R$ ${valorBase.toFixed(2).replace(".", ",")} / ano`;

                    return (
                      <div
                        key={plano.id}
                        className="flex flex-col space-y-3 rounded-2xl border border-red-700/40 bg-zinc-900 p-4"
                      >
                        <h3 className="text-center text-sm font-semibold text-red-300">
                          {plano.nome}
                        </h3>
                        <p className="text-center text-lg font-bold text-red-400">
                          {precoFormatado}
                        </p>
                        <p className="text-center text-[11px] text-zinc-400">
                          {plano.descricao}
                        </p>

                        <ul className="space-y-2 text-[11px] text-zinc-200">
                          {plano.beneficios.map((b, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-3 py-2"
                            >
                              <span
                                className={
                                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold " +
                                  (b.included
                                    ? "bg-emerald-500 text-black"
                                    : "bg-red-600 text-black")
                                }
                              >
                                {b.included ? "✓" : "✕"}
                              </span>
                              <span
                                className={
                                  b.included
                                    ? "text-emerald-200"
                                    : "text-red-300 line-through"
                                }
                              >
                                {b.label}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <a
                          href="/planos"
                          className="mt-2 inline-block rounded-full border border-red-600 px-3 py-1 text-center text-[11px] font-semibold text-red-300 hover:bg-red-600/20"
                        >
                          Ver este plano em detalhes
                        </a>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-1 text-center text-[11px] text-zinc-400">
                  A contratação de qualquer plano só poderá ser concluída após a
                  leitura e o aceite dos <strong>termos de uso</strong> e do{" "}
                  <strong>contrato de prestação de serviço</strong>.
                </p>
              </>
            )}
          </div>
        </section>

        {/* =========================================================
            RESUMO / VALOR TOTAL
        ========================================================== */}
            <section className="rounded-2xl border border-red-700/40 bg-zinc-950/70 p-6">
              <h2 className="mb-6 text-2xl font-semibold text-red-400 text-center">
                Resumo do seu agendamento
              </h2>

              {/* linha com as duas colunas */}
              <div className="flex flex-col gap-8 md:flex-row md:items-end">
                {/* COLUNA ESQUERDA – SERVIÇOS */}
                <div className="flex-1">
                  <h3 className="mb-3 text-2xl font-semibold text-zinc-200">
                    Serviços selecionados
                  </h3>

                  <ul className="space-y-1 text-base text-zinc-300">
                    {SERVICOS_ESTUDIO.map((s) => {
                      const q = quantidadesServicos[s.id] || 0;
                      if (!q) return null;
                      return (
                        <li key={s.id}>
                          {q}x {s.nome} — R${" "}
                          {(q * s.preco).toFixed(2).replace(".", ",")}
                        </li>
                      );
                    })}

                    {BEATS_PACOTES.map((s) => {
                      const q = quantidadesBeats[s.id] || 0;
                      if (!q) return null;
                      return (
                        <li key={s.id}>
                          {q}x {s.nome} — R${" "}
                          {(q * s.preco).toFixed(2).replace(".", ",")}
                        </li>
                      );
                    })}

                    {totalGeral === 0 && (
                      <li className="text-zinc-500">
                        Nenhum serviço selecionado ainda.
                      </li>
                    )}
                  </ul>
                </div>

                {/* COLUNA DIREITA – HORÁRIO / DATA / TOTAL */}
                <div className="flex flex-col items-end text-right gap-2">
                  <p className="text-base md:text-2xl font-extrabold text-zinc-300 whitespace-nowrap">
                    Horário:{" "}
                    <span className="font-extrabold">
                      {horaSelecionada || "nenhum horário selecionado"}
                    </span>
                  </p>

                  <p className="text-base md:text-2xl font-extrabold text-zinc-300 whitespace-nowrap">
                    Data:{" "}
                    <span className="font-extrabold">
                      {dataSelecionada ? dataFormatada : "nenhuma data selecionada"}
                    </span>
                  </p>

                  <p className="mt-2 text-2xl md:text-3xl font-extrabold text-yellow-300 whitespace-nowrap">
                    Total estimado: R$ {totalGeral.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>
            </section>

        {/* =========================================================
            CONFIRMAR E IR PARA PAGAMENTO
        ========================================================== */}
        <section className="my-12">
          <div className="space-y-3 rounded-2xl border border-red-700/40 bg-zinc-950 p-6 text-sm">
            <p className="text-sm text-center text-zinc-300 md:text-base">
              Ao prosseguir, você confirma que está ciente de que o agendamento
              só será efetivado após a confirmação do pagamento e de que os
              detalhes finais (como tempo exato de sessão, ajustes e revisões)
              podem ser alinhados diretamente com o estúdio.
            </p>

            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={handleConfirmar}
                className="w-full max-w-6xl rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500"
              >
                Confirmar agendamento e ir para pagamentos
              </button>
            </div>

           <p className="text-xs text-center text-zinc-400">
              A confirmação do agendamento implica concordância com os{" "}
              <strong>termos de uso</strong> e com o{" "}
              <strong>contrato de prestação de serviço</strong> da THouse Rec.
            </p>
          </div>
        </section>

        {/* =========================================================
            DÚVIDAS / SUPORTE
        ========================================================== */}
        <section className="mb-12">
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-3 text-lg font-semibold text-red-400">
              Ficou com alguma dúvida?
            </h2>

            <p className="text-sm text-zinc-300 md:text-base">
              Se ainda restar alguma dúvida sobre horários, valores, planos ou
              funcionamento do estúdio, você pode consultar o FAQ ou falar
              diretamente com a gente pelo chat e pela página de contato.
            </p>

            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="/faq"
                className="rounded-full border border-zinc-700 px-5 py-2 text-xs font-semibold text-zinc-200 hover:border-red-500 hover:text-red-300"
              >
                Ver FAQ
              </a>

              <a
                href="/chat"
                className="rounded-full border border-zinc-700 px-5 py-2 text-xs font-semibold text-zinc-200 hover:border-red-500 hover:text-red-300"
              >
                Suporte via Chat
              </a>

              <a
                href="/contato"
                className="text-xs text-zinc-400 underline-offset-4 hover:underline"
              >
                Contato direto
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
