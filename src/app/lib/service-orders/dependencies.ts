/**
 * GO-H5 — Dependências entre Ordens de Serviço (estrutura futura).
 * Não bloqueia automaticamente — apenas modela a relação.
 */

/** Ordem sugerida de execução dentro de um mesmo pagamento/lote. */
export const SERVICE_ORDER_PIPELINE_HINT: Record<string, number> = {
  sessao: 10,
  captacao: 20,
  beat1: 30,
  mix: 40,
  master: 50,
  sonoplastia: 35,
};

/**
 * Dependências tipadas (futuro enforcement).
 * Ex.: mixagem tipicamente após beat; masterização após mixagem.
 */
export type ServiceOrderDependencyRule = {
  serviceType: string;
  dependsOnServiceTypes: readonly string[];
  /** soft = aviso futuro; hard = bloquear (ainda não usado). */
  mode: "soft" | "hard";
};

export const SERVICE_ORDER_DEPENDENCY_RULES: readonly ServiceOrderDependencyRule[] = [
  {
    serviceType: "mix",
    dependsOnServiceTypes: ["beat1"],
    mode: "soft",
  },
  {
    serviceType: "master",
    dependsOnServiceTypes: ["mix"],
    mode: "soft",
  },
];

export function suggestedPipelineRank(serviceType: string): number {
  return SERVICE_ORDER_PIPELINE_HINT[serviceType] ?? 100;
}

export function softDependenciesFor(serviceType: string): readonly string[] {
  const rule = SERVICE_ORDER_DEPENDENCY_RULES.find((r) => r.serviceType === serviceType);
  return rule?.dependsOnServiceTypes ?? [];
}
