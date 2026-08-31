/**
 * HS-03B — Domain Events padronizados (sem Event Bus).
 */

import type {
  DomainEvent,
  DomainEventName,
  TransitionInput,
  WorkflowEntity,
} from "@/app/lib/domain/state-machine/types";
import { normalizeState } from "@/app/lib/domain/state-machine/guards";

const EVENT_MAP: Record<WorkflowEntity, Record<string, DomainEventName>> = {
  appointment: {
    aceito: "AppointmentAccepted",
    confirmado: "AppointmentAccepted",
    recusado: "AppointmentRejected",
    cancelado: "AppointmentCancelled",
    remarcado: "AppointmentRebooked",
    em_andamento: "AppointmentStarted",
    concluido: "AppointmentCompleted",
  },
  service: {
    aceito: "ServiceAccepted",
    em_andamento: "ServiceStarted",
    entrega: "ServiceDelivered",
    concluido: "ServiceCompleted",
    cancelado: "ServiceCancelled",
    recusado: "ServiceRejected",
  },
  payment: {
    recebido: "PaymentReceived",
    confirmado: "PaymentConfirmed",
    reembolsado: "PaymentRefunded",
  },
  coupon: {
    criado: "CouponGenerated",
    utilizado: "CouponConsumed",
    expirado: "CouponExpired",
    cancelado: "CouponCancelled",
  },
};

export function resolveEventName(
  entity: WorkflowEntity,
  toNormalized: string
): DomainEventName {
  return EVENT_MAP[entity][toNormalized] || "DomainTransition";
}

export function buildDomainEvent(
  input: TransitionInput,
  from: string,
  to: string
): DomainEvent {
  const toN = normalizeState(input.entity, to);
  const fromN = normalizeState(input.entity, from);
  return {
    name: resolveEventName(input.entity, toN),
    entity: input.entity,
    entityId: String(input.id),
    from: fromN,
    to: toN,
    reason: input.reason,
    actor: input.actor,
    metadata: input.metadata,
    occurredAt: new Date().toISOString(),
  };
}

/** Emite evento padronizado (log estruturado). Sem bus. */
export function emitDomainEvent(event: DomainEvent): void {
  console.log(
    `[DomainEvent] ${event.name}`,
    JSON.stringify({
      entity: event.entity,
      entityId: event.entityId,
      from: event.from,
      to: event.to,
      actor: event.actor?.type,
      reason: event.reason,
      at: event.occurredAt,
    })
  );
}
