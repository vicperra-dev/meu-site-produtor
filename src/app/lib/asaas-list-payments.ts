import { getAsaasApiKey } from "./env";

export interface AsaasPaymentItem {
  id: string;
  value: number;
  status: string;
  externalReference: string | null;
  dateCreated: string;
  paymentDate: string | null;
  description?: string;
}

/**
 * Lista cobranças no Asaas por externalReference (userId) e status RECEIVED.
 * Usado para recuperar o id da cobrança quando o webhook não vinculou ao agendamento.
 */
export async function listAsaasPaymentsReceived(
  externalReference: string,
  limit = 20
): Promise<AsaasPaymentItem[]> {
  const apiKey = getAsaasApiKey();
  if (!apiKey) {
    throw new Error("API key do Asaas não configurada");
  }

  const isProduction = apiKey.startsWith("$aact_prod_");
  const apiUrl = isProduction
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3";

  const statuses = ["RECEIVED", "CONFIRMED"];
  const all: AsaasPaymentItem[] = [];
  const seen = new Set<string>();

  for (const status of statuses) {
    const params = new URLSearchParams({
      externalReference,
      status,
      limit: String(limit),
    });
    const response = await fetch(`${apiUrl}/payments?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
    });
    const text = await response.text();
    if (!response.ok) {
      console.error("[Asaas List] Erro:", response.status, text);
      continue;
    }
    let data: { data?: AsaasPaymentItem[] };
    try {
      data = JSON.parse(text);
    } catch {
      continue;
    }
    const list = data.data ?? [];
    for (const item of Array.isArray(list) ? list : []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    }
  }

  all.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  return all.slice(0, limit);
}
