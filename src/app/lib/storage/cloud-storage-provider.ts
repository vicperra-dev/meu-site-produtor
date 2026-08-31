/**
 * GO-01.2 — Stub cloud (S3/R2/Supabase Storage).
 * NÃO integrado nesta sprint. Troca futura via getStorageProvider() sem alterar domínio.
 */
import type {
  DeliveryWriteInput,
  DeliveryWriteResult,
  StorageProvider,
} from "@/app/lib/storage/types";

export class CloudStorageProvider implements StorageProvider {
  readonly kind = "cloud" as const;

  async writeDelivery(_input: DeliveryWriteInput): Promise<DeliveryWriteResult> {
    throw new Error(
      "CloudStorageProvider não configurado (GO-01). Use STORAGE_PROVIDER=local até integração cloud."
    );
  }

  async deleteDelivery(_publicPathOrName: string): Promise<void> {
    throw new Error(
      "CloudStorageProvider não configurado (GO-01). Use STORAGE_PROVIDER=local até integração cloud."
    );
  }

  async existsDelivery(_publicPathOrName: string): Promise<boolean> {
    throw new Error(
      "CloudStorageProvider não configurado (GO-01). Use STORAGE_PROVIDER=local até integração cloud."
    );
  }
}
