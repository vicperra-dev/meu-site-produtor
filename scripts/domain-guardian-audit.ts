/**
 * Domain Guardian — auditoria manual de integridade (Tier 1 / Tier 2).
 * Fonte: docs/ai/domain-invariants.md, docs/ai/domain-risks.md
 *
 * Uso: node --experimental-strip-types scripts/domain-guardian-audit.ts
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const MAX_SAMPLES = 15;
const REPORTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../reports/domain-guardian"
);

type CheckCode =
  | "F1"
  | "F4"
  | "A5"
  | "A8"
  | "A9"
  | "C1"
  | "C2"
  | "P2"
  | "X1"
  | "X2"
  | "S1"
  | "S2"
  | "S3"
  | "S4";
type FindingSeverity = "ERROR" | "WARN" | "INFO";
type CheckSeverity = "OK" | "WARN" | "ERROR" | "INFO";

type Finding = {
  id: CheckCode;
  severity: FindingSeverity;
  message: string;
};

type CheckResult = {
  id: CheckCode;
  scanned: number;
  findings: Finding[];
};

type JsonCheckResult = {
  code: CheckCode;
  severity: CheckSeverity;
  scanned: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  findings: Finding[];
};

type DomainGuardianReport = {
  generatedAt: string;
  executionMs: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
    checks: number;
  };
  results: JsonCheckResult[];
};

/** Sync com src/app/lib/symbolic-payment.ts */
const SYMBOLIC_AGENDAMENTO_BRL = 5;
const SYMBOLIC_PLANO_BRL = 5;
const LEGACY_COUPON_PREFIX_TESTE_AGEND = "TESTE_AGEND_";
const LEGACY_COUPON_PREFIX_TESTE_PAY = "TESTE_PAY_";
const ACTIVE_SIMULATION_COUPON_PREFIX = "TESTE_";
const REFUND_ASAAS_STATUS_SIMULATED = "simulated";

const planExpectedCouponCount: Record<string, number> = {
  teste: 5,
  bronze: 5,
  prata: 4,
  ouro: 7,
};

function parseAppointmentIds(raw: Prisma.JsonValue | null): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((id): id is number => typeof id === "number");
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((id): id is number => typeof id === "number")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sampleLines(items: string[], limit = MAX_SAMPLES): string[] {
  if (items.length <= limit) return items;
  return [
    ...items.slice(0, limit),
    `… e mais ${items.length - limit} ocorrência(s)`,
  ];
}

function amountsMatchSymbolic(amount: number, symbolic: number): boolean {
  return Math.abs(Number(amount) - symbolic) < 0.01;
}

function isSymbolicAmountPayment(type: string, amount: number): boolean {
  if (type === "agendamento" || type.toLowerCase().includes("agendamento")) {
    return amountsMatchSymbolic(amount, SYMBOLIC_AGENDAMENTO_BRL);
  }
  if (type === "plano") {
    return amountsMatchSymbolic(amount, SYMBOLIC_PLANO_BRL);
  }
  return false;
}

function parseMetadataJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function hasSymbolicPaymentMetadata(
  type: string,
  metadata: Record<string, unknown>
): boolean {
  if (type === "agendamento" || type.toLowerCase().includes("agendamento")) {
    if (metadata.symbolicAgendamento === true) return true;
    if (metadata.isTestPayment === true) return true;
    if (metadata.isTest === true) return true;
    return false;
  }
  if (type === "plano") {
    if (metadata.symbolicPlano === true) return true;
    if (metadata.isTestPayment === true) return true;
    if (metadata.isTest === true && metadata.tipo === "plano") return true;
    return false;
  }
  return false;
}

function expectedSymbolicAmountForType(type: string): number | null {
  if (type === "agendamento" || type.toLowerCase().includes("agendamento")) {
    return SYMBOLIC_AGENDAMENTO_BRL;
  }
  if (type === "plano") return SYMBOLIC_PLANO_BRL;
  return null;
}

function isPaymentSymbolicByAmount(type: string, amount: number): boolean {
  return isSymbolicAmountPayment(type, amount);
}

function isPaymentSymbolicByMetadata(
  type: string,
  metadata: Record<string, unknown> | null
): boolean {
  return metadata != null && hasSymbolicPaymentMetadata(type, metadata);
}

async function loadMetadataByAsaasIds(
  asaasIds: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (asaasIds.length === 0) return map;

  const rows = await prisma.paymentMetadata.findMany({
    where: { asaasId: { in: asaasIds } },
    select: { asaasId: true, metadata: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  for (const row of rows) {
    if (!row.asaasId || map.has(row.asaasId)) continue;
    const parsed = parseMetadataJson(row.metadata);
    if (parsed) map.set(row.asaasId, parsed);
  }
  return map;
}

async function findNearestMetadataForPayment(payment: {
  userId: string;
  type: string;
  createdAt: Date;
}): Promise<Record<string, unknown> | null> {
  const windowStart = new Date(payment.createdAt.getTime() - 48 * 60 * 60 * 1000);
  const windowEnd = new Date(payment.createdAt.getTime() + 48 * 60 * 60 * 1000);

  const rows = await prisma.paymentMetadata.findMany({
    where: {
      userId: payment.userId,
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
    take: 20,
  });

  for (const row of rows) {
    const parsed = parseMetadataJson(row.metadata);
    if (parsed && hasSymbolicPaymentMetadata(payment.type, parsed)) return parsed;
  }
  return null;
}

async function resolvePaymentMetadata(payment: {
  id: string;
  userId: string;
  type: string;
  asaasId: string | null;
  createdAt: Date;
  amount: number;
}): Promise<Record<string, unknown> | null> {
  if (payment.asaasId) {
    const byAsaas = await loadMetadataByAsaasIds([payment.asaasId]);
    const meta = byAsaas.get(payment.asaasId);
    if (meta) return meta;
  }
  return findNearestMetadataForPayment(payment);
}

// F1 — asaasId duplicado
async function checkF1(): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<
    { asaasId: string; count: bigint }[]
  >`
    SELECT "asaasId", COUNT(*)::bigint AS count
    FROM "Payment"
    WHERE "asaasId" IS NOT NULL
    GROUP BY "asaasId"
    HAVING COUNT(*) > 1
  `;

  const scanned = await prisma.payment.count({
    where: { asaasId: { not: null } },
  });

  const findings: Finding[] = rows.map((r) => ({
    id: "F1",
    severity: "ERROR" as const,
    message: `asaasId duplicado "${r.asaasId}" (${r.count} payments)`,
  }));

  return { id: "F1", scanned, findings };
}

// F4 — Payment aprovado (agendamento) sem Appointment válido
async function checkF4(): Promise<CheckResult> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "approved",
      type: { contains: "agendamento", mode: "insensitive" },
    },
    select: {
      id: true,
      userId: true,
      appointmentId: true,
      appointmentIds: true,
    },
  });

  const findings: Finding[] = [];

  for (const p of payments) {
    const ids = new Set<number>();
    if (p.appointmentId != null) ids.add(p.appointmentId);
    for (const id of parseAppointmentIds(p.appointmentIds)) ids.add(id);

    if (ids.size === 0) {
      findings.push({
        id: "F4",
        severity: "ERROR",
        message: `Payment ${p.id} (user ${p.userId}) approved sem appointmentId/appointmentIds`,
      });
      continue;
    }

    const existing = await prisma.appointment.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((a) => a.id));
    const missing = [...ids].filter((id) => !existingSet.has(id));
    if (missing.length > 0) {
      findings.push({
        id: "F4",
        severity: "ERROR",
        message: `Payment ${p.id} referencia appointment(s) inexistente(s): ${missing.join(", ")}`,
      });
    }
  }

  return { id: "F4", scanned: payments.length, findings };
}

// A5 — Appointment ativo sem Service vinculado
async function checkA5(): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<
    { id: number; status: string; userId: string }[]
  >`
    SELECT a.id, a.status, a."userId"
    FROM "Appointment" a
    LEFT JOIN "Service" s ON s."appointmentId" = a.id
    WHERE a.status IN ('aceito', 'confirmado', 'em_andamento', 'concluido')
      AND a."adminArchivedAt" IS NULL
    GROUP BY a.id, a.status, a."userId"
    HAVING COUNT(s.id) = 0
  `;

  const scanned = await prisma.appointment.count({
    where: {
      adminArchivedAt: null,
      status: { in: ["aceito", "confirmado", "em_andamento", "concluido"] },
    },
  });

  const findings: Finding[] = rows.map((r) => ({
    id: "A5",
    severity: "WARN",
    message: `Appointment ${r.id} (${r.status}, user ${r.userId}) sem Service vinculado`,
  }));

  return { id: "A5", scanned, findings };
}

// A8 — conflitos de horário (status ≠ cancelado)
async function checkA8(): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<
    { id_a: number; id_b: number; data_a: Date; data_b: Date }[]
  >`
    SELECT
      a.id AS id_a,
      b.id AS id_b,
      a.data AS data_a,
      b.data AS data_b
    FROM "Appointment" a
    INNER JOIN "Appointment" b ON a.id < b.id
    WHERE a.status <> 'cancelado'
      AND b.status <> 'cancelado'
      AND a."adminArchivedAt" IS NULL
      AND b."adminArchivedAt" IS NULL
      AND a.data < b.data + (b."duracaoMinutos" * INTERVAL '1 minute')
      AND b.data < a.data + (a."duracaoMinutos" * INTERVAL '1 minute')
  `;

  const scanned = await prisma.appointment.count({
    where: { adminArchivedAt: null, status: { not: "cancelado" } },
  });

  const findings: Finding[] = rows.map((r) => ({
    id: "A8",
    severity: "WARN",
    message: `Conflito de horário entre appointments ${r.id_a} e ${r.id_b} (${r.data_a.toISOString()} / ${r.data_b.toISOString()})`,
  }));

  return { id: "A8", scanned, findings };
}

// A9 — arquivamento administrativo inconsistente
async function checkA9(): Promise<CheckResult> {
  const rows = await prisma.appointment.findMany({
    where: { adminArchivedAt: { not: null } },
    select: {
      id: true,
      status: true,
      adminArchivedReason: true,
      cancelRefundOption: true,
      refundProcessedAt: true,
      refundUserConfirmedAt: true,
      refundCouponId: true,
    },
  });

  const activeStatuses = new Set(["pendente", "aceito", "confirmado", "em_andamento"]);
  const findings: Finding[] = [];

  for (const apt of rows) {
    if (activeStatuses.has(apt.status)) {
      findings.push({
        id: "A9",
        severity: "WARN",
        message: `Appointment ${apt.id} arquivado com status operacional "${apt.status}"`,
      });
    }

    if (!apt.adminArchivedReason || apt.adminArchivedReason.trim().length < 3) {
      findings.push({
        id: "A9",
        severity: "WARN",
        message: `Appointment ${apt.id} arquivado sem adminArchivedReason válida (mín. 3 caracteres)`,
      });
    }

    if (apt.status === "cancelado" || apt.status === "recusado") {
      const cupomOk =
        apt.cancelRefundOption === "cupom" && Boolean(apt.refundCouponId);
      const reembolsoOk =
        apt.cancelRefundOption === "reembolso" &&
        Boolean(apt.refundProcessedAt) &&
        Boolean(apt.refundUserConfirmedAt);

      if (!cupomOk && !reembolsoOk) {
        findings.push({
          id: "A9",
          severity: "ERROR",
          message: `Appointment ${apt.id} arquivado com cancelamento/recusa não resolvido pelo usuário`,
        });
      }
    }
  }

  return { id: "A9", scanned: rows.length, findings };
}

// C1 — Coupon.code duplicado
async function checkC1(): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<
    { code: string; count: bigint }[]
  >`
    SELECT code, COUNT(*)::bigint AS count
    FROM "Coupon"
    GROUP BY code
    HAVING COUNT(*) > 1
  `;

  const scanned = await prisma.coupon.count();

  const findings: Finding[] = rows.map((r) => ({
    id: "C1",
    severity: "ERROR",
    message: `Coupon.code duplicado "${r.code}" (${r.count} registros)`,
  }));

  return { id: "C1", scanned, findings };
}

// C2 — Cupom usado sem rastreabilidade
async function checkC2(): Promise<CheckResult> {
  const coupons = await prisma.coupon.findMany({
    where: { used: true },
    select: {
      id: true,
      code: true,
      usedBy: true,
      appointmentId: true,
      paymentId: true,
      userPlanId: true,
    },
  });

  const findings: Finding[] = [];

  for (const c of coupons) {
    const hasDirect =
      Boolean(c.usedBy?.trim()) ||
      c.appointmentId != null ||
      Boolean(c.paymentId) ||
      Boolean(c.userPlanId);

    if (!hasDirect) {
      findings.push({
        id: "C2",
        severity: "WARN",
        message: `Coupon ${c.id} (${c.code}) used=true sem usedBy/appointmentId/paymentId/userPlanId`,
      });
      continue;
    }

    if (c.appointmentId != null) {
      const apt = await prisma.appointment.findUnique({
        where: { id: c.appointmentId },
        select: { id: true },
      });
      if (!apt) {
        findings.push({
          id: "C2",
          severity: "WARN",
          message: `Coupon ${c.id} (${c.code}) appointmentId=${c.appointmentId} inexistente`,
        });
      }
    }
  }

  return { id: "C2", scanned: coupons.length, findings };
}

// P2 — Plano ativo sem cupons (ou abaixo do esperado pelo catálogo)
async function checkP2(): Promise<CheckResult> {
  const plans = await prisma.userPlan.findMany({
    where: {
      status: "active",
      adminInactiveAt: null,
    },
    select: {
      id: true,
      userId: true,
      planId: true,
      planName: true,
      createdAt: true,
      _count: { select: { coupons: true } },
    },
  });

  const findings: Finding[] = [];

  for (const plan of plans) {
    const count = plan._count.coupons;
    const expected =
      planExpectedCouponCount[plan.planId.toLowerCase()] ?? null;

    if (count === 0) {
      findings.push({
        id: "P2",
        severity: "WARN",
        message: `UserPlan ${plan.id} (${plan.planId}, user ${plan.userId}) ativo sem cupons`,
      });
    } else if (expected != null && count < expected) {
      findings.push({
        id: "P2",
        severity: "WARN",
        message: `UserPlan ${plan.id} (${plan.planId}) com ${count} cupom(ns); esperado ≥${expected}`,
      });
    }
  }

  return { id: "P2", scanned: plans.length, findings };
}

// X1 — divergência de usuário entre entidades relacionadas
async function checkX1(): Promise<CheckResult> {
  const findings: Finding[] = [];
  let scanned = 0;

  const payments = await prisma.payment.findMany({
    where: {
      status: "approved",
      OR: [{ appointmentId: { not: null } }, { appointmentIds: { not: Prisma.DbNull } }],
    },
    select: {
      id: true,
      userId: true,
      appointmentId: true,
      appointmentIds: true,
    },
  });
  scanned += payments.length;

  for (const p of payments) {
    const ids = new Set<number>();
    if (p.appointmentId != null) ids.add(p.appointmentId);
    for (const id of parseAppointmentIds(p.appointmentIds)) ids.add(id);

    if (ids.size === 0) continue;

    const apts = await prisma.appointment.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, userId: true },
    });

    for (const apt of apts) {
      if (apt.userId !== p.userId) {
        findings.push({
          id: "X1",
          severity: "ERROR",
          message: `Payment ${p.id} userId=${p.userId} ≠ Appointment ${apt.id} userId=${apt.userId}`,
        });
      }
    }
  }

  const coupons = await prisma.coupon.findMany({
    where: {
      OR: [
        { userPlanId: { not: null } },
        { paymentId: { not: null } },
        { appointmentId: { not: null } },
      ],
    },
    select: {
      id: true,
      code: true,
      usedBy: true,
      assignedUserId: true,
      userPlanId: true,
      paymentId: true,
      appointmentId: true,
    },
  });
  scanned += coupons.length;

  for (const c of coupons) {
    if (c.userPlanId) {
      const plan = await prisma.userPlan.findUnique({
        where: { id: c.userPlanId },
        select: { userId: true },
      });
      if (!plan) continue;
      if (c.assignedUserId && c.assignedUserId !== plan.userId) {
        findings.push({
          id: "X1",
          severity: "ERROR",
          message: `Coupon ${c.id} assignedUserId=${c.assignedUserId} ≠ UserPlan ${c.userPlanId} userId=${plan.userId}`,
        });
      }
      if (c.usedBy && c.usedBy !== plan.userId) {
        findings.push({
          id: "X1",
          severity: "ERROR",
          message: `Coupon ${c.id} usedBy=${c.usedBy} ≠ UserPlan ${c.userPlanId} userId=${plan.userId}`,
        });
      }
    }

    if (c.paymentId) {
      const payment = await prisma.payment.findUnique({
        where: { id: c.paymentId },
        select: { userId: true },
      });
      if (!payment) continue;
      if (c.usedBy && c.usedBy !== payment.userId) {
        findings.push({
          id: "X1",
          severity: "ERROR",
          message: `Coupon ${c.id} usedBy=${c.usedBy} ≠ Payment ${c.paymentId} userId=${payment.userId}`,
        });
      }
      if (c.assignedUserId && c.assignedUserId !== payment.userId) {
        findings.push({
          id: "X1",
          severity: "ERROR",
          message: `Coupon ${c.id} assignedUserId=${c.assignedUserId} ≠ Payment ${c.paymentId} userId=${payment.userId}`,
        });
      }
    }

    if (c.appointmentId != null) {
      const apt = await prisma.appointment.findUnique({
        where: { id: c.appointmentId },
        select: { userId: true },
      });
      if (!apt) continue;
      if (c.usedBy && c.usedBy !== apt.userId) {
        findings.push({
          id: "X1",
          severity: "ERROR",
          message: `Coupon ${c.id} usedBy=${c.usedBy} ≠ Appointment ${c.appointmentId} userId=${apt.userId}`,
        });
      }
    }
  }

  return { id: "X1", scanned, findings };
}

// X2 — refundCouponId inconsistente
async function checkX2(): Promise<CheckResult> {
  const appointments = await prisma.appointment.findMany({
    where: { refundCouponId: { not: null } },
    select: {
      id: true,
      userId: true,
      refundCouponId: true,
    },
  });

  const findings: Finding[] = [];

  for (const apt of appointments) {
    const couponId = apt.refundCouponId!;
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      select: {
        id: true,
        code: true,
        assignedUserId: true,
        usedBy: true,
        userPlanId: true,
        paymentId: true,
      },
    });

    if (!coupon) {
      findings.push({
        id: "X2",
        severity: "ERROR",
        message: `Appointment ${apt.id} refundCouponId=${couponId} — cupom inexistente`,
      });
      continue;
    }

    let ownerId: string | null = coupon.assignedUserId ?? coupon.usedBy ?? null;

    if (!ownerId && coupon.userPlanId) {
      const plan = await prisma.userPlan.findUnique({
        where: { id: coupon.userPlanId },
        select: { userId: true },
      });
      ownerId = plan?.userId ?? null;
    }
    if (!ownerId && coupon.paymentId) {
      const payment = await prisma.payment.findUnique({
        where: { id: coupon.paymentId },
        select: { userId: true },
      });
      ownerId = payment?.userId ?? null;
    }

    if (ownerId && ownerId !== apt.userId) {
      findings.push({
        id: "X2",
        severity: "ERROR",
        message: `Appointment ${apt.id} userId=${apt.userId} ≠ dono do cupom ${coupon.id} (${coupon.code}) userId=${ownerId}`,
      });
    }
  }

  return { id: "X2", scanned: appointments.length, findings };
}

// S1 — Payments que ainda dependem do fallback legado amount=5 (sem metadata simbólica)
async function checkS1(): Promise<CheckResult> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "approved",
      type: { in: ["agendamento", "plano"] },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      asaasId: true,
      createdAt: true,
    },
  });

  const asaasIds = payments
    .map((p) => p.asaasId)
    .filter((id): id is string => Boolean(id));
  const metadataByAsaas = await loadMetadataByAsaasIds(asaasIds);

  const findings: Finding[] = [];

  for (const payment of payments) {
    let metadata: Record<string, unknown> | null = null;
    if (payment.asaasId) {
      metadata = metadataByAsaas.get(payment.asaasId) ?? null;
    }
    if (!metadata) {
      metadata = await findNearestMetadataForPayment(payment);
    }

    const symbolicByMetadata = isPaymentSymbolicByMetadata(payment.type, metadata);
    const symbolicByAmount = isPaymentSymbolicByAmount(payment.type, payment.amount);
    if (!symbolicByAmount) continue;
    if (symbolicByMetadata) continue;

    findings.push({
      id: "S1",
      severity: "WARN",
      message: `Payment ${payment.id} (${payment.type}, amount=${payment.amount}) depende de fallback legado amount=5 — sem metadata symbolicPlano/symbolicAgendamento/isTestPayment`,
    });
  }

  return { id: "S1", scanned: payments.length, findings };
}

// S2 — Cupons TESTE_* sem vínculo reconhecido de simulação
async function checkS2(): Promise<CheckResult> {
  const coupons = await prisma.coupon.findMany({
    where: { code: { startsWith: ACTIVE_SIMULATION_COUPON_PREFIX } },
    select: {
      id: true,
      code: true,
      assignedUserId: true,
      userPlanId: true,
      paymentId: true,
      appointmentId: true,
      refundAsaasStatus: true,
      payment: {
        select: {
          id: true,
          userId: true,
          type: true,
          amount: true,
          status: true,
          asaasId: true,
          createdAt: true,
        },
      },
    },
  });

  const findings: Finding[] = [];

  for (const coupon of coupons) {
    if (await couponHasRecognizedSimulationLink(coupon)) continue;

    findings.push({
      id: "S2",
      severity: "WARN",
      message: `Coupon ${coupon.id} (${coupon.code}) prefixo TESTE_* sem vínculo de simulação (payment/plano/assigned/refund)`,
    });
  }

  return { id: "S2", scanned: coupons.length, findings };
}

async function couponHasRecognizedSimulationLink(coupon: {
  assignedUserId: string | null;
  userPlanId: string | null;
  paymentId: string | null;
  appointmentId: number | null;
  refundAsaasStatus: string | null;
  payment: {
    id: string;
    userId: string;
    type: string;
    amount: number;
    status: string;
    asaasId: string | null;
    createdAt: Date;
  } | null;
}): Promise<boolean> {
  if (coupon.refundAsaasStatus === REFUND_ASAAS_STATUS_SIMULATED) return true;
  if (coupon.assignedUserId) return true;

  if (coupon.userPlanId) {
    const plan = await prisma.userPlan.findUnique({
      where: { id: coupon.userPlanId },
      select: { amount: true },
    });
    if (plan && amountsMatchSymbolic(plan.amount, SYMBOLIC_PLANO_BRL)) return true;
  }

  if (coupon.paymentId && coupon.payment?.status === "approved") {
    const metadata = await resolvePaymentMetadata(coupon.payment);
    if (isPaymentSymbolicByMetadata(coupon.payment.type, metadata)) return true;
    if (isPaymentSymbolicByAmount(coupon.payment.type, coupon.payment.amount)) return true;
  }

  if (coupon.appointmentId != null) {
    const aptPayment = await prisma.payment.findFirst({
      where: {
        status: "approved",
        type: "agendamento",
        OR: [
          { appointmentId: coupon.appointmentId },
          { appointmentIds: { not: Prisma.DbNull } },
        ],
      },
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        asaasId: true,
        createdAt: true,
        appointmentId: true,
        appointmentIds: true,
      },
    });
    if (aptPayment) {
      const ids = parseAppointmentIds(aptPayment.appointmentIds);
      if (
        aptPayment.appointmentId === coupon.appointmentId ||
        ids.includes(coupon.appointmentId)
      ) {
        const aptMetadata = await resolvePaymentMetadata(aptPayment);
        if (isPaymentSymbolicByMetadata(aptPayment.type, aptMetadata)) return true;
        if (isPaymentSymbolicByAmount(aptPayment.type, aptPayment.amount)) return true;
      }
    }
  }

  return false;
}

// S3 — Metadata simbólica com amount divergente ou fallback legado ainda ativo
async function checkS3(): Promise<CheckResult> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "approved",
      type: { in: ["agendamento", "plano"] },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      asaasId: true,
      createdAt: true,
    },
  });

  const asaasIds = payments
    .map((p) => p.asaasId)
    .filter((id): id is string => Boolean(id));
  const metadataByAsaas = await loadMetadataByAsaasIds(asaasIds);

  const findings: Finding[] = [];

  for (const payment of payments) {
    let metadata: Record<string, unknown> | null = null;
    if (payment.asaasId) {
      metadata = metadataByAsaas.get(payment.asaasId) ?? null;
    }
    if (!metadata) {
      metadata = await findNearestMetadataForPayment(payment);
    }

    const symbolicByMetadata = isPaymentSymbolicByMetadata(payment.type, metadata);
    const symbolicByAmount = isPaymentSymbolicByAmount(payment.type, payment.amount);
    if (!symbolicByMetadata && !symbolicByAmount) continue;

    const expected = expectedSymbolicAmountForType(payment.type);
    if (expected == null) continue;

    if (symbolicByMetadata && !amountsMatchSymbolic(payment.amount, expected)) {
      findings.push({
        id: "S3",
        severity: "WARN",
        message: `Payment ${payment.id} (${payment.type}) com metadata simbólica mas amount=${payment.amount} (esperado ${expected})`,
      });
      continue;
    }

    if (symbolicByAmount && !symbolicByMetadata) {
      findings.push({
        id: "S3",
        severity: "WARN",
        message: `Payment ${payment.id} (${payment.type}, amount=${payment.amount}) classificado apenas via fallback legado amount=5`,
      });
    }
  }

  return { id: "S3", scanned: payments.length, findings };
}

// S4 — Uso residual de prefixos legados TESTE_AGEND_* / TESTE_PAY_*
async function checkS4(): Promise<CheckResult> {
  const [agendCoupons, payCoupons] = await Promise.all([
    prisma.coupon.findMany({
      where: { code: { startsWith: LEGACY_COUPON_PREFIX_TESTE_AGEND } },
      select: { id: true, code: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.findMany({
      where: { code: { startsWith: LEGACY_COUPON_PREFIX_TESTE_PAY } },
      select: { id: true, code: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const scanned = agendCoupons.length + payCoupons.length;
  const findings: Finding[] = [];

  findings.push({
    id: "S4",
    severity: "INFO",
    message: `Legado no banco: ${agendCoupons.length} cupom(ns) TESTE_AGEND_*, ${payCoupons.length} cupom(ns) TESTE_PAY_*`,
  });

  if (agendCoupons.length > 0) {
    for (const c of agendCoupons) {
      findings.push({
        id: "S4",
        severity: "WARN",
        message: `Cupom legado TESTE_AGEND_*: ${c.id} (${c.code})`,
      });
    }
  }

  if (payCoupons.length > 0) {
    for (const c of payCoupons) {
      findings.push({
        id: "S4",
        severity: "WARN",
        message: `Cupom legado TESTE_PAY_*: ${c.id} (${c.code})`,
      });
    }
  }

  return { id: "S4", scanned, findings };
}

function formatReport(results: CheckResult[]): string {
  const ok: string[] = [];
  const info: string[] = [];
  const warn: string[] = [];
  const error: string[] = [];

  for (const result of results) {
    if (result.findings.length === 0) {
      ok.push(
        `${result.id}: nenhuma violação (${result.scanned} registro(s) verificado(s))`
      );
      continue;
    }

    const bySeverity = (s: FindingSeverity) =>
      result.findings.filter((f) => f.severity === s).map((f) => f.message);

    const errs = bySeverity("ERROR");
    const warns = bySeverity("WARN");
    const infos = bySeverity("INFO");

    if (errs.length === 0 && warns.length === 0 && infos.length === 0) {
      ok.push(`${result.id}: nenhuma violação`);
    }
    if (infos.length > 0) {
      info.push(
        `${result.id} (${infos.length}):`,
        ...sampleLines(infos).map((l) => `  - ${l}`)
      );
    }
    if (errs.length > 0) {
      error.push(
        `${result.id} (${errs.length}):`,
        ...sampleLines(errs).map((l) => `  - ${l}`)
      );
    }
    if (warns.length > 0) {
      warn.push(
        `${result.id} (${warns.length}):`,
        ...sampleLines(warns).map((l) => `  - ${l}`)
      );
    }
  }

  const criticalCount = results.reduce(
    (n, r) => n + r.findings.filter((f) => f.severity === "ERROR").length,
    0
  );
  const alertCount = results.reduce(
    (n, r) => n + r.findings.filter((f) => f.severity === "WARN").length,
    0
  );
  const infoCount = results.reduce(
    (n, r) => n + r.findings.filter((f) => f.severity === "INFO").length,
    0
  );
  const totalScanned = results.reduce((n, r) => n + r.scanned, 0);

  const lines: string[] = [
    "Domain Guardian Report",
    "",
    "OK:",
    ...(ok.length > 0 ? ok.map((l) => `  ${l}`) : ["  (nenhum)"]),
    "",
    "INFO:",
    ...(info.length > 0 ? info.map((l) => `  ${l}`) : ["  (nenhum)"]),
    "",
    "WARN:",
    ...(warn.length > 0 ? warn.map((l) => `  ${l}`) : ["  (nenhum)"]),
    "",
    "ERROR:",
    ...(error.length > 0 ? error.map((l) => `  ${l}`) : ["  (nenhum)"]),
    "",
    "Resumo:",
    `  * erros críticos: ${criticalCount}`,
    `  * alertas: ${alertCount}`,
    `  * informativos: ${infoCount}`,
    `  * total verificado: ${totalScanned} registro(s) em ${results.length} verificação(ões)`,
  ];

  return lines.join("\n");
}

function resolveCheckSeverity(result: CheckResult): CheckSeverity {
  if (result.findings.some((f) => f.severity === "ERROR")) return "ERROR";
  if (result.findings.some((f) => f.severity === "WARN")) return "WARN";
  if (result.findings.some((f) => f.severity === "INFO")) return "INFO";
  return "OK";
}

function buildJsonReport(
  results: CheckResult[],
  generatedAt: Date,
  executionMs: number
): DomainGuardianReport {
  const jsonResults: JsonCheckResult[] = results.map((result) => {
    const errorCount = result.findings.filter((f) => f.severity === "ERROR").length;
    const warningCount = result.findings.filter((f) => f.severity === "WARN").length;
    const infoCount = result.findings.filter((f) => f.severity === "INFO").length;
    return {
      code: result.id,
      severity: resolveCheckSeverity(result),
      scanned: result.scanned,
      errorCount,
      warningCount,
      infoCount,
      findings: result.findings,
    };
  });

  const errors = jsonResults.reduce((n, r) => n + r.errorCount, 0);
  const warnings = jsonResults.reduce((n, r) => n + r.warningCount, 0);
  const info = jsonResults.reduce((n, r) => n + r.infoCount, 0);

  return {
    generatedAt: generatedAt.toISOString(),
    executionMs,
    summary: {
      errors,
      warnings,
      info,
      checks: jsonResults.length,
    },
    results: jsonResults,
  };
}

function formatReportFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}.json`;
}

async function persistReport(report: DomainGuardianReport, generatedAt: Date) {
  await mkdir(REPORTS_DIR, { recursive: true });

  const timestampedPath = path.join(
    REPORTS_DIR,
    formatReportFilename(generatedAt)
  );
  const latestPath = path.join(REPORTS_DIR, "latest.json");
  const payload = `${JSON.stringify(report, null, 2)}\n`;

  await writeFile(timestampedPath, payload, "utf8");
  await writeFile(latestPath, payload, "utf8");

  return { timestampedPath, latestPath };
}

async function main() {
  const startedAt = Date.now();
  const generatedAt = new Date();
  const results: CheckResult[] = [];

  results.push(await checkF1());
  results.push(await checkF4());
  results.push(await checkA5());
  results.push(await checkA8());
  results.push(await checkA9());
  results.push(await checkC1());
  results.push(await checkC2());
  results.push(await checkP2());
  results.push(await checkX1());
  results.push(await checkX2());
  results.push(await checkS1());
  results.push(await checkS2());
  results.push(await checkS3());
  results.push(await checkS4());

  const executionMs = Date.now() - startedAt;
  const report = buildJsonReport(results, generatedAt, executionMs);
  const { timestampedPath, latestPath } = await persistReport(report, generatedAt);

  console.log(formatReport(results));
  console.log("");
  console.log(`Relatório JSON: ${timestampedPath}`);
  console.log(`Latest: ${latestPath}`);

  const hasErrors = results.some((r) =>
    r.findings.some((f) => f.severity === "ERROR")
  );
  if (hasErrors) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("domain_guardian_error:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
