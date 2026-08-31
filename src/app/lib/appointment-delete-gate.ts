/**
 * Gate: exclusão só após workflow encerrado (OP-02B).
 */

const CLOSED_STATUSES = new Set(["cancelado", "recusado", "concluido"]);

const REFUND_DONE = new Set([
  "refunded",
  "REFUNDED",
  "confirmed",
  "simulated",
  "FAILED",
  "failed",
  "TIMEOUT",
  "timeout",
]);

export type AppointmentDeleteDecision =
  | { allowed: true; reason: string }
  | { allowed: false; reason: string };

/**
 * Permite excluir apenas quando o processo operacional terminou:
 * - concluído; ou
 * - cancelado/recusado com remarcação (cupom) já gerada; ou
 * - cancelado/recusado com reembolso financeiro resolvido; ou
 * - cancelado/recusado sem trilha de reembolso pendente (nada a escolher).
 */
export function canDeleteClosedAppointment(
  apt: {
    status: string;
    cancelRefundOption?: string | null;
    refundProcessedAt?: Date | string | null;
    refundAsaasStatus?: string | null;
    refundCouponId?: string | null;
  }
): AppointmentDeleteDecision {
  const status = String(apt.status || "").toLowerCase();
  if (!CLOSED_STATUSES.has(status)) {
    return {
      allowed: false,
      reason: "Só é possível excluir agendamentos com workflow encerrado (concluído, cancelado ou recusado).",
    };
  }

  if (status === "concluido") {
    return { allowed: true, reason: "Processo concluído." };
  }

  // cancelado / recusado
  if (!apt.cancelRefundOption) {
    // Usuário ainda pode precisar escolher reembolso/cupom — bloqueia se há indício de pagamento
    // Sem opção escolhida: permitir só se claramente sem trilha (legado sem refund)
    if (apt.refundProcessedAt || apt.refundCouponId) {
      return { allowed: true, reason: "Trilha de reembolso/cupom já registrada." };
    }
    return {
      allowed: false,
      reason: "Aguardando escolha de reembolso ou cupom de remarcação (workflow não encerrado).",
    };
  }

  if (apt.cancelRefundOption === "cupom") {
    if (apt.refundCouponId) {
      return { allowed: true, reason: "Cupom de remarcação gerado — processo encerrado." };
    }
    return {
      allowed: false,
      reason: "Cupom de remarcação ainda não gerado.",
    };
  }

  if (apt.cancelRefundOption === "reembolso") {
    if (!apt.refundProcessedAt) {
      return {
        allowed: false,
        reason: "Reembolso financeiro ainda não processado.",
      };
    }
    const st = String(apt.refundAsaasStatus || "");
    if (!st || st.toLowerCase() === "pending") {
      return {
        allowed: false,
        reason: "Reembolso ainda pendente no gateway.",
      };
    }
    if (REFUND_DONE.has(st) || REFUND_DONE.has(st.toUpperCase())) {
      return { allowed: true, reason: `Reembolso resolvido (${st}).` };
    }
    return {
      allowed: false,
      reason: `Status de reembolso não finalizado: ${st || "desconhecido"}.`,
    };
  }

  return { allowed: false, reason: "Workflow de encerramento incompleto." };
}
