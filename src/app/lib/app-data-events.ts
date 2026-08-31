/**
 * Compat layer — preferir DomainSyncProvider / useDomainRefresh (SYNC-01A).
 * Mantém notify/subscribe para código legado; BroadcastChannel + CustomEvent.
 */

const APP_DATA_CHANGED = "thouse:data-changed";
const BC_NAME = "thouse:domain-sync";

/** Dispara refresh em telas que assinam `subscribeAppDataChanged`. */
export function notifyAppDataChanged(detail?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_DATA_CHANGED, { detail }));
  if ("BroadcastChannel" in window) {
    try {
      const bc = new BroadcastChannel(BC_NAME);
      bc.postMessage({ type: "local-signal", detail });
      bc.close();
    } catch {
      /* ignore */
    }
  }
}

/** Assina mudanças de dados + refresh ao voltar à aba. */
export function subscribeAppDataChanged(onRefresh: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => onRefresh();
  window.addEventListener(APP_DATA_CHANGED, handler);

  let bc: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    bc = new BroadcastChannel(BC_NAME);
    bc.onmessage = (msg) => {
      if (
        msg.data?.type === "local-signal" ||
        msg.data?.type === "sync-envelope"
      ) {
        onRefresh();
      }
    };
  }

  const onVisibility = () => {
    if (document.visibilityState === "visible") onRefresh();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.removeEventListener(APP_DATA_CHANGED, handler);
    document.removeEventListener("visibilitychange", onVisibility);
    bc?.close();
  };
}

export function isLocalhostClient(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}
