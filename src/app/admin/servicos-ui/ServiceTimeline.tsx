"use client";

/**
 * GO-03A — Timeline visual do serviço (PARTE 7).
 * Derivada exclusivamente de dados já existentes na resposta da API
 * (payment.status, appointment, createdAt, acceptedAt, status, delivery, updatedAt).
 * Nenhuma tabela nova, nenhuma chamada extra.
 */
import type { AdminService } from "./types";
import { formatDateTime } from "./meta";

export type TimelineStepState = "done" | "current" | "pending" | "terminal-bad";

export interface TimelineStep {
  label: string;
  detail?: string;
  state: TimelineStepState;
}

type StepState = TimelineStepState;
type Step = TimelineStep;

const PAID_STATUSES = new Set(["approved", "received", "confirmed"]);

export function buildTimeline(s: AdminService): Step[] {
  const paid = s.payment ? PAID_STATUSES.has(String(s.payment.status).toLowerCase()) : false;
  const cancelled = s.status === "cancelado";
  const refused = s.status === "recusado";
  const delivered = Boolean(s.deliveryAudioUrl);
  const done = s.status === "concluido";
  const inProgress = s.status === "em_andamento";
  const accepted = s.status === "aceito" || inProgress || done;

  const steps: Step[] = [];

  steps.push({
    label: paid ? "Pagamento aprovado" : s.payment ? "Pagamento registrado" : "Sem pagamento vinculado",
    detail: s.payment
      ? `${s.payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · ${s.payment.status}`
      : undefined,
    state: s.payment ? "done" : "pending",
  });

  steps.push({
    label: s.appointment ? "Agendamento criado" : "Sem agendamento",
    detail: s.appointment ? `#${s.appointment.id} · ${formatDateTime(s.appointment.data)}` : undefined,
    state: s.appointment ? "done" : "pending",
  });

  steps.push({
    label: "Serviço criado",
    detail: formatDateTime(s.createdAt),
    state: "done",
  });

  if (cancelled || refused) {
    steps.push({
      label: cancelled ? "Cancelado" : "Recusado",
      detail: formatDateTime(s.updatedAt || undefined),
      state: "terminal-bad",
    });
    return steps;
  }

  steps.push({
    label: "Aceito",
    detail: s.acceptedAt ? formatDateTime(s.acceptedAt) : undefined,
    state: accepted ? "done" : s.status === "pendente" ? "current" : "pending",
  });

  steps.push({
    label: "Em andamento",
    state: inProgress ? "current" : done ? "done" : "pending",
  });

  steps.push({
    label: "Arquivo enviado",
    detail: delivered ? "Entrega disponível para o cliente" : undefined,
    state: delivered ? "done" : "pending",
  });

  steps.push({
    label: "Concluído",
    detail: done ? formatDateTime(s.updatedAt || undefined) : undefined,
    state: done ? "done" : "pending",
  });

  return steps;
}

const DOT: Record<StepState, string> = {
  done: "bg-green-400 border-green-400",
  current: "bg-blue-400 border-blue-400 animate-pulse",
  pending: "bg-transparent border-zinc-600",
  "terminal-bad": "bg-red-400 border-red-400",
};

const TEXT: Record<StepState, string> = {
  done: "text-zinc-200",
  current: "text-blue-300",
  pending: "text-zinc-500",
  "terminal-bad": "text-red-300",
};

/** Renderer genérico de timeline — reutilizado por Serviços (GO-03A) e Agendamentos (GO-03B). */
export function TimelineSteps({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative ml-1.5 space-y-3 border-l border-zinc-700 pl-4">
      {steps.map((step, i) => (
        <li key={`${step.label}-${i}`} className="relative">
          <span
            className={`absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 ${DOT[step.state]}`}
          />
          <p className={`text-xs font-medium ${TEXT[step.state]}`}>{step.label}</p>
          {step.detail && <p className="text-[11px] text-zinc-500">{step.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

export function ServiceTimeline({ service }: { service: AdminService }) {
  return <TimelineSteps steps={buildTimeline(service)} />;
}
