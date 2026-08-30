"use client";

/**
 * GO-03B — Board compartilhado de agendamentos.
 * Mesmo componente para todas as rotas /admin/agendamentos/*.
 * Somente apresentação/consulta: usa exclusivamente as APIs já certificadas
 * (GET/PATCH/DELETE /api/admin/agendamentos, POST cancelar, POST reverter-cancelamento).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFeedback } from "@/components/design-system";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import { notifyAppDataChanged } from "@/app/lib/app-data-events";
import { STATUS_BY_KEY, Icons, serviceTypeLabel, type StatusKey } from "@/app/admin/servicos-ui/meta";
import { StatusTabs } from "@/app/admin/servicos-ui/StatusTabs";
import { Toolbar, type ToolbarState } from "@/app/admin/servicos-ui/Toolbar";
import { Pagination } from "@/app/admin/servicos-ui/Pagination";
import { BoardSkeleton, EmptyState, Spinner } from "@/app/admin/servicos-ui/States";
import type { AdminAgendamento, RelatedService } from "./types";
import {
  APT_PAYMENT_OPTIONS,
  APT_TYPE_FILTERS,
  aptStatusKey,
  matchesAptPayment,
  matchesAptPeriod,
  matchesAptSearch,
  sortAgendamentos,
} from "./meta";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentDrawer } from "./AppointmentDrawer";
import { Breadcrumb } from "./Breadcrumb";

const PAGE_SIZE = 12;
const BASE_PATH = "/admin/agendamentos";

export function AppointmentsBoard({ status }: { status: StatusKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notifySuccess, notifyError, ask, askDelete } = useFeedback();

  const [agendamentos, setAgendamentos] = useState<AdminAgendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [cancelModal, setCancelModal] = useState<{ id: number } | null>(null);
  const [cancelJustificativa, setCancelJustificativa] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Serviços relacionados (drawer): carregados sob demanda da API já existente.
  const [services, setServices] = useState<RelatedService[] | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);

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
  const highlightId = Number(searchParams.get("highlight")) || null;

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

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agendamentos", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(data.agendamentos || []);
      }
    } catch (err) {
      console.error("Erro ao carregar agendamentos", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarServicos = useCallback(async () => {
    setLoadingServices(true);
    try {
      const res = await fetch("/api/admin/servicos", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setServices(data.servicos || []);
      }
    } catch (err) {
      console.error("Erro ao carregar serviços relacionados", err);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useDomainRefresh("admin-agendamentos", () => carregar());

  useEffect(() => {
    void carregar();
    void carregarServicos();
  }, [carregar, carregarServicos]);

  // ?highlight=ID (link vindo dos cards de serviço) abre o drawer do agendamento.
  useEffect(() => {
    if (highlightId && !loading && agendamentos.some((a) => a.id === highlightId)) {
      setDrawerId(highlightId);
    }
  }, [highlightId, loading, agendamentos]);

  async function atualizar() {
    setRefreshing(true);
    await Promise.all([carregar(), carregarServicos()]);
    setRefreshing(false);
  }

  /* --------------------------------- Ações --------------------------------- */

  async function patchStatus(id: number, novoStatus: string, label: string) {
    if (busyId != null) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/agendamentos?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (res.ok) {
        await Promise.all([carregar(), carregarServicos()]);
        notifyAppDataChanged("admin-agendamento-updated");
      } else {
        const data = await res.json().catch(() => ({}));
        notifyError(data.error || `Erro ao ${label} agendamento.`);
        await Promise.all([carregar(), carregarServicos()]);
      }
    } catch (err) {
      console.error(err);
      notifyError(`Erro ao ${label} agendamento.`);
      await Promise.all([carregar(), carregarServicos()]);
    } finally {
      setBusyId(null);
    }
  }

  function abrirModalCancelar(id: number) {
    setCancelModal({ id });
    setCancelJustificativa("");
  }

  function fecharModalCancelar() {
    setCancelModal(null);
    setCancelJustificativa("");
    setCancelSubmitting(false);
  }

  async function confirmarCancelamento() {
    if (!cancelModal) return;
    const justificativa = cancelJustificativa.trim();
    if (justificativa.length < 3) {
      notifyError("Justificativa é obrigatória (mínimo 3 caracteres).");
      return;
    }
    setCancelSubmitting(true);
    try {
      const res = await fetch(`/api/admin/agendamentos/cancelar?id=${cancelModal.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationComment: justificativa }),
      });
      if (res.ok) {
        fecharModalCancelar();
        await carregar();
        notifyAppDataChanged("admin-agendamento-updated");
        notifySuccess(
          "Agendamento cancelado.",
          "O usuário poderá escolher reembolso ou cupom na Minha Conta."
        );
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.error === "string" ? data.error : "Erro ao cancelar agendamento.";
        notifyError(msg);
      }
    } catch (err) {
      console.error("Erro ao cancelar agendamento", err);
      notifyError("Erro ao cancelar agendamento.");
    } finally {
      setCancelSubmitting(false);
    }
  }

  async function reverterCancelamento(id: number) {
    if (
      !(await ask(
        "Reverter cancelamento?",
        "O horário será reservado novamente."
      ))
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/agendamentos/reverter-cancelamento?id=${id}`, {
        method: "POST",
      });
      if (res.ok) {
        await carregar();
        notifyAppDataChanged("admin-agendamento-updated");
        notifySuccess("Cancelamento revertido com sucesso!", "O horário foi reservado novamente.");
      } else {
        const error = await res.json().catch(() => ({}));
        notifyError(error.error || "Erro ao reverter cancelamento.");
      }
    } catch (err) {
      console.error("Erro ao reverter cancelamento", err);
      notifyError("Erro ao reverter cancelamento.");
    }
  }

  async function excluirAgendamento(id: number) {
    if (
      !(await askDelete(
        "Excluir agendamento?",
        "Esta ação não pode ser desfeita."
      ))
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/agendamentos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setDrawerId((v) => (v === id ? null : v));
        await carregar();
        notifyAppDataChanged("admin-agendamento-updated");
        notifySuccess("Agendamento excluído com sucesso!");
      } else {
        const error = await res.json().catch(() => ({}));
        notifyError(error.error || "Erro ao excluir agendamento.");
      }
    } catch (err) {
      console.error("Erro ao excluir agendamento", err);
      notifyError("Erro ao excluir agendamento.");
    }
  }

  /* ------------------------------- Derivações ------------------------------ */

  const clientes = useMemo(
    () =>
      [...new Set(agendamentos.map((a) => a.user.nomeArtistico))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [agendamentos]
  );

  // Filtros (sem status) — base para contadores das abas e para a lista.
  const filtradosSemStatus = useMemo(() => {
    const typeFilter = APT_TYPE_FILTERS.find((t) => t.value === urlState.tipo);
    return agendamentos.filter(
      (a) =>
        matchesAptSearch(a, searchInput.trim()) &&
        matchesAptPeriod(a, urlState.periodo) &&
        (!typeFilter || typeFilter.match(a)) &&
        matchesAptPayment(a, urlState.pagamento) &&
        (!urlState.cliente || a.user.nomeArtistico === urlState.cliente)
    );
  }, [agendamentos, searchInput, urlState.periodo, urlState.tipo, urlState.pagamento, urlState.cliente]);

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
    for (const a of filtradosSemStatus) {
      const key = aptStatusKey(a.status) as StatusKey;
      if (key in c && key !== "todos") c[key]++;
    }
    return c;
  }, [filtradosSemStatus]);

  const daPagina = useMemo(() => {
    const byStatus =
      status === "todos"
        ? filtradosSemStatus
        : filtradosSemStatus.filter((a) => aptStatusKey(a.status) === status);
    return sortAgendamentos(byStatus, urlState.sort);
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

  const servicesByAppointment = useMemo(() => {
    const map = new Map<number, RelatedService[]>();
    for (const s of services || []) {
      if (s.appointmentId == null) continue;
      const list = map.get(s.appointmentId) || [];
      list.push(s);
      map.set(s.appointmentId, list);
    }
    return map;
  }, [services]);

  const drawerAgendamento = drawerId != null ? agendamentos.find((a) => a.id === drawerId) || null : null;

  const statusMeta = STATUS_BY_KEY.get(status);
  const crumbs = [
    { label: "Dashboard", href: "/admin" },
    { label: "Agendamentos", href: `${BASE_PATH}/todos` },
    { label: statusMeta?.label || "Todos", href: `${BASE_PATH}/${statusMeta?.slug || "todos"}` },
    ...(drawerAgendamento ? [{ label: serviceTypeLabel(drawerAgendamento.tipo) }] : []),
  ];

  /* --------------------------------- Render -------------------------------- */

  if (loading) return <BoardSkeleton />;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb items={crumbs} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Agendamentos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestão operacional completa: status, pagamento, serviços e histórico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Abas de status */}
      <StatusTabs basePath={BASE_PATH} active={status} counts={counts} />

      {/* Pesquisa + filtros */}
      <Toolbar
        state={{ ...urlState, search: searchInput }}
        onChange={onToolbarChange}
        clientes={clientes}
        resultCount={daPagina.length}
        noun="agendamento"
        searchPlaceholder="Pesquisar por nome, email, telefone, ID, pagamento, serviço, tipo, plano, cupom ou status…"
        typeFilters={APT_TYPE_FILTERS.map((t) => ({ value: t.value, label: t.label }))}
        paymentOptions={[...APT_PAYMENT_OPTIONS]}
      />

      {/* Lista */}
      {visiveis.length === 0 ? (
        <EmptyState
          status={status}
          filtered={hasFilters}
          noun="agendamento"
          hint="Quando um cliente concluir um pagamento, o agendamento aparece aqui automaticamente."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visiveis.map((a) => (
            <AppointmentCard
              key={a.id}
              agendamento={a}
              servicesCount={services ? (servicesByAppointment.get(a.id) || []).length : undefined}
              relatedServices={servicesByAppointment.get(a.id)}
              highlighted={highlightId === a.id}
              actions={{
                busyId,
                onAbrir: (apt) => setDrawerId(apt.id),
                onAceitar: (id) => void patchStatus(id, "aceito", "aceitar"),
                onRecusar: (id) => void patchStatus(id, "recusado", "recusar"),
                onComecar: (id) => void patchStatus(id, "em_andamento", "iniciar"),
                onCancelar: (id) => abrirModalCancelar(id),
                onReverter: (id) => void reverterCancelamento(id),
                onExcluir: (id) => void excluirAgendamento(id),
              }}
            />
          ))}
        </div>
      )}

      <Pagination page={safePage} totalPages={totalPages} onPage={(p) => writeUrl({ page: p })} />

      {/* Drawer lateral */}
      {drawerAgendamento && (
        <AppointmentDrawer
          agendamento={drawerAgendamento}
          relatedServices={servicesByAppointment.get(drawerAgendamento.id) || []}
          loadingServices={loadingServices && services == null}
          onClose={() => setDrawerId(null)}
          actions={{
            busyId,
            onAceitar: (id) => void patchStatus(id, "aceito", "aceitar"),
            onRecusar: (id) => void patchStatus(id, "recusado", "recusar"),
            onComecar: (id) => void patchStatus(id, "em_andamento", "iniciar"),
            onCancelar: (id) => abrirModalCancelar(id),
            onReverter: (id) => void reverterCancelamento(id),
            onExcluir: (id) => void excluirAgendamento(id),
          }}
        />
      )}

      {/* Modal Justificativa Cancelamento (mesma API já certificada) */}
      {cancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-600 bg-zinc-800 p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-zinc-100">Cancelar agendamento</h3>
            <p className="mb-4 text-sm text-zinc-400">
              Justificativa é obrigatória. O usuário verá essa justificativa na Minha Conta e poderá
              escolher reembolso direto ou cupom para remarcar.
            </p>
            <textarea
              value={cancelJustificativa}
              onChange={(e) => setCancelJustificativa(e.target.value)}
              placeholder="Ex.: Cliente solicitou remarcação por conflito de agenda..."
              className="min-h-[100px] w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500"
              rows={4}
              minLength={3}
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={confirmarCancelamento}
                disabled={cancelSubmitting || cancelJustificativa.trim().length < 3}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelSubmitting ? "Cancelando…" : "Confirmar cancelamento"}
              </button>
              <button
                onClick={fecharModalCancelar}
                disabled={cancelSubmitting}
                className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-500"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
