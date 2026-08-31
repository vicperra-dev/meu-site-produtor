function hasAdminAccessLocal(
  user: { role: string; email?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  return user.role === "ADMIN";
}

/**
 * Indica se cupons de plano devem usar estilo simulação (prefixo TESTE_, validade curta).
 * Não usa planId — apenas flags explícitas no metadata.
 */
export function resolvePlanIsTestPayment(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  if (metadata.symbolicPlano === true) return true;
  if (metadata.isTestPayment === true) return true;
  if (metadata.isTest === true && metadata.tipo === "plano") return true;
  return false;
}

/** Pagamento de plano simbólico / simulação (mesma regra de `resolvePlanIsTestPayment`). */
export function isSymbolicPlanoPayment(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return resolvePlanIsTestPayment(metadata);
}

/** Valor cobrado no Asaas para checkout simbólico de agendamento (admin). */
export const SYMBOLIC_AGENDAMENTO_BRL = 5;

/** Valor do pagamento simbólico de plano (fluxo local / teste). */
export const SYMBOLIC_PLANO_BRL = 5;

/** Status de reembolso quando não há chamada ao Asaas (pagamento/cupom simbólico). */
export const REFUND_ASAAS_STATUS_SIMULATED = "simulated" as const;

export type SymbolicPaymentLike = {
  amount: number;
  type: string;
  status: string;
};

function isLocalDevRuntime(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  return /localhost|127\.0\.0\.1/i.test(site);
}

/** Gate único para checkout simbólico, reprocessar teste e fluxos admin de simulação. */
export function canUseSymbolicSimulation(
  user: { role: string | null; email: string | null } | null | undefined
): boolean {
  if (isLocalDevRuntime()) return true;
  if (!user) return false;
  return hasAdminAccessLocal({ role: user.role ?? "", email: user.email ?? "" });
}

/**
 * Cupons de estilo teste (prefixo TESTE_, validade curta): pagamento simbólico ou metadata legada `isTest`.
 */
export function isSymbolicAgendamentoCouponStyle(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  if (metadata.symbolicAgendamento === true) return true;
  if (metadata.isTestPayment === true) return true;
  if (metadata.isTest === true) return true;
  return false;
}

function amountsMatchSymbolic(amount: number, symbolic: number): boolean {
  return Math.abs(Number(amount) - symbolic) < 0.01;
}

function legacyAmountMatchesSymbolicType(payment: SymbolicPaymentLike): boolean {
  if (payment.type === "agendamento") {
    return amountsMatchSymbolic(payment.amount, SYMBOLIC_AGENDAMENTO_BRL);
  }
  if (payment.type === "plano") {
    return amountsMatchSymbolic(payment.amount, SYMBOLIC_PLANO_BRL);
  }
  return false;
}

function logLegacyAmountFallback(payment: SymbolicPaymentLike, context: string): void {
  console.warn(
    `[symbolic-payment] Fallback legado amount=5 sem metadata explícita [${context}]`,
    {
      type: payment.type,
      amount: payment.amount,
      status: payment.status,
    }
  );
}

/**
 * Pagamento aprovado que só é classificado como simbólico pelo fallback `amount === 5`
 * (sem metadata symbolicAgendamento / symbolicPlano / isTestPayment equivalente).
 */
export function dependsOnLegacyAmountFallback(
  payment: SymbolicPaymentLike,
  metadata?: Record<string, unknown> | null
): boolean {
  if (payment.status !== "approved") return false;
  if (payment.type !== "agendamento" && payment.type !== "plano") return false;
  if (metadata && isSymbolicFromMetadata(payment.type, metadata)) return false;
  return legacyAmountMatchesSymbolicType(payment);
}

/** Cláusula Prisma ampla — filtrar com `isSymbolicAgendamentoApprovedPayment` + metadata. */
export function symbolicAgendamentoApprovedPaymentWhereInput() {
  return {
    type: "agendamento" as const,
    status: "approved" as const,
  };
}

/** Cláusula Prisma ampla — filtrar com `isSymbolicApprovedPayment` + metadata. */
export function symbolicPlanoApprovedPaymentWhereInput() {
  return {
    type: "plano" as const,
    status: "approved" as const,
  };
}

/** Filtra pagamentos aprovados que qualificam como simbólicos (metadata ou amount por tipo). */
export function filterSymbolicApprovedPayments<T extends SymbolicPaymentLike>(
  payments: T[]
): T[] {
  return payments.filter(
    (payment) => payment.status === "approved" && isSymbolicApprovedPayment(payment)
  );
}

/** Pagamento de agendamento aprovado classificado como simbólico (metadata; fallback legado por amount). */
export function isSymbolicAgendamentoApprovedPayment(
  payment: SymbolicPaymentLike,
  metadata?: Record<string, unknown> | null
): boolean {
  if (payment.status !== "approved" || payment.type !== "agendamento") return false;
  if (metadata && isSymbolicFromMetadata("agendamento", metadata)) return true;
  if (dependsOnLegacyAmountFallback(payment, metadata)) {
    logLegacyAmountFallback(payment, "isSymbolicAgendamentoApprovedPayment");
    return true;
  }
  return false;
}

export function isSymbolicFromMetadata(
  type: string,
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  if (type === "agendamento") return isSymbolicAgendamentoCouponStyle(metadata);
  if (type === "plano") return isSymbolicPlanoPayment(metadata);
  return false;
}

export function isSymbolicApprovedPayment(
  payment: SymbolicPaymentLike,
  metadata?: Record<string, unknown> | null
): boolean {
  if (payment.status !== "approved") return false;

  if (metadata && isSymbolicFromMetadata(payment.type, metadata)) {
    return true;
  }

  if (dependsOnLegacyAmountFallback(payment, metadata)) {
    logLegacyAmountFallback(payment, "isSymbolicApprovedPayment");
    return true;
  }

  return false;
}

export function resolvePaymentModoTransacao(
  payment: SymbolicPaymentLike,
  metadata?: Record<string, unknown> | null
): "teste" | "real" {
  return isSymbolicApprovedPayment(payment, metadata) ? "teste" : "real";
}

export function parsePaymentAppointmentIds(payment: {
  appointmentId: number | null;
  appointmentIds: unknown;
}): number[] {
  const ids = new Set<number>();
  if (payment.appointmentId != null) ids.add(payment.appointmentId);
  if (payment.appointmentIds == null) return [...ids];

  const raw = payment.appointmentIds;
  const parsed = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        })()
      : [];

  if (Array.isArray(parsed)) {
    for (const id of parsed) {
      if (typeof id === "number") ids.add(id);
    }
  }

  return [...ids];
}
