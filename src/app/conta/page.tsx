"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ContaPage() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState(user?.nome || "");
  const [foto, setFoto] = useState(user?.foto || "");

  // Se não estiver logado → redireciona
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  if (!user) return null;

  function salvarAlteracoes() {
    updateUser({ nome, foto });
    alert("Perfil atualizado!");
  }

  function voltarParaSite() {
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-200">
      {/* topo: título + botão voltar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">
          Minha Conta — {user.nome}
        </h1>

        <button
          onClick={voltarParaSite}
          className="rounded-full border border-red-600 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-600 hover:text-white transition"
        >
          Voltar para o site
        </button>
      </div>

      <div className="space-y-8">
        {/* INFORMAÇÕES DO PERFIL */}
        <section className="border border-red-700/40 rounded-lg p-6 bg-black/40">
          <h2 className="text-xl font-semibold mb-4">Informações do Perfil</h2>

          <label className="block mb-4">
            <span className="text-sm text-zinc-400">Nome</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full mt-1 rounded bg-zinc-900 border border-zinc-700 px-3 py-2"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-zinc-400">URL da Foto (opcional)</span>
            <input
              type="text"
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
              className="w-full mt-1 rounded bg-zinc-900 border border-zinc-700 px-3 py-2"
            />
          </label>

          <button
            onClick={salvarAlteracoes}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
          >
            Salvar Alterações
          </button>
        </section>

        {/* INFORMAÇÕES DA CONTA */}
        <section className="border border-red-700/40 rounded-lg p-6 bg-black/40">
          <h2 className="text-xl font-semibold mb-4">Informações de Conta</h2>

          <p className="text-sm text-zinc-400">Email registrado:</p>
          <p className="mb-4 text-lg">{user.email}</p>

          <p className="text-sm text-zinc-400 mb-2">ID do usuário:</p>
          <p>{user.id}</p>
        </section>

        {/* BOTÃO DE LOGOUT */}
        <button
          onClick={logout}
          className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded font-semibold w-full"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
