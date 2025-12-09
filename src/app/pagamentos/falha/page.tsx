"use client";

import Link from "next/link";

export default function PagamentoFalhaPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-zinc-100">
      <h1 className="mb-4 text-2xl font-semibold text-red-400">
        Pagamento não concluído
      </h1>

      <p className="mb-3 text-sm text-zinc-300">
        Ocorreu um problema ao processar o seu pagamento.
      </p>

      <p className="mb-6 text-sm text-zinc-300">
        Se o valor tiver sido debitado, o Mercado Pago poderá realizar o
        estorno automaticamente. Em caso de dúvida, fale com o suporte ou
        tente novamente.
      </p>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/planos"
          className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500"
        >
          Ver planos novamente
        </Link>

        <Link
          href="/"
          className="rounded-full border border-zinc-700 px-5 py-2 font-semibold text-zinc-200 hover:border-red-500 hover:text-red-300"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}

