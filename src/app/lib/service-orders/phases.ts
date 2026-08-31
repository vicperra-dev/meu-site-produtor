/**
 * GO-H5 — Fases operacionais da Ordem de Serviço.
 * Solicitação / Reserva / Execução / Entrega nunca se misturam.
 */

export const SERVICE_ORDER_PHASES = [
  /** Cupom emitido; aguarda o cliente agendar. */
  "awaiting_schedule",
  /** Agendamento criado; pendente de aceite admin — NÃO ocupa calendário. */
  "solicitation",
  /** Admin aceitou — ocupa calendário / dashboard / controle. */
  "reserved",
  /** Trabalho em andamento (Serviços Selecionados). */
  "execution",
  /** Upload / entrega / recebimento. */
  "delivery",
  "completed",
  "cancelled",
] as const;

export type ServiceOrderPhase = (typeof SERVICE_ORDER_PHASES)[number];

/** Fase a partir do status do Appointment (após vínculo). */
export function phaseFromAppointmentStatus(
  status?: string | null
): ServiceOrderPhase {
  const s = String(status || "");
  if (s === "cancelado" || s === "recusado") return "cancelled";
  if (s === "concluido") return "completed";
  if (s === "em_andamento") return "execution";
  if (s === "aceito" || s === "confirmado") return "reserved";
  if (s === "pendente") return "solicitation";
  return "solicitation";
}

/** Solicitação nunca reserva agenda. */
export function phaseOccupiesCalendar(phase: ServiceOrderPhase): boolean {
  return phase === "reserved" || phase === "execution" || phase === "delivery" || phase === "completed";
}
