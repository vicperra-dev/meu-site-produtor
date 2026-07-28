/**
 * Catálogo de cenários Homologation Engine (OP-02B / GO-01).
 * Cada cenário mapeia para input de runHomologationSimulation.
 * H1: todo SKU oficial deve ter cenário aqui.
 */
import type { HomologationRunInput } from "@/app/lib/homologation/types";
import type { RefundLifecycleStatus } from "@/app/lib/payment-provider/types";
import { listCouponServiceTypesForAgendamentoItems } from "@/app/lib/agendamento-payment-coupons";
import {
  isCouponsOnlyAgendamentoPayment,
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
  exigeAgendamentoNoCheckout,
  exigeAgendamentoHora,
} from "@/app/lib/agendamento-payment-rules";

export type HomologationScenarioId =
  | "sessao"
  | "captacao"
  | "beat"
  | "beat2"
  | "beat3"
  | "beat4"
  | "mix"
  | "master"
  | "mix_master"
  | "sonoplastia"
  | "producao_completa"
  | "beat_mix_master"
  | "sessao_beat"
  | "sessao_mix"
  | "beat_mix"
  | "plano_bronze"
  | "plano_bronze_anual"
  | "plano_prata"
  | "plano_prata_anual"
  | "plano_ouro"
  | "plano_ouro_anual"
  | "cupom_desconto"
  | "cupom_remarcacao"
  | "refund_approved"
  | "refund_failed"
  | "refund_pending"
  | "refund_timeout";

export type HomologationScenarioDef = {
  id: HomologationScenarioId;
  label: string;
  description: string;
  /** Cupons de serviço esperados após confirm (null = não aplica / variável) */
  expectedServiceCoupons?: number | null;
  refundOutcome?: RefundLifecycleStatus;
  buildInput: (
    base: Pick<HomologationRunInput, "userId" | "userEmail" | "userName">
  ) => HomologationRunInput;
};

function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

type Line = { id: string; nome: string; quantidade: number };

function expectedCouponsFor(servicos: Line[], beats: Line[]): number {
  // GO-H5: 2+ Ordens → cupons; 1 Ordem → 0.
  if (isCouponsOnlyAgendamentoPayment({}, servicos, beats)) {
    return listCouponServiceTypesForAgendamentoItems(servicos, beats).length;
  }
  return 0;
}

function agendamentoScenario(
  id: HomologationScenarioId,
  label: string,
  description: string,
  servicos: Line[],
  beats: Line[] = [],
  opts?: { withSlot?: boolean }
): HomologationScenarioDef {
  const opensSchedule = exigeAgendamentoNoCheckout(servicos, beats);
  const expected = expectedCouponsFor(servicos, beats);
  const needsSlot = opensSchedule || opts?.withSlot === true;
  const presencial = opensSchedule && exigeAgendamentoHora(servicos, beats);
  return {
    id,
    label,
    description,
    expectedServiceCoupons: expected,
    buildInput: (base) => ({
      ...base,
      tipo: "agendamento",
      servicos,
      beats,
      ...(needsSlot
        ? {
            data: tomorrowIsoDate(),
            hora: presencial ? "14:00" : PRODUCTION_SCHEDULE_DEFAULT_HOUR,
            duracaoMinutos: 60,
          }
        : {}),
      observacoes: `Homologação cenário ${id}`,
      expectedServiceCoupons: expected,
      runRefund: false,
    }),
  };
}

export const HOMOLOGATION_SCENARIOS: HomologationScenarioDef[] = [
  agendamentoScenario(
    "sessao",
    "Sessão",
    "Uma sessão agendável → Appointment + Service (pipeline oficial).",
    [{ id: "sessao", nome: "Sessão", quantidade: 1 }]
  ),
  agendamentoScenario(
    "captacao",
    "Captação",
    "Captação agendável (exige data/hora) → Appointment + Service.",
    [{ id: "captacao", nome: "Captação", quantidade: 1 }]
  ),
  agendamentoScenario(
    "beat",
    "Beat",
    "1 Beat unitário → Appointment direto (GO-H3, sem cupom).",
    [],
    [{ id: "beat1", nome: "1 Beat", quantidade: 1 }]
  ),
  agendamentoScenario(
    "beat2",
    "2 Beats",
    "Pacote 2 Beats → 2 cupons Beat (GO-H4, sem agenda no checkout).",
    [],
    [{ id: "beat2", nome: "2 Beats", quantidade: 1 }]
  ),
  agendamentoScenario(
    "beat3",
    "3 Beats",
    "Pacote 3 Beats → 3 cupons Beat.",
    [],
    [{ id: "beat3", nome: "3 Beats", quantidade: 1 }]
  ),
  agendamentoScenario(
    "beat4",
    "4 Beats",
    "Pacote 4 Beats → 4 cupons Beat.",
    [],
    [{ id: "beat4", nome: "4 Beats", quantidade: 1 }]
  ),
  agendamentoScenario(
    "mix",
    "Mixagem",
    "Mixagem unitária → Appointment direto (data de entrega).",
    [{ id: "mix", nome: "Mixagem", quantidade: 1 }]
  ),
  agendamentoScenario(
    "master",
    "Masterização",
    "Masterização unitária → Appointment direto.",
    [{ id: "master", nome: "Masterização", quantidade: 1 }]
  ),
  agendamentoScenario(
    "mix_master",
    "Mix + Master",
    "Pacote Mix + Master → cupons mix + master (GO-H4).",
    [{ id: "mix_master", nome: "Mix + Master", quantidade: 1 }]
  ),
  agendamentoScenario(
    "sonoplastia",
    "Sonoplastia",
    "Sonoplastia unitária → Appointment direto.",
    [{ id: "sonoplastia", nome: "Sonoplastia", quantidade: 1 }]
  ),
  agendamentoScenario(
    "producao_completa",
    "Produção Completa",
    "Pacote → 2 sessão + 2 captação + beat + mix + master (7 cupons).",
    [],
    [{ id: "producao_completa", nome: "Produção Completa", quantidade: 1 }]
  ),
  agendamentoScenario(
    "beat_mix_master",
    "Beat + Mix + Master",
    "Pacote → cupons beat + mix + master.",
    [],
    [{ id: "beat_mix_master", nome: "Beat + Mix + Master", quantidade: 1 }]
  ),
  agendamentoScenario(
    "sessao_beat",
    "Sessão + Beat",
    "Multi → dois cupons TEST independentes (sessao + beat1).",
    [{ id: "sessao", nome: "Sessão", quantidade: 1 }],
    [{ id: "beat1", nome: "1 Beat", quantidade: 1 }]
  ),
  agendamentoScenario(
    "sessao_mix",
    "Sessão + Mix",
    "Multi → cupons sessao + mix.",
    [
      { id: "sessao", nome: "Sessão", quantidade: 1 },
      { id: "mix", nome: "Mixagem", quantidade: 1 },
    ]
  ),
  agendamentoScenario(
    "beat_mix",
    "Beat + Mix",
    "Multi → cupons beat1 + mix.",
    [{ id: "mix", nome: "Mixagem", quantidade: 1 }],
    [{ id: "beat1", nome: "1 Beat", quantidade: 1 }]
  ),
  {
    id: "plano_bronze",
    label: "Plano Bronze",
    description: "Pagamento simbólico de plano Bronze (+ Assinatura H10C).",
    expectedServiceCoupons: null,
    buildInput: (base) => ({
      ...base,
      tipo: "plano",
      planId: "bronze",
      modo: "mensal",
      runRefund: false,
    }),
  },
  {
    id: "plano_bronze_anual",
    label: "Plano Bronze Anual",
    description: "Assinatura anual Bronze — 12 ciclos de benefício (H10B/C).",
    expectedServiceCoupons: null,
    buildInput: (base) => ({
      ...base,
      tipo: "plano",
      planId: "bronze",
      modo: "anual",
      runRefund: false,
    }),
  },
  {
    id: "plano_prata",
    label: "Plano Prata",
    description: "Pagamento simbólico de plano Prata (+ Assinatura).",
    expectedServiceCoupons: null,
    buildInput: (base) => ({
      ...base,
      tipo: "plano",
      planId: "prata",
      modo: "mensal",
      runRefund: false,
    }),
  },
  {
    id: "plano_ouro",
    label: "Plano Ouro",
    description: "Pagamento simbólico de plano Ouro (+ Assinatura).",
    expectedServiceCoupons: null,
    buildInput: (base) => ({
      ...base,
      tipo: "plano",
      planId: "ouro",
      modo: "mensal",
      runRefund: false,
    }),
  },
  {
    id: "plano_prata_anual",
    label: "Plano Prata Anual",
    description: "Assinatura anual Prata.",
    expectedServiceCoupons: null,
    buildInput: (base) => ({
      ...base,
      tipo: "plano",
      planId: "prata",
      modo: "anual",
      runRefund: false,
    }),
  },
  {
    id: "plano_ouro_anual",
    label: "Plano Ouro Anual",
    description: "Assinatura anual Ouro.",
    expectedServiceCoupons: null,
    buildInput: (base) => ({
      ...base,
      tipo: "plano",
      planId: "ouro",
      modo: "anual",
      runRefund: false,
    }),
  },
  {
    id: "cupom_desconto",
    label: "Cupom Desconto",
    description: "Cria cupom DISCOUNT via domínio + valida checkoutDiscount.",
    expectedServiceCoupons: null,
    buildInput: (base) => ({
      ...base,
      tipo: "agendamento",
      scenarioKind: "cupom_desconto",
      servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1 }],
      data: tomorrowIsoDate(),
      hora: "15:00",
      runRefund: false,
    }),
  },
  {
    id: "cupom_remarcacao",
    label: "Cupom Remarcação",
    description: "Fluxo cancel → REBOOK (página exclusiva).",
    expectedServiceCoupons: 1,
    buildInput: (base) => ({
      ...base,
      tipo: "agendamento",
      scenarioKind: "cupom_remarcacao",
      servicos: [{ id: "sessao", nome: "Sessão", quantidade: 1 }],
      data: tomorrowIsoDate(),
      hora: "16:00",
      runRefund: false,
    }),
  },
  {
    id: "refund_approved",
    label: "Refund APPROVED",
    description: "Reembolso simulado aprovado (pipeline SM + sync).",
    expectedServiceCoupons: 1,
    refundOutcome: "APPROVED",
    buildInput: (base) => ({
      ...base,
      tipo: "agendamento",
      servicos: [],
      beats: [{ id: "beat1", nome: "1 Beat", quantidade: 1 }],
      runRefund: true,
      refundOutcome: "APPROVED",
    }),
  },
  {
    id: "refund_failed",
    label: "Refund FAILED",
    description: "Reembolso simulado com falha controlada.",
    expectedServiceCoupons: 1,
    refundOutcome: "FAILED",
    buildInput: (base) => ({
      ...base,
      tipo: "agendamento",
      servicos: [],
      beats: [{ id: "beat1", nome: "1 Beat", quantidade: 1 }],
      runRefund: true,
      refundOutcome: "FAILED",
    }),
  },
  {
    id: "refund_pending",
    label: "Refund PENDING",
    description: "Reembolso solicitado e pendente (sem confirmação).",
    expectedServiceCoupons: 1,
    refundOutcome: "PENDING",
    buildInput: (base) => ({
      ...base,
      tipo: "agendamento",
      servicos: [],
      beats: [{ id: "beat1", nome: "1 Beat", quantidade: 1 }],
      runRefund: true,
      refundOutcome: "PENDING",
    }),
  },
  {
    id: "refund_timeout",
    label: "Refund TIMEOUT",
    description: "Reembolso com timeout simulado (gateway não respondeu).",
    expectedServiceCoupons: 1,
    refundOutcome: "TIMEOUT",
    buildInput: (base) => ({
      ...base,
      tipo: "agendamento",
      servicos: [],
      beats: [{ id: "beat1", nome: "1 Beat", quantidade: 1 }],
      runRefund: true,
      refundOutcome: "TIMEOUT",
    }),
  },
];

export function getHomologationScenario(
  id: string | null | undefined
): HomologationScenarioDef | undefined {
  if (!id) return undefined;
  return HOMOLOGATION_SCENARIOS.find((s) => s.id === id);
}

/** SKUs canônicos que devem ter cenário (GO-01.4). */
export const OFFICIAL_SKU_SCENARIO_IDS: HomologationScenarioId[] = [
  "sessao",
  "captacao",
  "beat",
  "beat2",
  "beat3",
  "beat4",
  "mix",
  "master",
  "mix_master",
  "sonoplastia",
  "producao_completa",
  "beat_mix_master",
  "sessao_beat",
  "sessao_mix",
  "beat_mix",
];
