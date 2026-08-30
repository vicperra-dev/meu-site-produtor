/**
 * Domínio operacional consolidado (HS-03A + HS-03B).
 * Appointment · Service · Payment · Coupon
 * Mutações de status → State Machine (transition).
 */

export * from "@/app/lib/domain/statuses";
export * from "@/app/lib/domain/coupon-types";
export * from "@/app/lib/domain/domain-service";
export {
  approveAppointment,
  rejectAppointment,
  startServiceWork,
  ensureOperationalTimerServicesStartedForAppointment,
  cancelAppointment,
  revertAppointmentCancellation,
  rebookAppointment,
  startService,
  completeService,
  deliverService,
  completeOperationalService,
  updateServiceFields,
  confirmPayment,
  refundPaymentStatus,
  consumeCoupon,
  type WorkflowResult,
  type WorkflowOk,
  type WorkflowFail,
} from "@/app/lib/domain/workflow";
export {
  transition,
  isTransitionAllowed,
  assertTransitionAllowed,
  listAllowedTargets,
  ALLOWED_TRANSITIONS,
  normalizeState,
  toPersistedState,
  type TransitionInput,
  type TransitionResult,
  type DomainEvent,
} from "@/app/lib/domain/state-machine";
export * from "@/app/lib/domain/graph";
