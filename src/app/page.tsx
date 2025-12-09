"use client";

import React, { useState } from "react";
import Header from "./components/Header";

// ---------------------------------------------------------
// PLANOS (valores base mensais e anuais, em reais)
// ---------------------------------------------------------
type Plano = {
  id: string;
  nome: string;
  mensal: number; // em R$
  anual: number; // em R$
  descricao: string;
  beneficios: { label: string; included: boolean }[];
};

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

export default function Home() {
  const [modoPlano, setModoPlano] = useState<"mensal" | "anual">("mensal");

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        {/* =========================================================
            INTRODUÇÃO / HERO
        ========================================================== */}
        <section
          id="inicio"
          className="mb-12 grid items-start gap-6 md:grid-cols-[1.4fr,1fr]"
        >
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-red-500">
              Estúdio • Produção • Mix &amp; Master • Sonoplastia • Beatmaking
            </p>

            {/* TÍTULO THouse Rec */}
            <h1 className="mb-6 space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-semibold leading-none text-red-500 md:text-5xl">
                  T
                </span>
                <span className="text-3xl font-semibold md:text-4xl">
                  House Rec
                </span>
              </div>

              <p className="text-base font-medium text-zinc-100 md:text-lg">
                Crie sua música com identidade e qualidade profissional, em um
                estúdio pensado para artistas independentes.
              </p>
            </h1>

            {/* INTRODUÇÃO EM CAIXA */}
            <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
                A THouse Rec é o estúdio independente criado por Victor Pereira
                Ramos — o <strong>Tremv</strong> — produtor musical, artista e
                engenheiro de áudio nascido em Botafogo, no Rio de Janeiro. A
                trajetória começou nas batalhas de rima, rodas de freestyle e na
                cena independente, explorando o FL Studio e construindo uma
                estética própria.
              </p>

              <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
                Além da vivência prática, Victor está cursando{" "}
                <strong>Produção Fonográfica (bacharelado) na Estácio</strong>,
                atualmente no <strong>5º período</strong>, com previsão de
                formatura para <strong>dezembro de 2026</strong>. Essa formação
                acadêmica se soma à experiência de estúdio, trazendo uma base
                técnica sólida para cada projeto que passa pela THouse Rec.
              </p>

              <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
                Com o tempo, Tremv passou a produzir artistas, mixar,
                masterizar, trabalhar com sonoplastia e desenvolver uma visão
                completa de projeto: do beat à música finalizada. O estúdio
                nasceu para ser um espaço criativo, acessível e profissional,
                onde cada artista é tratado com atenção e cuidado.
              </p>

              <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
                Hoje, a THouse Rec reúne produções lançadas no YouTube, Spotify
                e SoundCloud, direção de shows, trabalhos como mestre de
                cerimônia e consultorias musicais. A ideia é simples:
                transformar suas referências e ideias em sons que tenham força,
                sentimento e qualidade de lançamento.
              </p>
            </div>
          </div>

          {/* =========================================================
              VÍDEO - CLIPE DO ARTISTA
          ========================================================== */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-red-400">
              Reprogramação — Dizzy (Prod. Tremv)
            </h2>

            <div className="aspect-video overflow-hidden rounded-xl border border-red-700/60 bg-black">
              <iframe
                src="https://www.youtube.com/embed/VIDEO_ID_AQUI"
                title="Clipe THouse Rec"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* =========================================================
            TEXTO EXPLICATIVO ANTES DOS SERVIÇOS
        ========================================================== */}
        <section className="mb-10">
          <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
            Você pode contratar serviços avulsos ou combinar diferentes etapas
            da produção para montar a sessão ideal: captação, mix, master,
            sonoplastia e beats. Cada item pode ser usado separadamente ou em
            conjunto, dependendo da fase em que o seu som está e do tipo de
            suporte que você precisa no estúdio.
          </p>
        </section>

        {/* =========================================================
            CAIXA: SERVIÇOS DE ESTÚDIO
        ========================================================== */}
        <section className="mb-16">
          <div className="space-y-8 rounded-2xl border border-red-700/40 bg-zinc-950 p-6">
            <h2 className="text-center text-xl font-semibold text-red-400">
              Serviços de Estúdio
            </h2>

            {/* LINHA 1 — 3 CAIXAS */}
            <div className="grid grid-cols-3 gap-6">
              {/* Captação */}
              <div className="rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">Captação</p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 50/h</p>
              </div>

              {/* Mix */}
              <div className="rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">Mixagem</p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 110</p>
              </div>

              {/* Master */}
              <div className="rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">
                  Masterização
                </p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 60</p>
              </div>
            </div>

            {/* LINHA 2 — 2 CAIXAS */}
            <div className="mx-auto grid max-w-xl grid-cols-2 gap-6">
              {/* Mix + Master */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">
                  Mix + Master
                </p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 160</p>
              </div>

              {/* Sonoplastia */}
              <div className="rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">Sonoplastia</p>
                <p className="text-xs text-zinc-400">(a partir de)</p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 320</p>
              </div>
            </div>

            {/* DIREITO À SESSÃO */}
            <div className="rounded-xl border border-yellow-600/60 bg-yellow-950/40 p-4">
              <p className="text-sm leading-relaxed text-yellow-100 md:text-base">
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
            CAIXA: BEATS E PACOTES
        ========================================================== */}
        <section className="mb-8">
          <div className="space-y-8 rounded-2xl border border-red-700/40 bg-zinc-950 p-6">
            <h2 className="text-center text-xl font-semibold text-red-400">
              Beats e Pacotes Especiais
            </h2>

            {/* LINHA 1 */}
            <div className="grid grid-cols-3 gap-6">
              {/* 1 beat */}
              <div className="rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">1 Beat</p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 150</p>
              </div>

              {/* 2 beats */}
              <div className="rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">2 Beats</p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 250</p>
              </div>

              {/* 3 beats */}
              <div className="rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">3 Beats</p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 350</p>
              </div>
            </div>

            {/* LINHA 2 */}
            <div className="grid grid-cols-3 gap-6">
              {/* 4 beats */}
              <div className="flex min-h-[110px] flex-col items-center justify-center rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">4 Beats</p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 400</p>
              </div>

              {/* beat + mix + master */}
              <div className="flex min-h-[110px] flex-col items-center justify-center rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">
                  Beat + Mix + Master
                </p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 280</p>
              </div>

              {/* produção completa */}
              <div className="min-h-[110px] rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-center">
                <p className="text-sm font-medium text-zinc-100">
                  Produção Completa
                </p>
                <p className="mt-1 text-xl font-bold text-red-400">R$ 400</p>
                <p className="mt-1 text-xs text-zinc-400">
                  4h captação + beat + mix + master
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            LEMBRETE IMPORTANTE
        ========================================================== */}
        <section className="mb-16">
          <div className="rounded-xl border border-yellow-600/60 bg-yellow-950/40 p-4">
            <p className="text-sm leading-relaxed text-yellow-100 md:text-base">
              <strong>Lembrete importante:</strong> o agendamento só é liberado
              após o pagamento da sessão ou da captação. Para serviços de beats,
              mix e master, você terá acesso a uma área do usuário (em
              desenvolvimento) para acompanhar prazos, pagamentos, andamento do
              projeto e download dos arquivos finalizados.
            </p>
          </div>
        </section>

        {/* =========================================================
            PLANOS — COM TOGGLE MENSAL / ANUAL
        ========================================================== */}
        <section id="planos" className="mb-16">
          <div className="space-y-6 rounded-2xl border border-red-700/40 bg-zinc-950 p-6">
            <h2 className="text-center text-xl font-semibold text-red-400">
              Quer aprofundar e produzir com frequência?
            </h2>

            <p className="mx-auto max-w-3xl text-center text-sm text-zinc-300 md:text-base">
              Os planos da THouse Rec foram pensados para artistas que desejam
              manter uma rotina de lançamentos, garantir prioridade na agenda e
              ter o melhor custo-benefício em relação aos serviços avulsos.
            </p>

            {/* Toggle Mensal / Anual */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-full border border-red-700/60 bg-zinc-900 p-1 text-xs">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                    className="
                      flex h-full flex-col justify-between
                      space-y-6 rounded-2xl border border-red-700/40 bg-zinc-900
                      p-6
                    "
                  >
                    <h3 className="text-center text-lg font-semibold text-red-300">
                      {plano.nome}
                    </h3>

                    <p className="text-center text-2xl font-bold text-red-400">
                      {precoFormatado}
                    </p>

                    <p className="text-center text-xs text-zinc-400">
                      {plano.descricao}
                    </p>

                    <ul className="space-y-2 text-sm text-zinc-200">
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
                      className="mt-auto inline-block rounded-full border border-red-600 px-4 py-2 text-center text-sm font-semibold text-red-300 hover:bg-red-600/20"
                    >
                      Ver este plano em detalhes
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Aviso sobre termos de uso e contrato */}
            <p className="mt-2 text-center text-xs text-zinc-400">
              A contratação de qualquer plano só poderá ser concluída após a
              leitura e o aceite dos <strong>termos de uso</strong> e do{" "}
              <strong>contrato de prestação de serviço</strong>.
            </p>
          </div>
        </section>

        {/* =========================================================
            SHOPPING
        ========================================================== */}
        <section className="mb-16 border-t border-zinc-800 pt-10">
          <h2 className="mb-7 text-center text-3xl font-semibold text-red-400">
            Loja Digital THouse Rec (em desenvolvimento)
          </h2>

          <div className="mx-auto space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-center max-w-6xl">
            <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
              Em breve você poderá adquirir camisetas, moletons, bonés e outros
              itens personalizados exclusivos da THouse Rec.
            </p>

            <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
              A aba <strong>Shopping</strong> está em construção e será
              atualizada conforme os produtos forem lançados, sempre alinhados à
              estética e à identidade do estúdio.
            </p>

            <a
              href="/shopping"
              className="block rounded-full bg-red-600 w-full py-4 text-lg font-semibold text-white text-center hover:bg-red-500"
            >
              Acessar Shopping
            </a>
          </div>
        </section>

        {/* =========================================================
            CHAMADA FINAL
        ========================================================== */}
        <section className="border-t border-zinc-800 pt-12">
          <h2 className="mb-3 text-center text-3xl font-semibold">
            Pronto para começar sua próxima faixa?
          </h2>

          <p className="mb-6 mx-auto max-w-3xl text-center text-sm text-zinc-300 md:text-base">
            A THouse Rec existe para transformar ideias em música real. Se você
            tem um projeto, um verso, um beat ou apenas vontade de começar, esse
            pode ser o momento perfeito para dar o próximo passo com estrutura,
            apoio e qualidade de estúdio.
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            <a
              href="/planos"
              className="flex-1 rounded-full bg-red-600 px-6 py-3 text-center text-base font-semibold text-white hover:bg-red-500"
            >
              Ver planos e pagamentos
            </a>

            <a
              href="/agendamento"
              className="flex-1 rounded-full border border-red-600/60 px-6 py-3 text-center text-base font-semibold text-red-300 hover:border-red-400 hover:text-red-200"
            >
              Agendar sessão
            </a>
          </div>
        </section>

        {/* =========================================================
            DÚVIDAS / SUPORTE
        ========================================================== */}
        <section className="mb-16 border-t border-zinc-800 pt-10">
          <h2 className="mb-3 text-center text-lg font-semibold text-red-400">
            Ficou com alguma dúvida?
          </h2>

          <p className="mb-4 mx-auto max-w-3xl text-center text-sm text-zinc-300 md:text-base">
            Se ainda restar alguma dúvida sobre sessões, prazos, valores ou
            questões técnicas, você pode consultar o FAQ ou falar diretamente
            com o suporte pelo chat. Estamos aqui para te ajudar a tirar o
            máximo proveito de cada sessão.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="/faq"
              className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 hover:border-red-500 hover:text-red-300"
            >
              Ver FAQ
            </a>

            <a
              href="/chat"
              className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 hover:border-red-500 hover:text-red-300"
            >
              Suporte via Chat
            </a>
          </div>

          <div className="mt-4 text-center">
            <a
              href="/contato"
              className="text-xs text-zinc-400 underline-offset-4 hover:underline"
            >
              Contato direto
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
