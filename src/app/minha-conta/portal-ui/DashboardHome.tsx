"use client";

/**
 * Portal do Cliente — Visão geral (GO-H12).
 * Ordem: Próximos (só Pendente) → Histórico (demais) → Notificações.
 * Status via paleta oficial alinhada ao admin.
 */

import { useMemo } from "react";
import {
  Card,
  Grid,
  Icon,
  IconName,
  Section,
  StatusBadge,
  cx,
  formatDate,
  formatTime,
  formatDateTime,
  Button,
} from "@/components/design-system";
import type { Agendamento, PortalData, PortalNotification } from "./types";
import type { TabKey } from "./tabs";
import { collectDownloads } from "./DownloadsSection";
import { serviceOrderLabel } from "@/app/lib/ui/service-order-visual";
import { normalizeOfficialStatus } from "@/app/lib/ui/status-palette";

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone = "text-zinc-100",
  onClick,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="text-left rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-600 hover:bg-zinc-800/60 hover:-translate-y-0.5 group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex w-8 h-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-red-400 transition-colors">
          <Icon name={icon} className="w-4 h-4" />
        </span>
        <Icon
          name="chevron-right"
          className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors"
        />
      </div>
      <p className={cx("text-2xl font-bold leading-tight", tone)}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </button>
  );
}

function orderLabel(a: Agendamento): string {
  return serviceOrderLabel(a.serviceOrderType || a.tipo);
}

/** Fonte da verdade: status do Appointment no banco (confirmado → aceito na UI). */
function displayStatus(a: Agendamento): string {
  return normalizeOfficialStatus(a.status) || a.status;
}

function AppointmentRow({ a }: { a: Agendamento }) {
  return (
    <Card className="flex items-center gap-3">
      <span className="flex flex-col items-center justify-center w-12 rounded-lg bg-zinc-800 border border-zinc-700 py-1">
        <span className="text-[10px] uppercase text-zinc-500 leading-none">
          {new Date(a.data).toLocaleDateString("pt-BR", { month: "short" })}
        </span>
        <span className="text-base font-bold text-zinc-100 leading-tight">
          {new Date(a.data).getDate()}
        </span>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{orderLabel(a)}</p>
        <p className="text-[11px] text-zinc-500">
          {formatDate(a.data)} às {formatTime(a.data)}
        </p>
      </div>
      <StatusBadge status={displayStatus(a)} />
    </Card>
  );
}

function NotificationPreview({
  n,
  onOpen,
}: {
  n: PortalNotification;
  onOpen: (n: PortalNotification) => void;
}) {
  const unread = !n.readAt;
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cx(
        "w-full text-left rounded-lg border px-3 py-2.5 transition-colors",
        unread
          ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
          : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/50"
      )}
    >
      <div className="flex items-start gap-2">
        {unread ? (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-400" aria-label="Nova" />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-700" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cx("text-sm truncate", unread ? "font-semibold text-zinc-50" : "font-medium text-zinc-200")}>
              {n.title}
            </p>
            {unread && (
              <span className="shrink-0 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                Nova
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-2 whitespace-pre-line">
            {n.message}
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">{formatDateTime(n.createdAt)}</p>
        </div>
      </div>
    </button>
  );
}

export function DashboardHome({
  data,
  goTo,
  onOpenNotification,
}: {
  nome: string;
  data: PortalData;
  goTo: (tab: TabKey) => void;
  onOpenNotification?: (n: PortalNotification) => void;
}) {
  const resumo = useMemo(() => {
    const ativos = new Set(["pendente", "aceito", "confirmado", "em_andamento"]);
    const servicosAtivos = data.agendamentos.filter((a) => ativos.has(a.status)).length;
    const downloads = collectDownloads(data.agendamentos).length;
    const cuponsDisponiveis = data.cupons.filter((c) => c.status === "disponivel").length;
    const planoAtual = data.planos.find((p) => p.ativo) ?? null;
    const pagamentosPendentes = (data.pagamentos ?? []).filter(
      (p) => p.status === "pending"
    ).length;
    const notifUnread = (data.notifications ?? []).filter((n) => !n.readAt).length;
    return {
      servicosAtivos,
      downloads,
      cuponsDisponiveis,
      planoAtual,
      pagamentosPendentes,
      notifUnread,
    };
  }, [data]);

  /** GO-H12: exclusivamente Pendente, mais próximo primeiro. */
  const proximos = useMemo(() => {
    return data.agendamentos
      .filter((a) => displayStatus(a) === "pendente")
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 8);
  }, [data.agendamentos]);

  /** GO-H12: todos os demais status, mais recente primeiro. */
  const historicoRecente = useMemo(() => {
    return data.agendamentos
      .filter((a) => displayStatus(a) !== "pendente")
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 8);
  }, [data.agendamentos]);

  const notificacoes = useMemo(
    () => (data.notifications ?? []).slice(0, 6),
    [data.notifications]
  );

  return (
    <div className="space-y-6">
      <Grid cols={3} className="lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          icon="music"
          label="Serviços ativos"
          value={resumo.servicosAtivos}
          hint="Agendamentos pendentes, aceitos ou em andamento"
          onClick={() => goTo("agendamentos")}
        />
        <SummaryCard
          icon="calendar"
          label="Próximos agendamentos"
          value={proximos.length}
          hint="Somente agendamentos pendentes"
          onClick={() => goTo("agendamentos")}
        />
        <SummaryCard
          icon="download"
          label="Downloads disponíveis"
          value={resumo.downloads}
          hint="Arquivos entregues pelo estúdio"
          tone={resumo.downloads > 0 ? "text-emerald-300" : "text-zinc-100"}
          onClick={() => goTo("downloads")}
        />
        <SummaryCard
          icon="ticket"
          label="Cupons disponíveis"
          value={resumo.cuponsDisponiveis}
          hint="Cupons de plano, serviço e reembolso prontos para usar"
          tone={resumo.cuponsDisponiveis > 0 ? "text-amber-300" : "text-zinc-100"}
          onClick={() => goTo("cupons")}
        />
        <SummaryCard
          icon="box"
          label="Plano atual"
          value={resumo.planoAtual ? resumo.planoAtual.planName : "—"}
          hint={resumo.planoAtual ? "Plano ativo" : "Nenhum plano ativo"}
          tone={resumo.planoAtual ? "text-emerald-300" : "text-zinc-500"}
          onClick={() => goTo("plano")}
        />
        <SummaryCard
          icon="bell"
          label="Notificações novas"
          value={resumo.notifUnread}
          hint="Notificações não lidas da conta"
          tone={resumo.notifUnread > 0 ? "text-red-300" : "text-zinc-100"}
          onClick={() => goTo("notificacoes")}
        />
      </Grid>

      <Section
        title="Próximos agendamentos"
        icon="calendar"
        description="Apenas solicitações pendentes de aprovação."
        actions={
          <button
            onClick={() => goTo("agendamentos")}
            className="text-xs font-semibold text-red-400 hover:text-red-300 inline-flex items-center gap-1"
          >
            Ver todos
            <Icon name="arrow-right" className="w-3 h-3" />
          </button>
        }
      >
        {proximos.length === 0 ? (
          <Card className="text-sm text-zinc-500 flex items-center gap-2">
            <Icon name="calendar" className="w-4 h-4 text-zinc-600" />
            Nenhum agendamento pendente no momento.
          </Card>
        ) : (
          <div className="space-y-2">
            {proximos.map((a) => (
              <AppointmentRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Histórico de agendamentos"
        icon="history"
        description="Aceito, em andamento, concluído, cancelado e recusado."
        actions={
          <button
            onClick={() => goTo("agendamentos")}
            className="text-xs font-semibold text-red-400 hover:text-red-300 inline-flex items-center gap-1"
          >
            Ver agenda
            <Icon name="arrow-right" className="w-3 h-3" />
          </button>
        }
      >
        {historicoRecente.length === 0 ? (
          <Card className="text-sm text-zinc-500 flex items-center gap-2">
            <Icon name="history" className="w-4 h-4 text-zinc-600" />
            Nenhum agendamento no histórico.
          </Card>
        ) : (
          <div className="space-y-2">
            {historicoRecente.map((a) => (
              <AppointmentRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Notificações"
        icon="bell"
        description="Avisos importantes da sua conta."
        actions={
          <button
            onClick={() => goTo("notificacoes")}
            className="text-xs font-semibold text-red-400 hover:text-red-300 inline-flex items-center gap-1"
          >
            Ver tudo
            <Icon name="arrow-right" className="w-3 h-3" />
          </button>
        }
      >
        {notificacoes.length === 0 ? (
          <Card className="text-sm text-zinc-500 flex items-center gap-2">
            <Icon name="bell" className="w-4 h-4 text-zinc-600" />
            Nenhuma notificação por enquanto.
          </Card>
        ) : (
          <div className="space-y-2">
            {notificacoes.map((n) => (
              <NotificationPreview
                key={n.id}
                n={n}
                onOpen={(item) => {
                  if (onOpenNotification) onOpenNotification(item);
                  else goTo("notificacoes");
                }}
              />
            ))}
            <div className="pt-1">
              <Button variant="ghost" size="xs" onClick={() => goTo("notificacoes")}>
                Abrir central de notificações
              </Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
