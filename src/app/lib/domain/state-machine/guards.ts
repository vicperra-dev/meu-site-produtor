/**
 * HS-03B — Guards e grafo explícito de transições.
 * Toda transição inválida deve falhar com erro explícito.
 */

import type { WorkflowEntity } from "@/app/lib/domain/state-machine/types";

/** Grafo canônico OP-01 (estados normalizados em minúsculas). */
export const ALLOWED_TRANSITIONS: Record<WorkflowEntity, Record<string, readonly string[]>> = {
  appointment: {
    // RECUSADO só de PENDENTE; CANCELADO só após ACEITO/CONFIRMADO/EM_ANDAMENTO
    pendente: ["aceito", "confirmado", "recusado"],
    aceito: ["em_andamento", "cancelado", "remarcado"],
    confirmado: ["aceito", "em_andamento", "cancelado", "remarcado"],
    em_andamento: ["concluido", "cancelado"],
    cancelado: ["aceito", "remarcado"],
    recusado: [],
    concluido: [],
    remarcado: ["pendente", "aceito"],
  },
  service: {
    // Linear: PENDENTE → ACEITO → EM_ANDAMENTO → ENTREGA/CONCLUÍDO
    pendente: ["aceito", "recusado", "cancelado"],
    aceito: ["em_andamento", "cancelado"],
    em_andamento: ["entrega", "concluido", "cancelado"],
    entrega: ["concluido", "cancelado"],
    concluido: [],
    cancelado: [],
    recusado: [],
  },
  payment: {
    pendente: ["recebido", "confirmado", "reembolsado"],
    pending: ["recebido", "confirmado", "reembolsado"],
    recebido: ["confirmado", "reembolsado"],
    received: ["confirmado", "reembolsado"],
    confirmado: ["reembolsado"],
    approved: ["reembolsado"],
    reembolsado: [],
    refunded: [],
  },
  coupon: {
    criado: ["utilizado", "expirado", "cancelado"],
    utilizado: [],
    expirado: [],
    cancelado: [],
  },
};

/** Aliases de persistência → estado canônico da SM. */
const NORMALIZE: Record<WorkflowEntity, Record<string, string>> = {
  appointment: {
    pendente: "pendente",
    aceito: "aceito",
    confirmado: "confirmado",
    em_andamento: "em_andamento",
    concluido: "concluido",
    recusado: "recusado",
    cancelado: "cancelado",
    remarcado: "remarcado",
  },
  service: {
    pendente: "pendente",
    aceito: "aceito",
    em_andamento: "em_andamento",
    entrega: "entrega",
    concluido: "concluido",
    recusado: "recusado",
    cancelado: "cancelado",
  },
  payment: {
    pendente: "pendente",
    pending: "pendente",
    recebido: "recebido",
    received: "recebido",
    confirmado: "confirmado",
    confirmed: "confirmado",
    approved: "confirmado",
    reembolsado: "reembolsado",
    refunded: "reembolsado",
  },
  coupon: {
    criado: "criado",
    created: "criado",
    utilizado: "utilizado",
    used: "utilizado",
    expirado: "expirado",
    expired: "expirado",
    cancelado: "cancelado",
    cancelled: "cancelado",
  },
};

/** Estado canônico → valor persistido no banco atual. */
const PERSIST: Record<WorkflowEntity, Record<string, string>> = {
  appointment: {
    pendente: "pendente",
    aceito: "aceito",
    confirmado: "confirmado",
    em_andamento: "em_andamento",
    concluido: "concluido",
    recusado: "recusado",
    cancelado: "cancelado",
    remarcado: "remarcado",
  },
  service: {
    pendente: "pendente",
    aceito: "aceito",
    em_andamento: "em_andamento",
    /** Entrega oficial persiste como concluido (+ URL nos metadata). */
    entrega: "concluido",
    concluido: "concluido",
    recusado: "recusado",
    cancelado: "cancelado",
  },
  payment: {
    pendente: "pending",
    recebido: "approved",
    confirmado: "approved",
    reembolsado: "refunded",
  },
  coupon: {
    criado: "criado",
    utilizado: "utilizado",
    expirado: "expirado",
    cancelado: "cancelado",
  },
};

export function normalizeState(entity: WorkflowEntity, state: string): string {
  const raw = String(state || "").trim().toLowerCase();
  return NORMALIZE[entity][raw] || raw;
}

export function toPersistedState(entity: WorkflowEntity, normalized: string): string {
  const n = normalizeState(entity, normalized);
  return PERSIST[entity][n] || n;
}

export function isTransitionAllowed(
  entity: WorkflowEntity,
  fromRaw: string,
  toRaw: string
): boolean {
  const from = normalizeState(entity, fromRaw);
  const to = normalizeState(entity, toRaw);
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[entity][from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function assertTransitionAllowed(
  entity: WorkflowEntity,
  fromRaw: string,
  toRaw: string
): void {
  const from = normalizeState(entity, fromRaw);
  const to = normalizeState(entity, toRaw);

  if (from === "concluido" && to === "pendente") {
    throw new Error("Não permitir CONCLUIDO → PENDENTE");
  }
  if (from === "concluido" && (to === "aceito" || to === "em_andamento" || to === "entrega")) {
    throw new Error(`Não permitir CONCLUIDO → ${to.toUpperCase()}`);
  }
  if (from === "aceito" && to === "concluido") {
    throw new Error("Não permitir ACEITO → CONCLUÍDO (passe por EM_ANDAMENTO)");
  }
  if (from === "aceito" && to === "recusado") {
    throw new Error("Não permitir ACEITO → RECUSADO (use CANCELADO)");
  }
  if (from === "recusado" && to === "em_andamento") {
    throw new Error("Não permitir RECUSADO → EM_ANDAMENTO");
  }
  if (from === "pendente" && to === "cancelado" && entity === "appointment") {
    throw new Error("Não permitir CANCELADO a partir de PENDENTE (use RECUSADO)");
  }
  if (
    (from === "reembolsado" || from === "refunded") &&
    (to === "confirmado" || to === "approved")
  ) {
    throw new Error("Não permitir REEMBOLSADO → CONFIRMADO");
  }
  if (from === "utilizado" && to === "criado") {
    throw new Error("Não permitir UTILIZADO → CRIADO");
  }

  if (!isTransitionAllowed(entity, from, to)) {
    throw new Error(`Transição inválida: ${entity} ${from} → ${to}`);
  }
}

export function listAllowedTargets(entity: WorkflowEntity, fromRaw: string): string[] {
  const from = normalizeState(entity, fromRaw);
  return [...(ALLOWED_TRANSITIONS[entity][from] || [])];
}
