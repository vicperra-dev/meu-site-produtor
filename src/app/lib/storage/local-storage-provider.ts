/**
 * GO-01.2 / GO-H11A — Storage local fora de public/ (não servido estaticamente).
 * Leitura apenas via /api/entregas/[serviceId].
 */
import { mkdir, writeFile, unlink, access } from "fs/promises";
import path from "path";
import type {
  DeliveryWriteInput,
  DeliveryWriteResult,
  StorageProvider,
} from "@/app/lib/storage/types";

/** Path canônico gravado no banco (não é URL pública). */
const STORED_PREFIX = "/uploads/deliveries/";

function deliveriesDir(): string {
  return path.join(process.cwd(), "storage", "deliveries");
}

function toStoredName(publicPathOrName: string): string {
  const raw = String(publicPathOrName || "").trim();
  if (raw.startsWith(STORED_PREFIX)) return raw.slice(STORED_PREFIX.length);
  return path.basename(raw);
}

export class LocalStorageProvider implements StorageProvider {
  readonly kind = "local" as const;

  async writeDelivery(input: DeliveryWriteInput): Promise<DeliveryWriteResult> {
    const dir = deliveriesDir();
    await mkdir(dir, { recursive: true });
    const abs = path.join(dir, input.storedName);
    await writeFile(abs, input.bytes);
    return {
      publicPath: `${STORED_PREFIX}${input.storedName}`,
      storedName: input.storedName,
      bytes: input.bytes.length,
    };
  }

  async deleteDelivery(publicPathOrName: string): Promise<void> {
    const name = toStoredName(publicPathOrName);
    if (!name || name.includes("..")) return;
    const candidates = [
      path.join(deliveriesDir(), name),
      path.join(process.cwd(), "public", "uploads", "deliveries", name),
    ];
    for (const abs of candidates) {
      try {
        await unlink(abs);
      } catch {
        /* inexistente */
      }
    }
  }

  async existsDelivery(publicPathOrName: string): Promise<boolean> {
    const name = toStoredName(publicPathOrName);
    if (!name || name.includes("..")) return false;
    for (const abs of [
      path.join(deliveriesDir(), name),
      path.join(process.cwd(), "public", "uploads", "deliveries", name),
    ]) {
      try {
        await access(abs);
        return true;
      } catch {
        /* next */
      }
    }
    return false;
  }
}
