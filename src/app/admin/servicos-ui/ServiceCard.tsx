"use client";

/**
 * GO-03A — Card profissional de serviço (PARTE 5).
 * Ações no rodapé aparecem apenas quando o status permite — exatamente as
 * operações já certificadas (Aceitar, Iniciar, Entregar, Download).
 * GO-H8B: exclusão física isolada removida.
 */
import { useState } from "react";
import Link from "next/link";
import { deliveryDisplayName } from "@/app/lib/delivery-url-validation";
import { isOperationalNoFileService } from "@/app/lib/service-catalog";
import type { AdminService } from "./types";
import { DeliveryBadge, PaymentBadge, StatusBadge } from "./Badges";
import { Icons, formatDate, formatTime, serviceTypeLabel, timeAgo } from "./meta";
import { ServiceTimeline } from "./ServiceTimeline";
import { Spinner } from "./States";

export interface ServiceCardActions {
  onAceitar?: (id: string) => void;
  onIniciar?: (id: string) => void;
  onEntregar?: (service: AdminService) => void;
  /** GO-H12 — Sessão/Captação sem upload */
  onConcluir?: (id: string) => void;
  onExcluir?: (id: string) => void;
  busyId?: string | null;
}

export function ServiceCard({ service: s, actions }: { service: AdminService; actions: ServiceCardActions }) {
  const [open, setOpen] = useState(false);
  const busy = actions.busyId === s.id;
  const delivered = Boolean(s.deliveryAudioUrl);
  const operationalNoFile = isOperationalNoFileService(s.tipo);
  const isAudio =
    delivered &&
    (s.deliveryAudioFormat === "wav" || s.deliveryAudioFormat === "mp3") &&
    !/\.zip(\?|$)/i.test(s.deliveryAudioUrl || "");

  return (
    <article className="group flex flex-col rounded-xl border border-zinc-700/80 bg-zinc-900/70 transition-all duration-200 hover:border-zinc-500/80 hover:shadow-lg hover:shadow-black/30">
      {/* Cabeçalho: título + status */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-100">
            {serviceTypeLabel(s.tipo)}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
            <Icons.user className="w-3 h-3 text-zinc-500" />
            <span className="truncate font-medium text-zinc-300">{s.user.nomeArtistico}</span>
          </p>
          <p className="truncate text-[11px] text-zinc-500">{s.user.email}</p>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {/* Badges: pagamento + entrega */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <PaymentBadge status={s.payment?.status} amount={s.payment?.amount} />
        <DeliveryBadge delivered={delivered} />
      </div>

      {/* Agendamento */}
      <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 px-4 py-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Agendamento</p>
          {s.appointment ? (
            <Link
              href={`/admin/agendamentos/todos?highlight=${s.appointment.id}`}
              className="font-mono text-red-400 underline-offset-2 hover:underline"
            >
              #{s.appointment.id}
            </Link>
          ) : (
            <span className="text-zinc-500">—</span>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Data</p>
          <p className="flex items-center gap-1 text-zinc-300">
            <Icons.calendar className="w-3 h-3 text-zinc-500" />
            {formatDate(s.appointment?.data || s.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Horário</p>
          <p className="flex items-center gap-1 text-zinc-300">
            <Icons.clock className="w-3 h-3 text-zinc-500" />
            {formatTime(s.appointment?.data || s.createdAt)}
          </p>
        </div>
      </div>

      {/* Entrega (quando existir) */}
      {delivered && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Entrega</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-300">
            <Icons.music className="w-3 h-3 shrink-0 text-purple-400" />
            <span className="truncate">{deliveryDisplayName(s.deliveryAudioUrl)}</span>
          </p>
          {isAudio && (
            <audio controls preload="none" className="mt-2 h-8 w-full" src={s.deliveryAudioUrl || undefined}>
              Seu navegador não reproduz áudio.
            </audio>
          )}
        </div>
      )}

      {/* Timeline expansível */}
      {open && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Timeline</p>
          <ServiceTimeline service={s} />
          {(s.observacoes || s.description) && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Observações</p>
              <p className="mt-0.5 text-xs text-zinc-400">{s.observacoes || s.description}</p>
            </div>
          )}
          {s.coupons && s.coupons.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Cupons</p>
              <ul className="mt-0.5 space-y-0.5 text-xs text-zinc-400">
                {s.coupons.map((c) => (
                  <li key={c.id}>
                    <span className="font-mono text-zinc-300">{c.code}</span> · {c.type} · {c.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Rodapé de ações — somente ações válidas para o status */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-zinc-800 bg-zinc-900/80 px-3 py-2.5 rounded-b-xl">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          {open ? <Icons.x className="w-3 h-3" /> : <Icons.external className="w-3 h-3" />}
          {open ? "Fechar" : "Abrir"}
        </button>

        {s.status === "pendente" && actions.onAceitar && (
          <button
            type="button"
            onClick={() => actions.onAceitar?.(s.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.check className="w-3 h-3" />}
            Aceitar
          </button>
        )}

        {s.status === "aceito" && actions.onIniciar && (
          <button
            type="button"
            onClick={() => actions.onIniciar?.(s.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.play className="w-3 h-3" />}
            Iniciar
          </button>
        )}

        {(s.status === "aceito" || s.status === "em_andamento") &&
          operationalNoFile &&
          actions.onConcluir && (
          <button
            type="button"
            onClick={() => actions.onConcluir?.(s.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.check className="w-3 h-3" />}
            Concluir Serviço
          </button>
        )}

        {s.status === "em_andamento" && !operationalNoFile && actions.onEntregar && (
          <button
            type="button"
            onClick={() => actions.onEntregar?.(s)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.upload className="w-3 h-3" />}
            Entregar
          </button>
        )}

        {s.status === "concluido" && delivered && (
          <a
            href={s.deliveryAudioUrl || "#"}
            download={deliveryDisplayName(s.deliveryAudioUrl)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
          >
            <Icons.download className="w-3 h-3" />
            Download
          </a>
        )}

        {s.status === "cancelado" && actions.onExcluir && (
          <button
            type="button"
            onClick={() => actions.onExcluir?.(s.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/40 disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3 h-3" /> : <Icons.trash className="w-3 h-3" />}
            Excluir registro
          </button>
        )}

        <span className="ml-auto text-[10px] text-zinc-600">{timeAgo(s.createdAt)}</span>
      </div>
    </article>
  );
}
