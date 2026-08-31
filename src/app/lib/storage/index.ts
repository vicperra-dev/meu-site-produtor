/**
 * GO-01.2 — Factory StorageProvider.
 * Domínio/API usam apenas getStorageProvider().
 */
import type { StorageProvider } from "@/app/lib/storage/types";
import { LocalStorageProvider } from "@/app/lib/storage/local-storage-provider";
import { CloudStorageProvider } from "@/app/lib/storage/cloud-storage-provider";

export type { StorageProvider, DeliveryWriteInput, DeliveryWriteResult } from "@/app/lib/storage/types";
export { LocalStorageProvider } from "@/app/lib/storage/local-storage-provider";
export { CloudStorageProvider } from "@/app/lib/storage/cloud-storage-provider";

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const mode = String(process.env.STORAGE_PROVIDER || "local").toLowerCase();
  if (mode === "cloud") {
    cached = new CloudStorageProvider();
  } else {
    cached = new LocalStorageProvider();
  }
  return cached;
}

/** Testes / reset de factory (não usar em request path). */
export function resetStorageProviderCache(): void {
  cached = null;
}
