/**
 * Filtro operacional mínimo para queries de agendamento (PR-03 / GO-H4.3).
 * Subconjunto autocontido — sem dependência de appointment-admin-archive / appointment-hidden.
 */
import { APPOINTMENT_STATUSES_RESERVING_CALENDAR } from "@/app/lib/domain/statuses";

/** Exclui arquivados do pool operacional (disponibilidade, conflito de horário). */
export const appointmentOperationalFilter = {
  adminArchivedAt: null as null,
};

/**
 * GO-H4.3 — Agendamentos que ocupam o calendário / bloqueiam slot.
 * Somente após Aceitar (e status operacionais derivados). Pendente não reserva.
 * Tipado de forma mutável para compatibilidade com Prisma `AppointmentWhereInput`.
 */
export const appointmentCalendarOccupancyFilter: {
  adminArchivedAt: null;
  status: { in: string[] };
} = {
  adminArchivedAt: null,
  status: { in: [...APPOINTMENT_STATUSES_RESERVING_CALENDAR] },
};
