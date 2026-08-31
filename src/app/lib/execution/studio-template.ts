/**
 * EC-01 — Studio Template Foundation (documentação estrutural).
 * Nenhuma extração de pacote nesta sprint.
 *
 * Separação conceitual:
 * - Reutilizável (StudioOS base)
 * - Específico THouse Rec (domínio da aplicação)
 */

export const STUDIO_REUSABLE_MODULES = [
  "src/app/lib/execution",
  "src/app/lib/domain/state-machine",
  "src/app/lib/domain/workflow.ts",
  "src/app/lib/domain/graph",
  "src/app/lib/synchronization",
  "src/app/lib/simulation",
  "src/app/lib/test-engine",
  "src/app/lib/auth.ts",
] as const;

export const THOUSE_SPECIFIC_MODULES = [
  "src/app/lib/asaas-*",
  "src/app/lib/process-payment-webhook.ts",
  "src/app/lib/symbolic-payment.ts",
  "src/app/lib/plan-coupons.ts",
  "src/app/lib/service-catalog.ts",
  "src/app/agendamento",
  "src/app/minha-conta",
  "src/app/admin",
  "src/app/planos",
  "src/app/pagamentos",
] as const;

export const STUDIO_TEMPLATE_BOUNDARY = {
  reusable: STUDIO_REUSABLE_MODULES,
  thouseSpecific: THOUSE_SPECIFIC_MODULES,
  substitutionPoints: [
    "domínio de negócio",
    "páginas",
    "identidade visual",
    "regras específicas da aplicação",
  ],
  entryPoint: "ExecutionCore.run()",
  pipeline: [
    "ExecutionCore",
    "Workflow",
    "StateMachine",
    "DomainEvents",
    "Synchronization",
    "Assertions",
    "Reports",
    "Cleanup",
  ],
} as const;
