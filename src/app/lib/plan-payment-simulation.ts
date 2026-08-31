/**
 * Classificação de pagamento de plano simbólico / simulação (ADR-010).
 * Somente lógica pura — sem Prisma, HTTP ou adminAccess.
 */

/** Valor cobrado no checkout simbólico de plano (admin / teste). */
export const SYMBOLIC_PLANO_BRL = 5;

/**
 * Indica se cupons de plano devem usar estilo simulação (prefixo TESTE_, validade curta).
 * Usa apenas flags explícitas no metadata — não infere por planId.
 */
export function resolvePlanIsTestPayment(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  if (metadata.symbolicPlano === true) return true;
  if (metadata.isTestPayment === true) return true;
  if (metadata.isTest === true && metadata.tipo === "plano") return true;
  return false;
}

/** Alias semântico de `resolvePlanIsTestPayment`. */
export function isSymbolicPlanoPayment(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return resolvePlanIsTestPayment(metadata);
}
