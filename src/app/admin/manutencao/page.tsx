"use client";

import { useEffect, useState } from "react";
import { LoadingBlock, useFeedback } from "@/components/design-system";

export default function AdminManutencaoPage() {
  const { notifySuccess, notifyError, notify } = useFeedback();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarEstado();
  }, []);

  async function carregarEstado() {
    try {
      const res = await fetch("/api/maintenance", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(data.maintenanceMode || false);
      } else {
        console.error("Erro ao carregar estado:", res.status, res.statusText);
      }
    } catch (err) {
      console.error("Erro ao carregar estado de manutenção", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleManutencao() {
    try {
      setSaving(true);
      const novoEstado = !maintenanceMode;
      
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: novoEstado }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(data.maintenanceMode ?? novoEstado);
        if (data.maintenanceMode) {
          notify(
            "Modo de manutenção ATIVADO.",
            "Todos os usuários (exceto admin) verão a página de manutenção."
          );
        } else {
          notifySuccess("Modo de manutenção DESATIVADO.", "O site voltou ao normal.");
        }
      } else {
        const error = await res.json().catch(() => ({ error: `Erro ${res.status}: ${res.statusText}` }));
        console.error("Erro na resposta:", error);
        notifyError(`Erro ao atualizar: ${error.error || "Erro desconhecido"}`);
      }
    } catch (err: any) {
      console.error("Erro ao atualizar modo de manutenção", err);
      notifyError(`Erro ao atualizar modo de manutenção: ${err.message || "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Pausa Virtual para Atualização</h1>
        <p className="text-zinc-400">
          Ative o modo de manutenção para exibir uma página de aviso aos usuários enquanto você atualiza o site.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Modo de Manutenção</h2>
            <p className="text-zinc-400 text-sm">
              {maintenanceMode
                ? "O site está em modo de manutenção. Todos os usuários (exceto você) verão apenas a página de aviso."
                : "O site está funcionando normalmente. Todos os usuários têm acesso completo."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleManutencao}
            disabled={saving}
            className={`
              relative inline-flex h-14 w-28 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900
              ${maintenanceMode ? "bg-red-600" : "bg-zinc-600"}
              ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span
              className={`
                inline-block h-12 w-12 transform rounded-full bg-white transition-transform duration-200 ease-in-out
                ${maintenanceMode ? "translate-x-14" : "translate-x-1"}
              `}
            />
          </button>
          <div className="flex-1">
            <div className="text-lg font-semibold text-zinc-100">
              {maintenanceMode ? "ATIVADO" : "DESATIVADO"}
            </div>
            <div className="text-sm text-zinc-400">
              {maintenanceMode
                ? "Site em manutenção"
                : "Site funcionando normalmente"}
            </div>
          </div>
        </div>

        {maintenanceMode && (
          <div className="rounded-lg border border-yellow-600/50 bg-yellow-600/10 p-4">
            <div className="flex items-start gap-3">
              <div className="text-yellow-400 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-300 mb-1">Modo de Manutenção Ativo</h3>
                <p className="text-sm text-yellow-200/80">
                  Todos os usuários (exceto administradores com <span className="font-mono">role ADMIN</span>) 
                  verão apenas a página de manutenção. Você pode continuar acessando o site normalmente para fazer 
                  atualizações.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-zinc-600/50 bg-zinc-900/50 p-4">
          <h3 className="font-semibold text-zinc-200 mb-2">Como funciona:</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              <span>Quando <strong className="text-zinc-300">DESATIVADO</strong>: O site funciona normalmente para todos os usuários.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              <span>Quando <strong className="text-zinc-300">ATIVADO</strong>: Todos os usuários (exceto admin) são redirecionados para a página de manutenção.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              <span>Administradores (<span className="font-mono">role ADMIN</span>) sempre têm acesso completo, mesmo com o modo ativado.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
