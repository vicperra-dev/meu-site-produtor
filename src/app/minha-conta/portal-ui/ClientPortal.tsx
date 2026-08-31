"use client";

/**
 * Portal do Cliente (GO-03D / GO-H12A) — shell principal de Minha Conta.
 *
 * GET /api/meus-dados + mark-read (FAQ, agendamentos, planos) +
 * useDomainRefresh. Sem polling periódico (evita flicker).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import {
  Avatar,
  Button,
  SkeletonCard,
  Skeleton,
  cx,
  Icon,
} from "@/components/design-system";
import type { PortalData } from "./types";
import { TABS, TabKey, isTabKey } from "./tabs";
import { DashboardHome } from "./DashboardHome";
import { AgendaSection } from "./AgendaSection";
import { DownloadsSection, collectDownloads } from "./DownloadsSection";
import { CouponsSection } from "./CouponsSection";
import { PlanSection } from "./PlanSection";
import { HistorySection } from "./HistorySection";
import { NotificationsSection } from "./NotificationsSection";
import { ProfileSection } from "./ProfileSection";
import { HelpSection } from "./HelpSection";

function PortalSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}

export function ClientPortal() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalData>({
    agendamentos: [],
    planos: [],
    cupons: [],
    faqQuestions: [],
    pagamentos: [],
    notifications: [],
  });
  const markReadInflight = useRef(false);

  const tabParam = searchParams.get("tab");
  const tab: TabKey = isTabKey(tabParam) ? tabParam : "visao-geral";
  const aptFocus = searchParams.get("apt");

  const carregarDados = useCallback(async () => {
    try {
      const timestamp = new Date().getTime();
      const [res, notifRes] = await Promise.all([
        fetch(`/api/meus-dados?t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }),
        fetch(`/api/notificacoes?t=${timestamp}`, {
          cache: "no-store",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }),
      ]);
      if (res.ok) {
        const payload = await res.json();
        let notifications = [];
        if (notifRes.ok) {
          const nPayload = await notifRes.json();
          notifications = nPayload.notifications || [];
        }
        setData({
          agendamentos: payload.agendamentos || [],
          planos: payload.planos || [],
          cupons: payload.cupons || [],
          faqQuestions: payload.faqQuestions || [],
          pagamentos: payload.pagamentos || [],
          notifications,
        });

        if (!markReadInflight.current) {
          const perguntasRespondidasNaoLidas = (payload.faqQuestions || []).filter(
            (p: { status: string; readAt?: string | null }) =>
              p.status === "respondida" && !p.readAt
          );
          const agendamentosConfirmadosNaoLidos = (payload.agendamentos || []).filter(
            (a: {
              status: string;
              pagamento?: { status?: string };
              readAt?: string | null;
            }) => {
              const isConfirmed =
                (a.status === "aceito" || a.status === "confirmado") &&
                a.pagamento?.status === "approved";
              return isConfirmed && !a.readAt;
            }
          );
          const planosAtivosNaoLidos = (payload.planos || []).filter(
            (p: { status: string; ativo?: boolean; readAt?: string | null }) => {
              const isActive = p.status === "active" && p.ativo === true;
              return isActive && !p.readAt;
            }
          );

          const promises: Promise<unknown>[] = [];
          if (perguntasRespondidasNaoLidas.length > 0) {
            promises.push(
              ...perguntasRespondidasNaoLidas.map((p: { id: string }) =>
                fetch("/api/faq/mark-read", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ questionId: p.id }),
                }).catch((err) => console.error("Erro ao marcar pergunta como lida:", err))
              )
            );
          }
          if (agendamentosConfirmadosNaoLidos.length > 0) {
            promises.push(
              ...agendamentosConfirmadosNaoLidos.map((a: { id: number }) =>
                fetch("/api/appointments/mark-read", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ appointmentId: a.id }),
                }).catch((err) => console.error("Erro ao marcar agendamento como lido:", err))
              )
            );
          }
          if (planosAtivosNaoLidos.length > 0) {
            promises.push(
              ...planosAtivosNaoLidos.map((p: { id: string }) =>
                fetch("/api/plans/mark-read", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ planId: p.id }),
                }).catch((err) => console.error("Erro ao marcar plano como lido:", err))
              )
            );
          }
          if (promises.length > 0) {
            markReadInflight.current = true;
            void Promise.all(promises)
              .then(() => {
                const nowIso = new Date().toISOString();
                setData((prev) => ({
                  ...prev,
                  faqQuestions: prev.faqQuestions.map((q) =>
                    perguntasRespondidasNaoLidas.some((p: { id: string }) => p.id === q.id)
                      ? { ...q, readAt: q.readAt || nowIso }
                      : q
                  ),
                  agendamentos: prev.agendamentos.map((a) =>
                    agendamentosConfirmadosNaoLidos.some((x: { id: number }) => x.id === a.id)
                      ? { ...a, readAt: a.readAt || nowIso }
                      : a
                  ),
                  planos: prev.planos.map((p) =>
                    planosAtivosNaoLidos.some((x: { id: string }) => x.id === p.id)
                      ? { ...p, readAt: p.readAt || nowIso }
                      : p
                  ),
                }));
                window.dispatchEvent(new CustomEvent("faq-updated"));
                window.dispatchEvent(new CustomEvent("appointment-updated"));
                window.dispatchEvent(new CustomEvent("plan-updated"));
              })
              .finally(() => {
                markReadInflight.current = false;
              });
          }
        }
      } else {
        const errorText = await res.text();
        console.error("[Minha Conta] Erro na resposta:", res.status, errorText);
        if (res.status >= 500) {
          setData((prev) => ({ ...prev, cupons: [] }));
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { refresh: refreshConta } = useDomainRefresh(
    ["minha-conta", "cupons", "planos", "pagamentos"],
    async () => {
      if (!user) return;
      await carregarDados();
    }
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    void refreshConta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // GO-H12A: sem polling periódico. Soft refresh ao voltar para a aba (DomainSync cobre eventos).
  useEffect(() => {
    if (!user) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void carregarDados();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [user?.id, carregarDados]);

  async function markNotificationsRead(ids: string[] | "all") {
    const body = ids === "all" ? { all: true } : { ids };
    const res = await fetch("/api/notificacoes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => {
        if (ids === "all") return n.readAt ? n : { ...n, readAt: now };
        return ids.includes(n.id) ? { ...n, readAt: n.readAt || now } : n;
      }),
    }));
  }

  async function openNotificationFromHome(n: import("./types").PortalNotification) {
    await markNotificationsRead([n.id]);
    if (n.actionHref) {
      router.push(n.actionHref);
    } else {
      goTo("notificacoes");
    }
  }

  function goTo(next: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "visao-geral") params.delete("tab");
    else params.set("tab", next);
    params.delete("apt");
    router.replace(`/minha-conta${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  const badges = useMemo(() => {
    const downloads = collectDownloads(data.agendamentos).length;
    const cupons = data.cupons.filter((c) => c.status === "disponivel").length;
    const respostas = data.faqQuestions.filter(
      (p) => p.status === "respondida" && !p.readAt
    ).length;
    const notificacoes = (data.notifications || []).filter((n) => !n.readAt).length;
    return { downloads, cupons, respostas, notificacoes };
  }, [data]);

  if (authLoading || !user || (user && loading)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 sm:p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <PortalSkeleton />
        </div>
      </div>
    );
  }

  const primeiroNome = user.nomeArtistico?.split(/\s+/)[0] || user.nomeArtistico;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={user.nomeArtistico} size="lg" className="hidden sm:inline-flex" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                Olá, {primeiroNome}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Bem-vindo novamente. Este é o seu portal do cliente.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            icon="refresh"
            onClick={() => {
              setLoading(true);
              void carregarDados();
            }}
            title="Atualizar dados"
          >
            Atualizar
          </Button>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-1.5 -mx-1 px-1.5 sm:mx-0"
          aria-label="Seções da conta"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            const badge =
              t.key === "downloads"
                ? badges.downloads
                : t.key === "cupons"
                  ? badges.cupons
                  : t.key === "notificacoes"
                    ? badges.notificacoes
                    : t.key === "ajuda"
                      ? badges.respostas
                      : 0;
            return (
              <button
                key={t.key}
                onClick={() => goTo(t.key)}
                className={cx(
                  "relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors flex-shrink-0",
                  active
                    ? "bg-red-600 text-white shadow-sm shadow-red-900/40"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                )}
              >
                <Icon name={t.icon} className="w-3.5 h-3.5" />
                {t.label}
                {badge > 0 && (
                  <span
                    className={cx(
                      "ml-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      active ? "bg-white/20 text-white" : "bg-red-600 text-white"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="animate-[fadeIn_.2s_ease]">
          {tab === "visao-geral" && (
            <DashboardHome
              nome={primeiroNome}
              data={data}
              goTo={goTo}
              onOpenNotification={(n) => void openNotificationFromHome(n)}
            />
          )}
          {tab === "agendamentos" && (
            <AgendaSection
              agendamentos={data.agendamentos}
              onChanged={carregarDados}
              focusId={aptFocus ? Number(aptFocus) : null}
            />
          )}
          {tab === "downloads" && <DownloadsSection agendamentos={data.agendamentos} />}
          {tab === "cupons" && (
            <CouponsSection cupons={data.cupons} onChanged={carregarDados} />
          )}
          {tab === "plano" && (
            <PlanSection planos={data.planos} cupons={data.cupons} onChanged={carregarDados} />
          )}
          {tab === "historico" && <HistorySection data={data} />}
          {tab === "notificacoes" && (
            <NotificationsSection data={data} onMarkRead={markNotificationsRead} />
          )}
          {tab === "perfil" && <ProfileSection />}
          {tab === "ajuda" && <HelpSection faqQuestions={data.faqQuestions} />}
        </div>
      </div>
    </div>
  );
}
