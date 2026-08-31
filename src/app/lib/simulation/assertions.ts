/**
 * SIM-01 — Assertions oficiais (reusa TE + sync/workflow/SM).
 */

import { prisma } from "@/app/lib/prisma";
import { listTransitionHistory } from "@/app/lib/domain/state-machine/history";
import {
  assertAppointment,
  assertCoupon,
  assertDashboard,
  assertMinhaConta,
  assertPayment,
  assertService,
} from "@/app/lib/test-engine/assert-engine";
import type { AssertResult } from "@/app/lib/test-engine/types";
import { findSyncObserverEvents, peekSyncObserver } from "@/app/lib/synchronization/observer";
import { surfacesForEvent } from "@/app/lib/synchronization/routing";
import type { SyncEventName } from "@/app/lib/synchronization/types";

export {
  assertPayment,
  assertAppointment,
  assertService,
  assertCoupon,
  assertDashboard,
  assertMinhaConta,
};

function ok(name: string, evidence?: Record<string, unknown>, message?: string): AssertResult {
  return { name, ok: true, evidence, message };
}

function fail(name: string, message: string, evidence?: Record<string, unknown>): AssertResult {
  return { name, ok: false, message, evidence };
}

export async function assertStatistics(): Promise<AssertResult> {
  const name = "assertStatistics";
  const [users, payments, services, plans] = await Promise.all([
    prisma.user.count(),
    prisma.payment.count({ where: { status: "approved" } }),
    prisma.service.count(),
    prisma.userPlan.count({ where: { status: "active" } }),
  ]);
  return ok(name, { users, paymentsApproved: payments, services, activePlans: plans });
}

export async function assertAgenda(params?: { minBlockedSlots?: number }): Promise<AssertResult> {
  const name = "assertAgenda";
  const [futureApts, blocked] = await Promise.all([
    prisma.appointment.count({
      where: { status: { not: "cancelado" }, data: { gte: new Date() } },
    }),
    prisma.blockedTimeSlot.count({ where: { ativo: true } }),
  ]);
  if (params?.minBlockedSlots != null && blocked < params.minBlockedSlots) {
    return fail(name, `blocked slots ${blocked} < ${params.minBlockedSlots}`, { futureApts, blocked });
  }
  return ok(name, { futureAppointments: futureApts, blockedSlots: blocked });
}

export function assertSynchronization(params: {
  eventName?: SyncEventName;
  minCount?: number;
  surface?: string;
}): AssertResult {
  const name = "assertSynchronization";
  const min = params.minCount ?? 1;
  const events = params.eventName
    ? findSyncObserverEvents((e) => e.name === params.eventName)
    : peekSyncObserver();
  if (events.length < min) {
    return fail(name, `esperava ≥${min} sync event(s), got ${events.length}`, {
      eventName: params.eventName,
    });
  }
  if (params.surface) {
    const routed = params.eventName ? surfacesForEvent(params.eventName) : [];
    if (params.eventName && !routed.includes(params.surface as any)) {
      return fail(name, `surface ${params.surface} não roteada para ${params.eventName}`, { routed });
    }
  }
  return ok(name, {
    count: events.length,
    sample: events.slice(0, 3).map((e) => ({ name: e.name, surfaces: e.surfaces, cursor: e.cursor })),
  });
}

export async function assertWorkflow(params: {
  entity: string;
  entityId: string;
  eventName?: string;
}): Promise<AssertResult> {
  const name = "assertWorkflow";
  const history = await listTransitionHistory({
    entity: params.entity,
    entityId: params.entityId,
    take: 5,
  });
  if (history.length === 0) {
    return fail(name, "nenhuma transição no histórico", { entity: params.entity, entityId: params.entityId });
  }
  if (params.eventName && !history.some((h) => h.eventName === params.eventName)) {
    return fail(name, `evento ${params.eventName} não encontrado no histórico`, { history });
  }
  return ok(name, { history: history.slice(0, 3) });
}

export async function assertStateMachine(params: {
  entity: string;
  entityId: string;
  toStatus?: string;
}): Promise<AssertResult> {
  const name = "assertStateMachine";
  const history = await listTransitionHistory({
    entity: params.entity,
    entityId: params.entityId,
    take: 1,
  });
  if (!history.length) {
    return fail(name, "histórico SM vazio");
  }
  const latest = history[0];
  if (params.toStatus && latest.toStatus !== params.toStatus) {
    return fail(name, `toStatus esperado ${params.toStatus}, got ${latest.toStatus}`, { latest });
  }
  return ok(name, { latest });
}
