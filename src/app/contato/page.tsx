import Header from "../components/Header";

export default function ContatoPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Contato</h1>
        <p className="mb-6 text-sm text-zinc-300">
          Entre em contato com a THouse rec para dúvidas, orçamentos e
          parcerias.
        </p>

        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            ✉️ E-mail: <strong>contato@seuprodutor.com</strong>
          </p>
          <p>
            📱 WhatsApp: <strong>(00) 00000-0000</strong>
          </p>
          <p>
            📍 Cidade/Região: <strong>Definir aqui</strong>
          </p>
        </div>

        {/* Futuro: formulário de contato */}
        <p className="mt-8 text-xs text-zinc-500">
          Mais pra frente, podemos colocar aqui um formulário de contato com
          nome, e-mail, assunto e mensagem, conectado ao e-mail do produtor.
        </p>
      </main>
    </>
  );
}
