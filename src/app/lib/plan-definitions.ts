/**
 * GO-H10B — Fonte única da arquitetura de planos.
 * Preços, benefícios por ciclo mensal, categorias e acesso ao Shopping.
 * Checkout, Homologação, Minha Conta e UI de marketing consomem apenas isto.
 */

export type PlanTierId = "bronze" | "prata" | "ouro";
export type PlanId = PlanTierId | "teste";
export type PlanModo = "mensal" | "anual";

/** Cupom de serviço/produção emitido em cada ciclo. */
export type PlanServiceGrant = {
  kind: "service";
  serviceType: "sessao" | "captacao" | "mix" | "master" | "beat1";
  quantity: number;
};

/** Cupom percentual emitido em cada ciclo. */
export type PlanDiscountGrant = {
  kind: "discount";
  /** percent_servicos | percent_beats — serviceType persistido no cupom */
  target: "servicos" | "beats";
  percent: number;
  quantity: number;
};

export type PlanCycleGrant = PlanServiceGrant | PlanDiscountGrant;

export type PlanMarketingBenefit = {
  label: string;
  included: boolean;
};

export type PlanDefinition = {
  id: PlanId;
  nome: string;
  descricao: string;
  mensal: number;
  anual: number;
  /** Promoções exclusivas do Shopping (mensal e anual). */
  hasPromotionAccess: boolean;
  /** Benefícios regenerados a cada ciclo mensal (sem acúmulo). */
  cycleBenefits: PlanCycleGrant[];
  marketingBenefits: PlanMarketingBenefit[];
  /**
   * GO-H10C — valores internos para cálculo de reembolso (não são preços públicos).
   * Chaves: serviceType do cupom ou percent_servicos / percent_beats.
   */
  internalRefundValues: Record<string, number>;
};

const INTERNAL_BRONZE_PRATA: Record<string, number> = {
  sessao: 30,
  captacao: 50,
  mix: 100,
  master: 75,
  beat1: 145,
  percent_servicos: 10,
};

const INTERNAL_OURO: Record<string, number> = {
  sessao: 30,
  captacao: 40,
  mix: 90,
  master: 60,
  beat1: 120,
  percent_servicos: 10,
  percent_beats: 10,
};

const BRONZE_BENEFITS: PlanCycleGrant[] = [
  { kind: "service", serviceType: "sessao", quantity: 1 },
  { kind: "service", serviceType: "captacao", quantity: 2 },
  { kind: "service", serviceType: "mix", quantity: 1 },
  { kind: "discount", target: "servicos", percent: 10, quantity: 1 },
];

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  bronze: {
    id: "bronze",
    nome: "Plano Bronze",
    descricao: "Para quem está começando a gravar com frequência.",
    mensal: 239.99,
    anual: 2399.9,
    hasPromotionAccess: false,
    cycleBenefits: BRONZE_BENEFITS,
    internalRefundValues: INTERNAL_BRONZE_PRATA,
    marketingBenefits: [
      { label: "1 sessão por mês (1h)", included: true },
      { label: "2h de captação por mês", included: true },
      { label: "1 Mix por mês", included: true },
      { label: "10% de desconto em serviços avulsos", included: true },
      { label: "Sem beats personalizados", included: false },
      { label: "Sem acesso a promoções exclusivas do Shopping", included: false },
      { label: "Não tem acompanhamento artístico", included: false },
    ],
  },
  prata: {
    id: "prata",
    nome: "Plano Prata",
    descricao:
      "Para artistas que gravam com regularidade e já possuem músicas próprias.",
    mensal: 449.99,
    anual: 4499.9,
    hasPromotionAccess: true,
    cycleBenefits: [
      { kind: "service", serviceType: "sessao", quantity: 1 },
      { kind: "service", serviceType: "captacao", quantity: 2 },
      { kind: "service", serviceType: "mix", quantity: 1 },
      { kind: "service", serviceType: "master", quantity: 1 },
      { kind: "service", serviceType: "beat1", quantity: 1 },
    ],
    internalRefundValues: INTERNAL_BRONZE_PRATA,
    marketingBenefits: [
      { label: "1 sessão por mês", included: true },
      { label: "2h de captação por mês", included: true },
      { label: "1 Mix por mês", included: true },
      { label: "1 Master por mês", included: true },
      { label: "1 Beat por mês", included: true },
      { label: "Acesso a promoções exclusivas do Shopping", included: true },
      { label: "Não tem desconto em serviços ou beats", included: false },
      { label: "Não tem acompanhamento artístico", included: false },
    ],
  },
  ouro: {
    id: "ouro",
    nome: "Plano Ouro",
    descricao:
      "Acompanhamento artístico contínuo com o Tremv e benefícios amplos por ciclo.",
    mensal: 799.99,
    anual: 7999.9,
    hasPromotionAccess: true,
    cycleBenefits: [
      { kind: "service", serviceType: "sessao", quantity: 2 },
      { kind: "service", serviceType: "captacao", quantity: 4 },
      { kind: "service", serviceType: "mix", quantity: 2 },
      { kind: "service", serviceType: "master", quantity: 2 },
      { kind: "service", serviceType: "beat1", quantity: 2 },
      { kind: "discount", target: "servicos", percent: 10, quantity: 1 },
      { kind: "discount", target: "beats", percent: 10, quantity: 1 },
    ],
    internalRefundValues: INTERNAL_OURO,
    marketingBenefits: [
      { label: "2 sessões por mês", included: true },
      { label: "4h de captação por mês", included: true },
      { label: "2 Mix por mês", included: true },
      { label: "2 Master por mês", included: true },
      { label: "2 Beats por mês", included: true },
      { label: "10% de desconto em serviços avulsos", included: true },
      { label: "10% de desconto em Beats", included: true },
      { label: "Acesso a promoções exclusivas do Shopping", included: true },
      { label: "Acompanhamento artístico", included: true },
    ],
  },
  /** Plano simbólico de homologação/admin — mesmos benefícios do Bronze. */
  teste: {
    id: "teste",
    nome: "Plano de Teste",
    descricao: "Plano simbólico para homologação.",
    mensal: 1,
    anual: 12,
    hasPromotionAccess: false,
    cycleBenefits: BRONZE_BENEFITS,
    internalRefundValues: INTERNAL_BRONZE_PRATA,
    marketingBenefits: [
      { label: "Mesmos benefícios do Bronze (homologação)", included: true },
    ],
  },
};

/** Lista pública (sem plano teste). */
export const PLAN_PRICES = (["bronze", "prata", "ouro"] as const).map((id) => {
  const p = PLAN_DEFINITIONS[id];
  return { id: p.id, nome: p.nome, mensal: p.mensal, anual: p.anual };
});

export function normalizePlanId(raw: string | null | undefined): PlanId | null {
  const id = String(raw || "")
    .trim()
    .toLowerCase();
  if (id in PLAN_DEFINITIONS) return id as PlanId;
  return null;
}

export function getPlanDefinition(planId: string | null | undefined): PlanDefinition | null {
  const id = normalizePlanId(planId);
  return id ? PLAN_DEFINITIONS[id] : null;
}

export function getPlanPrice(planId: string, modo: PlanModo): number {
  const plan = getPlanDefinition(planId);
  if (!plan) return 0;
  return modo === "mensal" ? plan.mensal : plan.anual;
}

export function planHasPromotionAccess(planId: string | null | undefined): boolean {
  return Boolean(getPlanDefinition(planId)?.hasPromotionAccess);
}

/** Quantidade de cupons emitidos por ciclo (1 cupom por unidade atômica / desconto). */
export function countPlanCycleCoupons(planId: string | null | undefined): number {
  const plan = getPlanDefinition(planId);
  if (!plan) return 0;
  return plan.cycleBenefits.reduce((sum, g) => sum + g.quantity, 0);
}

export function formatPlanPriceBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Motivo persistido em cancelReason ao invalidar cupom não usado na virada do ciclo. */
export const PLAN_CYCLE_SUBSTITUTED_REASON = "ciclo_mensal_substituido";

export function addCalendarMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getDate();
  const targetMonth = d.getMonth() + months;
  const target = new Date(d.getFullYear(), targetMonth, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  target.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return target;
}

/** Fim do ciclo mensal de benefícios a partir do início do ciclo. */
export function computeBenefitCycleEnd(cycleStart: Date): Date {
  return addCalendarMonths(cycleStart, 1);
}

/** GO-H10C — valor interno unitário para reembolso. */
export function getInternalRefundUnit(
  planId: string | null | undefined,
  serviceType: string | null | undefined
): number {
  const plan = getPlanDefinition(planId);
  if (!plan || !serviceType) return 0;
  return plan.internalRefundValues[serviceType] ?? 0;
}

