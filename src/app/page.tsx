"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProfessionalBox from "@/app/components/ProfessionalBox";
import { Button, LinkButton } from "@/components/design-system";
import { PLAN_DEFINITIONS, type PlanTierId } from "@/app/lib/plan-definitions";

// ID do vídeo do YouTube - Substitua pelo ID real do vídeo
// Para obter o ID: pegue a URL do YouTube (ex: https://www.youtube.com/watch?v=VIDEO_ID)
// e use apenas a parte após "v=" (antes do primeiro & se houver)
const YOUTUBE_VIDEO_ID = "UPY_DfdiGK4"; // ID do vídeo (apenas a parte após v=)

/** Contorno no glifo + halo externo visível, ainda seguindo o desenho da letra */
const HERO_GLYPH_READABILITY = {
  WebkitTextStroke: "2px #000",
  paintOrder: "stroke fill" as const,
  filter:
    "drop-shadow(0 0 5px #000) drop-shadow(0 0 10px rgba(0,0,0,0.92)) drop-shadow(0 1px 15px rgba(0,0,0,0.72))",
};

/* Texto da bibliografia — edite só aqui; vale para mobile e desktop */
const strong = (s: string) => <strong className="text-red-400">{s}</strong>;
const BIO = {
  p1: <>A {strong("THouse Rec")} é o estúdio independente criado por Victor Pereira Ramos — o {strong("Tremv")} — produtor musical, artista e compositor nascido em Botafogo, no Rio de Janeiro.</>,
  p2: <>Sua trajetória começou nas batalhas de rima, rodas de freestyle e na cena independente, explorando o FL Studio e construindo uma estética própria.</>,
  p3: <>Além da vivência prática, Victor está cursando {strong("Produção Fonográfica (bacharelado) na Estácio")}, atualmente no {strong("6º período")}, com previsão de formatura para {strong("dezembro de 2026")}.</>,
  p4: <>Essa formação acadêmica se soma à experiência de estúdio, trazendo uma base técnica sólida para cada projeto que passa pela THouse Rec.</>,
  p5: <>Com o tempo, Tremv passou a produzir artistas, realizando captações, mixagens, masterizações e criando beats do zero, além de participar de diversos projetos envolvendo sonoplastia. Dessa forma, ele desenvolveu uma visão completa de projeto: {strong("do beat à música finalizada")}, desde a ideia até o lançamento oficial.</>,
  p6: <>O estúdio nasceu para ser um espaço criativo, acessível e profissional, onde cada artista é tratado com atenção e cuidado.</>,
  p7: <>Hoje, a THouse Rec reúne produções lançadas no YouTube, Spotify e SoundCloud, direção de shows, trabalhos como mestre de cerimônia e consultorias musicais.</>,
  p8: <>A ideia é simples: transformar suas referências e ideias em sons que tenham força, sentimento e qualidade de lançamento.</>,
  p9: <>Seja bem-vindo(a), conheça a plataforma, explore nossos serviços e agende sua sessão. Estamos à disposição para que você transforme seu projeto em música com identidade e qualidade profissional.</>,
};

/* =========================
   PLANOS (GO-H10B — PLAN_DEFINITIONS)
========================= */
type Plano = {
  id: string;
  nome: string;
  mensal: number;
  anual: number;
  descricao: string;
  beneficios: { label: string; included: boolean; useTilde?: boolean }[];
};

const PLANOS: Plano[] = (["bronze", "prata", "ouro"] as PlanTierId[]).map((id) => {
  const p = PLAN_DEFINITIONS[id];
  return {
    id: p.id,
    nome: p.nome,
    mensal: p.mensal,
    anual: p.anual,
    descricao: p.descricao,
    beneficios: p.marketingBenefits,
  };
});

export default function Home() {
  const { user } = useAuth();
  const [modoPlano, setModoPlano] = useState<"mensal" | "anual">("mensal");

  return (
    <main className="relative mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-5 text-zinc-100">
        {/* Imagem de fundo da home — cover preenche a tela; posição ajustada para enquadrar melhor */}
        <div
          className="fixed inset-0 z-0 bg-no-repeat bg-zinc-900 page-bg-image"
          style={{
            backgroundImage: "url(/home-bg.png.png)",
            ["--page-bg-size" as string]: "cover",
            ["--page-bg-position" as string]: "center top",
          }}
          aria-hidden
        />

        {/* Conteúdo acima da imagem */}
        <div className="relative z-10">
        {/* =========================================================
            INTRODUÇÃO / HERO (igual à página de produção)
        ========================================================== */}
        <section
          id="inicio"
          className="relative min-h-screen overflow-x-clip pt-[var(--header-h,60px)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-[var(--header-h,60px)] bottom-0">
            <div
              className="absolute left-1/2 w-[min(100%,56rem)] px-3 sm:px-6 text-center max-md:top-[42%] md:top-[43%] lg:top-[44%]"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <div className="relative mx-auto inline-block max-w-full px-1 sm:px-0">
                <h1
                  className="hero-title pointer-events-auto relative z-10 font-extrabold tracking-tight text-white text-center w-full max-w-full md:whitespace-nowrap"
                  style={{
                    fontSize: "clamp(2.75rem, 8.5vw, 6.25rem)",
                    letterSpacing: "0.01em",
                    ...HERO_GLYPH_READABILITY,
                  }}
                >
                  <span className="text-red-500" style={{ fontSize: "1.12em", fontWeight: 800 }}>T</span>House Rec
                </h1>
              </div>

              <div className="relative mx-auto mt-10 w-full max-w-[min(100%,40rem)] sm:mt-12 md:mt-14">
                <p
                  className="hero-services pointer-events-auto relative z-10 uppercase font-bold text-red-500 tracking-[0.12em] md:tracking-[0.16em] text-center max-w-full leading-snug"
                  style={{
                    fontSize: "clamp(0.72rem, 2.2vw, 1.15rem)",
                    ...HERO_GLYPH_READABILITY,
                    WebkitTextStroke: "1.5px #000",
                    filter:
                      "drop-shadow(0 0 4px #000) drop-shadow(0 0 7px rgba(0,0,0,0.9)) drop-shadow(0 1px 10px rgba(0,0,0,0.62))",
                  }}
                >
                  <span className="block">ESTÚDIO • PRODUÇÃO • MIX &amp; MASTER •</span>
                  <span className="block">SONOPLASTIA • BEATMAKING</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTRODUÇÃO EM CAIXA */}
        <section className="mt-4 md:mt-10 flex justify-center px-4">
          <ProfessionalBox contentAlign="inherit">
            {/* Versão Mobile: 9 parágrafos - compacto */}
            <div className="space-y-3 md:hidden text-[11px] sm:text-xs leading-relaxed text-white" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)", textAlign: "justify" }}>
              <p>{BIO.p1}</p>
              <p>{BIO.p2}</p>
              <p>{BIO.p3}</p>
              <p>{BIO.p4}</p>
              <p>{BIO.p5}</p>
              <p>{BIO.p6}</p>
              <p>{BIO.p7}</p>
              <p>{BIO.p8}</p>
              <p>{BIO.p9}</p>
            </div>

            {/* Versão Desktop: 3 blocos - compacto */}
            <div className="hidden md:block space-y-4 text-sm leading-relaxed text-white" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)", textAlign: "justify" }}>
              <p>{BIO.p1} {BIO.p2} {BIO.p3}</p>
              <p>{BIO.p4} {BIO.p5} {BIO.p6}</p>
              <p>{BIO.p7} {BIO.p8} {BIO.p9}</p>
            </div>
          </ProfessionalBox>
        </section>

          {/* =========================================================
              VÍDEO - CLIPE DO ARTISTA
          ========================================================== */}
        <section className="mt-6 sm:mt-8 flex justify-center px-4">
          <div className="flex flex-col items-center space-y-3 w-full max-w-4xl">
            <h2 className="w-full text-left text-sm lg:text-base font-bold uppercase tracking-[0.12em] text-red-400" style={{ textShadow: "0 2px 8px rgba(239, 68, 68, 0.5)" }}>
              Reprogramação — Dizzy (Prod. Tremv)
            </h2>

            <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-lg border border-red-500 bg-zinc-900" style={{ borderWidth: "1px" }}>
              {YOUTUBE_VIDEO_ID ? (
                <iframe
                  src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1&playsinline=1`}
                  title="Clipe THouse Rec - Reprogramação — Dizzy (Prod. Tremv)"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  style={{ border: "none" }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Vídeo não configurado</p>
                    <p className="text-sm">Configure o ID do vídeo do YouTube no arquivo page.tsx</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            TEXTO EXPLICATIVO ANTES DOS SERVIÇOS
        ========================================================== */}
        <section className="mt-4 mb-6 flex justify-center px-4">
          <div className="relative w-full max-w-4xl border border-red-500 rounded-lg" style={{ borderWidth: "1px" }}>
            <div
              className="relative p-3 md:p-4"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <p className="text-xs md:text-sm leading-relaxed text-white md:text-base text-justify md:text-left px-4 md:px-0" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
            Você pode contratar serviços avulsos ou combinar diferentes etapas da produção para montar a sessão ideal: captação, mix, master, sonoplastia e beats. Cada item pode ser usado separadamente ou em conjunto, dependendo da fase em que o seu som está e do tipo de suporte que você precisa no estúdio.
          </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            CAIXA: SERVIÇOS DE ESTÚDIO
        ========================================================== */}
        {/* SERVIÇOS DE ESTÚDIO - compacto */}
        <section className="mb-6 flex justify-center px-4">
          <div className="relative w-full max-w-4xl">
            <div
              className="relative space-y-3 p-3 md:p-4 border border-red-500 rounded-lg"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderWidth: "1px",
              }}
            >
              <h2 className="text-center text-base font-semibold text-red-400 mb-3" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Serviços de Estúdio
            </h2>

            {/* LINHA 1 */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">Sessão</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 40 / h</p>
              </Link>

              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">Captação</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 55 / h</p>
              </Link>

              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">Mixagem</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 110</p>
              </Link>
            </div>

            {/* LINHA 2 */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">Masterização</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 80</p>
              </Link>

              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">Mix + Master</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 170</p>
              </Link>

              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">Sonoplastia</p>
                <p className="text-[9px] md:text-[10px] text-zinc-300">(a partir de)</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 350</p>
              </Link>
            </div>
            </div>
          </div>
        </section>

        {/* CAIXA: BEATS E PACOTES - compacto */}
        <section className="mb-10 flex justify-center px-4">
          <div className="relative w-full max-w-4xl">
            <div
              className="relative space-y-4 p-3 md:p-5 border border-red-500 rounded-lg"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderWidth: "1px",
              }}
            >
              <h2 className="text-center text-base font-semibold text-red-400 mb-3" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Beats e Pacotes Especiais
            </h2>

            {/* LINHA 1 */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {/* 1 beat */}
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">1 Beat</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 150</p>
              </Link>

              {/* 2 beats */}
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">2 Beats</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 250</p>
              </Link>

              {/* 3 beats */}
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">3 Beats</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 350</p>
              </Link>
            </div>

            {/* LINHA 2 */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {/* 4 beats */}
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">4 Beats</p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 400</p>
              </Link>

              {/* beat + mix + master */}
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">
                  Beat + Mix + Master
                </p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 320</p>
              </Link>

              {/* produção completa */}
              <Link href="/agendamento" className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-red-700/40 bg-black/50 backdrop-blur-sm p-2 md:p-3 text-center transition-all hover:border-red-500/60 hover:bg-black/70 cursor-pointer" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
                <p className="text-[10px] md:text-xs font-medium text-white">
                  Produção Completa
                </p>
                <p className="mt-0.5 text-sm md:text-base font-bold text-red-400">R$ 450</p>
                <p className="mt-0.5 text-[9px] md:text-[10px] text-zinc-300">
                  2h Sessão + 2h Captação + beat + mix + master
                </p>
              </Link>
            </div>
            </div>
          </div>
        </section>

        {/* LEMBRETE IMPORTANTE - compacto */}
        <section className="mb-10 flex justify-center px-4">
          <div className="relative w-full max-w-4xl border border-yellow-500 rounded-lg" style={{ borderWidth: "1px" }}>
            <div
              className="relative p-3 md:p-5"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <p className="text-xs md:text-sm leading-relaxed text-yellow-100 md:text-base text-justify md:text-left px-2 md:px-0" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
                <strong className="text-yellow-300">Lembrete importante:</strong> o agendamento só é liberado após o pagamento da sessão ou da captação. Para serviços de beats, mix e master, você terá acesso a uma área do usuário para acompanhar prazos, pagamentos e andamentos dos projetos e serviços.
            </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            PLANOS — COM TOGGLE MENSAL / ANUAL
        ========================================================== */}
        <section id="planos" className="mb-10 flex justify-center px-4">
          <div className="relative w-full max-w-4xl">
            <div
              className="relative space-y-4 p-4 md:p-6 border border-red-500 rounded-lg"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderWidth: "1px",
              }}
            >
              <h2 className="text-center text-base font-semibold text-red-400 mb-3" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Quer aprofundar e produzir com frequência?
            </h2>

              <p className="mx-auto max-w-2xl text-center text-xs text-white md:text-sm" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              Os planos da THouse Rec foram pensados para artistas que desejam
              manter uma rotina de lançamentos e aproveitar benefícios mensais
              do seu plano, com melhor previsibilidade em relação aos serviços avulsos.
            </p>

            {/* Toggle Mensal / Anual */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-full border border-red-700/60 bg-black/60 backdrop-blur-sm p-1 text-xs" style={{ boxShadow: "0 2px 10px rgba(239, 68, 68, 0.2)" }}>
                <Button
                  type="button"
                  variant={modoPlano === "mensal" ? "primary" : "ghost"}
                  size="xs"
                  className="rounded-full"
                  onClick={() => setModoPlano("mensal")}
                >
                  Mensal
                </Button>
                <Button
                  type="button"
                  variant={modoPlano === "anual" ? "primary" : "ghost"}
                  size="xs"
                  className="rounded-full"
                  onClick={() => setModoPlano("anual")}
                >
                  Anual
                </Button>
              </div>
            </div>

            {/* GRID DOS PLANOS - compacto */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
              {PLANOS.map((plano) => {
                const valorBase =
                  modoPlano === "mensal" ? plano.mensal : plano.anual;

                const precoFormatado =
                  modoPlano === "mensal"
                    ? `R$ ${valorBase.toFixed(2).replace(".", ",")} / mês`
                    : `R$ ${valorBase.toFixed(2).replace(".", ",")} / ano`;

                const borderColor = plano.id === "bronze" 
                  ? "border-amber-600/60" 
                  : plano.id === "prata" 
                  ? "border-gray-400/60" 
                  : "border-yellow-400/60";
                const hoverBorderColor = plano.id === "bronze"
                  ? "hover:border-amber-500/80"
                  : plano.id === "prata"
                  ? "hover:border-gray-300/80"
                  : "hover:border-yellow-300/80";

                return (
                  <div
                    key={plano.id}
                    className={`flex h-full flex-col rounded-xl border ${borderColor} bg-black/50 backdrop-blur-sm p-4 transition-all ${hoverBorderColor} hover:bg-black/70`}
                    style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)", borderWidth: "1px" }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1 flex flex-col">
                        <div className="space-y-6">
                          <h3 className="text-center text-lg font-semibold">
                            {plano.id === "bronze" ? (
                              <span className="text-amber-600">Plano Bronze</span>
                            ) : plano.id === "prata" ? (
                              <span className="text-gray-400">Plano Prata</span>
                            ) : plano.id === "ouro" ? (
                              <span className="text-yellow-400">Plano Ouro</span>
                            ) : (
                              <span className="text-red-300">{plano.nome}</span>
                            )}
                    </h3>

                    <p className="text-center text-2xl font-bold text-red-400">
                      {precoFormatado}
                    </p>

                    <p className="text-center text-xs text-zinc-400">
                      {plano.descricao}
                    </p>
                        </div>

                        <ul className="mt-10 space-y-2 mb-6 text-xs text-zinc-200">
                        {plano.beneficios.map((b, idx) => {
                        const useTilde = b.useTilde && b.included;
                        const isPriorityIntermediate = b.label === "Prioridade intermediária" && b.included;
                        const iconColor = b.included 
                          ? (isPriorityIntermediate ? "bg-yellow-500" : "bg-emerald-500") 
                          : "bg-red-600";
                        const textColor = b.included 
                          ? (isPriorityIntermediate ? "text-yellow-200" : "text-emerald-200") 
                          : "text-red-300";
                        const boxBgColor = isPriorityIntermediate ? "bg-yellow-950/40" : "bg-zinc-900";
                        const boxBorderColor = isPriorityIntermediate ? "border-yellow-500/60" : "";
                        
                        return (
                        <li
                          key={idx}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 ${boxBgColor} ${boxBorderColor} ${boxBorderColor ? "border" : ""}`}
                        >
                          <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${iconColor} text-black`}
                            >
                              {useTilde ? "~" : (b.included ? "✓" : "✕")}
                          </span>
                            <span className={b.included ? textColor : "text-red-300"}>
                            {b.label}
                          </span>
                        </li>
                        );
                        })}
                    </ul>
                      </div>

                    <LinkButton
                      href="/planos"
                      variant="outline"
                      size="sm"
                      className="mt-auto rounded-full border-red-600 text-red-300 hover:bg-red-600/20"
                    >
                      Ver este plano em detalhes
                    </LinkButton>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso sobre termos de uso e contrato */}
            <p className="mt-4 md:mt-6 text-center text-xs text-zinc-400 max-w-4xl mx-auto px-4">
              A confirmação implica concordância com os{" "}
              <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>termos de uso</a> e com o{" "}
              <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>contrato de prestação de serviço</a> da THouse Rec.
            </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            SHOPPING
        ========================================================== */}
        <section className="mb-10 flex justify-center px-4">
          <div className="relative w-full max-w-4xl border border-red-500 rounded-lg" style={{ borderWidth: "1px" }}>
            <div
              className="relative space-y-3 p-4 md:p-6"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <h2 className="text-center text-base md:text-lg font-semibold text-red-400 mb-3" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
            Loja Digital THouse Rec (em desenvolvimento)
          </h2>

              <div className="space-y-2 md:space-y-0 overflow-visible">
                {/* Mobile: dois parágrafos — padding maior para não cortar nas laterais */}
                <p className="md:hidden text-xs leading-relaxed text-white text-justify px-6 min-w-0 w-full" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)", boxSizing: "border-box" }}>
                  Em breve você poderá adquirir roupas estilizadas, beats originais e outros produtos. Assinantes Prata e Ouro já têm acesso às promoções exclusivas quando disponíveis.
                </p>
                <p className="md:hidden text-xs leading-relaxed text-white text-justify px-6 min-w-0 w-full" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)", boxSizing: "border-box" }}>
                  A aba <strong className="text-red-300">Shopping</strong> está em preparação para o catálogo de compra e será atualizada conforme os produtos forem lançados.
                </p>
                {/* Desktop: um único texto juntado */}
                <p className="hidden md:block text-base leading-relaxed text-white text-center px-4 md:px-0" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
                  Em breve você poderá adquirir roupas estilizadas, beats originais e outros produtos. Assinantes Prata e Ouro já têm acesso às promoções exclusivas quando disponíveis. A aba <strong className="text-red-300">Shopping</strong> está em preparação para o catálogo de compra.
                </p>
              </div>

              <div className="flex justify-center">
                <LinkButton
                  href="/shopping"
                  variant="primary"
                  size="md"
                  className="max-w-2xl w-full"
                  style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                >
                  Acessar Shopping
                </LinkButton>
              </div>
            </div>
            {/* Linha vermelha inferior */}
            <div
              className="h-[1px] w-full"
              style={{
                background: "rgba(239, 68, 68, 0.6)",
                boxShadow: "0 1px 10px rgba(239, 68, 68, 0.4)",
              }}
            />
          </div>
        </section>

        {/* =========================================================
            CHAMADA FINAL
        ========================================================== */}
        <section className="mb-6 flex justify-center px-4">
          <div className="relative w-full max-w-4xl border border-red-500 rounded-lg" style={{ borderWidth: "1px" }}>
            <div
              className="relative space-y-3 p-4 md:p-5"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <h2 className="text-center text-lg md:text-xl font-semibold text-red-400 mb-2" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
            Pronto para começar sua próxima faixa?
          </h2>

              <p className="mx-auto max-w-4xl text-xs md:text-sm leading-relaxed text-white mb-3 px-3 md:px-4 text-justify md:text-center" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
            A THouse Rec existe para transformar ideias em música real. Se você tem um projeto, um verso, um beat ou apenas vontade de começar, esse pode ser o momento perfeito para dar o próximo passo com estrutura, apoio e qualidade de estúdio.
          </p>

              <div className="flex justify-center">
                <LinkButton
                  href="/agendamento"
                  variant="primary"
                  size="md"
                  className="max-w-xl w-full"
                  style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                >
                  Agendar sessão
                </LinkButton>
              </div>
            </div>
          </div>
        </section>

        {/* DÚVIDAS / SUPORTE - compacto */}
        <section className="mb-6 flex justify-center px-4">
          <div className="relative w-full max-w-4xl border border-red-500 rounded-lg" style={{ borderWidth: "1px" }}>
            <div
              className="relative space-y-3 p-4 md:p-5"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <h2 className="text-center text-base md:text-lg font-semibold text-red-400 mb-2" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
            Ficou com alguma dúvida?
          </h2>

              <p className="mx-auto max-w-4xl text-xs md:text-sm leading-relaxed text-white mb-3 px-3 md:px-4 text-justify md:text-center" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
            Se ainda restar alguma dúvida sobre sessões, prazos, valores ou questões técnicas, você pode consultar o FAQ ou falar diretamente com o suporte pelo chat. Estamos aqui para te ajudar a tirar o máximo proveito de cada sessão.
          </p>

              <div className="flex flex-wrap justify-center items-center gap-2">
            <LinkButton
              href="/faq"
              variant="outline"
              size="xs"
              className="rounded-full border-red-600 text-red-300 hover:border-red-400 hover:text-red-200 hover:bg-red-600/10"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
            >
              Ver FAQ
            </LinkButton>

            <LinkButton
              href="/chat"
              variant="outline"
              size="xs"
              className="rounded-full border-red-600 text-red-300 hover:border-red-400 hover:text-red-200 hover:bg-red-600/10"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
            >
              Suporte via Chat
            </LinkButton>

            <LinkButton
              href="/contato"
              variant="outline"
              size="xs"
              className="rounded-full border-red-600 text-red-300 hover:border-red-400 hover:text-red-200 hover:bg-red-600/10"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
            >
              Contato direto
            </LinkButton>
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>
    );
}
