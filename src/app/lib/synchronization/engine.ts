/**
 * SYNC-01A — Synchronization Engine oficial.
 * Transition → DomainEvent → persist outbox → hub in-process → SSE/subscribers.
 */

import { prisma } from "@/app/lib/prisma";
import { resolveSyncRoute } from "@/app/lib/synchronization/routing";
import { notifyHub } from "@/app/lib/synchronization/hub";
import { recordSyncObserver } from "@/app/lib/synchronization/observer";
import type {
  DomainEventLike,
  SyncEnvelope,
  SyncEventName,
  SyncPublishOptions,
  SyncScope,
  SyncSimulationHooks,
  SyncSurface,
} from "@/app/lib/synchronization/types";

let simulationHooks: SyncSimulationHooks = {};

export function configureSyncSimulation(hooks: SyncSimulationHooks): void {
  simulationHooks = { ...simulationHooks, ...hooks };
}

function clockNow(): Date {
  return simulationHooks.clock?.now() || new Date();
}

function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase();
    if (
      key.includes("password") ||
      key.includes("senha") ||
      key.includes("cpf") ||
      key.includes("token") ||
      key.includes("secret") ||
      key.includes("email")
    ) {
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    } else if (Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number")) {
      out[k] = v.slice(0, 20);
    }
  }
  return out;
}

async function resolveOwnerUserId(
  entity: string,
  entityId: string,
  hint?: string | null
): Promise<string | null> {
  if (hint) return hint;
  try {
    if (entity === "appointment") {
      const id = parseInt(entityId, 10);
      if (!Number.isFinite(id)) return null;
      const row = await prisma.appointment.findUnique({
        where: { id },
        select: { userId: true },
      });
      return row?.userId || null;
    }
    if (entity === "service") {
      const row = await prisma.service.findUnique({
        where: { id: entityId },
        select: { userId: true },
      });
      return row?.userId || null;
    }
    if (entity === "payment") {
      const row = await prisma.payment.findUnique({
        where: { id: entityId },
        select: { userId: true },
      });
      return row?.userId || null;
    }
    if (entity === "coupon") {
      const row = await prisma.coupon.findUnique({
        where: { id: entityId },
        select: { assignedUserId: true, usedBy: true },
      });
      return row?.assignedUserId || row?.usedBy || null;
    }
    if (entity === "plan" || entity === "userPlan") {
      const row = await prisma.userPlan.findUnique({
        where: { id: entityId },
        select: { userId: true },
      });
      return row?.userId || null;
    }
  } catch {
    return null;
  }
  return null;
}

function rowToEnvelope(row: {
  id: string;
  cursor: bigint;
  name: string;
  entity: string;
  entityId: string;
  fromStatus: string | null;
  toStatus: string | null;
  scope: string;
  userId: string | null;
  surfaces: string;
  source: string;
  payload: string;
  occurredAt: Date;
}): SyncEnvelope {
  let surfaces: SyncSurface[] = [];
  let metadata: Record<string, unknown> = {};
  try {
    surfaces = JSON.parse(row.surfaces);
  } catch {
    surfaces = [];
  }
  try {
    metadata = JSON.parse(row.payload);
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    cursor: String(row.cursor),
    name: row.name as SyncEventName,
    entity: row.entity,
    entityId: row.entityId,
    from: row.fromStatus || undefined,
    to: row.toStatus || undefined,
    surfaces,
    scope: row.scope as SyncScope,
    userId: row.userId,
    occurredAt: row.occurredAt.toISOString(),
    source: row.source as SyncEnvelope["source"],
    metadata,
  };
}

/**
 * Publica evento no outbox + hub. Idempotente por id se re-passado.
 */
export async function publishSyncEvent(input: {
  name: SyncEventName;
  entity: string;
  entityId: string;
  from?: string;
  to?: string;
  options?: SyncPublishOptions;
}): Promise<SyncEnvelope> {
  const route = resolveSyncRoute(input.name);
  const surfaces = input.options?.surfaces || route.surfaces;
  const scope = input.options?.scope || route.scope;
  const userId = await resolveOwnerUserId(
    input.entity,
    input.entityId,
    input.options?.userId
  );
  const occurredAt = clockNow();
  const source = input.options?.source || "lifecycle";
  const metadata: Record<string, unknown> = {
    ...sanitizeMetadata(input.options?.metadata),
    ...(simulationHooks.sourceTag ? { simSource: simulationHooks.sourceTag } : {}),
    publicAgenda: Boolean(route.publicAgenda),
    notifyAdmin: Boolean(route.notifyAdmin),
  };

  const row = await prisma.synchronizationEvent.create({
    data: {
      name: input.name,
      entity: input.entity,
      entityId: String(input.entityId),
      fromStatus: input.from || null,
      toStatus: input.to || null,
      scope,
      userId,
      surfaces: JSON.stringify(surfaces),
      source,
      payload: JSON.stringify(metadata),
      occurredAt,
    },
  });

  const envelope = rowToEnvelope(row);
  recordSyncObserver(envelope);
  await notifyHub(envelope);

  // Agenda pública: segundo envelope sanitizado (sem userId) para outras sessões.
  if (route.publicAgenda) {
    const publicRow = await prisma.synchronizationEvent.create({
      data: {
        name: input.name,
        entity: input.entity,
        entityId: String(input.entityId),
        fromStatus: input.from || null,
        toStatus: input.to || null,
        scope: "public",
        userId: null,
        surfaces: JSON.stringify(["agenda"] as SyncSurface[]),
        source,
        payload: JSON.stringify({
          publicAgenda: true,
          slotHint: metadata.slotHint || metadata.data || true,
          duracaoMinutos: metadata.duracaoMinutos,
        }),
        occurredAt,
      },
    });
    const publicEnv = rowToEnvelope(publicRow);
    recordSyncObserver(publicEnv);
    await notifyHub(publicEnv);
  }

  return envelope;
}

/** Publica a partir de DomainEvent da State Machine. */
export async function publishFromDomainEvent(
  event: DomainEventLike,
  options?: SyncPublishOptions
): Promise<SyncEnvelope> {
  const actorUserId =
    event.actor?.type === "user" && event.actor.id ? event.actor.id : undefined;
  return publishSyncEvent({
    name: event.name as SyncEventName,
    entity: event.entity,
    entityId: event.entityId,
    from: event.from,
    to: event.to,
    options: {
      source: "state-machine",
      userId: options?.userId ?? actorUserId,
      surfaces: options?.surfaces,
      scope: options?.scope,
      metadata: {
        reason: event.reason,
        actorType: event.actor?.type,
        ...sanitizeMetadata(event.metadata),
        ...sanitizeMetadata(options?.metadata),
      },
    },
  });
}

export async function listSyncEventsSince(params: {
  cursor?: string | null;
  take?: number;
  userId?: string | null;
  isAdmin?: boolean;
  surfaces?: SyncSurface[];
}): Promise<{ events: SyncEnvelope[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(params.take || 50, 1), 200);
  const cursorNum =
    params.cursor && /^\d+$/.test(params.cursor) ? BigInt(params.cursor) : null;

  const where: {
    cursor?: { gt: bigint };
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (cursorNum != null) {
    where.cursor = { gt: cursorNum };
  }

  if (params.isAdmin) {
    // admin vê tudo
  } else if (params.userId) {
    where.OR = [
      { scope: "public" },
      { scope: "all" },
      { userId: params.userId },
      {
        AND: [
          { scope: "user" },
          { userId: params.userId },
        ],
      },
    ];
  } else {
    where.OR = [{ scope: "public" }, { scope: "all" }];
  }

  const rows = await prisma.synchronizationEvent.findMany({
    where,
    orderBy: { cursor: "asc" },
    take,
  });

  let events = rows.map(rowToEnvelope);

  if (params.surfaces && params.surfaces.length > 0 && !params.surfaces.includes("all")) {
    const want = new Set(params.surfaces);
    events = events.filter(
      (e) => e.surfaces.includes("all") || e.surfaces.some((s) => want.has(s))
    );
  }

  // Eventos de agenda pública: usuários anônimos/outros veem só slots (payload já sanitizado)
  if (!params.isAdmin && params.userId) {
    events = events.filter((e) => {
      if (e.userId === params.userId) return true;
      if (e.scope === "public" || e.scope === "all") return true;
      if (e.metadata?.publicAgenda && e.surfaces.includes("agenda")) {
        // entrega sanitizada: só metadata de slot
        return true;
      }
      if (e.metadata?.notifyAdmin) return false;
      return false;
    });
  }

  const nextCursor = events.length ? events[events.length - 1].cursor : params.cursor || null;
  return { events, nextCursor };
}

export async function getLatestSyncCursor(): Promise<string | null> {
  const row = await prisma.synchronizationEvent.findFirst({
    orderBy: { cursor: "desc" },
    select: { cursor: true },
  });
  return row ? String(row.cursor) : null;
}

/** Envelope público sanitizado para agenda (outro usuário). */
export function toPublicAgendaEnvelope(envelope: SyncEnvelope): SyncEnvelope {
  return {
    ...envelope,
    userId: null,
    scope: "public",
    surfaces: ["agenda"],
    metadata: {
      slotHint: envelope.metadata?.slotHint || envelope.metadata?.data || true,
      publicAgenda: true,
    },
  };
}
