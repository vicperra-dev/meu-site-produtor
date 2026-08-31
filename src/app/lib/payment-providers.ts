import { asaasFetch } from "@/app/lib/asaas-fetch";
import type {
  CheckoutParams,
  CheckoutResponse,
  CheckoutItem,
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentProvider,
  PaymentProviderKind,
  ProviderPaymentSnapshot,
  RefundPaymentResult,
  SimulateWebhookParams,
  SimulateWebhookResult,
} from "@/app/lib/payment-provider/types";
import { SimulationProvider } from "@/app/lib/payment-provider/simulation-provider";
import { refundAsaasPayment } from "@/app/lib/asaas-refund";
import { fetchAsaasPayment } from "@/app/lib/asaas-get-payment";

export type {
  CheckoutParams,
  CheckoutResponse,
  CheckoutItem,
  PaymentProvider,
  PaymentProviderKind,
  CreatePaymentResult,
  RefundPaymentResult,
};
export { SimulationProvider };

export class InfinityPayProvider implements PaymentProvider {
  readonly kind = "asaas" as const;
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, _isTest: boolean = true) {
    this.apiKey = apiKey;
    this.apiUrl = "https://api.infinitypay.com.br/v1";
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResponse> {
    const payload = {
      amount: params.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
      currency: "BRL",
      items: params.items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.unit_price,
      })),
      customer: params.payer
        ? { name: params.payer.name, email: params.payer.email }
        : undefined,
      metadata: params.metadata || {},
      return_url: params.backUrls.success,
      cancel_url: params.backUrls.failure,
      webhook_url: params.backUrls.pending,
    };
    const response = await fetch(`${this.apiUrl}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Infinity Pay API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    const initPoint = data.checkout_url || data.url || data.payment_url;
    if (!initPoint) throw new Error("Infinity Pay não retornou URL de checkout");
    return {
      initPoint,
      preferenceId: data.id || data.checkout_id,
      provider: "infinitypay",
    };
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const c = await this.createCheckout(params);
    return {
      providerPaymentId: c.preferenceId || `inf_${Date.now()}`,
      provider: "asaas",
      status: "PENDING",
      value: params.items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
      initPoint: c.initPoint,
    };
  }
  async confirmPayment(): Promise<SimulateWebhookResult> {
    throw new Error("InfinityPay: confirmação via webhook do provedor.");
  }
  async cancelPayment(): Promise<ProviderPaymentSnapshot> {
    throw new Error("InfinityPay: cancelamento não implementado neste adapter.");
  }
  async refundPayment(): Promise<RefundPaymentResult> {
    throw new Error("InfinityPay: reembolso não implementado neste adapter.");
  }
  async simulateWebhook(): Promise<SimulateWebhookResult> {
    throw new Error("InfinityPay: simulateWebhook não suportado.");
  }
  async getPayment(): Promise<ProviderPaymentSnapshot | null> {
    return null;
  }
}

export class AsaasProvider implements PaymentProvider {
  readonly kind = "asaas" as const;
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, isTest: boolean = true) {
    this.apiKey = apiKey;
    const isProductionToken = apiKey.startsWith("$aact_prod_");
    this.apiUrl = isProductionToken
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";
    void isTest;
    console.log(
      `[Asaas] Ambiente detectado: ${isProductionToken ? "PRODUÇÃO" : "SANDBOX"} (token: ${apiKey.substring(0, 20)}...)`
    );
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResponse> {
    try {
      const totalAmount = params.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      );

      let customerId: string | null = null;
      if (params.payer) {
        customerId = await this.getOrCreateCustomer({
          name: params.payer.name,
          email: params.payer.email,
          cpf: params.payer.cpf,
        });
      }

      const externalReference = params.metadata?.operationId;
      if (!externalReference) {
        throw new Error("operationId é obrigatório no metadata para criar pagamento no Asaas");
      }
      if (String(externalReference).length > 100) {
        throw new Error(
          `externalReference (${String(externalReference).length} caracteres) excede o limite de 100 caracteres do Asaas.`
        );
      }

      const paymentPayload: Record<string, unknown> = {
        customer: customerId || undefined,
        billingType: "UNDEFINED",
        value: Number(totalAmount.toFixed(2)),
        dueDate: this.formatDateForAsaas(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        description:
          params.items.map((item) => item.title).join(", ") || "Pagamento THouse Rec",
        externalReference,
      };

      if (!customerId && params.payer) {
        paymentPayload.name = params.payer.name;
        paymentPayload.email = params.payer.email;
        if (params.payer.cpf) {
          paymentPayload.cpfCnpj = params.payer.cpf.replace(/\D/g, "");
        }
      }

      if (params.backUrls) {
        const isLocalhost =
          params.backUrls.success.includes("localhost") ||
          params.backUrls.success.includes("127.0.0.1");
        if (!isLocalhost) {
          paymentPayload.callback = {
            successUrl: params.backUrls.success,
            autoRedirect: true,
          };
        }
      }

      const asaasHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        access_token: this.apiKey,
        "User-Agent": "THouseRec/1.0",
      };

      const response = await asaasFetch(`${this.apiUrl}/payments`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(paymentPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Asaas API error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.errors?.[0]) {
            const firstError = errorData.errors[0];
            errorMessage = `Asaas API error: ${response.status} - ${firstError.description || firstError.message || errorText}`;
            if (firstError.code === "insufficient_permission") {
              errorMessage =
                "❌ Permissão insuficiente: A chave de API não tem a permissão PAYMENT:WRITE necessária.";
            }
          } else {
            errorMessage = `Asaas API error: ${response.status} - ${errorText}`;
          }
        } catch {
          errorMessage = `Asaas API error: ${response.status} - ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const initPoint = data.invoiceUrl || data.bankSlipUrl || data.url;
      if (!initPoint) throw new Error("Asaas não retornou URL de checkout");

      return {
        initPoint,
        preferenceId: data.id,
        provider: "asaas",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao criar checkout Asaas: ${message}`);
    }
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const checkout = await this.createCheckout(params);
    const value =
      params.value ??
      params.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    return {
      providerPaymentId: checkout.preferenceId || "",
      provider: "asaas",
      status: "PENDING",
      value: Number(value.toFixed(2)),
      initPoint: checkout.initPoint,
      invoiceUrl: checkout.initPoint,
    };
  }

  async confirmPayment(_providerPaymentId: string): Promise<SimulateWebhookResult> {
    return {
      received: false,
      success: false,
      error:
        "Asaas: confirmação ocorre via webhook PAYMENT_RECEIVED do provedor (não via confirmPayment local).",
    };
  }

  async cancelPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot> {
    const snap = await this.getPayment(providerPaymentId);
    if (!snap) throw new Error("Pagamento Asaas não encontrado para cancelamento.");
    return snap;
  }

  async refundPayment(
    providerPaymentId: string,
    opts?: { value?: number; description?: string }
  ): Promise<RefundPaymentResult> {
    try {
      const raw = await refundAsaasPayment(
        providerPaymentId,
        opts?.value,
        opts?.description
      );
      const statusRaw = String((raw as { status?: string })?.status || "").toUpperCase();
      const status =
        statusRaw === "PENDING" || statusRaw === "IN_PROGRESS"
          ? ("PENDING" as const)
          : ("APPROVED" as const);
      return {
        status,
        providerPaymentId,
        provider: "asaas",
        value: opts?.value,
        raw,
        reason:
          status === "PENDING"
            ? "Reembolso pendente no Asaas."
            : "Reembolso solicitado no Asaas.",
      };
    } catch (e: unknown) {
      return {
        status: "FAILED",
        providerPaymentId,
        provider: "asaas",
        reason: e instanceof Error ? e.message : String(e),
        value: opts?.value,
      };
    }
  }

  async simulateWebhook(_params: SimulateWebhookParams): Promise<SimulateWebhookResult> {
    return {
      received: false,
      success: false,
      error:
        "AsaasProvider.simulateWebhook não aplica efeitos locais — use o webhook real do Asaas ou SimulationProvider.",
    };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot | null> {
    const remote = await fetchAsaasPayment(providerPaymentId);
    if (!remote) return null;
    const st = remote.status.toUpperCase();
    return {
      providerPaymentId: remote.id,
      provider: "asaas",
      status: st,
      value: remote.value ?? 0,
      refundStatus: st === "REFUNDED" ? "APPROVED" : null,
      raw: remote,
    };
  }

  async getOrCreateCustomer(payer: {
    name: string;
    email: string;
    cpf?: string;
  }): Promise<string | null> {
    try {
      const asaasHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        access_token: this.apiKey,
        "User-Agent": "THouseRec/1.0",
      };

      const searchResponse = await asaasFetch(
        `${this.apiUrl}/customers?email=${encodeURIComponent(payer.email)}`,
        { method: "GET", headers: asaasHeaders }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          const existingCustomer = searchData.data[0];
          if (payer.cpf && !existingCustomer.cpfCnpj) {
            await asaasFetch(`${this.apiUrl}/customers/${existingCustomer.id}`, {
              method: "POST",
              headers: asaasHeaders,
              body: JSON.stringify({ cpfCnpj: payer.cpf.replace(/\D/g, "") }),
            });
          }
          return existingCustomer.id;
        }
      }

      const customerPayload: Record<string, string> = {
        name: payer.name,
        email: payer.email,
      };
      if (payer.cpf) {
        customerPayload.cpfCnpj = payer.cpf.replace(/\D/g, "");
      } else {
        throw new Error(
          "CPF é obrigatório para criar pagamentos no Asaas. Cadastre seu CPF no perfil."
        );
      }

      const createResponse = await asaasFetch(`${this.apiUrl}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload),
      });
      if (createResponse.ok) {
        const customerData = await createResponse.json();
        return customerData.id;
      }
      return null;
    } catch (error) {
      console.warn("[Asaas] Erro ao buscar/criar cliente:", error);
      return null;
    }
  }

  private formatDateForAsaas(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly kind = "asaas" as const;
  private accessToken: string;
  private siteUrl: string;

  constructor(accessToken: string, siteUrl: string) {
    this.accessToken = accessToken;
    this.siteUrl = siteUrl;
  }

  async createCheckout(_params: CheckoutParams): Promise<CheckoutResponse> {
    void this.accessToken;
    void this.siteUrl;
    throw new Error("Mercado Pago provider precisa ser implementado via SDK");
  }
  async createPayment(): Promise<CreatePaymentResult> {
    throw new Error("Mercado Pago não implementado");
  }
  async confirmPayment(): Promise<SimulateWebhookResult> {
    throw new Error("Mercado Pago não implementado");
  }
  async cancelPayment(): Promise<ProviderPaymentSnapshot> {
    throw new Error("Mercado Pago não implementado");
  }
  async refundPayment(): Promise<RefundPaymentResult> {
    throw new Error("Mercado Pago não implementado");
  }
  async simulateWebhook(): Promise<SimulateWebhookResult> {
    throw new Error("Mercado Pago não implementado");
  }
  async getPayment(): Promise<ProviderPaymentSnapshot | null> {
    return null;
  }
}

export function createPaymentProvider(
  kind: PaymentProviderKind | "auto" = "auto"
): PaymentProvider {
  if (kind === "simulation") {
    return new SimulationProvider();
  }
  const isTest = process.env.NODE_ENV !== "production";
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAsaasApiKey } = require("./env");
  const apiKey = getAsaasApiKey();
  if (!apiKey) {
    throw new Error(
      "ASAAS_API_KEY não configurado no .env. Configure o token do Asaas para usar o sistema de pagamentos."
    );
  }
  return new AsaasProvider(apiKey, isTest);
}
