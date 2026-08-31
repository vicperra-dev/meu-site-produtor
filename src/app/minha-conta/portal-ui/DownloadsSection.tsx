"use client";

/**
 * Portal do Cliente — Área de Downloads.
 * Reúne todas as entregas já presentes em /api/meus-dados
 * (agendamento.entregas). Player HTML5 para WAV/MP3, nunca URL bruta.
 */

import {
  Card,
  EmptyState,
  Icon,
  Section,
  Tag,
  formatDateTime,
} from "@/components/design-system";
import { deliveryDisplayName } from "@/app/lib/delivery-url-validation";
import type { Agendamento, EntregaServico } from "./types";
import { deliveryTypeLabel, isAudioDelivery } from "./helpers";

interface DownloadRow {
  entrega: EntregaServico;
  agendamento: Agendamento;
}

export function collectDownloads(agendamentos: Agendamento[]): DownloadRow[] {
  const rows: DownloadRow[] = [];
  for (const a of agendamentos) {
    for (const e of a.entregas ?? []) {
      rows.push({ entrega: e, agendamento: a });
    }
  }
  rows.sort((x, y) => {
    const dx = x.entrega.deliveredAt ? new Date(x.entrega.deliveredAt).getTime() : 0;
    const dy = y.entrega.deliveredAt ? new Date(y.entrega.deliveredAt).getTime() : 0;
    return dy - dx;
  });
  return rows;
}

export function DownloadsSection({ agendamentos }: { agendamentos: Agendamento[] }) {
  const downloads = collectDownloads(agendamentos);

  return (
    <Section
      title="Downloads"
      icon="download"
      description={
        downloads.length > 0
          ? `${downloads.length} arquivo${downloads.length > 1 ? "s" : ""} disponível${
              downloads.length > 1 ? "is" : ""
            } para você`
          : undefined
      }
    >
      {downloads.length === 0 ? (
        <EmptyState
          icon="download"
          title="Nenhum arquivo disponível ainda"
          description="Quando o estúdio concluir um serviço, os arquivos aparecerão aqui para download e pré-escuta."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {downloads.map(({ entrega: e, agendamento: a }) => {
            const fileName = deliveryDisplayName(e.deliveryAudioUrl);
            const tipo = deliveryTypeLabel(e.deliveryAudioFormat, e.deliveryAudioUrl);
            const audio = isAudioDelivery(e.deliveryAudioFormat, e.deliveryAudioUrl);
            return (
              <Card key={e.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex w-10 h-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex-shrink-0">
                    <Icon name={audio ? "music" : "file"} className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-100 break-all">{fileName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Tag intent="info">{tipo}</Tag>
                      <Tag intent="neutral">{e.tipo}</Tag>
                      {e.deliveredAt && (
                        <span className="text-[11px] text-zinc-500">
                          {formatDateTime(e.deliveredAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1 truncate">
                      Pedido: {a.tipo} · #{a.id}
                    </p>
                  </div>
                </div>
                {audio && (
                  <audio controls preload="none" className="w-full" src={e.deliveryAudioUrl}>
                    Seu navegador não reproduz áudio.
                  </audio>
                )}
                <a
                  href={e.deliveryAudioUrl}
                  download={fileName}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                >
                  <Icon name="download" className="w-3.5 h-3.5" />
                  Baixar arquivo
                </a>
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}
