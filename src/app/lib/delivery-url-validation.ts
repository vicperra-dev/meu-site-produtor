const URL_OK = /^https?:\/\/.+/i;
const LOCAL_UPLOAD_OK = /^\/uploads\/deliveries\/[a-zA-Z0-9._-]+$/;

export type DeliveryUrlValidationResult =
  | { ok: true; probeOk?: boolean; probeSkippedReason?: string; isLocalUpload?: boolean }
  | { ok: false; error: string };

/**
 * Valida URL/caminho de entrega.
 * Aceita http(s) externo OU caminho local /uploads/deliveries/* (upload admin).
 */
export async function validateDeliveryAudioUrl(
  rawUrl: string,
  opts?: { probe?: boolean }
): Promise<DeliveryUrlValidationResult> {
  const urlTrim = String(rawUrl || "").trim();
  if (!urlTrim) {
    return { ok: false, error: "URL do áudio não pode estar vazia." };
  }
  const lower = urlTrim.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return { ok: false, error: "URL inválida: apenas links http ou https são permitidos." };
  }

  if (LOCAL_UPLOAD_OK.test(urlTrim)) {
    return { ok: true, isLocalUpload: true, probeSkippedReason: "upload local" };
  }

  // OP-01: entrega oficial é upload local; URL externa só legado (probe).
  if (!URL_OK.test(urlTrim)) {
    return {
      ok: false,
      error: "Faça upload do arquivo (WAV/MP3/ZIP). Caminho inválido.",
    };
  }

  if (!opts?.probe) {
    return { ok: true };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(urlTrim, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "THouseRec-DeliveryCheck/1.0" },
    });
    clearTimeout(timer);

    if (res.status === 404) {
      return { ok: false, error: "O link não foi encontrado (404). Verifique se o arquivo está disponível." };
    }

    if (res.ok || res.status === 405 || res.status === 403 || res.status === 401) {
      return {
        ok: true,
        probeOk: res.ok,
        probeSkippedReason:
          !res.ok && res.status !== 404
            ? `HEAD retornou ${res.status} (aceito como inconclusivo)`
            : undefined,
      };
    }

    return {
      ok: true,
      probeOk: false,
      probeSkippedReason: `HEAD retornou ${res.status}; formato da URL aceito`,
    };
  } catch (e: unknown) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: true,
      probeOk: false,
      probeSkippedReason: aborted
        ? "Tempo esgotado ao verificar o link (HEAD)"
        : "Não foi possível verificar o link (HEAD); formato aceito",
    };
  }
}

/** Nome amigável a partir do path/URL de entrega (sem expor pasta interna). */
export function deliveryDisplayName(url: string | null | undefined): string {
  if (!url) return "Arquivo entregue";
  try {
    const raw = url.includes("://") ? new URL(url).pathname : url;
    const base = raw.split("/").pop() || "arquivo";
    // strip serviceId_timestamp_uuid_ prefix when present
    const cleaned = base.replace(/^[a-f0-9]+_\d+_[a-f0-9]+_/i, "");
    return cleaned || base;
  } catch {
    return "Arquivo entregue";
  }
}
