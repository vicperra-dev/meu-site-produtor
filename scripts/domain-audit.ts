/**
 * HS-03A — Domain audit (Payment ↔ Appointment ↔ Service ↔ Coupon).
 *
 *   npx --yes tsx --tsconfig tsconfig.json scripts/domain-audit.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  APPOINTMENT_STATUSES,
  SERVICE_STATUSES,
  isAppointmentStatus,
  isServiceStatus,
} from "../src/app/lib/domain/statuses";
import { resolveCanonicalCouponType } from "../src/app/lib/domain/coupon-types";

const prisma = new PrismaClient();

type Issue = {
  type: string;
  count: number;
  sample: Array<string | number>;
  severity?: "blocking" | "warning";
};

function parseAppointmentIds(payment: {
  appointmentId: number | null;
  appointmentIds: unknown;
}): number[] {
  const ids = new Set<number>();
  if (payment.appointmentId != null) ids.add(payment.appointmentId);
  const raw = payment.appointmentIds;
  if (Array.isArray(raw)) {
    for (const v of raw) {
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      if (Number.isFinite(n)) ids.add(n);
    }
  }
  return [...ids];
}

async function main() {
  const issues: Issue[] = [];

  const [appointments, services, payments, coupons] = await Promise.all([
    prisma.appointment.findMany({
      select: { id: true, status: true, userId: true },
    }),
    prisma.service.findMany({
      select: {
        id: true,
        appointmentId: true,
        status: true,
        tipo: true,
        userId: true,
      },
    }),
    prisma.payment.findMany({
      select: {
        id: true,
        userId: true,
        status: true,
        type: true,
        asaasId: true,
        appointmentId: true,
        appointmentIds: true,
      },
    }),
    prisma.coupon.findMany({
      select: {
        id: true,
        code: true,
        couponType: true,
        discountType: true,
        serviceType: true,
        assignedUserId: true,
        appointmentId: true,
        paymentId: true,
        userPlanId: true,
        usedBy: true,
        used: true,
      },
    }),
  ]);

  const aptIds = new Set(appointments.map((a) => a.id));
  const paymentIds = new Set(payments.map((p) => p.id));
  const serviceByApt = new Map<number, typeof services>();
  for (const s of services) {
    if (s.appointmentId == null) continue;
    const list = serviceByApt.get(s.appointmentId) || [];
    list.push(s);
    serviceByApt.set(s.appointmentId, list);
  }

  // Payment aprovado de agendamento sem Appointment
  const paymentSemAppointment = payments.filter((p) => {
    if (p.status !== "approved" || p.type !== "agendamento") return false;
    const ids = parseAppointmentIds(p);
    if (ids.length === 0) return true;
    return ids.some((id) => !aptIds.has(id));
  });
  if (paymentSemAppointment.length) {
    const symbolic = paymentSemAppointment.filter(
      (p) => typeof p.asaasId === "string" && p.asaasId.startsWith("pay_te_")
    );
    const real = paymentSemAppointment.filter(
      (p) => !(typeof p.asaasId === "string" && p.asaasId.startsWith("pay_te_"))
    );
    if (real.length) {
      issues.push({
        type: "payment_sem_appointment",
        count: real.length,
        sample: real.slice(0, 10).map((p) => p.id),
        severity: "blocking",
      });
    }
    if (symbolic.length) {
      issues.push({
        type: "payment_sem_appointment_simbolico",
        count: symbolic.length,
        sample: symbolic.slice(0, 10).map((p) => p.id),
        severity: "warning",
      });
    }
  }

  // Appointment sem Service (operacionalmente aceito+)
  const aptsSemService = appointments.filter((a) => {
    if (!["aceito", "confirmado", "em_andamento", "concluido"].includes(a.status)) {
      return false;
    }
    return !serviceByApt.has(a.id) || (serviceByApt.get(a.id) || []).length === 0;
  });
  if (aptsSemService.length) {
    issues.push({
      type: "appointment_sem_service",
      count: aptsSemService.length,
      sample: aptsSemService.slice(0, 10).map((a) => a.id),
    });
  }

  // Service sem Appointment (órfão)
  const serviceSemAppointment = services.filter(
    (s) => s.appointmentId == null || !aptIds.has(s.appointmentId)
  );
  if (serviceSemAppointment.length) {
    issues.push({
      type: "service_sem_appointment",
      count: serviceSemAppointment.length,
      sample: serviceSemAppointment.slice(0, 10).map((s) => s.id),
    });
  }

  // Coupon órfão (sem owner)
  const cuponsOrfaos = coupons.filter(
    (c) =>
      !c.assignedUserId && !c.paymentId && !c.userPlanId && !c.usedBy && c.appointmentId == null
  );
  if (cuponsOrfaos.length) {
    issues.push({
      type: "coupon_orfao",
      count: cuponsOrfaos.length,
      sample: cuponsOrfaos.slice(0, 10).map((c) => c.id),
    });
  }

  // Coupon com paymentId inexistente
  const cuponsPaymentInvalido = coupons.filter(
    (c) => c.paymentId != null && !paymentIds.has(c.paymentId)
  );
  if (cuponsPaymentInvalido.length) {
    issues.push({
      type: "coupon_payment_inexistente",
      count: cuponsPaymentInvalido.length,
      sample: cuponsPaymentInvalido.slice(0, 10).map((c) => c.id),
    });
  }

  // Status impossível
  const aptStatusInvalid = appointments.filter((a) => !isAppointmentStatus(a.status));
  if (aptStatusInvalid.length) {
    issues.push({
      type: "appointment_status_impossivel",
      count: aptStatusInvalid.length,
      sample: aptStatusInvalid.slice(0, 10).map((a) => `${a.id}:${a.status}`),
    });
  }
  const svcStatusInvalid = services.filter((s) => !isServiceStatus(s.status));
  if (svcStatusInvalid.length) {
    issues.push({
      type: "service_status_impossivel",
      count: svcStatusInvalid.length,
      sample: svcStatusInvalid.slice(0, 10).map((s) => `${s.id}:${s.status}`),
    });
  }

  // Payment duplicado por asaasId
  const asaasMap = new Map<string, string[]>();
  for (const p of payments) {
    if (!p.asaasId) continue;
    const list = asaasMap.get(p.asaasId) || [];
    list.push(p.id);
    asaasMap.set(p.asaasId, list);
  }
  const asaasDup = [...asaasMap.entries()].filter(([, ids]) => ids.length > 1);
  if (asaasDup.length) {
    issues.push({
      type: "payment_duplicado_asaasId",
      count: asaasDup.length,
      sample: asaasDup.slice(0, 10).map(([id]) => id),
    });
  }

  // Coupon code duplicado (schema unique, mas audit defensivo)
  const codeMap = new Map<string, string[]>();
  for (const c of coupons) {
    const list = codeMap.get(c.code) || [];
    list.push(c.id);
    codeMap.set(c.code, list);
  }
  const codeDup = [...codeMap.entries()].filter(([, ids]) => ids.length > 1);
  if (codeDup.length) {
    issues.push({
      type: "coupon_duplicado",
      count: codeDup.length,
      sample: codeDup.slice(0, 10).map(([code]) => code),
    });
  }

  // Workflow inválido: concluido sem nenhum service concluido quando há services
  const workflowInvalid = appointments.filter((a) => {
    if (a.status !== "concluido") return false;
    const svcs = serviceByApt.get(a.id) || [];
    if (svcs.length === 0) return true;
    return !svcs.some((s) => s.status === "concluido");
  });
  if (workflowInvalid.length) {
    issues.push({
      type: "workflow_invalido_concluido",
      count: workflowInvalid.length,
      sample: workflowInvalid.slice(0, 10).map((a) => a.id),
    });
  }

  // Multi-serviço: payment com N appointments mas appointments sem services
  const multiInconsistente = payments.filter((p) => {
    if (p.type !== "agendamento" || p.status !== "approved") return false;
    const ids = parseAppointmentIds(p);
    if (ids.length < 2) return false;
    return ids.some((id) => aptIds.has(id) && !(serviceByApt.get(id) || []).length);
  });
  if (multiInconsistente.length) {
    issues.push({
      type: "multiplos_servicos_inconsistentes",
      count: multiInconsistente.length,
      sample: multiInconsistente.slice(0, 10).map((p) => p.id),
    });
  }

  // Sanity: enum canônico resolve para todos
  const unmappedTypes: string[] = [];
  for (const c of coupons) {
    try {
      resolveCanonicalCouponType(c);
    } catch {
      unmappedTypes.push(c.id);
    }
  }
  if (unmappedTypes.length) {
    issues.push({
      type: "coupon_tipo_nao_resolvido",
      count: unmappedTypes.length,
      sample: unmappedTypes.slice(0, 10),
    });
  }

  // HS-03B: histórico inconsistente / transições inválidas registradas
  try {
    const { isTransitionAllowed } = await import("../src/app/lib/domain/state-machine/guards");
    const logs = await prisma.domainTransitionHistory.findMany({
      select: { id: true, entity: true, fromStatus: true, toStatus: true },
      take: 2000,
    });
    const badLogs = logs.filter((l) => {
      if (l.fromStatus === l.toStatus) return false;
      const entity = l.entity as "appointment" | "service" | "payment" | "coupon";
      return !isTransitionAllowed(entity, l.fromStatus, l.toStatus);
    });
    if (badLogs.length) {
      issues.push({
        type: "historico_inconsistente",
        count: badLogs.length,
        sample: badLogs.slice(0, 10).map((l) => l.id),
      });
    }
  } catch (e: any) {
    console.warn("[domain-audit] Histórico SM indisponível:", e?.message || e);
  }

  const report = {
    ok: issues.filter((i) => (i.severity || "blocking") === "blocking").length === 0,
    generatedAt: new Date().toISOString(),
    counts: {
      appointments: appointments.length,
      services: services.length,
      payments: payments.length,
      coupons: coupons.length,
    },
    knownStatuses: {
      appointment: APPOINTMENT_STATUSES,
      service: SERVICE_STATUSES,
    },
    issues,
  };

  console.log(JSON.stringify(report, null, 2));
  const blocking = issues.filter((i) => (i.severity || "blocking") === "blocking");
  if (blocking.length > 0) {
    console.error(`\n[domain-audit] FAIL — ${blocking.length} issue(s) blocking`);
    process.exitCode = 1;
  } else {
    console.log("\n[domain-audit] PASS");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
