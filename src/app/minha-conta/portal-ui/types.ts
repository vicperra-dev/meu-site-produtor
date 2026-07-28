/**
 * Portal do Cliente (GO-03D) — tipos dos payloads existentes de
 * GET /api/meus-dados. Nenhum campo novo é inventado.
 */

export interface EntregaServico {
  id: string;
  tipo: string;
  description: string | null;
  deliveryAudioUrl: string;
  deliveryAudioFormat: string | null;
  deliveredAt?: string | null;
  status?: string;
}

export interface Agendamento {
  id: number;
  data: string;
  duracaoMinutos: number;
  tipo: string;
  observacoes?: string;
  status: string;
  createdAt?: string;
  cancelReason?: string | null;
  cancelRefundOption?: string | null;
  refundProcessedAt?: string | null;
  cancelCouponCode?: string | null;
  entregas?: EntregaServico[];
  /** GO-H9 — Ordem de Serviço (fonte oficial). */
  serviceOrderLabel?: string | null;
  serviceOrderType?: string | null;
  serviceOrderPhase?: string | null;
  rootPaymentId?: string | null;
  pagamento: {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    createdAt: string;
  } | null;
  /** true quando o agendamento foi feito com cupom de plano (ao cancelar, só oferece cupom para remarcar) */
  foiComCupomPlano?: boolean;
}

export interface Plano {
  id: string;
  planId: string;
  planName: string;
  modo: string;
  amount: number;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt?: string;
  ativo: boolean;
  expiraEm: string | null;
  /** Preenchido quando o usuário já solicitou reembolso do plano cancelado */
  refundProcessedAt?: string | null;
  /** false para plano de teste ou sem pagamento Asaas: não mostra "Solicitar reembolso" */
  podeSolicitarReembolso?: boolean;
}

export interface Cupom {
  id: string;
  code: string;
  couponType: string;
  canonicalCouponType?: string;
  /** GO-H8: servico | producao | reembolso | plano | desconto */
  couponCategory?: string | null;
  discountType: string;
  discountValue: number;
  serviceType?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  used?: boolean;
  usedAt?: string | null;
  status: "disponivel" | "usado" | "expirado" | "substituido";
  paymentId?: string | null;
  rootPaymentId?: string | null;
  parentCouponId?: string | null;
  originAppointmentId?: number | null;
  userPlanId?: string | null;
  appointmentId?: number | null;
  refundAsaasStatus?: string | null;
  userPlan?: {
    id: string;
    planId: string;
    planName: string;
    endDate?: string | null;
  } | null;
}

export interface FAQQuestion {
  id: string;
  question: string;
  answer: string | null;
  status: string; // "pendente", "respondida", "recusada"
  blocked?: boolean;
  blockedReason?: string | null;
  published: boolean;
  answeredAt: string | null;
  readAt: string | null;
  createdAt: string;
  faq?: {
    id: string;
    question: string;
  } | null;
}

/** Pagamentos do usuário (já retornados por /api/meus-dados, campo `pagamentos`). */
export interface PagamentoUsuario {
  id: string;
  amount: number;
  status: string;
  type?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  appointmentId?: number | null;
}

export interface PortalData {
  agendamentos: Agendamento[];
  planos: Plano[];
  cupons: Cupom[];
  faqQuestions: FAQQuestion[];
  pagamentos: PagamentoUsuario[];
}
