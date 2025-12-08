import Header from "../components/Header";

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Suporte / FAQ</h1>
        <p className="mb-6 text-sm text-zinc-300">
          Aqui ficam as respostas para as dúvidas mais comuns sobre o uso do
          site, agendamentos, planos e questões gerais do estúdio.
        </p>

        <div className="space-y-4 text-sm">
          <details className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <summary className="cursor-pointer text-red-400">
              Como funciona o agendamento das sessões?
            </summary>
            <p className="mt-2 text-zinc-300">
              Aqui você explica, em texto, o passo a passo de como agendar,
              prazos, cancelamento etc.
            </p>
          </details>

          <details className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <summary className="cursor-pointer text-red-400">
              Quais são as formas de pagamento dos planos?
            </summary>
            <p className="mt-2 text-zinc-300">
              Aqui você fala de PIX, cartão, cobrança recorrente etc.
            </p>
          </details>

          <details className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <summary className="cursor-pointer text-red-400">
              Quem fica com os direitos das músicas e dos beats?
            </summary>
            <p className="mt-2 text-zinc-300">
              Resumo das regras, com link para a página de Serviços/Contratos.
            </p>
          </details>
        </div>
      </main>
    </>
  );
}
