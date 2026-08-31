/**
 * Compat: reexporta composição comercial do módulo Ordens de Serviço (GO-H5).
 * Preferir `@/app/lib/service-orders`.
 */
export {
  COMMERCIAL_PRODUCT_COMPOSITION as OFFICIAL_PACKAGE_COMPOSITION,
  COMMERCIAL_COMPOSITE_PRODUCT_IDS as OFFICIAL_PACKAGE_IDS,
  COMMERCIAL_PRODUCT_LABELS as PACKAGE_CATALOG_LABELS,
  getCommercialProductComposition as getOfficialPackageComposition,
  isCommercialCompositeProductId as isOfficialPackageId,
  COMMERCIAL_PRODUCT_COMPOSITION,
  COMMERCIAL_COMPOSITE_PRODUCT_IDS,
  COMMERCIAL_PRODUCT_LABELS,
  getCommercialProductComposition,
  isCommercialCompositeProductId,
} from "@/app/lib/service-orders/composition";

export type {
  CommercialCompositeProductId as OfficialPackageId,
  CommercialCompositeProductId,
} from "@/app/lib/service-orders/composition";
