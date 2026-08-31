import { prisma } from "@/app/lib/prisma";
import {
  deriveAppointmentStatusFromServiceStatuses,
} from "@/app/lib/service-authority";
import { transition } from "@/app/lib/domain/state-machine/transition";
import { isTransitionAllowed } from "@/app/lib/domain/state-machine/guards";

/**
 * Espelha o status administrativo do Appointment a partir dos Services.
 * Fonte operacional = Service; Appointment apenas agregação da solicitação.
 * Atualização passa pela State Machine (sem bypass prisma direto).
 */
export async function reconcileAppointmentWithServices(appointmentId: number): Promise<void> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true },
  });
  if (!apt) return;

  const services = await prisma.service.findMany({
    where: { appointmentId },
    select: { status: true },
  });
  if (services.length === 0) return;

  const next = deriveAppointmentStatusFromServiceStatuses(
    apt.status,
    services.map((s) => s.status)
  );
  if (!next || next === apt.status) return;

  if (!isTransitionAllowed("appointment", apt.status, next)) {
    console.warn(
      `[AppointmentSync] Transição espelho bloqueada pela SM: apt ${appointmentId} ${apt.status} → ${next}`
    );
    return;
  }

  const result = await transition({
    entity: "appointment",
    id: appointmentId,
    to: next,
    actor: { type: "system" },
    reason: "reconcileAppointmentWithServices",
    skipEffects: true,
  });

  if (!result.ok) {
    console.warn(
      `[AppointmentSync] Falha ao espelhar apt ${appointmentId}: ${result.error}`
    );
    return;
  }

  console.warn(
    `[AppointmentSync] Agendamento ${appointmentId}: espelho admin "${apt.status}" → "${next}" (derivado de Service via SM).`
  );
}
