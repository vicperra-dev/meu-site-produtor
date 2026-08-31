import { getAsaasApiKey } from "./env";

function isSyntheticAsaasId(paymentId: string): boolean {
  const id = String(paymentId || "");
  return (
    id.startsWith("sim_pay_") ||
    id.startsWith("homo_pay_") ||
    id.startsWith("sim_") ||
    id.startsWith("homo_") ||
    id.startsWith("test_")
  );
}

/**
 * Faz reembolso direto de um pagamento no Asaas
 */
export async function refundAsaasPayment(paymentId: string, value?: number, description?: string) {
  try {
    if (isSyntheticAsaasId(paymentId)) {
      const err = new Error(
        "Este pagamento é de homologação/simulação e não possui cobrança real no Asaas. O cancelamento local está ok; o estorno financeiro só se aplica a pagamentos Asaas reais."
      );
      (err as Error & { code?: string }).code = "ASAAS_SYNTHETIC_PAYMENT";
      throw err;
    }

    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      throw new Error("API key do Asaas não configurada");
    }

    const isProduction = apiKey.startsWith("$aact_prod_");
    const apiUrl = isProduction
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    const refundPayload: Record<string, unknown> = {
      value,
      description: description || "Reembolso de cancelamento de plano",
    };

    console.log(`[Asaas Refund] Solicitando reembolso paymentId=${paymentId} value=${value ?? "full"}`);

    const response = await fetch(`${apiUrl}/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body: JSON.stringify(refundPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[Asaas Refund] Erro ao fazer reembolso:`, {
        status: response.status,
        responseLength: responseText.length,
      });
      let friendly = `Erro ao fazer reembolso no Asaas: ${response.status}`;
      try {
        const parsed = JSON.parse(responseText) as {
          errors?: Array<{ description?: string }>;
          message?: string;
        };
        const desc =
          parsed?.errors?.[0]?.description || parsed?.message || responseText.slice(0, 180);
        if (desc) friendly = `Erro ao fazer reembolso no Asaas: ${desc}`;
      } catch {
        if (responseText) friendly += ` - ${responseText.slice(0, 180)}`;
      }
      const err = new Error(friendly);
      (err as Error & { body?: string; status?: number }).body = responseText;
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }

    let refundData;
    try {
      refundData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[Asaas Refund] Erro ao parsear resposta:", parseError);
      throw new Error("Erro ao processar resposta do reembolso");
    }

    console.log("[Asaas Refund] Reembolso solicitado com sucesso:", {
      id: refundData?.id,
      status: refundData?.status,
      value: refundData?.value,
    });

    return refundData;
  } catch (error: unknown) {
    console.error("[Asaas Refund] Erro:", error);
    throw error;
  }
}
