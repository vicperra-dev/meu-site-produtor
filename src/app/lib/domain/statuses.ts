/**
 * HS-03A — Status canônicos Appointment / Service.
 * Service = autoridade operacional; Appointment = solicitação / espelho admin.
 */

export const APPOINTMENT_STATUSES = [
  "pendente",
  "aceito",
  "confirmado",
  "em_andamento",
  "concluido",
  "recusado",
  "cancelado",
  "remarcado",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const SERVICE_STATUSES = [
  "pendente",
  "aceito",
  "em_andamento",
  "recusado",
  "cancelado",
  "concluido",
] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

/** Serviços Selecionados: fila operacional (OP-01). */
export const ACTIVE_OPERATIONAL_SERVICE_STATUSES: ReadonlySet<string> = new Set([
  "pendente",
  "aceito",
  "em_andamento",
]);

export const TERMINAL_SERVICE_STATUSES: ReadonlySet<string> = new Set([
  "concluido",
  "cancelado",
  "recusado",
]);

export const TERMINAL_APPOINTMENT_STATUSES: ReadonlySet<string> = new Set([
  "concluido",
  "cancelado",
  "recusado",
]);

/** Status que bloqueiam reuso de cupom associado ao agendamento. */
export const APPOINTMENT_STATUSES_BLOCKING_COUPON_REUSE: ReadonlySet<string> = new Set([
  "pendente",
  "aceito",
  "confirmado",
  "em_andamento",
]);

/**
 * GO-H4.3 — Status que reservam o calendário operacional.
 * Pendente / aguardando aprovação NÃO ocupam horários, cores nem disponibilidade.
 * A reserva só ocorre após o admin Aceitar.
 */
export const APPOINTMENT_STATUSES_RESERVING_CALENDAR = [
  "aceito",
  "confirmado",
  "em_andamento",
  "concluido",
] as const;

export const APPOINTMENT_STATUSES_RESERVING_CALENDAR_SET: ReadonlySet<string> = new Set(
  APPOINTMENT_STATUSES_RESERVING_CALENDAR
);

export function appointmentReservesCalendar(status?: string | null): boolean {
  return APPOINTMENT_STATUSES_RESERVING_CALENDAR_SET.has(String(status || ""));
}

export function isServiceStatus(value: string): value is ServiceStatus {
  return (SERVICE_STATUSES as readonly string[]).includes(value);
}

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

export function isOpenServiceStatus(status: string): boolean {
  return !TERMINAL_SERVICE_STATUSES.has(status);
}

/** Mapeia status administrativo do Appointment → status inicial de Service (criação). */
export function mapRequestStatusToServiceStatus(appointmentStatus: string): ServiceStatus {
  if (appointmentStatus === "em_andamento") return "em_andamento";
  if (appointmentStatus === "concluido") return "concluido";
  if (appointmentStatus === "aceito" || appointmentStatus === "confirmado") return "aceito";
  if (appointmentStatus === "cancelado") return "cancelado";
  if (appointmentStatus === "recusado") return "recusado";
  return "pendente";
}

/**
 * Derivação única Appointment ← Services (espelho administrativo).
 * Não é fonte operacional nas UIs de execução.
 */
export function deriveAppointmentStatusFromServiceStatuses(
  appointmentStatus: string,
  serviceStatuses: string[]
): string | null {
  if (serviceStatuses.length === 0) return null;
  if (appointmentStatus === "cancelado" || appointmentStatus === "recusado") {
    return null;
  }

  const open = serviceStatuses.filter((s) => isOpenServiceStatus(s));
  const anyEmAndamento = serviceStatuses.some((s) => s === "em_andamento");
  const anyAceito = serviceStatuses.some((s) => s === "aceito");
  const anyConcluido = serviceStatuses.some((s) => s === "concluido");
  const allTerminal = serviceStatuses.every((s) => TERMINAL_SERVICE_STATUSES.has(s));
  const allCancelledLike = serviceStatuses.every(
    (s) => s === "cancelado" || s === "recusado"
  );

  let aptStatus = appointmentStatus;

  if (aptStatus === "pendente" && anyEmAndamento) return "em_andamento";
  if (aptStatus === "pendente" && anyAceito) return "aceito";

  if (aptStatus === "concluido" && open.length > 0) {
    return anyEmAndamento ? "em_andamento" : "aceito";
  }

  if ((aptStatus === "aceito" || aptStatus === "confirmado") && anyEmAndamento) {
    return "em_andamento";
  }

  if (
    allTerminal &&
    anyConcluido &&
    !allCancelledLike &&
    aptStatus !== "concluido" &&
    aptStatus !== "cancelado" &&
    aptStatus !== "recusado"
  ) {
    return "concluido";
  }

  return null;
}

export function parsePaymentMetadataJson(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}
