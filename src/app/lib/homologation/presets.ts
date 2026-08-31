/**
 * GO-H6 — Presets rápidos do laboratório (aceleram seleção; não alteram regras).
 */
import type { HomologationScenarioId } from "@/app/lib/homologation/scenarios";
import type { CanonicalServiceId } from "@/app/lib/service-catalog";

export type LabPresetId =
  | "compra_simples"
  | "compra_multipla"
  | "producao_completa"
  | "reembolso"
  | "plano"
  | "compra_desconto"
  | "compra_cupom"
  | "servicos_repetidos"
  | "servicos_misturados"
  | "livre";

export type LabPreset = {
  id: LabPresetId;
  label: string;
  description: string;
  /** Mapeia para cenário oficial do engine, se houver. */
  scenarioId?: HomologationScenarioId;
  /** Seleção livre no catálogo (quando não usa scenarioId). */
  qty?: Partial<Record<CanonicalServiceId, number>>;
  planId?: string;
  runRefund?: boolean;
};

export const LAB_PRESETS: LabPreset[] = [
  {
    id: "compra_simples",
    label: "Compra simples",
    description: "1 Ordem → calendário imediato (Sessão).",
    scenarioId: "sessao",
    qty: { sessao: 1 },
  },
  {
    id: "compra_multipla",
    label: "Compra múltipla",
    description: "2+ Ordens → cupons (Sessão + Beat).",
    scenarioId: "sessao_beat",
    qty: { sessao: 1, beat1: 1 },
  },
  {
    id: "producao_completa",
    label: "Produção Completa",
    description: "7 Ordens atômicas via pacote comercial.",
    scenarioId: "producao_completa",
    qty: { producao_completa: 1 },
  },
  {
    id: "reembolso",
    label: "Reembolso",
    description: "Compra + refund APPROVED simulado.",
    scenarioId: "refund_approved",
    runRefund: true,
  },
  {
    id: "plano",
    label: "Plano",
    description: "Plano Bronze simbólico.",
    scenarioId: "plano_bronze",
    planId: "bronze",
  },
  {
    id: "compra_desconto",
    label: "Compra com desconto",
    description: "Cria cupom DISCOUNT via domínio.",
    scenarioId: "cupom_desconto",
  },
  {
    id: "compra_cupom",
    label: "Compra com cupom",
    description: "Fluxo multi que emite cupons de serviço.",
    scenarioId: "sessao_mix",
    qty: { sessao: 1, mix: 1 },
  },
  {
    id: "servicos_repetidos",
    label: "Serviços repetidos",
    description: "2 Sessões → 2 Ordens / cupons.",
    qty: { sessao: 2 },
  },
  {
    id: "servicos_misturados",
    label: "Serviços misturados",
    description: "Sessão + Captação + Mix.",
    qty: { sessao: 1, captacao: 1, mix: 1 },
  },
  {
    id: "livre",
    label: "Modo livre",
    description: "Monte qualquer combinação no catálogo.",
  },
];
