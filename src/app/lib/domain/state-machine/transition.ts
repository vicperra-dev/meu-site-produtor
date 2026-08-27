/**
 * HS-03B — State Machine oficial.
 * Única porta de alteração de status de domínio: transition().
 */

import { prisma } from "@/app/lib/prisma";
import { validateDeliveryAudioUrl } from "@/app/lib/delivery-url-validation";
import { ensureServicesForAppointment } from "@/app/lib/ensure-appointment-services";
import {
  assertTransitionAllowed,
  isTransitionAllowed,
  normalizeState,
  toPersistedState,
} from "@/app/lib/domain/state-machine/guards";
import { buildDomainEvent, emitDomainEvent } from "@/app/lib/domain/state-machine/events";
import { recordTransitionHistory } from "@/app/lib/domain/state-machine/history";
import { planTransitionEffects } from "@/app/lib/domain/state-machine/effects";
import type {
  TransitionInput,
  TransitionResult,
  WorkflowEntity,
} from "@/app/lib/domain/state-machine/types";

function fail(error: string, httpStatus: number, code: string): TransitionResult {
  return { ok: false, error, httpStatus, code };
}

async function loadCurrentStatus(
  entity: WorkflowEntity,
  id: string | number
): Promise<{ status: string; raw: Record<string, unknown> } | null> {
  if (entity === "appointment") {
    const row = await prisma.appointment.findUnique({
      where: { id: typeof id === "number" ? id : parseInt(String(id), 10) },
    });
    if (!row) return null;
    return { status: row.status, raw: row as unknown as Record<string, unknown> };
  }
  if (entity === "service") {
    const row = await prisma.service.findUnique({ where: { id: String(id) } });
    if (!row) return null;
    return { status: row.status, raw: row as unknown as Record<string, unknown> };
  }
  if (entity === "payment") {
    const row = await prisma.payment.findUnique({ where: { id: String(id) } });
    if (!row) return null;
    return { status: row.status, raw: row as unknown as Record<string, unknown> };
  }
  const row = await prisma.coupon.findUnique({ where: { id: String(id) } });
  if (!row) return null;
  let status = "criado";
  if (row.used) status = "utilizado";
  else if (row.userRemovedAt) status = "cancelado";
  else if (row.expiresAt && row.expiresAt.getTime() < Date.now()) status = "expirado";
  return { status, raw: row as unknown as Record<string, unknown> };
}

async function persistStatus(
  input: TransitionInput,
  fromPersisted: string,
  toNormalized: string
): Promise<{ applied: boolean; conflictAlreadyAtTarget: boolean }> {
  const persisted = toPersistedState(input.entity, toNormalized);
  const meta = input.metadata || {};
  const fromNorm = normalizeState(input.entity, fromPersisted);

  if (input.entity === "appointment") {
    const idNum = typeof input.id === "number" ? input.id : parseInt(String(input.id), 10);
    const data: Record<string, unknown> = { status: persisted };
    if (persisted === "recusado" || persisted === "cancelado" || persisted === "remarcado") {
      if (input.reason) data.cancelReason = input.reason;
      data.cancelledAt = new Date();
    }
    if (persisted === "aceito" && (fromNorm === "cancelado" || fromNorm === "remarcado")) {
      data.cancelReason = null;
      data.cancelledAt = null;
      data.cancelRefundOption = null;
      data.refundProcessedAt = null;
      data.refundCouponId = null;
    }

    // confirmado é alias legado de aceite admin
    const fromWhere =
      fromPersisted === "confirmado" && persisted === "aceito"
        ? { in: ["confirmado", "aceito"] }
        : fromPersisted === "aceito" && persisted === "em_andamento"
          ? { in: ["aceito", "confirmado"] }
          : fromPersisted;

    const cnt = await prisma.appointment.updateMany({
      where: {
        id: idNum,
        status: fromWhere as any,
      },
      data: data as any,
    });
    if (cnt.count > 0) return { applied: true, conflictAlreadyAtTarget: false };
    const cur = await prisma.appointment.findUnique({ where: { id: idNum } });
    return {
      applied: false,
      conflictAlreadyAtTarget: cur?.status === persisted,
    };
  }

  if (input.entity === "service") {
    const data: Record<string, unknown> = { status: persisted };
    if (persisted === "aceito") data.acceptedAt = new Date();
    if (persisted === "concluido") {
      const skipDelivery = Boolean(meta.completeWithoutDelivery);
      if (skipDelivery) {
        // GO-H12: Sessão/Captação — conclusão operacional sem arquivo
        data.deliveryAudioUrl = null;
        data.deliveryAudioFormat = null;
      } else {
        const url = String(meta.deliveryAudioUrl || "").trim();
        const fmt = meta.deliveryAudioFormat;
        if (fmt !== "wav" && fmt !== "mp3" && fmt !== "zip") {
          throw Object.assign(new Error("Formato de entrega obrigatório (wav|mp3|zip)"), {
            httpStatus: 400,
            code: "VALIDATION",
          });
        }
        const probe =
          process.env.DELIVERY_AUDIO_URL_PROBE === "1" ||
          process.env.DELIVERY_AUDIO_URL_PROBE === "true" ||
          Boolean(meta.probe);
        const urlValidation = await validateDeliveryAudioUrl(url, { probe });
        if (!urlValidation.ok) {
          throw Object.assign(new Error(urlValidation.error || "URL de entrega inválida"), {
            httpStatus: 400,
            code: "VALIDATION",
          });
        }
        data.deliveryAudioUrl = url;
        data.deliveryAudioFormat = fmt;
      }
    }

    const fromFilter =
      toNormalized === "em_andamento"
        ? { in: ["pendente", "aceito"] }
        : toNormalized === "entrega"
          ? { in: ["em_andamento"] }
          : toNormalized === "concluido"
            ? { in: ["em_andamento", "entrega"] }
            : fromPersisted;

    const cnt = await prisma.service.updateMany({
      where: { id: String(input.id), status: fromFilter as any },
      data: data as any,
    });
    if (cnt.count > 0) return { applied: true, conflictAlreadyAtTarget: false };
    const cur = await prisma.service.findUnique({ where: { id: String(input.id) } });
    return {
      applied: false,
      conflictAlreadyAtTarget: cur?.status === persisted,
    };
  }

  if (input.entity === "payment") {
    const fromFilter =
      fromNorm === "pendente"
        ? { in: ["pending", "pendente"] }
        : fromNorm === "confirmado"
          ? { in: ["approved", "confirmado", "recebido"] }
          : fromPersisted;
    const cnt = await prisma.payment.updateMany({
      where: { id: String(input.id), status: fromFilter as any },
      data: { status: persisted },
    });
    if (cnt.count > 0) return { applied: true, conflictAlreadyAtTarget: false };
    const cur = await prisma.payment.findUnique({ where: { id: String(input.id) } });
    const curNorm = cur ? normalizeState("payment", cur.status) : "";
    return {
      applied: false,
      conflictAlreadyAtTarget: curNorm === toNormalized || cur?.status === persisted,
    };
  }

  if (toNormalized === "utilizado") {
    const cnt = await prisma.coupon.updateMany({
      where: { id: String(input.id), used: false },
      data: {
        used: true,
        usedAt: new Date(),
        usedBy: (meta.usedBy as string) || undefined,
      },
    });
    if (cnt.count > 0) return { applied: true, conflictAlreadyAtTarget: false };
    const cur = await prisma.coupon.findUnique({ where: { id: String(input.id) } });
    return { applied: false, conflictAlreadyAtTarget: Boolean(cur?.used) };
  }
  if (toNormalized === "cancelado") {
    const cnt = await prisma.coupon.updateMany({
      where: { id: String(input.id), userRemovedAt: null },
      data: { userRemovedAt: new Date() },
    });
    return {
      applied: cnt.count > 0,
      conflictAlreadyAtTarget: cnt.count === 0,
    };
  }
  if (toNormalized === "expirado") {
    return { applied: true, conflictAlreadyAtTarget: false };
  }
  return { applied: true, conflictAlreadyAtTarget: false };
}

/**
 * Porta única de alteração de status.
 */
export async function transition(input: TransitionInput): Promise<TransitionResult> {
  const loaded = await loadCurrentStatus(input.entity, input.id);
  if (!loaded) {
    return fail(`${input.entity} não encontrado`, 404, "NOT_FOUND");
  }

  const from = normalizeState(input.entity, input.from ?? loaded.status);
  const to = normalizeState(input.entity, input.to);

  if (input.entity === "service" && (to === "concluido" || to === "entrega")) {
    const aptId = (loaded.raw as { appointmentId?: number | null }).appointmentId;
    if (aptId == null) {
      return fail(
        "Este serviço não está vinculado a um agendamento; não é possível concluir com entrega aqui.",
        400,
        "VALIDATION"
      );
    }
  }

  if (from === to || normalizeState(input.entity, loaded.status) === to) {
    const event = buildDomainEvent(input, from, to);
    return {
      ok: true,
      alreadyProcessed: true,
      from,
      to,
      event,
      entityId: String(input.id),
    };
  }

  try {
    assertTransitionAllowed(input.entity, from, to);
  } catch (e: any) {
    return fail(e.message || `Transição inválida: ${from} → ${to}`, 409, "INVALID_TRANSITION");
  }

  if (!isTransitionAllowed(input.entity, from, to)) {
    return fail(
      `Transição inválida: ${input.entity} ${from} → ${to}`,
      409,
      "INVALID_TRANSITION"
    );
  }

  let persistResult: { applied: boolean; conflictAlreadyAtTarget: boolean };
  try {
    persistResult = await persistStatus(input, loaded.status, to);
  } catch (e: any) {
    return fail(e.message || "Falha ao persistir", e.httpStatus || 500, e.code || "ERROR");
  }

  if (!persistResult.applied) {
    if (persistResult.conflictAlreadyAtTarget) {
      const event = buildDomainEvent(input, from, to);
      return {
        ok: true,
        alreadyProcessed: true,
        from,
        to,
        event,
        entityId: String(input.id),
      };
    }
    return fail("Estado mudou concorrentemente. Atualize e tente novamente.", 409, "CONFLICT");
  }

  const event = buildDomainEvent(input, from, to);
  emitDomainEvent(event);
  await recordTransitionHistory(event);
  // SYNC-01A — fan-out oficial após persistência válida (não republica em alreadyProcessed)
  try {
    const { publishFromDomainEvent } = await import("@/app/lib/synchronization/engine");
    await publishFromDomainEvent(event);
  } catch (syncErr) {
    console.error("[transition] Synchronization Engine publish failed (non-fatal):", syncErr);
  }

  if (!input.skipEffects) {
    const plan = await planTransitionEffects(event);
    for (const cascade of plan.cascades) {
      await transition(cascade);
    }
    if (plan.after) await plan.after();
  }

  // Reabertura: garantir Services
  if (
    input.entity === "appointment" &&
    to === "aceito" &&
    (from === "cancelado" || from === "remarcado")
  ) {
    const idNum = typeof input.id === "number" ? input.id : parseInt(String(input.id), 10);
    await ensureServicesForAppointment(idNum);
  }

  return {
    ok: true,
    from,
    to: toPersistedState(input.entity, to),
    event,
    entityId: String(input.id),
  };
}
