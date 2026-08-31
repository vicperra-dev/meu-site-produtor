/**
 * GO-01.2 — Abstração de storage de entrega.
 * Domínio e rotas dependem apenas desta interface.
 */

export type DeliveryWriteInput = {
  /** Nome do arquivo já sanitizado (inclui extensão). */
  storedName: string;
  bytes: Buffer;
};

export type DeliveryWriteResult = {
  /** Caminho público canônico (ex.: /uploads/deliveries/…). */
  publicPath: string;
  storedName: string;
  bytes: number;
};

export interface StorageProvider {
  readonly kind: "local" | "cloud";
  /** Grava arquivo de entrega e retorna path público. */
  writeDelivery(input: DeliveryWriteInput): Promise<DeliveryWriteResult>;
  /** Remove arquivo de entrega pelo path público ou storedName. No-op se inexistente. */
  deleteDelivery(publicPathOrName: string): Promise<void>;
  /** Verifica existência (best-effort). */
  existsDelivery(publicPathOrName: string): Promise<boolean>;
}
