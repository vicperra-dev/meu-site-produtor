"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const ok = await login(email, senha);

    setCarregando(false);

    if (!ok) {
      setErro("Email ou senha inválidos.");
      return;
    }

    // deu certo → vai pra conta
    router.push("/conta");
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-6 py-10 text-zinc-100">
        <h1 className="mb-2 text-2xl font-semibold">Entrar na THouse Rec</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Acesse sua conta para acompanhar agendamentos, planos e serviços.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-red-700/40 bg-zinc-950 p-6"
        >
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-500"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-500"
              placeholder="Sua senha"
            />
          </div>

          {erro && (
            <p className="text-xs text-red-400 bg-red-950/40 rounded px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className={`mt-2 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
              carregando
                ? "cursor-wait bg-zinc-800 text-zinc-500"
                : "bg-red-600 text-white hover:bg-red-500"
            }`}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    </>
  );
}
