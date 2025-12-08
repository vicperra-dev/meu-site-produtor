"use client";

import { useState } from "react";
import Header from "../components/Header";

export default function PagamentosPage() {
  const [carregando, setCarregando] = useState(false);

  const handlePagar = async () => {
    try {
      setCarregando(true);

      // EXEMPLO: depois vamos passar planoId, tipo, etc.
      const res = await fetch("/api/pagamentos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "plano",
          planoId: "prata",
          modo: "mensal",
          descricao: "Plano Prata mensal",
          valor: 349.99,
        }),
      });

      if (!res.ok) {
        console.error(await res.text());
        alert("Erro ao criar pagamento. Tente novamente.");
        return;
      }

      const data = await res.json();

      // Mercado Pago geralmente retorna um link tipo init_point / sandbox_init_point
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("Não foi possível obter o link de pagamento.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro inesperado ao iniciar o pagamento.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-3xl px-6 py-10 text-zinc-100">
        <section className="mb-8 space-y-4">
          <h1 className="text-2xl font-semibold md:text-3xl text-center">
            Pagamentos{" "}
            <span className="text-red-500">THouse Rec</span>
          </h1>

          <p className="text-sm leading-relaxed text-zinc-300 md:text-base text-center">
            Aqui você finaliza a compra do seu plano ou sessão. O pagamento é
            processado com segurança pelo{" "}
            <strong>Mercado Pago</strong>, onde você poderá escolher{" "}
            <strong>Pix, cartão de crédito, cartão de débito</strong> ou outras
            formas disponíveis.
          </p>
        </section>

        {/* RESUMO EXEMPLO – depois vamos ligar isso com o agendamento / planos */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-3 text-sm">
          <h2 className="text-lg font-semibold text-red-400">
            Resumo do pagamento
          </h2>

          <p className="text-zinc-300">
            <strong>Tipo:</strong> Plano Prata
          </p>
          <p className="text-zinc-300">
            <strong>Periodicidade:</strong> Mensal
          </p>
          <p className="text-lg font-semibold text-yellow-300">
            Total: R$ 349,99
          </p>

          <p className="text-xs text-zinc-400">
            Ao continuar, você será direcionado para o ambiente seguro do
            Mercado Pago. A compra só será concluída após a confirmação do
            pagamento e o aceite dos <strong>termos de uso</strong> e do{" "}
            <strong>contrato de prestação de serviço</strong> da THouse Rec.
          </p>
        </section>

        <section>
          <button
            type="button"
            onClick={handlePagar}
            disabled={carregando}
            className="w-full rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando
              ? "Redirecionando para o Mercado Pago..."
              : "Pagar com Mercado Pago (Pix, cartão, boleto)"}
          </button>
        </section>
      </main>
    </>
  );
}
