  "use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import DuvidasBox from "../components/DuvidasBox";
import {
  Button,
  Card,
  Field,
  PageHeader,
  Select,
  useFeedback,
} from "@/components/design-system";
import { PLAN_DEFINITIONS, type PlanTierId } from "@/app/lib/plan-definitions";

// =========================================================
// TIPOS
// =========================================================
type Plano = {
  id: string;
  nome: string;
  mensal: number;
  anual: number;
  descricao: string;
  beneficios: { label: string; included: boolean; useTilde?: boolean }[];
};

// =========================================================
// GO-H10B — Fonte única PLAN_DEFINITIONS
// =========================================================
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

// =========================================================
// COMPONENTE
// =========================================================
export default function PlanosPage() {
  const [mounted, setMounted] = useState(false);
  const [modoPlano, setModoPlano] = useState<"mensal" | "anual">("mensal");
  const [aceiteTermos, setAceiteTermos] = useState<Record<string, boolean>>({
    bronze: false,
    prata: false,
    ouro: false,
  });
  const [testPlanId, setTestPlanId] = useState<"bronze" | "prata" | "ouro">("bronze");
  const [testPlanModo, setTestPlanModo] = useState<"mensal" | "anual">("mensal");

  const { user } = useAuth();
  const router = useRouter();
  const { notifyError, notify } = useFeedback();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleAssinar = async (plano: Plano) => {
    if (!user) {
      notify("Você precisa estar logado para assinar um plano.");
      router.push("/login");
      return;
    }

    if (!aceiteTermos[plano.id]) {
      notify("É preciso marcar a declaração dos Termos de Contrato antes de assinar o plano.");
      return;
    }

    // Redirecionar para página de pagamentos com dados do plano
    const queryParams = new URLSearchParams({
      tipo: "plano",
      planId: plano.id,
      modo: modoPlano,
    });

    router.push(`/pagamentos?${queryParams.toString()}`);
  };

  return (
    <main className="relative mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-5 text-zinc-100 overflow-x-hidden">
      {/* Imagem de fundo da página de Planos */}
      <div
        className="fixed inset-0 z-0 bg-no-repeat bg-zinc-900 page-bg-image"
        style={{
          backgroundImage: "url(/planos-bg.png.png)",
          ["--page-bg-size" as string]: "cover",
          ["--page-bg-position" as string]: "center -8%",
        }}
        aria-hidden
      />
      <div className="relative z-10">
      {/* TÍTULO */}
      <section className="mb-8 flex flex-col items-center justify-center w-full">
        <PageHeader
          title={<>Planos da <span className="text-red-500">THouse Rec</span></>}
          subtitle="Benefícios mensais sem acúmulo — no anual você tem 12 ciclos. Escolha o plano que melhor se encaixa na sua rotina."
          className="justify-center text-center mb-6 sm:mb-8 md:mb-10"
        />

        {/* TOGGLE - BEM PRÓXIMO DO TEXTO */}
        <div className="flex justify-center items-center px-4 w-full mb-3">
          <div className="inline-flex rounded-full border border-red-700/60 bg-zinc-900 p-1">
            <button
              onClick={() => setModoPlano("mensal")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                modoPlano === "mensal"
                  ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : "text-zinc-300 hover:text-red-300 hover:bg-black/40"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setModoPlano("anual")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                modoPlano === "anual"
                  ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : "text-zinc-300 hover:text-red-300 hover:bg-black/40"
              }`}
            >
              Anual
            </button>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="mb-16 flex justify-center px-4">
        <div className="relative w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
            {PLANOS.map((plano) => {
              const valorBase =
                modoPlano === "mensal" ? plano.mensal : plano.anual;

              const precoFormatado =
                modoPlano === "mensal"
                  ? `R$ ${valorBase.toFixed(2).replace(".", ",")} / mês`
                  : `R$ ${valorBase.toFixed(2).replace(".", ",")} / ano`;

              const borderColor = plano.id === "bronze" 
                ? "border-amber-600/80" 
                : plano.id === "prata" 
                ? "border-gray-400/80" 
                : "border-yellow-400/80";
              const hoverBorderColor = plano.id === "bronze"
                ? "hover:border-amber-500"
                : plano.id === "prata"
                ? "hover:border-gray-300"
                : "hover:border-yellow-300";

              return (
                <div
                  key={plano.id}
                  className={`flex h-full flex-col rounded-xl border ${borderColor} bg-black/50 backdrop-blur-sm p-4 transition-all ${hoverBorderColor} hover:bg-black/70`}
                  style={{ 
                    textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)", 
                    borderWidth: "1px",
                    boxShadow: plano.id === "bronze" 
                      ? "0 0 20px rgba(217, 119, 6, 0.4), 0 0 10px rgba(217, 119, 6, 0.2)"
                      : plano.id === "prata"
                      ? "0 0 20px rgba(156, 163, 175, 0.4), 0 0 10px rgba(156, 163, 175, 0.2)"
                      : "0 0 20px rgba(234, 179, 8, 0.4), 0 0 10px rgba(234, 179, 8, 0.2)"
                  }}
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
                          const iconColor = b.included ? "bg-emerald-500" : "bg-red-600";
                          const textColor = b.included ? "text-emerald-200" : "text-red-300";
                          
                          return (
                            <li
                              key={idx}
                              className="flex items-center gap-2 rounded-lg px-4 py-2 bg-zinc-900"
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

                    {/* CHECKBOX DE ACEITE DOS TERMOS */}
                    <div className="mb-4 flex items-center justify-center gap-2">
                      <input
                        type="checkbox"
                        id={`aceite-termos-${plano.id}`}
                        checked={aceiteTermos[plano.id]}
                        onChange={(e) => setAceiteTermos(prev => ({ ...prev, [plano.id]: e.target.checked }))}
                        className="h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-0"
                      />
                      <label
                        htmlFor={`aceite-termos-${plano.id}`}
                        className="text-xs text-white cursor-pointer"
                        style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
                      >
                        Declaro estar ciente dos{" "}
                        <a
                          href="/termos-contratos"
                          className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                        >
                          termos de contrato
                        </a>
                      </label>
                    </div>

                    <Button
                      onClick={() => handleAssinar(plano)}
                      variant="outline"
                      fullWidth
                      className="mt-auto"
                      style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                    >
                      Assinar este plano
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {user && user.role === "ADMIN" && (
        <section className="mb-16 flex justify-center px-4">
          <Card className="relative w-full max-w-4xl border-2 border-yellow-500 bg-yellow-950/20 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-yellow-400">
                🧪 Pagamento de Teste - Plano (Apenas Admin)
              </h3>
              <p className="text-sm text-yellow-200">
                Pagamento simbólico de plano (R$ 5,00) usa o mesmo pipeline do real.
                Escolha Bronze, Prata ou Ouro — os cupons do plano são gerados normalmente.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Field label="Plano" className="text-left">
                  <Select
                    value={testPlanId}
                    onChange={(e) =>
                      setTestPlanId(e.target.value as "bronze" | "prata" | "ouro")
                    }
                    className="border-yellow-600 text-yellow-100"
                    options={[
                      { value: "bronze", label: "Bronze" },
                      { value: "prata", label: "Prata" },
                      { value: "ouro", label: "Ouro" },
                    ]}
                  />
                </Field>
                <Field label="Modo" className="text-left">
                  <Select
                    value={testPlanModo}
                    onChange={(e) =>
                      setTestPlanModo(e.target.value as "mensal" | "anual")
                    }
                    className="border-yellow-600 text-yellow-100"
                    options={[
                      { value: "mensal", label: "Mensal" },
                      { value: "anual", label: "Anual" },
                    ]}
                  />
                </Field>
              </div>
              <Button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/test-payment", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        tipo: "plano",
                        planId: testPlanId,
                        modo: testPlanModo,
                      }),
                    });

                    if (!res.ok) {
                      const error = await res.json();
                      let errorMessage = error.error || "Erro ao criar pagamento de teste";
                      
                      if (error.details?.tipo === "permissao_insuficiente") {
                        errorMessage = `❌ Permissão Insuficiente\n\n${error.error}\n\n${error.details.solucao}\n\n${error.details.guia || ""}`;
                      } else if (error.details?.tipo === "token_invalido") {
                        errorMessage = `❌ Token Inválido\n\n${error.error}\n\n${error.details.solucao}`;
                      } else if (error.details?.tipo === "ambiente_invalido") {
                        errorMessage = `❌ Ambiente Inválido\n\n${error.error}\n\n${error.details.solucao}`;
                      }
                      
                      notifyError(errorMessage);
                      console.error("[Test Payment Frontend] Erro completo:", error);
                      return;
                    }

                    const data = await res.json();
                    if (data.initPoint) {
                      window.location.href = data.initPoint;
                    } else {
                      notifyError("Não foi possível obter o link de pagamento de teste.");
                    }
                  } catch (e) {
                    console.error(e);
                    notifyError("Erro inesperado ao iniciar pagamento de teste.");
                  }
                }}
                variant="primary"
                className="mt-4 w-full max-w-md mx-auto bg-yellow-600 hover:bg-yellow-500"
                style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
              >
                Testar pagamento — {testPlanId} ({testPlanModo})
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* TEXTO FINAL */}
      <section className="mb-16 flex justify-center px-4">
        <div className="relative w-full max-w-4xl border border-red-500 rounded-xl" style={{ borderWidth: "1px" }}>
          <div
            className="relative p-3 md:p-4 rounded-xl"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <p className="text-sm md:text-base leading-relaxed text-white mb-4 text-justify md:text-center px-2 md:px-0" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              Assinar um plano da THouse Rec é a forma mais inteligente de produzir
              com constância. Os planos oferecem benefícios mensais por ciclo
              (cupons de serviço e/ou desconto), conforme o tier escolhido.
            </p>
            
            <p className="text-xs md:text-sm text-zinc-300 mt-4 text-justify md:text-center px-2 md:px-0" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              A contratação de qualquer plano está sujeita à confirmação do pagamento e ao aceite dos{" "}
              <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>termos de uso</a>
              <span className="hidden md:inline"><br />e </span>
              <span className="md:hidden"> e </span>
              <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>contrato de prestação de serviço</a> da THouse Rec.
            </p>
          </div>
        </div>
      </section>

      {/* BOX DE DÚVIDAS */}
      <DuvidasBox />
      </div>
    </main>
  );
}
