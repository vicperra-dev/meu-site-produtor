"use client";

/**
 * SYNC-01A — Provider único: EventSource + BroadcastChannel + dedup + refresh coalesce.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SyncEnvelope, SyncSurface } from "@/app/lib/synchronization/types";

type RefreshHandler = () => void | Promise<void>;

type DomainSyncContextValue = {
  connected: boolean;
  lastCursor: string | null;
  lastEvent: SyncEnvelope | null;
  subscribeSurface: (surface: SyncSurface | SyncSurface[], onRefresh: RefreshHandler) => () => void;
  publishLocalSignal: (detail?: string) => void;
};

const DomainSyncContext = createContext<DomainSyncContextValue | null>(null);

const BC_NAME = "thouse:domain-sync";
const SEEN_MAX = 500;

function surfacesKey(surfaces: SyncSurface[]): string {
  return [...surfaces].sort().join(",");
}

export function DomainSyncProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<SyncEnvelope | null>(null);

  const handlersRef = useRef<Map<string, Set<RefreshHandler>>>(new Map());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const coalesceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cursorRef = useRef<string | null>(null);

  const markSeen = useCallback((id: string): boolean => {
    if (seenIdsRef.current.has(id)) return false;
    seenIdsRef.current.add(id);
    if (seenIdsRef.current.size > SEEN_MAX) {
      const arr = Array.from(seenIdsRef.current);
      for (const old of arr.slice(0, arr.length - 250)) seenIdsRef.current.delete(old);
    }
    return true;
  }, []);

  const runRefresh = useCallback((surfaces: SyncSurface[]) => {
    const keys = new Set<string>();
    for (const s of surfaces) {
      keys.add(s);
      keys.add("all");
    }
    for (const key of keys) {
      const set = handlersRef.current.get(key);
      if (!set) continue;
      // coalesce 50ms por surface key
      const existing = coalesceRef.current.get(key);
      if (existing) clearTimeout(existing);
      coalesceRef.current.set(
        key,
        setTimeout(() => {
          coalesceRef.current.delete(key);
          for (const fn of Array.from(set)) {
            void Promise.resolve(fn()).catch((err) =>
              console.error("[DomainSync] refresh error", key, err)
            );
          }
        }, 50)
      );
    }
  }, []);

  const handleEnvelope = useCallback(
    (env: SyncEnvelope, fromBroadcast = false) => {
      if (!markSeen(env.id)) return;
      cursorRef.current = env.cursor;
      setLastCursor(env.cursor);
      setLastEvent(env);
      runRefresh(env.surfaces.includes("all") ? ["all"] : env.surfaces);

      if (!fromBroadcast && typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel(BC_NAME);
          bc.postMessage({ type: "sync-envelope", envelope: env });
          bc.close();
        } catch {
          /* ignore */
        }
      }
    },
    [markSeen, runRefresh]
  );

  const recoveryFetch = useCallback(async () => {
    try {
      const q = new URLSearchParams({ mode: "poll" });
      if (cursorRef.current) q.set("cursor", cursorRef.current);
      const res = await fetch(`/api/sync/events?${q}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.events)) {
        for (const env of data.events as SyncEnvelope[]) {
          handleEnvelope(env);
        }
      }
      if (data.cursor) {
        cursorRef.current = data.cursor;
        setLastCursor(data.cursor);
      }
    } catch (err) {
      console.warn("[DomainSync] recovery fetch failed", err);
    }
  }, [handleEnvelope]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let es: EventSource | null = null;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (stopped) return;
      const q = new URLSearchParams();
      if (cursorRef.current) q.set("cursor", cursorRef.current);
      es = new EventSource(`/api/sync/events?${q}`, { withCredentials: true });

      es.addEventListener("domain", (ev) => {
        try {
          const env = JSON.parse((ev as MessageEvent).data) as SyncEnvelope;
          handleEnvelope(env);
        } catch (err) {
          console.warn("[DomainSync] bad SSE payload", err);
        }
      });

      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!stopped) {
          reconnectTimer = setTimeout(() => {
            void recoveryFetch().then(connect);
          }, 3000);
        }
      };
    };

    connect();

    let bc: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = (msg) => {
        if (msg.data?.type === "sync-envelope" && msg.data.envelope) {
          handleEnvelope(msg.data.envelope as SyncEnvelope, true);
        } else if (msg.data?.type === "local-signal") {
          runRefresh(["all"]);
        }
      };
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void recoveryFetch();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Fallback recovery interval (inventory: fallback)
    const fallback = setInterval(() => {
      if (document.visibilityState === "visible" && !connected) {
        void recoveryFetch();
      }
    }, 15000);

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisibility);
      es?.close();
      bc?.close();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleEnvelope, recoveryFetch, runRefresh]);

  const subscribeSurface = useCallback(
    (surface: SyncSurface | SyncSurface[], onRefresh: RefreshHandler) => {
      const list = Array.isArray(surface) ? surface : [surface];
      for (const s of list) {
        if (!handlersRef.current.has(s)) handlersRef.current.set(s, new Set());
        handlersRef.current.get(s)!.add(onRefresh);
      }
      return () => {
        for (const s of list) {
          handlersRef.current.get(s)?.delete(onRefresh);
        }
      };
    },
    []
  );

  const publishLocalSignal = useCallback(
    (detail?: string) => {
      runRefresh(["all"]);
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel(BC_NAME);
          bc.postMessage({ type: "local-signal", detail });
          bc.close();
        } catch {
          /* ignore */
        }
      }
    },
    [runRefresh]
  );

  const value = useMemo(
    () => ({
      connected,
      lastCursor,
      lastEvent,
      subscribeSurface,
      publishLocalSignal,
    }),
    [connected, lastCursor, lastEvent, subscribeSurface, publishLocalSignal]
  );

  void surfacesKey;

  return <DomainSyncContext.Provider value={value}>{children}</DomainSyncContext.Provider>;
}

export function useDomainSync(): DomainSyncContextValue {
  const ctx = useContext(DomainSyncContext);
  if (!ctx) {
    // fallback seguro fora do provider
    return {
      connected: false,
      lastCursor: null,
      lastEvent: null,
      subscribeSurface: () => () => {},
      publishLocalSignal: () => {},
    };
  }
  return ctx;
}
