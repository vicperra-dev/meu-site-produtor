"use client";

import { useState } from "react";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

type Plano = {
  id: string;
  nome: string;
  mensal: number;
  anual: number;
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

export default function PlanosPage() {
  const [modoPlano, setModoPlano] = useState<"mensal" | "anual">("mensal");
  const [loadingPlanoId, setLoadingPlanoId] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleAssinar = async (plano: Plano) => {
    try {
      if (!user) {
        alert("Você precisa estar logado para assinar um plano.");
        router.push("/login");
        return;
      }

      setLoadingPlanoId(plano.id);

      // ⚠️ IMPORTANTE: rota plural, porque a pasta é /api/pagamentos
      const resp = await fetch("/api/pagamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planoId: plano.id,
          modo: modoPlano,
          userId: user.id,
          nome: user.nome,
          email: user.email,
        }),
      });

      // ---------- ERRO HTTP (4xx / 5xx) ----------
      if (!resp.ok) {
        const status = resp.status;
        const rawText = await resp.text().catch(() => "");

        console.error("Falha ao criar pagamento (HTTP):", {
          status,
          rawText,
        });

        alert(
          `Falha ao criar pagamento.\n\n` +
            `Status HTTP: ${status}\n` +
            `Resposta do servidor:\n` +
            (rawText || "(vazia)")
        );
        return;
      }

      // ---------- SUCESSO (200) ----------
      let data: any = null;
      try {
        data = await resp.json();
      } catch (e) {
        console.error("Não consegui fazer parse do JSON de sucesso:", e);
        alert(
          "Pagamento parece ter sido criado, mas a resposta veio em um formato inesperado.\nVeja o console para mais detalhes."
        );
        return;
      }

      console.log("Resposta de sucesso /api/pagamentos:", data);

      if (!data?.init_point) {
        alert(
          "Resposta do servidor não trouxe o link de pagamento (init_point)."
        );
        return;
      }

      // Redireciona para o checkout do Mercado Pago
      window.location.href = data.init_point;
    } catch (e) {
      console.error("Erro inesperado ao iniciar o pagamento:", e);
      alert("Erro inesperado ao iniciar o pagamento.");
    } finally {
      setLoadingPlanoId(null);
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        {/* =========================================================
            TÍTULO / INTRO
        ========================================================== */}
        <div className="mb-15">
          <h1 className="text-center text-5xl font-bold">
            Planos da{" "}
            <span className="text-red-500">
              THouse Rec
            </span>
          </h1>

          <p className="mt-7 text-center text-zinc-300 text-base leading-relaxed">
            Aqui você escolhe o plano que melhor encaixa na sua rotina de
            lançamentos. Basta selecionar entre{" "}
            <strong>mensal</strong> ou <strong>anual</strong>, conferir os
            benefícios e, ao clicar em <strong>“Assinar plano”</strong>, você
            será direcionado para a sessão de pagamentos. Lá será feita a
            confirmação do plano escolhido e o{" "}
            <strong>
              aceite dos termos de uso e do contrato de prestação de serviço
            </strong>
            .
          </p>
        </div>

        {/* =========================================================
            TOGGLE MENSAL / ANUAL
        ========================================================== */}
        <section className="mb-8">
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
        </section>

        {/* =========================================================
            GRID DOS PLANOS
        ========================================================== */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANOS.map((plano) => {
              const valorBase =
                modoPlano === "mensal" ? plano.mensal : plano.anual;

              const precoFormatado =
                modoPlano === "mensal"
                  ? `R$ ${valorBase.toFixed(2).replace(".", ",")} / mês`
                  : `R$ ${valorBase.toFixed(2).replace(".", ",")} / ano`;

              const isLoading = loadingPlanoId === plano.id;

              return (
                <div
                  key={plano.id}
                  className="
                    flex flex-col justify-between
                    rounded-2xl border border-red-700/40 bg-zinc-900
                    p-6 h-full space-y-6
                  "
                >
                  <div className="space-y-2">
                    <h2 className="text-center text-lg font-semibold text-red-300">
                      {plano.nome}
                    </h2>

                    <p className="text-center text-2xl font-bold text-red-400">
                      {precoFormatado}
                    </p>

                    <p className="text-center text-xs text-zinc-400">
                      {plano.descricao}
                    </p>
                  </div>

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

                  <button
                    type="button"
                    onClick={() => handleAssinar(plano)}
                    disabled={isLoading}
                    className={`mt-3 inline-block w-full rounded-full border border-red-600 px-4 py-2 text-center text-sm font-semibold ${
                      isLoading
                        ? "bg-red-900/40 text-red-200 cursor-wait"
                        : "text-red-300 hover:bg-red-600/20"
                    }`}
                  >
                    {isLoading ? "Redirecionando..." : "Assinar este plano"}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-xs text-zinc-400 max-w-3xl mx-auto">
            A assinatura de qualquer plano só será concluída após a confirmação
            do pagamento e o aceite dos <strong>termos de uso</strong> e do{" "}
            <strong>contrato de prestação de serviço</strong> da THouse Rec.
          </p>
        </section>
      </main>
    </>
  );
}
