/**
 * Constantes e textos compartilhados entre /agendamento e /agendamento/cupom/[codigo].
 */
import { isSchedulableServiceType } from "@/app/lib/service-catalog";
import {
  OPERATIONAL_HOURS,
  PRODUCTION_DELIVERY_HOUR,
  minScheduleDateIsoStudio,
} from "@/app/lib/calendar-day-state";

export const SCHEDULE_HORARIOS = OPERATIONAL_HOURS;

export { OPERATIONAL_HOURS, PRODUCTION_DELIVERY_HOUR };

/** Texto obrigatório acima do calendário para serviços de produção (sem horários). */
export const PRODUCTION_DELIVERY_DATE_MESSAGE =
  "Selecione a data em que deseja receber o material final. Esta data representa a entrega desejada. Após o envio da solicitação, a equipe analisará a disponibilidade e confirmará ou ajustará essa data conforme a capacidade de produção.";

export function serviceNeedsStudioHours(
  serviceType?: string | null,
  serviceName?: string | null
): boolean {
  return isSchedulableServiceType(serviceType, serviceName);
}

export function minScheduleDateIso(daysAhead = 0): string {
  return minScheduleDateIsoStudio(daysAhead);
}
