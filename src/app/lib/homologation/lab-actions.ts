/**
 * GO-H6 — Modo Livre: ações admin-only sobre artefatos de Homologação.
 * Não altera regras de negócio; apenas acelera cenários via workflow oficial.
 */
import { prisma } from "@/app/lib/prisma";
import { parseStudioDateTime } from "@/app/lib/calendar-time";
import { hasOperationalTimer } from "@/app/lib/service-timing";
import {
  approveAppointment,
  rejectAppointment,
  startServiceWork,
  startService,
  completeService,
  completeOperationalService,
} from "@/app/lib/domain/workflow";
import { SimulationProvider } from "@/app/lib/payment-provider/simulation-provider";
import { paymentByProviderIdWhere } from "@/app/lib/payment-provider/identity";
import {
  SERVICE_ORDER_PHASES,
  type ServiceOrderPhase,
} from "@/app/lib/service-orders/phases";
import { syncServiceOrderPhaseFromAppointment } from "@/app/lib/service-orders/persist";

export type LabAction =
  | { action: "approve_appointment"; appointmentId: number }
  | { action: "reject_appointment"; appointmentId: number; reason?: string }
  | { action: "start_appointment"; appointmentId: number }
  | {
      action: "set_appointment_datetime";
      appointmentId: number;
      data: string;
      hora?: string;
      duracaoMinutos?: number;
    }
  | { action: "confirm_payment"; providerPaymentId: string }
  | { action: "cancel_payment"; providerPaymentId: string }
  | { action: "set_order_phase"; serviceOrderId: string; phase: ServiceOrderPhase }
  | { action: "start_service"; serviceId: string }
  | { action: "simulate_delivery"; serviceId: string }
  | { action: "advance_order_from_appointment"; appointmentId: number };

export type LabActionResult = {
  ok: boolean;
  action: string;
  detail?: string;
  data?: unknown;
  error?: string;
};

async function assertSimulationAppointment(appointmentId: number): Promise<boolean> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, observacoes: true },
  });
  if (!apt) return false;
  const obs = String(apt.observacoes || "");
  if (
    obs.includes("homo_") ||
    obs.includes("Homologação") ||
    obs.includes("[Homologação]") ||
    obs.includes("simulação")
  ) {
    return true;
  }
  const order = await prisma.serviceOrder.findFirst({
    where: { appointmentId },
    include: { payment: { select: { provider: true, providerPaymentId: true } } },
  });
  if (order?.payment) {
    const p = String(order.payment.provider || "").toUpperCase();
    const pid = String(order.payment.providerPaymentId || "");
    if (p === "SIMULATION" || pid.startsWith("sim_pay_")) return true;
  }
  const pay = await prisma.payment.findFirst({
    where: { appointmentId },
    select: { provider: true, providerPaymentId: true },
  });
  if (pay) {
    const p = String(pay.provider || "").toUpperCase();
    const pid = String(pay.providerPaymentId || "");
    if (p === "SIMULATION" || pid.startsWith("sim_pay_")) return true;
  }
  return false;
}

async function assertSimulationPayment(providerPaymentId: string): Promise<boolean> {
  if (providerPaymentId.startsWith("sim_pay_")) return true;
  const local = await prisma.payment.findFirst({
    where: paymentByProviderIdWhere(providerPaymentId),
    select: { provider: true, providerPaymentId: true },
  });
  if (!local) {
    const meta = await prisma.paymentMetadata.findFirst({
      where: { asaasId: providerPaymentId },
    });
    return Boolean(meta);
  }
  return (
    String(local.provider || "").toUpperCase() === "SIMULATION" ||
    String(local.providerPaymentId || "").startsWith("sim_pay_")
  );
}

async function assertSimulationOrder(serviceOrderId: string): Promise<boolean> {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: serviceOrderId },
    include: { payment: { select: { provider: true, providerPaymentId: true } } },
  });
  if (!order) return false;
  if (order.payment) {
    const p = String(order.payment.provider || "").toUpperCase();
    const pid = String(order.payment.providerPaymentId || "");
    if (p === "SIMULATION" || pid.startsWith("sim_pay_")) return true;
  }
  if (order.appointmentId) return assertSimulationAppointment(order.appointmentId);
  return false;
}

async function assertSimulationService(serviceId: string): Promise<boolean> {
  const svc = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { appointmentId: true },
  });
  if (!svc?.appointmentId) return false;
  return assertSimulationAppointment(svc.appointmentId);
}

export async function runLabAction(
  input: LabAction,
  actorUserId: string
): Promise<LabActionResult> {
  const actor = { type: "admin" as const, id: actorUserId };

  try {
    switch (input.action) {
      case "approve_appointment": {
        if (!(await assertSimulationAppointment(input.appointmentId))) {
          return {
            ok: false,
            action: input.action,
            error: "Agendamento não é de Homologação/Simulation.",
          };
        }
        const r = await approveAppointment(input.appointmentId, "aceito", actor);
        if (!r.ok) return { ok: false, action: input.action, error: r.error };
        return {
          ok: true,
          action: input.action,
          detail: `Appointment #${input.appointmentId} aceito`,
          data: r.data,
        };
      }
      case "reject_appointment": {
        if (!(await assertSimulationAppointment(input.appointmentId))) {
          return {
            ok: false,
            action: input.action,
            error: "Agendamento não é de Homologação/Simulation.",
          };
        }
        const r = await rejectAppointment(
          input.appointmentId,
          input.reason || "Recusa Homologação (Modo Livre)",
          actor
        );
        if (!r.ok) return { ok: false, action: input.action, error: r.error };
        return {
          ok: true,
          action: input.action,
          detail: `Appointment #${input.appointmentId} recusado`,
          data: r.data,
        };
      }
      case "start_appointment": {
        if (!(await assertSimulationAppointment(input.appointmentId))) {
          return {
            ok: false,
            action: input.action,
            error: "Agendamento não é de Homologação/Simulation.",
          };
        }
        const r = await startServiceWork(input.appointmentId, actor);
        if (!r.ok) return { ok: false, action: input.action, error: r.error };
        return {
          ok: true,
          action: input.action,
          detail: `Appointment #${input.appointmentId} em andamento`,
          data: r.data,
        };
      }
      case "set_appointment_datetime": {
        if (!(await assertSimulationAppointment(input.appointmentId))) {
          return {
            ok: false,
            action: input.action,
            error: "Agendamento não é de Homologação/Simulation.",
          };
        }
        const hora = input.hora || "14:00";
        let data: Date;
        try {
          data = parseStudioDateTime(input.data, hora);
        } catch {
          return { ok: false, action: input.action, error: "Data/hora inválida." };
        }
        const updated = await prisma.appointment.update({
          where: { id: input.appointmentId },
          data: {
            data,
            ...(input.duracaoMinutos ? { duracaoMinutos: input.duracaoMinutos } : {}),
          },
        });
        // Reanexa marcador de homologação se sumiu
        const obs = String(updated.observacoes || "");
        if (!obs.includes("Homologação") && !obs.includes("homo_")) {
          await prisma.appointment.update({
            where: { id: input.appointmentId },
            data: {
              observacoes: `${obs ? `${obs} · ` : ""}[Homologação] data ajustada no Modo Livre`,
            },
          });
        }
        return {
          ok: true,
          action: input.action,
          detail: `Appointment #${input.appointmentId} → ${input.data} ${hora}`,
          data: { id: input.appointmentId, data: data.toISOString() },
        };
      }
      case "confirm_payment": {
        if (!(await assertSimulationPayment(input.providerPaymentId))) {
          return {
            ok: false,
            action: input.action,
            error: "Pagamento não é SimulationProvider.",
          };
        }
        const provider = new SimulationProvider();
        const webhook = await provider.confirmPayment(input.providerPaymentId);
        return {
          ok: Boolean(webhook.success || webhook.received),
          action: input.action,
          detail: webhook.error || "confirmPayment executado",
          data: webhook,
        };
      }
      case "cancel_payment": {
        if (!(await assertSimulationPayment(input.providerPaymentId))) {
          return {
            ok: false,
            action: input.action,
            error: "Pagamento não é SimulationProvider.",
          };
        }
        const provider = new SimulationProvider();
        const snap = await provider.cancelPayment(input.providerPaymentId);
        return {
          ok: true,
          action: input.action,
          detail: `status=${snap.status}`,
          data: snap,
        };
      }
      case "set_order_phase": {
        if (!(await assertSimulationOrder(input.serviceOrderId))) {
          return {
            ok: false,
            action: input.action,
            error: "Ordem não é de Homologação/Simulation.",
          };
        }
        if (!SERVICE_ORDER_PHASES.includes(input.phase)) {
          return { ok: false, action: input.action, error: `Fase inválida: ${input.phase}` };
        }
        const updated = await prisma.serviceOrder.update({
          where: { id: input.serviceOrderId },
          data: { phase: input.phase },
        });
        return {
          ok: true,
          action: input.action,
          detail: `Ordem ${input.serviceOrderId} → ${input.phase}`,
          data: updated,
        };
      }
      case "start_service": {
        if (!(await assertSimulationService(input.serviceId))) {
          return {
            ok: false,
            action: input.action,
            error: "Serviço não é de Homologação/Simulation.",
          };
        }
        const r = await startService(input.serviceId, actor);
        if (!r.ok) return { ok: false, action: input.action, error: r.error };
        return {
          ok: true,
          action: input.action,
          detail: `Service ${input.serviceId} em andamento`,
          data: r.data,
        };
      }
      case "simulate_delivery": {
        if (!(await assertSimulationService(input.serviceId))) {
          return {
            ok: false,
            action: input.action,
            error: "Serviço não é de Homologação/Simulation.",
          };
        }
        const current = await prisma.service.findUnique({
          where: { id: input.serviceId },
          select: { tipo: true },
        });
        const url = `homologation/lab-delivery/${input.serviceId}.wav`;
        const r = hasOperationalTimer(current?.tipo)
          ? await completeOperationalService({ serviceId: input.serviceId, actor })
          : await completeService({
              serviceId: input.serviceId,
              deliveryAudioUrl: url,
              deliveryAudioFormat: "wav",
              probe: true,
              actor,
            });
        if (!r.ok) return { ok: false, action: input.action, error: r.error };
        return {
          ok: true,
          action: input.action,
          detail: `Entrega simulada ${input.serviceId}`,
          data: r.data,
        };
      }
      case "advance_order_from_appointment": {
        if (!(await assertSimulationAppointment(input.appointmentId))) {
          return {
            ok: false,
            action: input.action,
            error: "Agendamento não é de Homologação/Simulation.",
          };
        }
        const apt = await prisma.appointment.findUnique({
          where: { id: input.appointmentId },
          select: { status: true },
        });
        if (!apt) return { ok: false, action: input.action, error: "Agendamento não encontrado." };
        await syncServiceOrderPhaseFromAppointment({
          appointmentId: input.appointmentId,
          appointmentStatus: apt.status,
        });
        return {
          ok: true,
          action: input.action,
          detail: `Fases sincronizadas a partir do appointment #${input.appointmentId}`,
        };
      }
      default:
        return { ok: false, action: "unknown", error: "Ação desconhecida." };
    }
  } catch (e: unknown) {
    return {
      ok: false,
      action: (input as { action: string }).action,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
