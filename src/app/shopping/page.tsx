import Header from "../components/Header";

export default function ShoppingPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        <h1 className="mb-2 text-2xl font-semibold">Shopping THouse rec</h1>
        <p className="mb-6 text-sm text-zinc-300">
          Em breve aqui você encontra roupas, bonés e outros itens
          personalizados da THouse rec. A ideia é ter uma loja simples, direta,
          onde o artista ou fã entra, escolhe a peça e finaliza a compra sem
          burocracia.
        </p>

        {/* GRADE DE PRODUTOS (placeholder) */}
        <section className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <div className="mb-3 aspect-[4/5] w-full rounded-lg bg-zinc-900" />
              <h2 className="mb-1 text-sm font-semibold text-red-400">
                Produto {item}
              </h2>
              <p className="mb-2 text-xs text-zinc-300">
                Descrição curta da peça (camiseta, moletom, boné, etc).
              </p>
              <p className="mb-3 text-sm font-semibold text-zinc-100">
                R$ 0,00
              </p>
              <button className="mt-auto rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500">
                Ver detalhes / Comprar
              </button>
            </div>
          ))}
        </section>

        <p className="mt-8 text-xs text-zinc-500">
          Mais pra frente, podemos integrar essa página com um sistema de
          e-commerce (pagamento via PIX/cartão, cálculo de frete, controle de
          estoque, etc.).
        </p>
      </main>
    </>
  );
}
