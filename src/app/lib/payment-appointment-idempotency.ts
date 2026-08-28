import { TERMINAL_APPOINTMENT_STATUSES } from "@/app/lib/domain/statuses";

export type SlotAction =
  | { action: "create" }
  | { action: "reuse"; appointmentId: number }
  | { action: "skip_foreign" };

const NON_REUSABLE = new Set<string>([
  ...TERMINAL_APPOINTMENT_STATUSES,
  "remarcado",
]);

export function isReusableAppointmentStatus(status: string | null | undefined): boolean {
  return !NON_REUSABLE.has(String(status || ""));
}

/**
 * Pagador já tem agendamento no slot → reutilizar.
 * Outro usuário reserva o horário (status que ocupa calendário) → não criar.
 * Caso contrário → criar.
 */
export function decidePaymentSlotAction(params: {
  ownReusableId: number | null;
  foreignReservingId: number | null;
}): SlotAction {
  if (params.ownReusableId != null) {
    return { action: "reuse", appointmentId: params.ownReusableId };
  }
  if (params.foreignReservingId != null) {
    return { action: "skip_foreign" };
  }
  return { action: "create" };
}

export type PlannedCouponOp = "increment" | "bind_only" | "none";

export function decideCouponFulfillmentOp(params: {
  hasCoupon: boolean;
  useCount: number;
  used: boolean;
  appointmentId: number | null;
  serviceId: string | null;
  targetAppointmentId: number;
  targetServiceId: string | null;
}): PlannedCouponOp {
  if (!params.hasCoupon) return "none";
  const consumed = params.used || params.useCount > 0;
  if (!consumed) return "increment";
  const needsBind =
    (params.appointmentId == null && params.targetAppointmentId != null) ||
    (!params.serviceId && Boolean(params.targetServiceId));
  return needsBind ? "bind_only" : "none";
}

export function shouldSendFulfillmentEmails(params: {
  sendEmailsRequested: boolean;
  createdAppointmentThisRun: boolean;
}): boolean {
  return params.sendEmailsRequested && params.createdAppointmentThisRun;
}

export function missingServiceCount(existing: number, expected: number): number {
  return Math.max(0, expected - Math.max(0, existing));
}
