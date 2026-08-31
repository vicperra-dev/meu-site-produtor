/**
 * HS-03B — Workflow / State Machine audit.
 *
 *   npm run workflow:audit
 */
import { PrismaClient } from "@prisma/client";
import {
  ALLOWED_TRANSITIONS,
  isTransitionAllowed,
  normalizeState,
} from "../src/app/lib/domain/state-machine/guards";
import { isAppointmentStatus, isServiceStatus } from "../src/app/lib/domain/statuses";

const prisma = new PrismaClient();

type Issue = { type: string; count: number; sample: Array<string | number> };

async function main() {
  const issues: Issue[] = [];

  const [appointments, services, payments, logs] = await Promise.all([
    prisma.appointment.findMany({ select: { id: true, status: true } }),
    prisma.service.findMany({ select: { id: true, status: true, appointmentId: true } }),
    prisma.payment.findMany({ select: { id: true, status: true } }),
    prisma.domainTransitionHistory.findMany({
      select: {
        id: true,
        entity: true,
        entityId: true,
        fromStatus: true,
        toStatus: true,
        eventName: true,
      },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }).catch(() => [] as any[]),
  ]);

  // Estados impossíveis
  const aptBad = appointments.filter((a) => !isAppointmentStatus(a.status));
  if (aptBad.length) {
    issues.push({
      type: "appointment_status_impossivel",
      count: aptBad.length,
      sample: aptBad.slice(0, 10).map((a) => `${a.id}:${a.status}`),
    });
  }
  const svcBad = services.filter((s) => !isServiceStatus(s.status));
  if (svcBad.length) {
    issues.push({
      type: "service_status_impossivel",
      count: svcBad.length,
      sample: svcBad.slice(0, 10).map((s) => `${s.id}:${s.status}`),
    });
  }

  // Histórico com transição inválida (loop / guard break)
  const invalidHistory = logs.filter((l) => {
    const entity = l.entity as "appointment" | "service" | "payment" | "coupon";
    if (!ALLOWED_TRANSITIONS[entity]) return true;
    if (l.fromStatus === l.toStatus) return false;
    return !isTransitionAllowed(entity, l.fromStatus, l.toStatus);
  });
  if (invalidHistory.length) {
    issues.push({
      type: "historico_transicao_invalida",
      count: invalidHistory.length,
      sample: invalidHistory.slice(0, 10).map((l) => l.id),
    });
  }

  // Loops triviais: A→B seguido de B→A no mesmo entityId em sequência (amostra)
  const byEntity = new Map<string, typeof logs>();
  for (const l of logs) {
    const key = `${l.entity}:${l.entityId}`;
    const list = byEntity.get(key) || [];
    list.push(l);
    byEntity.set(key, list);
  }
  let loopCount = 0;
  const loopSample: string[] = [];
  for (const [key, list] of byEntity) {
    const chrono = [...list].reverse();
    for (let i = 1; i < chrono.length; i++) {
      const prev = chrono[i - 1];
      const cur = chrono[i];
      if (prev.toStatus === cur.fromStatus && cur.toStatus === prev.fromStatus) {
        loopCount++;
        if (loopSample.length < 10) loopSample.push(key);
        break;
      }
    }
  }
  if (loopCount) {
    issues.push({ type: "workflow_loop_suspect", count: loopCount, sample: loopSample });
  }

  // Status órfão: service sem appointment
  const orphanSvc = services.filter((s) => s.appointmentId == null);
  if (orphanSvc.length) {
    issues.push({
      type: "service_status_orfao",
      count: orphanSvc.length,
      sample: orphanSvc.slice(0, 10).map((s) => s.id),
    });
  }

  // Workflow quebrado: appointment concluido sem service concluido
  const svcByApt = new Map<number, string[]>();
  for (const s of services) {
    if (s.appointmentId == null) continue;
    const list = svcByApt.get(s.appointmentId) || [];
    list.push(s.status);
    svcByApt.set(s.appointmentId, list);
  }
  const broken = appointments.filter((a) => {
    if (a.status !== "concluido") return false;
    const st = svcByApt.get(a.id) || [];
    return st.length === 0 || !st.some((x) => x === "concluido");
  });
  if (broken.length) {
    issues.push({
      type: "workflow_quebrado_concluido",
      count: broken.length,
      sample: broken.slice(0, 10).map((a) => a.id),
    });
  }

  // Guards unit check (table integrity)
  const guardSelfTests: Array<[string, string, string, boolean]> = [
    ["appointment", "concluido", "pendente", false],
    ["appointment", "recusado", "em_andamento", false],
    ["payment", "reembolsado", "confirmado", false],
    ["coupon", "utilizado", "criado", false],
    ["appointment", "pendente", "aceito", true],
    ["service", "aceito", "em_andamento", true],
    ["payment", "pendente", "confirmado", true],
    ["coupon", "criado", "utilizado", true],
  ];
  const guardFails = guardSelfTests.filter(([entity, from, to, expected]) => {
    const actual = isTransitionAllowed(entity as any, from, to);
    return actual !== expected;
  });
  if (guardFails.length) {
    issues.push({
      type: "guard_table_inconsistente",
      count: guardFails.length,
      sample: guardFails.map(([e, f, t]) => `${e}:${f}->${t}`),
    });
  }

  // Normalize smoke
  const normOk =
    normalizeState("payment", "approved") === "confirmado" &&
    normalizeState("service", "entrega") === "entrega";
  if (!normOk) {
    issues.push({ type: "normalize_inconsistente", count: 1, sample: ["payment/service"] });
  }

  void payments;

  const report = {
    ok: issues.length === 0,
    generatedAt: new Date().toISOString(),
    counts: {
      appointments: appointments.length,
      services: services.length,
      payments: payments.length,
      historyLogs: logs.length,
    },
    issues,
  };

  console.log(JSON.stringify(report, null, 2));
  if (issues.length > 0) {
    console.error(`\n[workflow-audit] FAIL — ${issues.length} tipo(s)`);
    process.exitCode = 1;
  } else {
    console.log("\n[workflow-audit] PASS");
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
