import { getAsaasApiKey } from "./env";

export type AsaasPaymentSummary = {
  status: string;
  id: string;
  value?: number;
};

/**
 * GET /v3/payments/:id — usado para idempotência de reembolso (ex.: já REFUNDED).
 */
export async function fetchAsaasPayment(asaasPaymentId: string): Promise<AsaasPaymentSummary | null> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) return null;

    const isProduction = apiKey.startsWith("$aact_prod_");
    const apiUrl = isProduction ? "https://www.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";

    const response = await fetch(`${apiUrl}/payments/${asaasPaymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      console.warn("[Asaas GET Payment]", response.status, text?.slice(0, 200));
      return null;
    }

    const data = JSON.parse(text);
    return {
      id: String(data.id ?? asaasPaymentId),
      status: String(data.status ?? ""),
      value: typeof data.value === "number" ? data.value : undefined,
    };
  } catch (e: any) {
    console.warn("[Asaas GET Payment] falha:", e?.message);
    return null;
  }
}

export function asaasPaymentIsRefundedStatus(status: string): boolean {
  const s = (status || "").toUpperCase();
  return s === "REFUNDED";
}
