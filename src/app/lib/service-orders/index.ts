/**
 * GO-H5 — Módulo único do domínio operacional (Ordens de Serviço).
 *
 * Produto Comercial → Decomposição → Ordens de Serviço → Agendamento → Execução → Entrega
 */

export {
  COMMERCIAL_PRODUCT_COMPOSITION,
  COMMERCIAL_COMPOSITE_PRODUCT_IDS,
  COMMERCIAL_PRODUCT_LABELS,
  getCommercialProductComposition,
  isCommercialCompositeProductId,
  // compat
  OFFICIAL_PACKAGE_COMPOSITION,
  PACKAGE_CATALOG_LABELS,
  getOfficialPackageComposition,
  isOfficialPackageId,
  OFFICIAL_PACKAGE_IDS,
} from "@/app/lib/service-orders/composition";

export type { CommercialCompositeProductId, OfficialPackageId } from "@/app/lib/service-orders/composition";

export {
  expandPurchaseToServiceOrders,
  expandLineToAtomicServiceTypes,
  countServiceOrders,
  purchaseOpensImmediateSchedule,
  purchaseEmitsServiceOrderCoupons,
  resolveCommercialProductId,
} from "@/app/lib/service-orders/expand";

export type {
  PurchaseLine,
  ServiceOrderSpec,
  PersistedServiceOrderShape,
} from "@/app/lib/service-orders/expand";

export {
  SERVICE_ORDER_PHASES,
  phaseFromAppointmentStatus,
  phaseOccupiesCalendar,
} from "@/app/lib/service-orders/phases";

export type { ServiceOrderPhase } from "@/app/lib/service-orders/phases";

export {
  SERVICE_ORDER_DEPENDENCY_RULES,
  SERVICE_ORDER_PIPELINE_HINT,
  softDependenciesFor,
  suggestedPipelineRank,
} from "@/app/lib/service-orders/dependencies";

export type { ServiceOrderDependencyRule } from "@/app/lib/service-orders/dependencies";

export {
  createServiceOrdersWithCoupons,
  createServiceOrderForImmediateAppointment,
  syncServiceOrderPhaseFromAppointment,
  linkServiceOrderCouponToAppointment,
} from "@/app/lib/service-orders/persist";
