"use client";

/**
 * GO-03B — Drawer lateral do agendamento (PARTE 6).
 * Detalhe completo sem sair da tela: cliente, pagamento, serviços relacionados,
 * plano, cupons, histórico, timeline, observações e ações válidas.
 * Somente leitura + ações já certificadas (delegadas ao board).
 */
import { useEffect } from "react";
import Link from "next/link";
import { deliveryDisplayName } from "@/app/lib/delivery-url-validation";
import { canDeleteClosedAppointment } from "@/app/lib/appointment-delete-gate";
import { StatusBadge, PaymentBadge, DeliveryBadge } from "@/app/admin/servicos-ui/Badges";
import {
  Icons,
  formatDateTime,
  formatDate,
  formatTime,
  serviceTypeLabel,
} from "@/app/admin/servicos-ui/meta";
import { Spinner } from "@/app/admin/servicos-ui/States";
import type { AdminAgendamento, RelatedService } from "./types";
import { AppointmentTimeline } from "./AppointmentTimeline";
import { aptPaymentSummary, aptStatusKey, formatDuracao } from "./meta";
import { FinancialSummaryDetails } from "@/app/admin/servicos-ui/FinancialSummary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-800 px-5 py-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5 text-xs">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0 break-words text-right text-zinc-300">{value}</span>
    </div>
  );
}

export interface AppointmentDrawerActions {
  onAceitar?: (id: number) => void;
  onRecusar?: (id: number) => void;
  onComecar?: (id: number) => void;
  onCancelar?: (id: number) => void;
  onReverter?: (id: number) => void;
  onExcluir?: (id: number) => void;
  busyId?: number | null;
}

export function AppointmentDrawer({
  agendamento: a,
  relatedServices,
  loadingServices,
  actions,
  onClose,
}: {
  agendamento: AdminAgendamento;
  relatedServices: RelatedService[];
  loadingServices: boolean;
  actions: AppointmentDrawerActions;
  onClose: () => void;
}) {
  const status = aptStatusKey(a.status);
  const pay = aptPaymentSummary(a);
  const busy = actions.busyId === a.id;
  const cupons =
    a.cuponsAssociados && a.cuponsAssociados.length > 0
      ? a.cuponsAssociados
      : a.cupomAssociado
        ? [a.cupomAssociado]
        : [];
  const plano = cupons.find((c) => String(c.couponType || "").toLowerCase().includes("plano"));
  const arquivos = relatedServices.filter((s) => Boolean(s.deliveryAudioUrl));
  const podeExcluir = canDeleteClosedAppointment(a).allowed;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Agendamento #${a.id}`}>
      {/* Overlay */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar detalhe"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
      />

      {/* Painel */}
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-zinc-700 bg-zinc-900/95 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Agendamento #{a.id}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-zinc-100">
              {serviceTypeLabel(a.tipo)}
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusBadge status={status} />
              <PaymentBadge status={pay.status} amount={pay.amount} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            <Icons.x className="w-4 h-4" />
          </button>
        </header>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          <Section title="Cliente">
            <Row label="Nome" value={a.user.nomeArtistico} />
            <Row label="Email" value={a.user.email} />
            {a.user.telefone && <Row label="Telefone" value={a.user.telefone} />}
          </Section>

          <Section title="Agendamento">
            <Row label="Data" value={formatDate(a.data)} />
            <Row label="Horário" value={formatTime(a.data)} />
            <Row label="Tempo reservado" value={formatDuracao(a.duracaoMinutos)} />
            <Row label="Criado em" value={formatDateTime(a.createdAt)} />
            {a.blocked && (
              <Row
                label="Bloqueio"
                value={<span className="text-red-300">{a.blockedReason || "Bloqueado pelo admin"}</span>}
              />
            )}
          </Section>

          <Section title="Pagamento">
            <FinancialSummaryDetails financial={a.financial} />
            {a.pagamentoConfirmado ? (
              <>
                <Row label="Status" value={a.pagamentoConfirmado.status} />
                <Row label="Método" value={a.pagamentoConfirmado.paymentMethod || "—"} />
                <Row label="ID" value={<span className="font-mono">{a.pagamentoConfirmado.id}</span>} />
                {a.pagamentoConfirmado.asaasId && (
                  <Row label="ID Asaas" value={<span className="font-mono">{a.pagamentoConfirmado.asaasId}</span>} />
                )}
                <Row label="Confirmado em" value={formatDateTime(a.pagamentoConfirmado.createdAt)} />
              </>
            ) : pay.viaCupom ? (
              <p className="mt-2 text-xs text-emerald-300">Sem cobrança no gateway (total zero / cupom).</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Pagamento não confirmado.</p>
            )}
          </Section>

          {plano && (
            <Section title="Plano">
              <Row label="Cupom do plano" value={<span className="font-mono">{plano.code}</span>} />
              {plano.serviceType && <Row label="Serviço" value={serviceTypeLabel(plano.serviceType)} />}
              <Row label="Status" value={plano.used ? "Usado" : "Pendente"} />
            </Section>
          )}

          {cupons.length > 0 && (
            <Section title="Cupons">
              <ul className="space-y-1.5">
                {cupons.map((c, i) => (
                  <li key={c.id ?? `${c.code}-${i}`} className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2 text-xs">
                    <p className="font-mono font-medium text-zinc-200">{c.code}</p>
                    <p className="mt-0.5 text-zinc-500">
                      {c.serviceType ? `${serviceTypeLabel(c.serviceType)} · ` : ""}
                      {c.couponType || c.discountType} · {c.used ? "Usado" : "Pendente"}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Serviços relacionados">
            {loadingServices ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Spinner className="w-3.5 h-3.5" /> Carregando serviços…
              </div>
            ) : relatedServices.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum serviço vinculado a este agendamento.</p>
            ) : (
              <ul className="space-y-1.5">
                {relatedServices.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">{serviceTypeLabel(s.tipo)}</p>
                      <p className="truncate text-[11px] text-zinc-500">{s.id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StatusBadge status={s.status} />
                      <DeliveryBadge delivered={Boolean(s.deliveryAudioUrl)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/servicos/todos"
              className="mt-2 inline-flex items-center gap-1 text-xs text-red-400 underline-offset-2 hover:underline"
            >
              <Icons.external className="w-3 h-3" />
              Abrir Serviços Gerais
            </Link>
          </Section>

          {arquivos.length > 0 && (
            <Section title="Arquivos relacionados">
              <ul className="space-y-2">
                {arquivos.map((s) => {
                  const isAudio =
                    (s.deliveryAudioFormat === "wav" || s.deliveryAudioFormat === "mp3") &&
                    !/\.zip(\?|$)/i.test(s.deliveryAudioUrl || "");
                  return (
                    <li key={s.id} className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2">
                      <p className="flex items-center gap-1.5 truncate text-xs text-zinc-300">
                        <Icons.music className="w-3 h-3 shrink-0 text-purple-400" />
                        <span className="truncate">{deliveryDisplayName(s.deliveryAudioUrl)}</span>
                      </p>
                      {isAudio && (
                        <audio controls preload="none" className="mt-2 h-8 w-full" src={s.deliveryAudioUrl || undefined}>
                          Seu navegador não reproduz áudio.
                        </audio>
                      )}
                      <a
                        href={s.deliveryAudioUrl || "#"}
                        download={deliveryDisplayName(s.deliveryAudioUrl)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-purple-300 underline-offset-2 hover:underline"
                      >
                        <Icons.download className="w-3 h-3" />
                        Download
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {a.observacoes && (
            <Section title="Observações">
              <p className="whitespace-pre-wrap text-xs text-zinc-400">{a.observacoes}</p>
            </Section>
          )}

          {(status === "cancelado" || status === "recusado") && (a.cancelReason || a.cancelRefundOption) && (
            <Section title="Histórico de encerramento">
              {a.cancelReason && <Row label="Justificativa" value={a.cancelReason} />}
              {a.cancelledAt && <Row label="Cancelado em" value={formatDateTime(a.cancelledAt)} />}
              {a.cancelRefundOption && (
                <Row
                  label="Opção do cliente"
                  value={a.cancelRefundOption === "reembolso" ? "Reembolso direto (Asaas)" : "Cupom de remarcação"}
                />
              )}
              {a.refundProcessedAt && <Row label="Reembolso processado" value={formatDateTime(a.refundProcessedAt)} />}
              {a.refundAsaasStatus && <Row label="Status no gateway" value={a.refundAsaasStatus} />}
            </Section>
          )}

          <Section title="Timeline">
            <AppointmentTimeline agendamento={a} relatedServices={relatedServices} />
          </Section>
        </div>

        {/* Rodapé de ações — somente ações válidas para o status */}
        <footer className="flex flex-wrap items-center gap-1.5 border-t border-zinc-700 bg-zinc-900/95 px-4 py-3">
          {status === "pendente" && actions.onAceitar && (
            <button
              type="button"
              onClick={() => actions.onAceitar?.(a.id)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/40 disabled:opacity-50"
            >
              {busy ? <Spinner className="w-3 h-3" /> : <Icons.trash className="w-3 h-3" />}
              Excluir
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Fechar
          </button>
        </footer>
      </aside>
    </div>
  );
}
