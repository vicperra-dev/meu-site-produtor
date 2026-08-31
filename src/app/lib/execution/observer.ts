/**
 * EC-01 — Execution observer (delega ao sync observer).
 */

export {
  enableSyncObserver,
  disableSyncObserver,
  drainSyncObserver,
  peekSyncObserver,
  findSyncObserverEvents,
} from "@/app/lib/synchronization/observer";
