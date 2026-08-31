/**
 * SYNC-01A — Porta oficial de lifecycle events (criação/planos)
 * fora do grafo de status da State Machine, mas sempre via Sync Engine.
 */

import { publishSyncEvent } from "@/app/lib/synchronization/engine";
import type { SyncEnvelope, SyncPublishOptions } from "@/app/lib/synchronization/types";

export async function emitAppointmentReserved(params: {
  appointmentId: number | string;
  userId: string;
  dataIso?: string;
  duracaoMinutos?: number;
  metadata?: Record<string, unknown>;
}): Promise<SyncEnvelope> {
  return publishSyncEvent({
    name: "AppointmentReserved",
    entity: "appointment",
    entityId: String(params.appointmentId),
    to: "pendente",
    options: {
      source: "lifecycle",
      userId: params.userId,
      metadata: {
        slotHint: params.dataIso || true,
        data: params.dataIso,
        duracaoMinutos: params.duracaoMinutos,
        ...params.metadata,
      },
    },
  });
}

export async function emitCouponGenerated(params: {
  couponId: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<SyncEnvelope> {
  return publishSyncEvent({
    name: "CouponGenerated",
    entity: "coupon",
    entityId: params.couponId,
    to: "criado",
    options: {
      source: "lifecycle",
      userId: params.userId,
      metadata: params.metadata,
    },
  });
}

export async function emitPlanCancelled(params: {
  userPlanId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<SyncEnvelope> {
  return publishSyncEvent({
    name: "PlanCancelled",
    entity: "userPlan",
    entityId: params.userPlanId,
    from: "active",
    to: "cancelled",
    options: {
      source: "lifecycle",
      userId: params.userId,
      metadata: params.metadata,
    },
  });
}

export async function emitPlanRenewed(params: {
  userPlanId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<SyncEnvelope> {
  return publishSyncEvent({
    name: "PlanRenewed",
    entity: "userPlan",
    entityId: params.userPlanId,
    to: "active",
    options: {
      source: "lifecycle",
      userId: params.userId,
      metadata: params.metadata,
    },
  });
}

export async function emitSyncSignal(
  options?: SyncPublishOptions & { entity?: string; entityId?: string }
): Promise<SyncEnvelope> {
  return publishSyncEvent({
    name: "SyncSignal",
    entity: options?.entity || "system",
    entityId: options?.entityId || "signal",
    options: {
      source: options?.source || "client-signal",
      scope: options?.scope || "all",
      userId: options?.userId,
      surfaces: options?.surfaces || ["all"],
      metadata: options?.metadata,
    },
  });
}
