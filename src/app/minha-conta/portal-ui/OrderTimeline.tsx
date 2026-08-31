"use client";

/**
 * Portal do Cliente — timeline visual de um pedido/agendamento.
 * Derivada exclusivamente dos campos já retornados por /api/meus-dados
 * (status, pagamento, entregas, cancelamento). Nenhum dado novo.
 */

import { Timeline, TimelineItemData, formatDateTime } from "@/components/design-system";
import type { Agendamento } from "./types";

export function buildOrderTimeline(a: Agendamento): TimelineItemData[] {
  const cancelado = a.status === "cancelado" || a.status === "recusado";
  const temPagamento = a.pagamento?.status === "approved";
  const temEntrega = (a.entregas?.length ?? 0) > 0;
  const concluido = a.status === "concluido";
  const emAndamento = a.status === "em_andamento";
  const aceito = a.status === "aceito" || a.status === "confirmado";

  const items: TimelineItemData[] = [];

  items.push({
    key: "pagamento",
    title: temPagamento ? "Pagamento aprovado" : "Pagamento",
    state: temPagamento ? "done" : "pending",
    icon: "credit-card",
    meta: a.pagamento?.createdAt ? formatDateTime(a.pagamento.createdAt) : undefined,
    description: a.pagamento
      ? `R$ ${a.pagamento.amount.toFixed(2).replace(".", ",")}${
          a.pagamento.paymentMethod ? ` · ${a.pagamento.paymentMethod}` : ""
        }`
      : a.foiComCupomPlano
      ? "Agendamento feito com cupom do plano"
      : "Aguardando confirmação",
  });

  items.push({
    key: "agendamento",
    title: "Agendamento confirmado",
    state:
      aceito || emAndamento || concluido || temEntrega
        ? "done"
        : cancelado
        ? "error"
        : a.status === "pendente"
        ? "current"
        : "pending",
    icon: "calendar",
    meta: formatDateTime(a.data),
    description: `${a.tipo} · ${a.duracaoMinutos} min`,
  });

  if (cancelado) {
    items.push({
      key: "cancelado",
      title: a.status === "recusado" ? "Recusado" : "Cancelado",
      state: "error",
      icon: "x",
      description: a.cancelReason || undefined,
    });
    if (a.cancelRefundOption === "reembolso") {
      items.push({
        key: "reembolso",
        title: "Reembolso direto solicitado",
        state: "done",
        icon: "wallet",
        meta: a.refundProcessedAt ? formatDateTime(a.refundProcessedAt) : undefined,
        description: "Crédito em até 5 dias úteis na conta vinculada ao pagamento.",
      });
    } else if (a.cancelRefundOption === "cupom" && a.cancelCouponCode) {
      items.push({
        key: "cupom",
        title: "Cupom de remarcação gerado",
        state: "done",
        icon: "ticket",
        description: a.cancelCouponCode,
      });
    } else {
      items.push({
        key: "escolha",
        title: "Escolha de reembolso pendente",
        state: "current",
        icon: "help",
        description: "Escolha entre reembolso direto ou cupom para remarcar.",
      });
    }
    return items;
  }

  items.push({
    key: "aceito",
    title: "Aceito pelo estúdio",
    state: aceito || emAndamento || concluido ? "done" : "pending",
    icon: "check",
  });

  items.push({
    key: "andamento",
    title: "Em andamento",
    state: emAndamento ? "current" : concluido || temEntrega ? "done" : "pending",
    icon: "music",
  });

  items.push({
    key: "entrega",
    title: "Entrega disponível",
    state: temEntrega ? "done" : "pending",
    icon: "download",
    meta:
      temEntrega && a.entregas![0].deliveredAt
        ? formatDateTime(a.entregas![0].deliveredAt!)
        : undefined,
    description: temEntrega
      ? `${a.entregas!.length} arquivo${a.entregas!.length > 1 ? "s" : ""} entregue${
          a.entregas!.length > 1 ? "s" : ""
        }`
      : concluido
      ? "Aguardando envio do arquivo pelo estúdio"
      : undefined,
  });

  items.push({
    key: "concluido",
    title: "Concluído",
    state: concluido ? "done" : "pending",
    icon: "check-circle",
  });

  return items;
}

export function OrderTimeline({ agendamento }: { agendamento: Agendamento }) {
  return <Timeline items={buildOrderTimeline(agendamento)} compact />;
}
