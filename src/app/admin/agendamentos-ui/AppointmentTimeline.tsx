"use client";

/**
 * GO-03B — Timeline visual do agendamento (PARTE 7).
 * Derivada exclusivamente de dados já existentes (Appointment + Payment +
 * Services relacionados). Reutiliza o renderer TimelineSteps do GO-03A.
 */
import { TimelineSteps, type TimelineStep } from "@/app/admin/servicos-ui/ServiceTimeline";
import { formatDateTime } from "@/app/admin/servicos-ui/meta";
import type { AdminAgendamento, RelatedService } from "./types";
import { aptStatusKey } from "./meta";

const ORDER = ["pendente", "aceito", "em_andamento", "concluido"];

export function buildAppointmentTimeline(
  a: AdminAgendamento,
  relatedServices?: RelatedService[]
): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const status = aptStatusKey(a.status);
  const idx = ORDER.indexOf(status);
  const temCupom = Boolean(a.cupomAssociado || (a.cuponsAssociados && a.cuponsAssociados.length > 0));
  const entregue = (relatedServices || []).some((s) => Boolean(s.deliveryAudioUrl));

  // Pagamento
  if (a.pagamentoConfirmado) {
    steps.push({
      label: "Pagamento criado",
      detail: formatDateTime(a.pagamentoConfirmado.createdAt),
      state: "done",
    });
    steps.push({
      label: "Pagamento aprovado",
      detail: a.pagamentoConfirmado.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      state: "done",
    });
  } else if (temCupom) {
    steps.push({ label: "Pago com cupom", detail: a.cupomAssociado?.code, state: "done" });
  } else {
    steps.push({ label: "Pagamento", detail: "não confirmado", state: "pending" });
  }

  // Agendamento criado
  steps.push({ label: "Agendamento criado", detail: formatDateTime(a.createdAt), state: "done" });

  // Terminais negativos
  if (status === "cancelado") {
    steps.push({
      label: "Cancelado",
      detail: a.cancelledAt ? formatDateTime(a.cancelledAt) : a.cancelReason || undefined,
      state: "terminal-bad",
    });
    if (a.cancelRefundOption === "reembolso") {
      steps.push({
        label: "Reembolso financeiro",
        detail: a.refundProcessedAt ? formatDateTime(a.refundProcessedAt) : "aguardando",
        state: a.refundProcessedAt ? "done" : "pending",
      });
    } else if (a.cancelRefundOption === "cupom") {
      steps.push({
        label: "Cupom de remarcação",
        detail: a.refundCouponId ? "gerado" : "aguardando",
        state: a.refundCouponId ? "done" : "pending",
      });
    } else if (a.pagamentoConfirmado) {
      steps.push({ label: "Aguardando escolha do cliente", detail: "reembolso ou cupom", state: "pending" });
    }
    return steps;
  }
  if (status === "recusado") {
    steps.push({
      label: "Recusado",
      detail: a.cancelReason || undefined,
      state: "terminal-bad",
    });
    return steps;
  }

  // Progressão normal
  if (idx === 0) {
    steps.push({ label: "Aguardando aceite", state: "current" });
  }
  steps.push({ label: "Aceito", state: idx >= 1 ? "done" : "pending" });
  steps.push({
    label: "Em andamento",
    state: idx >= 3 ? "done" : idx === 2 ? "current" : "pending",
  });
  steps.push({
    label: "Entrega concluída",
    detail: entregue ? "arquivo enviado" : undefined,
    state: entregue ? "done" : idx >= 3 ? "done" : "pending",
  });
  steps.push({ label: "Concluído", state: idx >= 3 ? "done" : "pending" });
  return steps;
}

export function AppointmentTimeline({
  agendamento,
  relatedServices,
}: {
  agendamento: AdminAgendamento;
  relatedServices?: RelatedService[];
}) {
  return <TimelineSteps steps={buildAppointmentTimeline(agendamento, relatedServices)} />;
}
