"use client";

import { useCallback, useRef } from "react";
import { useDomainSubscription } from "@/app/hooks/useDomainSubscription";
import type { SyncSurface } from "@/app/lib/synchronization/types";

/**
 * Assina superfícies e expõe refresh coalescido (sem polling periódico).
 * In-flight overlap protection embutida.
 */
export function useDomainRefresh(
  surfaces: SyncSurface | SyncSurface[],
  loader: () => void | Promise<void>
) {
  const inflight = useRef(false);
  const pending = useRef(false);

  const safeLoad = useCallback(async () => {
    if (inflight.current) {
      pending.current = true;
      return;
    }
    inflight.current = true;
    try {
      await loader();
    } finally {
      inflight.current = false;
      if (pending.current) {
        pending.current = false;
        void safeLoad();
      }
    }
  }, [loader]);

  useDomainSubscription(surfaces, () => {
    void safeLoad();
  }, [safeLoad]);

  return { refresh: safeLoad };
}
