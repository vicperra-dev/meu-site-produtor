"use client";

import Link from "next/link";

/** Mesma largura/padding do box "Assinar um plano..." na página Planos (mobile: texto justificado, colunas alinhadas). */
export default function DuvidasBox() {
  return (
    <section className="mb-16 flex justify-center px-4">
      <div className="relative w-full max-w-4xl border border-red-500 rounded-xl" style={{ borderWidth: "1px" }}>
        <div
          className="relative space-y-3 p-3 md:p-4 rounded-xl"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <h2 className="text-base md:text-lg text-center font-semibold text-red-400" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
            Ficou com alguma dúvida?
          </h2>

          <p
            className="text-sm md:text-base leading-relaxed text-white text-justify md:text-center px-2 md:px-0"
            style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
          >
            Se ainda restar alguma dúvida sobre sessões, prazos, valores ou questões técnicas, você pode consultar o FAQ ou falar diretamente com o suporte pelo chat. Estamos aqui para te ajudar a tirar o máximo proveito de cada sessão.
          </p>

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link
              href="/faq"
              className="rounded-full border border-red-600 px-4 py-2 text-xs font-semibold text-red-300 hover:border-red-400 hover:text-red-200 hover:bg-red-600/10 transition-all"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
            >
              Ver FAQ
            </Link>

            <Link
              href="/chat"
              className="rounded-full border border-red-600 px-4 py-2 text-xs font-semibold text-red-300 hover:border-red-400 hover:text-red-200 hover:bg-red-600/10 transition-all"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
            >
              Suporte via Chat
            </Link>

            <Link
              href="/contato"
              className="rounded-full border border-red-600 px-4 py-2 text-xs font-semibold text-red-300 hover:border-red-400 hover:text-red-200 hover:bg-red-600/10 transition-all"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
            >
              Contato direto
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
