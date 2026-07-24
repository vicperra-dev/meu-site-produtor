"use client";

/**
 * GO-03A — Board compartilhado de serviços (Serviços Gerais + Selecionados).
 * Mesmo componente para todas as rotas /admin/servicos/* e
 * /admin/servicos-selecionados/*. Somente apresentação/consulta:
 * usa exclusivamente as APIs já certificadas (GET/PATCH /api/admin/servicos).
 * GO-H8B: sem DELETE isolado de Service (Pedido Raiz / purgeOrderTree).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFeedback } from "@/components/design-system";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import { notifyAppDataChanged } from "@/app/lib/app-data-events";
import type { AdminService, BoardVariant } from "./types";
import {
  Icons,
  TYPE_FILTERS,
  matchesPeriod,
  serviceTypeLabel,
  sortServices,
  formatDate,
  type StatusKey,
} from "./meta";
import { StatusTabs } from "./StatusTabs";
import { Toolbar, type ToolbarState } from "./Toolbar";
import { ServiceCard } from "./ServiceCard";
import { Pagination } from "./Pagination";
import { BoardSkeleton, EmptyState, Spinner } from "./States";
import { DeliveryModal } from "./DeliveryModal";

const PAGE_SIZE = 12;
const PAID = new Set(["approved", "received", "confirmed"]);

const VARIANT_CONFIG: Record<
  BoardVariant,
  { title: string; subtitle: string; basePath: string; surface: "servicos-gerais" | "servicos-selecionados" }
> = {
  gerais: {
    title: "Serviços Gerais",
    subtitle: "Visão completa de todos os serviços: status, pagamento, agendamento e entrega.",
    basePath: "/admin/servicos",
    surface: "servicos-gerais",
  },
  selecionados: {
    title: "Serviços Selecionados",
    subtitle: "Fila operacional dos serviços vinculados a agendamentos.",
    basePath: "/admin/servicos-selecionados",
    surface: "servicos-selecionados",
  },
};

function matchesPayment(s: AdminService, filter: string): boolean {
  if (!filter) return true;
  const st = String(s.payment?.status || "").toLowerCase();
  switch (filter) {
    case "aprovado":
      return PAID.has(st);
    case "pendente":
      return st === "pending";
    case "reembolsado":
      return st === "refunded" || st === "refund";
    case "sem_pagamento":
      return !s.payment;
    default:
      return true;
  }
}

function matchesSearch(s: AdminService, q: string): boolean {
  if (!q) return true;
  const hay = [
    s.user.nomeArtistico,
    s.user.email,
    s.id,
    s.appointment?.id != null ? String(s.appointment.id) : "",
    s.tipo,
    serviceTypeLabel(s.tipo),
    s.status,
    s.payment?.status || "",
    s.payment?.paymentMethod || "",
    s.payment ? s.payment.amount.toFixed(2) : "",
    formatDate(s.appointment?.data || s.createdAt),
    s.description || "",
    s.observacoes || "",
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => hay.includes(term));
}

export function ServicosBoard({ variant, status }: { variant: BoardVariant; status: StatusKey }) {
  const cfg = VARIANT_CONFIG[variant];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notifyError } = useFeedback();

  const [servicos, setServicos] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [entregaService, setEntregaService] = useState<AdminService | null>(null);

  /* -------------------- Estado dos filtros (fonte: URL) -------------------- */

  const urlState: ToolbarState = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      periodo: searchParams.get("periodo") || "todos",
      tipo: searchParams.get("tipo") || "",
      pagamento: searchParams.get("pagamento") || "",
      cliente: searchParams.get("cliente") || "",
      sort: searchParams.get("sort") || "date_desc",
    }),
    [searchParams]
  );
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Input de pesquisa local (instantâneo) + sincronização debounced com a URL.
  const [searchInput, setSearchInput] = useState(urlState.search);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeUrl = useCallback(
    (patch: Partial<ToolbarState & { page: number }>) => {
      const params = new URLSearchParams(searchParams.toString());
      const set = (key: string, value: string | number | undefined, defaultValue?: string) => {
        const v = value === undefined ? undefined : String(value);
        if (!v || v === defaultValue) params.delete(key);
        else params.set(key, v);
      };
      if ("search" in patch) set("search", patch.search);
      if ("periodo" in patch) set("periodo", patch.periodo, "todos");
      if ("tipo" in patch) set("tipo", patch.tipo);
      if ("pagamento" in patch) set("pagamento", patch.pagamento);
      if ("cliente" in patch) set("cliente", patch.cliente);
      if ("sort" in patch) set("sort", patch.sort, "date_desc");
      if ("page" in patch) set("page", patch.page === 1 ? undefined : patch.page);
      else params.delete("page"); // qualquer mudança de filtro volta à página 1
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const onToolbarChange = useCallback(
    (patch: Partial<ToolbarState>) => {
      if ("search" in patch) {
        setSearchInput(patch.search || "");
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => writeUrl({ search: patch.search || "" }), 250);
        return;
      }
      writeUrl(patch);
    },
    [writeUrl]
  );

  useEffect(() => {
    setSearchInput(urlState.search);
  }, [urlState.search]);

  /* ------------------------------ Carregamento ----------------------------- */

  const carregar = useCallback(async (withRepair = false) => {
    try {
      const url = withRepair ? "/api/admin/servicos?repair=1" : "/api/admin/servicos";
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setServicos(data.servicos || []);
      }
    } catch (err) {
      console.error("Erro ao carregar serviços", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDomainRefresh(cfg.surface, () => carregar(false));

  useEffect(() => {
    void carregar(true);
  }, [carregar]);

  async function atualizar() {
    setRefreshing(true);
    await carregar(false);
    setRefreshing(false);
  }

  /* --------------------------------- Ações --------------------------------- */

  async function patchStatus(id: string, novoStatus: string, label: string) {
    try {
      setBusyId(id);
      const res = await fetch(`/api/admin/servicos?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (res.ok) {
        await carregar();
        notifyAppDataChanged("admin-servico-updated");
      } else {
        const data = await res.json().catch(() => ({}));
        notifyError(data.error || `Erro ao ${label} serviço.`);
      }
    } catch (err) {
      console.error(err);
      notifyError(`Erro ao ${label} serviço.`);
    } finally {
      setBusyId(null);
    }
  }

  // GO-H8B: exclusão física isolada removida — Service não é raiz.
  // Interromper via status cancelado; limpar árvore via Pedido Raiz / Homologação.

  /* ------------------------------- Derivações ------------------------------ */

  // Variante: Selecionados = somente serviços vinculados a agendamento.
  const daVariante = useMemo(
    () => (variant === "selecionados" ? servicos.filter((s) => s.appointmentId != null) : servicos),
    [servicos, variant]
  );

  const clientes = useMemo(
    () => [...new Set(daVariante.map((s) => s.user.nomeArtistico))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [daVariante]
  );

  // Filtros (sem status) — base para contadores das abas e para a lista.
  const filtradosSemStatus = useMemo(() => {
    const typeFilter = TYPE_FILTERS.find((t) => t.value === urlState.tipo);
    return daVariante.filter(
      (s) =>
        matchesSearch(s, searchInput.trim()) &&
        matchesPeriod(s, urlState.periodo) &&
        (!typeFilter || typeFilter.match(s.tipo)) &&
        matchesPayment(s, urlState.pagamento) &&
        (!urlState.cliente || s.user.nomeArtistico === urlState.cliente)
    );
  }, [daVariante, searchInput, urlState.periodo, urlState.tipo, urlState.pagamento, urlState.cliente]);

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = {
      todos: filtradosSemStatus.length,
      pendente: 0,
      aceito: 0,
      em_andamento: 0,
      concluido: 0,
      cancelado: 0,
      recusado: 0,
    };
    for (const s of filtradosSemStatus) {
      if (s.status in c) c[s.status as StatusKey]++;
    }
    return c;
  }, [filtradosSemStatus]);

  const daPagina = useMemo(() => {
    const byStatus =
      status === "todos" ? filtradosSemStatus : filtradosSemStatus.filter((s) => s.status === status);
    return sortServices(byStatus, urlState.sort);
  }, [filtradosSemStatus, status, urlState.sort]);

  const totalPages = Math.max(1, Math.ceil(daPagina.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visiveis = daPagina.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters = Boolean(
    searchInput.trim() ||
      (urlState.periodo && urlState.periodo !== "todos") ||
      urlState.tipo ||
      urlState.pagamento ||
      urlState.cliente
  );

  /* --------------------------------- Render -------------------------------- */

  if (loading) return <BoardSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">{cfg.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{cfg.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={atualizar}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <Icons.refresh className="w-3.5 h-3.5" />}
          {refreshing ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {/* Abas de status */}
      <StatusTabs basePath={cfg.basePath} active={status} counts={counts} />

      {/* Pesquisa + filtros */}
      <Toolbar
        state={{ ...urlState, search: searchInput }}
        onChange={onToolbarChange}
        clientes={clientes}
        resultCount={daPagina.length}
      />

      {/* Lista */}
      {visiveis.length === 0 ? (
        <EmptyState status={status} filtered={hasFilters} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              actions={{
                busyId,
                onAceitar: (id) => void patchStatus(id, "aceito", "aceitar"),
                onIniciar: (id) => void patchStatus(id, "em_andamento", "iniciar"),
                onEntregar: (svc) => setEntregaService(svc),
              }}
            />
          ))}
        </div>
      )}

      <Pagination page={safePage} totalPages={totalPages} onPage={(p) => writeUrl({ page: p })} />

      {/* Modal de entrega */}
      {entregaService && (
        <DeliveryModal
          service={entregaService}
          onClose={() => setEntregaService(null)}
          onSaved={async () => {
            await carregar();
            notifyAppDataChanged("admin-servico-updated");
          }}
        />
      )}
    </div>
  );
}
