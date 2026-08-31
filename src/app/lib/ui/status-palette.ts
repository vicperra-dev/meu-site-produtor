/**
 * GO-H9 — Paleta oficial de status (toda a plataforma).
 * Apenas apresentação; não altera regras de domínio.
 *
 * Pendente → Cinza
 * Aceito → Verde
 * Em andamento → Amarelo
 * Concluído → Azul
 * Recusado → Vermelho
 * Cancelado → Vermelho
 */

export type OfficialStatus =
  | "pendente"
  | "aceito"
  | "em_andamento"
  | "concluido"
  | "recusado"
  | "cancelado";

/** Intent do Design System alinhado à paleta GO-H9. */
export type StatusVisualIntent =
  | "pending"
  | "success"
  | "warning"
  | "info"
  | "error"
  | "cancelled"
  | "neutral";

export const OFFICIAL_STATUS_META: Record<
  OfficialStatus,
  { label: string; intent: StatusVisualIntent; description: string }
> = {
  pendente: {
    label: "Pendente",
    intent: "pending",
    description: "Aguardando análise do administrador.",
  },
  aceito: {
    label: "Aceito",
    intent: "success",
    description: "Agendamento aprovado.",
  },
  em_andamento: {
    label: "Em andamento",
    intent: "warning",
    description: "Serviço em execução.",
  },
  concluido: {
    label: "Concluído",
    intent: "info",
    description: "Serviço finalizado.",
  },
  recusado: {
    label: "Recusado",
    intent: "error",
    description: "Agendamento recusado.",
  },
  cancelado: {
    label: "Cancelado",
    intent: "error",
    description: "Fluxo encerrado.",
  },
};

/** Normaliza aliases legados para o status oficial de UI. */
export function normalizeOfficialStatus(status?: string | null): OfficialStatus | null {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "confirmado") return "aceito";
  if (s === "remarcado") return "cancelado";
  if (s in OFFICIAL_STATUS_META) return s as OfficialStatus;
  return null;
}

export function statusVisualMeta(status?: string | null): {
  label: string;
  intent: StatusVisualIntent;
} {
  const key = normalizeOfficialStatus(status);
  if (key) {
    const m = OFFICIAL_STATUS_META[key];
    return { label: m.label, intent: m.intent };
  }
  return { label: String(status || "—"), intent: "neutral" };
}

/** Fase da Ordem de Serviço → status oficial de UI (fonte da verdade operacional). */
export function statusFromServiceOrderPhase(phase?: string | null): OfficialStatus {
  switch (String(phase || "")) {
    case "awaiting_schedule":
    case "solicitation":
      return "pendente";
    case "reserved":
      return "aceito";
    case "execution":
      return "em_andamento";
    case "delivery":
    case "completed":
      return "concluido";
    case "cancelled":
      return "cancelado";
    default:
      return "pendente";
  }
}
