"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";

export default function RegistroPage() {
  const { registro } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }

    setCarregando(true);
    const ok = await registro(nome, email, senha);
    setCarregando(false);

    if (!ok) {
      setErro("Não foi possível registrar. Verifique se o email já não está em uso.");
      return;
    }

    router.push("/conta");
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-6 py-10 text-zinc-100">
        <h1 className="mb-2 text-2xl font-semibold">Criar conta na THouse Rec</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Crie seu acesso para gerenciar agendamentos, planos e produções com o Tremv.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-red-700/40 bg-zinc-950 p-6"
        >
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Nome artístico</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-500"
              placeholder="Tremv, Dizzy, etc."
            />
          </div>

          {/* Email */}
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

          {/* Senha */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 pr-16 text-sm outline-none focus:border-red-500"
                placeholder="Crie uma senha"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center text-xs text-zinc-400 hover:text-red-400"
              >
                {mostrarSenha ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Confirmar senha</label>
            <div className="relative">
              <input
                type={mostrarConfirmar ? "text" : "password"}
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 pr-16 text-sm outline-none focus:border-red-500"
                placeholder="Repita a senha"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center text-xs text-zinc-400 hover:text-red-400"
              >
                {mostrarConfirmar ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <p className="text-xs text-red-400 bg-red-950/40 rounded px-3 py-2">
              {erro}
            </p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={carregando}
            className={`mt-2 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
              carregando
                ? "cursor-wait bg-zinc-800 text-zinc-500"
                : "bg-red-600 text-white hover:bg-red-500"
            }`}
          >
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      </main>
    </>
  );
}
