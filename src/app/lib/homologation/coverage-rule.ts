/**
 * OP-02B / OP-02H — Regra permanente: Homologation Engine.
 *
 * Toda funcionalidade futura que altere pagamentos, workflow, agendamento,
 * planos, cupons ou reembolso DEVE possuir cenário correspondente executável
 * em Admin → Homologação (`src/app/lib/homologation/scenarios.ts`).
 *
 * Não criar fluxos paralelos nem regras específicas só para simulação.
 * SimulationProvider usa o mesmo domínio (processPaymentWebhook / SM / sync).
 */

export const HOMOLOGATION_COVERAGE_RULE = {
  id: "H1",
  title: "Cobertura Homologation Engine obrigatória",
  classification: "CRÍTICO" as const,
  appliesTo: [
    "pagamentos",
    "workflow",
    "agendamento",
    "planos",
    "cupons",
    "reembolso",
  ],
  requirement:
    "Antes de merge de feature operacional, adicionar ou atualizar cenário em Homologation Engine e validar no painel /api/admin/homologation/run.",
};
