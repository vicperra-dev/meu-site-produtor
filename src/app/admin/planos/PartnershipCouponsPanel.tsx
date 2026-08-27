"use client";

import { useEffect, useRef, useState } from "react";
import { CHECKOUT_CATALOG, CANONICAL_SERVICE_IDS } from "@/app/lib/service-catalog";
import { useFeedback } from "@/components/design-system";
import {
  parsePartnershipFixedAmount,
  partnershipExpiryError,
  tomorrowIsoStudio,
  type PartnershipUserSearchHit,
} from "@/app/lib/promotional-coupon";

type PartnershipRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  applicableLabels: string[];
  maxUses: number | null;
  useCount: number;
  remainingUses: number | null;
  expiresAt: string | null;
  isActive: boolean;
  used: boolean;
  adminNote: string | null;
  assignedUser: { id: string; nomeArtistico: string; email: string } | null;
};

export function PartnershipCouponsPanel() {
  const { notifySuccess, notifyError } = useFeedback();
  const [rows, setRows] = useState<PartnershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [suggestions, setSuggestions] = useState<PartnershipUserSearchHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [assignedUser, setAssignedUser] = useState<PartnershipUserSearchHit | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState("50");
  const [allServices, setAllServices] = useState(false);
  const [selectedSkus, setSelectedSkus] = useState<string[]>(["mix", "master"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [expiryHint, setExpiryHint] = useState<string | null>(null);
  const [amountHint, setAmountHint] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState<"1" | "3" | "5" | "unlimited">("3");
  const [adminNote, setAdminNote] = useState("");

  const minExpiry = tomorrowIsoStudio();

  async function loadCupons() {
    setLoading(true);
    try {
      const cuponsRes = await fetch("/api/admin/cupons/promocionais", {
        credentials: "include",
      });
      if (cuponsRes.ok) {
        const data = await cuponsRes.json();
        setRows(data.cupons || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCupons();
  }, []);

  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!boxRef.current?.contains(ev.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = userSearch.trim();
    if (assignedUser && q === assignedUser.nomeArtistico) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (q.length < 1) {
      setSuggestions([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/admin/usuarios/buscar?q=${encodeURIComponent(q)}`,
            { credentials: "include" }
          );
          const data = await res.json().catch(() => ({}));
          setSuggestions(Array.isArray(data.usuarios) ? data.usuarios : []);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        } finally {
          setSearchingUsers(false);
        }
      })();
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userSearch, assignedUser]);

  function selectUser(u: PartnershipUserSearchHit) {
    setAssignedUser(u);
    setUserSearch(u.nomeArtistico);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function toggleSku(id: string) {
    setSelectedSkus((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedUser?.id) {
      notifyError("Selecione o usuário beneficiado na lista de sugestões.");
      return;
    }
    const amount = parsePartnershipFixedAmount(discountValue);
    if (!amount.ok) {
      setAmountHint(amount.error);
      notifyError(amount.error);
      return;
    }
    setAmountHint(null);
    const expErr = partnershipExpiryError(expiresAt);
    if (expErr) {
      setExpiryHint(expErr);
      notifyError(expErr);
      return;
    }
    setExpiryHint(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cupons/promocionais", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: assignedUser.id,
          code: code.trim() || null,
          discountValue: amount.value,
          allServices,
          applicableServiceTypes: selectedSkus,
          expiresAt,
          maxUses: maxUses === "unlimited" ? "unlimited" : Number(maxUses),
          adminNote,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(data.error || "Não foi possível criar o cupom.");
        return;
      }
      notifySuccess(`Cupom ${data.coupon?.code || ""} criado.`);
      setCode("");
      setAdminNote("");
      await loadCupons();
    } catch {
      notifyError("Falha ao criar cupom de parceria.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(id: string, next: boolean) {
    const res = await fetch("/api/admin/cupons/promocionais", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notifyError(data.error || "Não foi possível atualizar.");
      return;
    }
    await loadCupons();
  }

  function usesLabel(row: PartnershipRow) {
    if (row.maxUses == null) return `${row.useCount} (ilimitado)`;
    return `${row.useCount} / ${row.maxUses}`;
  }

  function discountLabel(row: PartnershipRow) {
    return row.discountType === "percent"
      ? `${row.discountValue}%`
      : `R$ ${Number(row.discountValue).toFixed(2)}`;
  }

  function rowCanReactivate(row: PartnershipRow) {
    if (row.used) return false;
    if (row.remainingUses === 0) return false;
    if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) return false;
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-amber-200">Cupons de parceria</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Desconto promocional em reais para um artista específico. Não é benefício de
            plano, reembolso, remarcação nem homologação.
          </p>
        </div>

        <form onSubmit={criar} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm md:col-span-2" ref={boxRef}>
            <span className="text-zinc-300">Usuário beneficiado</span>
            <input
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setAssignedUser(null);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Buscar nome artístico, nome ou e-mail..."
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            {showSuggestions && (suggestions.length > 0 || searchingUsers) && (
              <ul className="mt-1 max-h-56 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 shadow-lg">
                {searchingUsers && suggestions.length === 0 && (
                  <li className="px-3 py-2 text-zinc-500">Buscando…</li>
                )}
                {suggestions.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-zinc-800"
                      onClick={() => selectUser(u)}
                    >
                      <div className="font-medium text-zinc-100">{u.nomeArtistico}</div>
                      {u.nomeCompleto && u.nomeCompleto !== u.nomeArtistico && (
                        <div className="text-xs text-zinc-400">{u.nomeCompleto}</div>
                      )}
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {assignedUser ? (
              <p className="text-xs text-emerald-400">
                Selecionado: {assignedUser.nomeArtistico} — {assignedUser.email}
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Digite e clique em uma sugestão. O usuário é obrigatório.
              </p>
            )}
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Código (opcional)</span>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ARTISTA20"
                className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 font-mono text-zinc-100"
              />
              <button
                type="button"
                className="rounded-lg border border-zinc-600 px-3 text-xs text-zinc-300"
                onClick={() =>
                  setCode(`PARC${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
                }
              >
                Gerar
              </button>
            </div>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Valor do desconto (R$)</span>
            <input
              required
              inputMode="decimal"
              value={discountValue}
              onChange={(e) => {
                setDiscountValue(e.target.value);
                const parsed = parsePartnershipFixedAmount(e.target.value);
                setAmountHint(parsed.ok ? null : parsed.error);
              }}
              placeholder="50,00"
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            {amountHint && <p className="text-xs text-red-400">{amountHint}</p>}
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Validade</span>
            <input
              required
              type="date"
              min={minExpiry}
              value={expiresAt}
              onChange={(e) => {
                setExpiresAt(e.target.value);
                setExpiryHint(partnershipExpiryError(e.target.value));
              }}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
            {expiryHint && <p className="text-xs text-red-400">{expiryHint}</p>}
            <p className="text-xs text-zinc-500">
              Somente datas futuras (a partir de {minExpiry.split("-").reverse().join("/")}).
            </p>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Limite de usos</span>
            <select
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value as typeof maxUses)}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100"
            >
              <option value="1">1 uso</option>
              <option value="3">3 usos</option>
              <option value="5">5 usos</option>
              <option value="unlimited">Ilimitado até a validade</option>
            </select>
          </label>

          <div className="md:col-span-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={allServices}
                onChange={(e) => setAllServices(e.target.checked)}
              />
              Válido para todos os serviços de estúdio
            </label>
            {!allServices && (
              <div className="flex flex-wrap gap-2">
                {CANONICAL_SERVICE_IDS.map((id) => (
                  <label
                    key={id}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                      selectedSkus.includes(id)
                        ? "border-amber-500 bg-amber-500/20 text-amber-200"
                        : "border-zinc-600 text-zinc-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedSkus.includes(id)}
                      onChange={() => toggleSku(id)}
                    />
                    {CHECKOUT_CATALOG[id].nome}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-zinc-300">Observação interna</span>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100"
              placeholder="Parceria, colaboração, acordo…"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {saving ? "Criando…" : "Criar cupom de parceria"}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-800/50">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Artista</th>
              <th className="px-3 py-2 text-left">Desconto</th>
              <th className="px-3 py-2 text-left">Serviços</th>
              <th className="px-3 py-2 text-left">Usos</th>
              <th className="px-3 py-2 text-left">Validade</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Observação</th>
              <th className="px-3 py-2 text-left">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-500">
                  Nenhum cupom de parceria ainda.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-mono text-zinc-100">{row.code}</td>
                <td className="px-3 py-2">
                  <div className="text-zinc-100">{row.assignedUser?.nomeArtistico}</div>
                  <div className="text-xs text-zinc-500">{row.assignedUser?.email}</div>
                </td>
                <td className="px-3 py-2 text-zinc-200">{discountLabel(row)}</td>
                <td className="px-3 py-2 text-zinc-300">{row.applicableLabels.join(", ")}</td>
                <td className="px-3 py-2 text-zinc-200">{usesLabel(row)}</td>
                <td className="px-3 py-2 text-zinc-300">
                  {row.expiresAt
                    ? new Date(row.expiresAt).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      !row.isActive
                        ? "text-zinc-400"
                        : row.used
                          ? "text-red-300"
                          : "text-green-300"
                    }
                  >
                    {!row.isActive ? "Inativo" : row.used ? "Esgotado" : "Ativo"}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-500 max-w-[12rem] truncate">
                  {row.adminNote || "—"}
                </td>
                <td className="px-3 py-2">
                  {row.isActive ? (
                    <button
                      type="button"
                      onClick={() => void setActive(row.id, false)}
                      className="text-xs rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:border-amber-500"
                    >
                      Desativar
                    </button>
                  ) : rowCanReactivate(row) ? (
                    <button
                      type="button"
                      onClick={() => void setActive(row.id, true)}
                      className="text-xs rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:border-amber-500"
                    >
                      Reativar
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-500">Inativo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
