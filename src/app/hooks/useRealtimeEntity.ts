"use client";

import { useEffect, useState } from "react";
import { useDomainSync } from "@/app/lib/synchronization/DomainSyncProvider";
import type { SyncEnvelope, SyncSurface } from "@/app/lib/synchronization/types";

/**
 * Observa o último envelope relevante para entity/entityId (ou superfície).
 */
export function useRealtimeEntity(opts: {
  entity?: string;
  entityId?: string;
  surfaces?: SyncSurface[];
}): SyncEnvelope | null {
  const { lastEvent, subscribeSurface } = useDomainSync();
  const [matched, setMatched] = useState<SyncEnvelope | null>(null);

  useEffect(() => {
    const surfaces = opts.surfaces?.length ? opts.surfaces : (["all"] as SyncSurface[]);
    return subscribeSurface(surfaces, () => {
      /* refresh signal — matched updated via lastEvent effect */
    });
  }, [subscribeSurface, opts.surfaces]);

  useEffect(() => {
    if (!lastEvent) return;
    if (opts.entity && lastEvent.entity !== opts.entity) return;
    if (opts.entityId && lastEvent.entityId !== opts.entityId) return;
    setMatched(lastEvent);
  }, [lastEvent, opts.entity, opts.entityId]);

  return matched;
}
