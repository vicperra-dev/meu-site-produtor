import { getAsaasApiKey } from "./env";

const ASAAS_API_KEY = getAsaasApiKey();
const isProductionToken = ASAAS_API_KEY?.startsWith('$aact_prod_');
const API_URL = isProductionToken
  ? "https://www.asaas.com/api/v3"
  : "https://sandbox.asaas.com/api/v3";

/**
 * Criar assinatura recorrente no Asaas
 */
export async function createAsaasSubscription(params: {
  customerId: string;
  billingType: "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BOLETO";
  value: number;
  cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
  billingDay: number; // Dia do mês (1-28)
  description: string;
  externalReference?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const subscriptionPayload: any = {
      customer: params.customerId,
      billingType: params.billingType,
      value: params.value,
      cycle: params.cycle,
      description: params.description,
      externalReference: params.externalReference,
      metadata: params.metadata || {},
    };

    // Para ciclo mensal, definir dia de cobrança
    if (params.cycle === "MONTHLY") {
      subscriptionPayload.billingDay = Math.min(Math.max(params.billingDay, 1), 28);
    }

    // Calcular próxima data de cobrança
    const nextBillingDate = new Date();
    if (params.cycle === "MONTHLY") {
      nextBillingDate.setDate(params.billingDay);
      if (nextBillingDate < new Date()) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }
    } else if (params.cycle === "YEARLY") {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    subscriptionPayload.nextDueDate = formatDateForAsaas(nextBillingDate);

    console.log("[Asaas Subscription] Criando assinatura:", JSON.stringify(subscriptionPayload, null, 2));

    const response = await fetch(`${API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY || "",
      },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Asaas Subscription] Erro na resposta:", response.status, errorText);
      throw new Error(`Asaas API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[Asaas Subscription] Assinatura criada:", data.id);

    return {
      id: data.id,
      status: data.status,
      nextDueDate: data.nextDueDate,
    };
  } catch (error: any) {
    console.error("[Asaas Subscription] Erro ao criar assinatura:", error);
    throw error;
  }
}

function formatDateForAsaas(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Buscar assinatura no Asaas
 */
export async function getAsaasSubscription(subscriptionId: string) {
  try {
    const response = await fetch(`${API_URL}/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        "access_token": ASAAS_API_KEY || "",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Asaas API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("[Asaas Subscription] Erro ao buscar assinatura:", error);
    throw error;
  }
}

/**
 * Cancelar assinatura no Asaas
 */
export async function cancelAsaasSubscription(subscriptionId: string) {
  try {
    const response = await fetch(`${API_URL}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: {
        "access_token": ASAAS_API_KEY || "",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Asaas API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("[Asaas Subscription] Erro ao cancelar assinatura:", error);
    throw error;
  }
}
