/**
 * SYNC-01A — Observador determinístico para Test Engine (sem sleeps).
 */

import type { SyncEnvelope } from "@/app/lib/synchronization/types";

const g = globalThis as unknown as {
  __thouseSyncObserver?: {
    enabled: boolean;
    events: SyncEnvelope[];
  };
};

function store() {
  if (!g.__thouseSyncObserver) {
    g.__thouseSyncObserver = { enabled: false, events: [] };
  }
  return g.__thouseSyncObserver;
}

export function enableSyncObserver(): void {
  const s = store();
  s.enabled = true;
  s.events = [];
}

export function disableSyncObserver(): void {
  const s = store();
  s.enabled = false;
  s.events = [];
}

export function recordSyncObserver(envelope: SyncEnvelope): void {
  const s = store();
  if (!s.enabled) return;
  s.events.push(envelope);
}

export function drainSyncObserver(): SyncEnvelope[] {
  const s = store();
  const out = s.events.slice();
  s.events = [];
  return out;
}

export function peekSyncObserver(): SyncEnvelope[] {
  return store().events.slice();
}

export function findSyncObserverEvents(predicate: (e: SyncEnvelope) => boolean): SyncEnvelope[] {
  return store().events.filter(predicate);
}
