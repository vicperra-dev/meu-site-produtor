/**
 * HS-02B / HS-03A — Compat layer.
 * Fonte canônica: `@/app/lib/domain`.
 */
export {
  SERVICE_STATUSES,
  type ServiceStatus,
  ACTIVE_OPERATIONAL_SERVICE_STATUSES,
  TERMINAL_SERVICE_STATUSES,
  mapRequestStatusToServiceStatus,
  isOpenServiceStatus,
  parsePaymentMetadataJson,
  deriveAppointmentStatusFromServiceStatuses,
} from "@/app/lib/domain/statuses";
