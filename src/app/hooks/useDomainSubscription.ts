"use client";

import { useEffect } from "react";
import { useDomainSync } from "@/app/lib/synchronization/DomainSyncProvider";
import type { SyncSurface } from "@/app/lib/synchronization/types";

/**
 * Assina superfícies do Sync Engine e chama onEvent/onRefresh.
 */
export function useDomainSubscription(
  surfaces: SyncSurface | SyncSurface[],
  onRefresh: () => void | Promise<void>,
  deps: unknown[] = []
): void {
  const { subscribeSurface } = useDomainSync();

  useEffect(() => {
    return subscribeSurface(surfaces, onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeSurface, JSON.stringify(surfaces), ...deps]);
}
