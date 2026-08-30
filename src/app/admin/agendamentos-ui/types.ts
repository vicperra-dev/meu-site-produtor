/**
 * GO-03B — Tipos de UI do painel de agendamentos (somente leitura das APIs existentes).
 * Espelham a resposta de GET /api/admin/agendamentos. Nenhuma regra de negócio aqui.
 */

export interface PagamentoConfirmado {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  asaasId: string | null;
  provider?: string | null;
  createdAt: string;
}

export interface CupomAssociado {
  id?: string;
  code: string;
  serviceType: string | null;
  discountType: string;
  used: boolean;
  couponType?: string;
  paymentId?: string | null;
}

export interface AdminFinancialSummaryView {
  originalAmount: number | null;
  discountAmount: number;
  finalAmount: number | null;
  amountsKnown: boolean;
  paymentChannel: string;
  paymentLabel: string;
  couponCode: string | null;
  couponKind: string;
  couponKindLabel: string;
  hasCoupon: boolean;
}

export interface AdminAgendamento {
  id: number;
  data: string;
  duracaoMinutos: number;
  tipo: string;
  observacoes?: string | null;
  status: string;
  blocked: boolean;
  blockedAt?: string | null;
  blockedReason?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  cancelRefundOption?: string | null;
  refundProcessedAt?: string | null;
  refundAsaasStatus?: string | null;
  refundCouponId?: string | null;
  user: {
    nomeArtistico: string;
    email: string;
    telefone?: string | null;
  };
  createdAt: string;
  pagamentoConfirmado: PagamentoConfirmado | null;
  financial?: AdminFinancialSummaryView | null;
  cupomAssociado: CupomAssociado | null;
  cuponsAssociados?: CupomAssociado[];
}

/** Serviço relacionado (subset de GET /api/admin/servicos) exibido no drawer. */
export interface RelatedService {
  id: string;
  tipo: string;
  status: string;
  appointmentId: number | null;
  deliveryAudioUrl?: string | null;
  deliveryAudioFormat?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  actualDurationSeconds?: number | null;
  contractedDurationSeconds?: number | null;
  overtimeBasePriceCents?: number | null;
  suggestedOvertimeAmountCents?: number | null;
}
