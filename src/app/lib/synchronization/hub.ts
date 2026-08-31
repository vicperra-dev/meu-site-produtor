/**
 * SYNC-01A — Hub in-process (singleton). Entrega imediata no processo atual.
 * Sem Redis / bus distribuído.
 */

import type { SyncEnvelope, SyncSubscriber, SyncSurface } from "@/app/lib/synchronization/types";

const g = globalThis as unknown as {
  __thouseSyncHub?: {
    subscribers: Map<string, SyncSubscriber>;
    recentIds: Set<string>;
  };
};

function store() {
  if (!g.__thouseSyncHub) {
    g.__thouseSyncHub = {
      subscribers: new Map(),
      recentIds: new Set(),
    };
  }
  return g.__thouseSyncHub;
}

function matchesSurface(subSurfaces: SyncSurface[], envelope: SyncEnvelope): boolean {
  if (subSurfaces.includes("all")) return true;
  if (envelope.surfaces.includes("all")) return true;
  return subSurfaces.some((s) => envelope.surfaces.includes(s));
}

export function subscribeSync(subscriber: SyncSubscriber): () => void {
  const s = store();
  s.subscribers.set(subscriber.id, subscriber);
  return () => {
    s.subscribers.delete(subscriber.id);
  };
}

export function unsubscribeSync(id: string): void {
  store().subscribers.delete(id);
}

export function listSyncSubscribers(): SyncSubscriber[] {
  return Array.from(store().subscribers.values());
}

/** Dedup curto em memória (mesmo processo) — IDs já entregues ao hub. */
export function markHubDelivered(id: string): boolean {
  const s = store();
  if (s.recentIds.has(id)) return false;
  s.recentIds.add(id);
  if (s.recentIds.size > 2000) {
    const arr = Array.from(s.recentIds);
    for (const old of arr.slice(0, arr.length - 1000)) s.recentIds.delete(old);
  }
  return true;
}

export async function notifyHub(envelope: SyncEnvelope): Promise<number> {
  if (!markHubDelivered(envelope.id)) return 0;
  const subs = listSyncSubscribers().filter((sub) => matchesSurface(sub.surfaces, envelope));
  let n = 0;
  for (const sub of subs) {
    try {
      await sub.onEvent(envelope);
      n += 1;
    } catch (err) {
      console.error("[SyncHub] subscriber error", sub.id, err);
    }
  }
  return n;
}
