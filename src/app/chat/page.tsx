import Header from "../components/Header";

export default function ChatPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Chat de Suporte</h1>
        <p className="mb-6 text-sm text-zinc-300">
          No futuro, essa página pode virar um chat em tempo real ou um
          atendimento com IA. Por enquanto, você pode colocar instruções para o
          artista mandar mensagem por WhatsApp ou e-mail.
        </p>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          <p>
            Exemplo: “Enquanto o chat em tempo real não está ativo, fale com a
            THouse rec pelo WhatsApp (xx) xxxxx-xxxx ou envie um e-mail para
            contato@seuprodutor.com com o assunto SUPORTE”.
          </p>
        </div>
      </main>
    </>
  );
}
