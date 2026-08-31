/**
 * HS-03A — Domain Service único.
 * Perguntas de pertencimento, status e capacidades — sem lógica espalhada em telas.
 */

import { prisma } from "@/app/lib/prisma";
import {
  ACTIVE_OPERATIONAL_SERVICE_STATUSES,
  TERMINAL_APPOINTMENT_STATUSES,
  TERMINAL_SERVICE_STATUSES,
  deriveAppointmentStatusFromServiceStatuses,
  isOpenServiceStatus,
  type ServiceStatus,
} from "@/app/lib/domain/statuses";
import {
  resolveCanonicalCouponType,
  type CanonicalCouponType,
  type CouponTypeInput,
} from "@/app/lib/domain/coupon-types";

export type DomainErrorCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "FORBIDDEN"
  | "CONFLICT"
  | "VALIDATION";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly httpStatus: number = 400
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export type TransitionAction =
  | "approve"
  | "reject"
  | "cancel"
  | "start"
  | "complete"
  | "deliver"
  | "rebook"
  | "refund"
  | "revert_cancel"
  | "generate_coupon";

function appointmentIdsFromPayment(payment: {
  appointmentId?: number | null;
  appointmentIds?: unknown;
}): number[] {
  const ids = new Set<number>();
  if (payment.appointmentId != null && Number.isFinite(payment.appointmentId)) {
    ids.add(Number(payment.appointmentId));
  }
  const raw = payment.appointmentIds;
  if (Array.isArray(raw)) {
    for (const v of raw) {
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      if (Number.isFinite(n)) ids.add(n);
    }
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const v of parsed) {
          const n = typeof v === "number" ? v : parseInt(String(v), 10);
          if (Number.isFinite(n)) ids.add(n);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return [...ids];
}

export async function getPaymentForAppointment(appointmentId: number) {
  const byDirect = await prisma.payment.findFirst({
    where: { appointmentId, status: "approved" },
    orderBy: { createdAt: "desc" },
  });
  if (byDirect) return byDirect;

  const candidates = await prisma.payment.findMany({
    where: { type: "agendamento", status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    candidates.find((p) => appointmentIdsFromPayment(p).includes(appointmentId)) || null
  );
}

export async function getAppointmentsForPayment(paymentId: string): Promise<number[]> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { appointmentId: true, appointmentIds: true },
  });
  if (!payment) return [];
  return appointmentIdsFromPayment(payment);
}

export async function getServicesForAppointment(appointmentId: number) {
  return prisma.service.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAppointmentForService(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { appointmentId: true, appointment: true },
  });
  return service?.appointment ?? null;
}

export async function getOperationalStatusForAppointment(appointmentId: number): Promise<{
  adminStatus: string;
  operationalStatus: string;
  serviceStatuses: string[];
  derivedAdminStatus: string | null;
}> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { status: true },
  });
  if (!apt) {
    throw new DomainError("NOT_FOUND", "Agendamento não encontrado", 404);
  }
  const services = await getServicesForAppointment(appointmentId);
  const serviceStatuses = services.map((s) => s.status);
  const derived = deriveAppointmentStatusFromServiceStatuses(apt.status, serviceStatuses);

  let operationalStatus = apt.status;
  if (serviceStatuses.length > 0) {
    if (serviceStatuses.every((s) => s === "concluido")) operationalStatus = "concluido";
    else if (serviceStatuses.some((s) => s === "em_andamento")) operationalStatus = "em_andamento";
    else if (serviceStatuses.some((s) => s === "aceito")) operationalStatus = "aceito";
    else if (serviceStatuses.every((s) => s === "cancelado" || s === "recusado")) {
      operationalStatus = serviceStatuses.some((s) => s === "recusado") ? "recusado" : "cancelado";
    } else if (serviceStatuses.some((s) => s === "pendente")) operationalStatus = "pendente";
  }

  return {
    adminStatus: apt.status,
    operationalStatus,
    serviceStatuses,
    derivedAdminStatus: derived,
  };
}

export function resolveCouponOwnerHints(coupon: CouponTypeInput & {
  assignedUserId?: string | null;
  usedBy?: string | null;
}): {
  canonicalType: CanonicalCouponType;
  hasOwner: boolean;
} {
  const canonicalType = resolveCanonicalCouponType(coupon);
  const hasOwner = Boolean(
    coupon.assignedUserId ||
      coupon.usedBy ||
      coupon.paymentId ||
      coupon.userPlanId ||
      coupon.appointmentId
  );
  return { canonicalType, hasOwner };
}

export function getNextValidAppointmentTransitions(status: string): TransitionAction[] {
  switch (status) {
    case "pendente":
      return ["approve", "reject", "cancel"];
    case "aceito":
    case "confirmado":
      return ["start", "cancel", "refund", "rebook"];
    case "em_andamento":
      return ["cancel", "complete", "deliver", "refund"];
    case "cancelado":
      return ["revert_cancel", "generate_coupon"];
    case "concluido":
    case "recusado":
      return [];
    default:
      return [];
  }
}

export function getNextValidServiceTransitions(status: string): TransitionAction[] {
  switch (status) {
    case "pendente":
      return ["approve", "reject", "cancel", "start"];
    case "aceito":
      return ["start", "cancel", "complete", "deliver"];
    case "em_andamento":
      return ["complete", "deliver", "cancel"];
    case "concluido":
    case "cancelado":
    case "recusado":
      return [];
    default:
      return [];
  }
}

export function canCancelAppointment(status: string, actor: "admin" | "user"): boolean {
  if (TERMINAL_APPOINTMENT_STATUSES.has(status) && status !== "concluido") {
    return status === "cancelado" ? false : false;
  }
  if (status === "concluido") return false;
  if (actor === "admin") {
    return status !== "cancelado" && status !== "recusado";
  }
  return status === "aceito" || status === "confirmado" || status === "em_andamento";
}

export function canApproveAppointment(status: string): boolean {
  return status === "pendente";
}

export function canRejectAppointment(status: string): boolean {
  return status === "pendente";
}

export function canStartService(status: string): boolean {
  return status === "pendente" || status === "aceito";
}

export function canCompleteService(status: string): boolean {
  return status === "aceito" || status === "em_andamento" || status === "pendente";
}

export function canDeliverService(status: string): boolean {
  return canCompleteService(status);
}

export function canRebookAppointment(status: string): boolean {
  return status === "cancelado" || status === "recusado";
}

export function canGenerateCouponFromAppointment(status: string): boolean {
  return status === "cancelado";
}

export function isSelectedOperationalService(status: string): boolean {
  return ACTIVE_OPERATIONAL_SERVICE_STATUSES.has(status);
}

export function isGeneralServicesInclusive(_status: string): boolean {
  return true;
}

export function summarizeServiceWorkload(statuses: string[]): {
  active: number;
  completed: number;
  cancelledLike: number;
  open: number;
} {
  return {
    active: statuses.filter((s) => ACTIVE_OPERATIONAL_SERVICE_STATUSES.has(s)).length,
    completed: statuses.filter((s) => s === "concluido").length,
    cancelledLike: statuses.filter((s) => s === "cancelado" || s === "recusado").length,
    open: statuses.filter((s) => isOpenServiceStatus(s)).length,
  };
}

export function assertServiceTransition(
  from: string,
  to: ServiceStatus
): void {
  if (from === to) return;
  if (TERMINAL_SERVICE_STATUSES.has(from) && to !== from) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `Service em estado terminal (${from}) não pode ir para ${to}`
    );
  }
  if (to === "em_andamento" && from !== "pendente" && from !== "aceito" && from !== "em_andamento") {
    throw new DomainError(
      "INVALID_TRANSITION",
      `Não é possível iniciar serviço a partir de ${from}`
    );
  }
  if (to === "concluido" && TERMINAL_SERVICE_STATUSES.has(from) && from !== "concluido") {
    throw new DomainError(
      "INVALID_TRANSITION",
      `Não é possível concluir serviço a partir de ${from}`
    );
  }
}
