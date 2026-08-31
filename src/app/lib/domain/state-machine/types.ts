/**
 * HS-03B — Tipos da State Machine oficial.
 */

export type WorkflowEntity = "appointment" | "service" | "payment" | "coupon";

export type TransitionActor =
  | { type: "admin"; id?: string }
  | { type: "user"; id?: string }
  | { type: "system"; id?: string }
  | { type: "webhook"; id?: string }
  | { type: "test-engine"; id?: string };

export type TransitionInput = {
  entity: WorkflowEntity;
  id: string | number;
  /** Se omitido, lê o estado atual do banco. */
  from?: string;
  to: string;
  reason?: string;
  actor?: TransitionActor;
  metadata?: Record<string, unknown>;
  /** Evita efeitos em cascata (útil no webhook Asaas / testes). */
  skipEffects?: boolean;
};

export type DomainEventName =
  | "AppointmentAccepted"
  | "AppointmentRejected"
  | "AppointmentCancelled"
  | "AppointmentRebooked"
  | "AppointmentStarted"
  | "AppointmentCompleted"
  | "ServiceAccepted"
  | "ServiceStarted"
  | "ServiceDelivered"
  | "ServiceCompleted"
  | "ServiceCancelled"
  | "ServiceRejected"
  | "PaymentReceived"
  | "PaymentConfirmed"
  | "PaymentRefunded"
  | "CouponGenerated"
  | "CouponConsumed"
  | "CouponExpired"
  | "CouponCancelled"
  | "DomainTransition";

export type DomainEvent = {
  name: DomainEventName;
  entity: WorkflowEntity;
  entityId: string;
  from: string;
  to: string;
  reason?: string;
  actor?: TransitionActor;
  metadata?: Record<string, unknown>;
  occurredAt: string;
};

export type TransitionOk = {
  ok: true;
  alreadyProcessed?: boolean;
  from: string;
  to: string;
  event: DomainEvent;
  entityId: string;
};

export type TransitionFail = {
  ok: false;
  error: string;
  httpStatus: number;
  code: string;
};

export type TransitionResult = TransitionOk | TransitionFail;
