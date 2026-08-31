/**
 * Interface canônica de provedor de pagamento (OP Homologation).
 * Domínio / webhook / effects NÃO conhecem Asaas vs Simulation.
 */

export type PaymentProviderKind = "asaas" | "simulation";

export interface CheckoutItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

export interface CheckoutParams {
  items: CheckoutItem[];
  payer?: {
    name: string;
    email: string;
    cpf?: string;
  };
  metadata?: Record<string, unknown>;
  paymentMethod?: "cartao_credito" | "cartao_debito" | "pix" | "boleto";
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
}

export interface CheckoutResponse {
  initPoint: string;
  preferenceId?: string;
  provider: string;
}

/** Criação de cobrança (equivalente a payment no gateway). */
export type CreatePaymentParams = CheckoutParams & {
  description?: string;
  value?: number;
};

export type CreatePaymentResult = {
  providerPaymentId: string;
  provider: PaymentProviderKind;
  status: "PENDING" | "RECEIVED" | "CONFIRMED" | "REFUNDED" | "CANCELLED";
  value: number;
  initPoint?: string;
  invoiceUrl?: string;
  raw?: unknown;
};

export type ProviderPaymentSnapshot = {
  providerPaymentId: string;
  provider: PaymentProviderKind;
  status: string;
  value: number;
  description?: string | null;
  externalReference?: string | null;
  refundStatus?: RefundLifecycleStatus | null;
  raw?: unknown;
};

export type RefundLifecycleStatus =
  | "REQUESTED"
  | "PENDING"
  | "APPROVED"
  | "FAILED"
  | "TIMEOUT";

export type RefundPaymentResult = {
  status: RefundLifecycleStatus;
  providerPaymentId: string;
  provider: PaymentProviderKind;
  reason?: string;
  value?: number;
  raw?: unknown;
};

export type SimulateWebhookParams = {
  providerPaymentId: string;
  event:
    | "PAYMENT_RECEIVED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_REFUNDED"
    | "PAYMENT_DELETED"
    | "PAYMENT_OVERDUE";
  status?: string;
  value?: number;
  description?: string;
  externalReference?: string;
  metadata?: Record<string, unknown>;
};

export type SimulateWebhookResult = {
  received: boolean;
  success?: boolean;
  error?: string;
  domainResult?: unknown;
};

/**
 * Contrato único. AsaasProvider e SimulationProvider implementam os mesmos métodos.
 */
export interface PaymentProvider {
  readonly kind: PaymentProviderKind;

  /** Compat legado (checkouts existentes). */
  createCheckout(params: CheckoutParams): Promise<CheckoutResponse>;

  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  confirmPayment(providerPaymentId: string): Promise<SimulateWebhookResult>;
  cancelPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot>;
  refundPayment(
    providerPaymentId: string,
    opts?: {
      value?: number;
      description?: string;
      /** Homologação: força outcome (Simulation). Asaas ignora. */
      outcome?: RefundLifecycleStatus;
    }
  ): Promise<RefundPaymentResult>;
  simulateWebhook(params: SimulateWebhookParams): Promise<SimulateWebhookResult>;
  getPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot | null>;
}
