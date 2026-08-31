"use client";

import { useDomainSubscription } from "@/app/hooks/useDomainSubscription";
import type { SyncSurface } from "@/app/lib/synchronization/types";

/** Alias semântico — updates de workflow/status via Sync Engine. */
export function useWorkflowUpdates(
  surfaces: SyncSurface | SyncSurface[],
  onUpdate: () => void | Promise<void>
): void {
  useDomainSubscription(surfaces, onUpdate);
}
