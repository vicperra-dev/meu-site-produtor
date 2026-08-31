/**
 * SYNC-01A — Tipos oficiais do Synchronization Engine.
 * Domínio de eventos parte da State Machine (HS-03B).
 */

import type { DomainEvent, DomainEventName } from "@/app/lib/domain/state-machine/types";

/** Superfícies React / telas que assinam o hub único. */
export type SyncSurface =
  | "minha-conta"
  | "dashboard"
  | "servicos-gerais"
  | "servicos-selecionados"
  | "pagamentos"
  | "cupons"
  | "agenda"
  | "admin-agendamentos"
  | "estatisticas"
  | "planos"
  | "all";

/** Eventos de ciclo de vida fora da SM (criação / planos) — ainda passam pelo Sync Engine. */
export type LifecycleSyncEventName =
  | "AppointmentReserved"
  | "PlanCancelled"
  | "PlanRenewed"
  | "SyncSignal";

export type SyncEventName = DomainEventName | LifecycleSyncEventName;

export type SyncScope = "user" | "admin" | "public" | "all";

export type SyncEnvelope = {
  id: string;
  cursor: string;
  name: SyncEventName;
  entity: string;
  entityId: string;
  from?: string;
  to?: string;
  surfaces: SyncSurface[];
  scope: SyncScope;
  userId?: string | null;
  occurredAt: string;
  source: "state-machine" | "lifecycle" | "client-signal" | "recovery";
  metadata?: Record<string, unknown>;
};

export type SyncSubscriber = {
  id: string;
  surfaces: SyncSurface[];
  onEvent: (envelope: SyncEnvelope) => void | Promise<void>;
};

export type SyncPublishOptions = {
  surfaces?: SyncSurface[];
  scope?: SyncScope;
  userId?: string | null;
  source?: SyncEnvelope["source"];
  metadata?: Record<string, unknown>;
};

export type DomainEventLike = Pick<
  DomainEvent,
  "name" | "entity" | "entityId" | "from" | "to" | "occurredAt" | "metadata"
> & {
  actor?: DomainEvent["actor"];
  reason?: string;
};

export type SyncEventsApiResponse = {
  ok: true;
  cursor: string | null;
  events: SyncEnvelope[];
  polledAt: string;
};

export type PollingClass = "necessario" | "desnecessario" | "fallback";

export type PollingInventoryItem = {
  file: string;
  what: string;
  intervalMs: number;
  classification: PollingClass;
  notes: string;
};

/** Clock abstrato para SIM-03 (time simulation) — default = Date.now. */
export type SyncClock = {
  now: () => Date;
};

/** Compatibilidade SIM-01/02/03 (sem implementação de simulação nesta sprint). */
export type SyncSimulationHooks = {
  clock?: SyncClock;
  sourceTag?: "live" | "sim-payment" | "sim-scenario" | "sim-time";
};
