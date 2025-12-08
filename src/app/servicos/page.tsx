import Header from "../components/Header";

export default function ServicosPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Serviços e Contratos</h1>
        <p className="mb-6 text-sm text-zinc-300">
          Nesta página ficam todas as informações sobre os serviços oferecidos,
          termos de uso, direitos autorais, uso de beats, divisão de masters e
          demais questões jurídicas.
        </p>

        <div className="space-y-4 text-sm text-zinc-300">
          <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="mb-2 text-red-400">Serviços oferecidos</h2>
            <ul className="list-disc pl-4 text-xs">
              <li>Captação em estúdio</li>
              <li>Mixagem de faixas</li>
              <li>Masterização para streaming</li>
              <li>Produção de beats personalizados</li>
            </ul>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="mb-2 text-red-400">Direitos autorais e uso de obras</h2>
            <p className="text-xs">
              Aqui você vai detalhar quem detém os direitos sobre fonogramas,
              como funciona a cessão/licenciamento, uso de beats, se há divisão
              de royalties, etc. Idealmente, essa parte pode ser revisada por um
              advogado.
            </p>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="mb-2 text-red-400">Termos de uso e contratos</h2>
            <p className="text-xs">
              Resumo dos principais pontos contratuais e links para PDFs
              completos de contratos, se vocês quiserem disponibilizar.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
