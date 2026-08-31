"use client";

/**
 * Portal do Cliente — card de agendamento/pedido com timeline,
 * entregas e as mesmas ações da página original (cancelar,
 * escolher reembolso, copiar cupom).
 */

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  StatusBadge,
  Tag,
  formatBRL,
  formatDateTime,
  useFeedback,
  useToast,
} from "@/components/design-system";
import { deliveryDisplayName } from "@/app/lib/delivery-url-validation";
import type { Agendamento } from "./types";
import { OrderTimeline } from "./OrderTimeline";
import { cancelarAgendamento, escolherReembolso } from "./actions";
import { copyToClipboard, deliveryTypeLabel, isAudioDelivery } from "./helpers";

export function AppointmentCard({
  agendamento,
  onChanged,
  defaultExpanded = false,
}: {
  agendamento: Agendamento;
  onChanged: () => Promise<void> | void;
  defaultExpanded?: boolean;
}) {
  const a = agendamento;
  const toast = useToast();
  const { notifySuccess, notifyError, ask } = useFeedback();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [busy, setBusy] = useState(false);

  const cancelado = a.status === "cancelado" || a.status === "recusado";
  const podeCancelar =
    (a.status === "aceito" || a.status === "confirmado") &&
    a.pagamento?.status === "approved";

  async function handleCancelar() {
    if (
      !(await ask(
        "Cancelar agendamento",
        "Tem certeza que deseja cancelar este agendamento? O horário ficará disponível novamente."
      ))
    ) {
      return;
    }
    const refundChoice = await ask(
      "Escolha o tipo de reembolso",
      "Confirmar = reembolso direto Asaas. Cancelar = cupom de reembolso."
    );
    const refundType = refundChoice ? "direct" : "coupon";
    setBusy(true);
    try {
      const { ok, data } = await cancelarAgendamento(a.id, refundType);
      if (ok) {
        let detail: string | undefined;
        if (data.refundType === "direct") {
          detail = `Reembolso direto de R$ ${
            data.refundAmount?.toFixed(2).replace(".", ",") || "0,00"
          } será processado em até 5 dias úteis na sua conta bancária.`;
        } else if (data.couponCode) {
          detail = `Cupom de reembolso: ${data.couponCode} — Valor: R$ ${
            data.refundAmount?.toFixed(2).replace(".", ",") || "0,00"
          }`;
        }
        notifySuccess("Seu agendamento foi cancelado com sucesso!", detail);
        await onChanged();
        window.dispatchEvent(new CustomEvent("appointment-updated"));
      } else {
        notifyError("Erro ao cancelar agendamento", data.error || undefined);
      }
    } catch (err) {
      console.error("Erro ao cancelar agendamento:", err);
      notifyError("Erro ao cancelar agendamento");
    } finally {
      setBusy(false);
    }
  }

  async function handleEscolherReembolso(opcao: "reembolso" | "cupom") {
    setBusy(true);
    try {
      const { ok, data } = await escolherReembolso(a.id, opcao);
      if (ok) {
        if (opcao === "reembolso") {
          notifySuccess(
            "Reembolso direto solicitado",
            "Valor será processado em até 5 dias úteis na sua conta."
          );
        } else {
          notifySuccess(
            `Cupom gerado: ${data.couponCode}`,
            `Use ao remarcar seu serviço${
              a.foiComCupomPlano ? " (mesmo tipo do cupom do plano)" : ""
            }.`
          );
        }
        await onChanged();
        window.dispatchEvent(new CustomEvent("appointment-updated"));
      } else {
        notifyError(
          opcao === "reembolso" ? "Erro ao solicitar reembolso" : "Erro ao gerar cupom",
          data.error || undefined
        );
      }
    } catch (e) {
      console.error(e);
      notifyError(opcao === "reembolso" ? "Erro ao solicitar reembolso" : "Erro ao gerar cupom");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">{a.tipo}</h3>
            <StatusBadge status={a.status} />
          </div>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <Icon name="calendar" className="w-3.5 h-3.5" />
            {formatDateTime(a.data)} · {a.duracaoMinutos} min
          </p>
        </div>
        <div className="flex items-center gap-2">
          {a.pagamento && (
            <Badge intent={a.pagamento.status === "approved" ? "success" : "pending"}>
              {formatBRL(a.pagamento.amount)}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setExpanded((v) => !v)}
            iconRight={expanded ? "chevron-down" : "chevron-right"}
          >
            {expanded ? "Ocultar" : "Detalhes"}
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          <Divider className="my-0" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Andamento
              </p>
              <OrderTimeline agendamento={a} />
            </div>

            {/* Detalhes e entregas */}
            <div className="space-y-3 text-sm text-zinc-400">
              {a.observacoes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    Observações
                  </p>
                  <p className="text-zinc-300 text-sm">{a.observacoes}</p>
                </div>
              )}
              {a.pagamento && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    Pagamento
                  </p>
                  <p className="text-zinc-300 text-sm">
                    {formatBRL(a.pagamento.amount)} ·{" "}
                    {a.pagamento.paymentMethod || "Método não informado"}
                  </p>
                </div>
              )}
              {(a.entregas?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                    Arquivos entregues
                  </p>
                  <ul className="space-y-3">
                    {a.entregas!.map((e) => {
                      const fileName = deliveryDisplayName(e.deliveryAudioUrl);
                      return (
                        <li key={e.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Icon name="file" className="w-4 h-4 text-zinc-500" />
                            <span className="text-zinc-200 text-sm font-medium break-all">
                              {fileName}
                            </span>
                            <Tag intent="info">
                              {deliveryTypeLabel(e.deliveryAudioFormat, e.deliveryAudioUrl)}
                            </Tag>
                          </div>
                          {e.deliveredAt && (
                            <p className="text-[11px] text-zinc-500">
                              Entregue em {formatDateTime(e.deliveredAt)}
                            </p>
                          )}
                          {isAudioDelivery(e.deliveryAudioFormat, e.deliveryAudioUrl) && (
                            <audio
                              controls
                              preload="none"
                              className="w-full"
                              src={e.deliveryAudioUrl}
                            >
                              Seu navegador não reproduz áudio.
                            </audio>
                          )}
                          <a
                            href={e.deliveryAudioUrl}
                            download={fileName}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                          >
                            <Icon name="download" className="w-3.5 h-3.5" />
                            Download
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {a.status === "concluido" && (a.entregas?.length ?? 0) === 0 && (
                <p className="text-xs text-zinc-500">
                  Aguardando envio do arquivo pelo estúdio.
                </p>
              )}
            </div>
          </div>

          {/* Cancelado/recusado: política de reembolso (mesma lógica original) */}
          {cancelado && (
            <>
              <Divider className="my-0" />
              <div className="space-y-2 text-sm">
                {a.cancelReason && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-0.5">
                      {a.status === "recusado" ? "Motivo da recusa" : "Justificativa do cancelamento"}
                    </p>
                    <p className="text-zinc-400">{a.cancelReason}</p>
                  </div>
                )}
                {!a.cancelRefundOption && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-zinc-400 text-xs w-full">
                      Escolha como deseja ser reembolsado:
                    </p>
                    <Button
                      variant="secondary"
                      icon="wallet"
                      disabled={busy}
                      onClick={() => handleEscolherReembolso("reembolso")}
                      className="!bg-sky-600 hover:!bg-sky-500 !text-white !border-transparent"
                    >
                      Reembolso direto (Asaas)
                    </Button>
                    <Button
                      variant="secondary"
                      icon="ticket"
                      disabled={busy}
                      onClick={() => handleEscolherReembolso("cupom")}
                      className="!bg-amber-600 hover:!bg-amber-500 !text-white !border-transparent"
                    >
                      Cupom para remarcar
                    </Button>
                  </div>
                )}
                {a.cancelRefundOption === "reembolso" && (
                  <p className="text-xs text-sky-300">
                    Reembolso direto solicitado em{" "}
                    {a.refundProcessedAt ? formatDateTime(a.refundProcessedAt) : ""}. O valor será
                    creditado na sua conta em até 5 dias úteis.
                  </p>
                )}
                {a.cancelRefundOption === "cupom" && a.cancelCouponCode && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-amber-300">Cupom gerado:</span>
                    <code className="px-2 py-1 bg-zinc-800 rounded text-amber-200 font-mono text-xs">
                      {a.cancelCouponCode}
                    </code>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      icon="copy"
                                      onClick={async () => {
                                        await copyToClipboard(a.cancelCouponCode || "");
                                        toast.success("Cupom copiado");
                                      }}
                                    >
                                      Copiar
                                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Ação de cancelamento (mesma condição original) */}
          {podeCancelar && (
            <>
              <Divider className="my-0" />
              <div className="flex justify-end">
                <Button variant="danger" icon="x" disabled={busy} onClick={handleCancelar}>
                  Cancelar agendamento
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
