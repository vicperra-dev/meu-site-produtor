/**
 * GO-H11A — URLs de entrega expostas ao cliente passam pelo proxy autenticado.
 * O valor em Service.deliveryAudioUrl continua sendo o path/URL de storage interno.
 */

export function deliveryProxyUrl(serviceId: string): string {
  return `/api/entregas/${encodeURIComponent(serviceId)}`;
}

export function isVercelBlobUrl(url: string): boolean {
  return /blob\.vercel-storage\.com/i.test(url);
}

export function isLocalDeliveryPath(url: string): boolean {
  return (
    url.startsWith("/uploads/deliveries/") ||
    url.startsWith("uploads/deliveries/") ||
    url.includes("/uploads/deliveries/")
  );
}

/** Extrai pathname relativo no Blob (ex.: deliveries/foo.wav) a partir da URL completa. */
export function blobPathnameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, "");
    return path || null;
  } catch {
    return null;
  }
}
