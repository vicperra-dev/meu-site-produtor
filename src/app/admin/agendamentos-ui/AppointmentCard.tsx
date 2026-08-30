"use client";

/**
 * GO-03B — Card profissional de agendamento (PARTE 5).
 * Ações no rodapé aparecem apenas quando o status permite — exatamente as
 * operações já certificadas (Aceitar, Recusar, Começar, Cancelar, Reverter, Excluir).
 */
import { canDeleteClosedAppointment } from "@/app/lib/appointment-delete-gate";
import { StatusBadge, PaymentBadge } from "@/app/admin/servicos-ui/Badges";
import { Icons, formatDate, formatTime, serviceTypeLabel, timeAgo } from "@/app/admin/servicos-ui/meta";
import { Spinner } from "@/app/admin/servicos-ui/States";
import { FinancialSummaryCompact } from "@/app/admin/servicos-ui/FinancialSummary";
import { ServiceTimingInfo } from "@/app/admin/servicos-ui/ServiceTimingInfo";
import { hasOperationalTimer } from "@/app/lib/service-timing";
import type { AdminAgendamento, RelatedService } from "./types";
import { aptPaymentSummary, aptStatusKey, formatDuracao } from "./meta";

export interface AppointmentCardActions {
  onAbrir?: (a: AdminAgendamento) => void;
  onAceitar?: (id: number) => void;
  onRecusar?: (id: number) => void;
  onComecar?: (id: number) => void;
  onCancelar?: (id: number) => void;
  onReverter?: (id: number) => void;
  onExcluir?: (id: number) => void;
  busyId?: number | null;
}

export function AppointmentCard({
  agendamento: a,
  servicesCount,
  relatedServices,
  actions,
  highlighted = false,
}: {
  agendamento: AdminAgendamento;
  /** Quantidade de serviços vinculados (dados já existentes). */
  servicesCount?: number;
  relatedServices?: RelatedService[];
  actions: AppointmentCardActions;
  highlighted?: boolean;
}) {
  const busy = actions.busyId === a.id;
  const status = aptStatusKey(a.status);
  const pay = aptPaymentSummary(a);
  const cupons =
    a.cuponsAssociados && a.cuponsAssociados.length > 0
      ? a.cuponsAssociados
      : a.cupomAssociado
        ? [a.cupomAssociado]
        : [];
  const plano = cupons.find((c) => String(c.couponType || "").toLowerCase().includes("plano"));
  const timerServices = (relatedServices || []).filter((s) => hasOperationalTimer(s.tipo));
  const podeExcluir = canDeleteClosedAppointment(a).allowed;

  return (
    <article
      className={`group flex flex-col rounded-xl border bg-zinc-900/70 transition-all duration-200 hover:shadow-lg hover:shadow-black/30 ${
        highlighted
          ? "border-red-500/70 ring-1 ring-red-500/40"
          : a.blocked
            ? "border-red-800/60 hover:border-red-600/60"
            : "border-zinc-700/80 hover:border-zinc-500/80"
      }`}
    >
      {/* Cabeçalho: cliente + status */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 truncate text-sm font-semibold text-zinc-100">
            <Icons.user className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <span className="truncate">{a.user.nomeArtistico}</span>
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{a.user.email}</p>
          {a.user.telefone && <p className="truncate text-[11px] text-zinc-500">{a.user.telefone}</p>}
          <p className="mt-1 truncate text-xs font-medium text-zinc-300">{serviceTypeLabel(a.tipo)}</p>
          {plano && (
            <p className="truncate text-[11px] text-amber-300/90">Plano · cupom {plano.code}</p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Badges: pagamento */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <PaymentBadge status={pay.status} amount={a.financial?.finalAmount ?? pay.amount} />
        {pay.viaCupom && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
            <Icons.check className="w-3 h-3" />
            Via cupom
          </span>
        )}
        {a.blocked && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-300">
            <Icons.slash className="w-3 h-3" />
            Bloqueado
          </span>
        )}
      </div>

      <div className="border-t border-zinc-800 px-4 py-2.5">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Financeiro</p>
        <FinancialSummaryCompact financial={a.financial} />
      </div>

      {timerServices.length > 0 && (
        <div className="border-t border-zinc-800 px-4 py-2">
          {timerServices.map((s) => (
            <ServiceTimingInfo key={s.id} service={s} compact />
          ))}
        </div>
      )}

      {/* Agendamento: data, horário, tempo reservado, serviços */}
      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 px-4 py-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Data</p>
          <p className="flex items-center gap-1 text-zinc-300">
            <Icons.calendar className="w-3 h-3 text-zinc-500" />
            {formatDate(a.data)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Horário</p>
          <p className="flex items-center gap-1 text-zinc-300">
            <Icons.clock className="w-3 h-3 text-zinc-500" />
            {formatTime(a.data)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Reservado</p>
          <p className="text-zinc-300">{formatDuracao(a.duracaoMinutos)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Serviços</p>
          <p className="tabular-nums text-zinc-300">{servicesCount ?? "—"}</p>
        </div>
      </div>

      {/* Observações (resumo) */}
      {a.observacoes && (
        <div className="border-t border-zinc-800 px-4 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Observações</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{a.observacoes}</p>
        </div>
      )}

      {/* Cancelamento (resumo) */}
      {status === "cancelado" && (a.cancelReason || a.cancelRefundOption) && (
        <div className="border-t border-zinc-800 px-4 py-2.5 text-xs">
          {a.cancelReason && <p className="line-clamp-2 text-zinc-400">{a.cancelReason}</p>}
          {a.cancelRefundOption === "reembolso" && (
            <p className="mt-1 text-sky-300/90">Reembolso direto (Asaas) solicitado</p>
          )}
          {a.cancelRefundOption === "cupom" && (
            <p className="mt-1 text-amber-300/90">Cupom de reembolso gerado para o cliente</p>
          )}
          {!a.cancelRefundOption && a.pagamentoConfirmado && (
            <p className="mt-1 text-zinc-500">Aguardando cliente escolher reembolso ou cupom</p>
          )}
        </div>
      )}

      {/* Rodapé de ações — somente ações válidas para o status */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 rounded-b-xl border-t border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
        <button
          type="button"
          onClick={() => actions.onAbrir?.(a)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          <Icons.external className="w-3 h-3" />
          Abrir
        </button>

        {status === "pendente" && actions.onAceitar && (
          <button
            type="button"
            onClick={() => actions.onAceitar?.(a.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.check className="w-3 h-3" />}
            Aceitar
          </button>
        )}

        {status === "pendente" && actions.onRecusar && (
          <button
            type="button"
            onClick={() => actions.onRecusar?.(a.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.xCircle className="w-3 h-3" />}
            Recusar
          </button>
        )}

        {status === "aceito" && actions.onComecar && (
          <button
            type="button"
            onClick={() => actions.onComecar?.(a.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.play className="w-3 h-3" />}
            Começar
          </button>
        )}

        {(status === "aceito" || status === "em_andamento") && actions.onCancelar && (
          <button
            type="button"
            onClick={() => actions.onCancelar?.(a.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
          >
            <Icons.slash className="w-3 h-3" />
            Cancelar
          </button>
        )}

        {status === "cancelado" && actions.onReverter && (
          <button
            type="button"
            onClick={() => actions.onReverter?.(a.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.refresh className="w-3 h-3" />}
            Reverter
          </button>
        )}

        {podeExcluir && actions.onExcluir && (
          <button
            type="button"
            onClick={() => actions.onExcluir?.(a.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/40 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.trash className="w-3 h-3" />}
            Excluir
          </button>
        )}

        <span className="ml-auto text-[10px] text-zinc-600">
          #{a.id} · {timeAgo(a.createdAt)}
        </span>
      </div>
    </article>
  );
}
