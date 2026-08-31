/**
 * GO-03C — Tipos de UI do Dashboard Executivo.
 * Espelham respostas das APIs admin existentes. Sem regras de domínio.
 */

export interface DashPayment {
  id: string;
  amount: number;
  status: string;
  type: string | null;
  createdAt: string;
  updatedAt?: string | null;
  statusReembolso?: string | null;
  refundProcessedAt?: string | null;
  refundAmount?: number | null;
  user?: { nomeArtistico?: string | null; email?: string | null } | null;
  label?: string | null;
}

export interface DashService {
  id: string;
  tipo: string;
  status: string;
  acceptedAt?: string | null;
  deliveryAudioUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  appointmentId?: number | null;
  appointment?: { id: number; data: string; status: string } | null;
  payment?: { id: string; amount: number; status: string } | null;
  user: { nomeArtistico: string; email: string };
}

export interface DashAppointment {
  id: number;
  data: string;
  tipo: string;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  refundProcessedAt?: string | null;
  cancelRefundOption?: string | null;
  user: { nomeArtistico: string; email: string } | null;
  pagamentoConfirmado?: { id: string; amount: number; status: string; createdAt: string } | null;
}

export interface DashCoupon {
  id: string;
  code: string;
  used: boolean;
  usedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  couponType?: string | null;
  serviceType?: string | null;
  refundProcessedAt?: string | null;
  user?: { nomeArtistico?: string | null; email?: string | null } | null;
}

export interface DashPlan {
  id: string;
  planName: string;
  status: string;
  amount: number;
  createdAt: string;
  user?: { nomeArtistico?: string | null; email?: string | null } | null;
}

export interface DashStats {
  appointments: number;
  appointmentsPendente: number;
  appointmentsAceitos: number;
  appointmentsCancelados: number;
  appointmentsRecusados: number;
  appointmentsEmAndamento: number;
  appointmentsConcluidos: number;
  users: number;
  payments: number;
  activePlans: number;
  services: number;
  pendingChats: number;
  pendingFaqs: number;
}

export interface DashDetalhadas {
  pagamentos: { total: number; valorTotal: number };
  planos: { total: number; ativos: number; inativos: number };
  agendamentos: {
    total: number;
    hoje: number;
    estaSemana: number;
    esteMes: number;
    totalCancelados: number;
  };
  servicos: {
    total: number;
    pendentes: number;
    aceitos: number;
    emAndamento: number;
    concluidos: number;
    cancelados: number;
    recusados: number;
  };
  usuarios: { total: number };
}

export type FetchState<T> =
  | { status: "idle" | "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };
