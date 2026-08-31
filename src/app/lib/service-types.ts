/**
 * Constantes puras de identidade de serviço.
 * Módulo folha: sem Prisma, sem Node-only, sem imports de domínio.
 * Seguro para Client Components (cronômetro) e para o servidor.
 */

/** Duração contratada padrão do cronômetro (segundos). Alterar só aqui. */
export const OPERATIONAL_CONTRACTED_DURATION_SECONDS = 60 * 60;

export const OPERATIONAL_TIMER_SERVICE_ID_LIST = ["sessao", "captacao"] as const;

export type OperationalTimerServiceId = (typeof OPERATIONAL_TIMER_SERVICE_ID_LIST)[number];

/** IDs com cronômetro operacional. Fonte exclusiva do gate. */
export const OPERATIONAL_TIMER_SERVICE_IDS: ReadonlySet<string> = new Set(
  OPERATIONAL_TIMER_SERVICE_ID_LIST
);

export function isOperationalTimerServiceId(id: string): boolean {
  return OPERATIONAL_TIMER_SERVICE_IDS.has(id);
}
