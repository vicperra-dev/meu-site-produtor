/**
 * GO-H5 — Composição comercial → serviços atômicos (Ordens de Serviço).
 * Produtos compostos (ex.: "Mix + Master") existem só na vitrine;
 * após o pagamento o domínio opera apenas com tipos atômicos.
 */

/** Tipos atômicos liberados por uma unidade de cada produto composto. */
export const COMMERCIAL_PRODUCT_COMPOSITION = {
  mix_master: ["mix", "master"],
  beat2: ["beat1", "beat1"],
  beat3: ["beat1", "beat1", "beat1"],
  beat4: ["beat1", "beat1", "beat1", "beat1"],
  beat_mix_master: ["beat1", "mix", "master"],
  /**
   * Produção Completa:
   * 2h Sessão + 2h Captação + 1 Beat + 1 Mixagem + 1 Masterização
   */
  producao_completa: ["sessao", "sessao", "captacao", "captacao", "beat1", "mix", "master"],
} as const satisfies Record<string, readonly string[]>;

export type CommercialCompositeProductId = keyof typeof COMMERCIAL_PRODUCT_COMPOSITION;

export const COMMERCIAL_COMPOSITE_PRODUCT_IDS = Object.keys(
  COMMERCIAL_PRODUCT_COMPOSITION
) as CommercialCompositeProductId[];

/** Descrição comercial alinhada à composição operacional. */
export const COMMERCIAL_PRODUCT_LABELS: Partial<
  Record<CommercialCompositeProductId, string>
> = {
  mix_master: "Mix + Master",
  beat2: "2 Beats",
  beat3: "3 Beats",
  beat4: "4 Beats",
  beat_mix_master: "Beat + Mix + Master",
  producao_completa:
    "Produção Completa (2h Sessão + 2h Captação + Beat + Mix + Master)",
};

export function getCommercialProductComposition(
  productId: string
): readonly string[] | null {
  const entry =
    COMMERCIAL_PRODUCT_COMPOSITION[productId as CommercialCompositeProductId];
  return entry ?? null;
}

export function isCommercialCompositeProductId(
  id: string
): id is CommercialCompositeProductId {
  return id in COMMERCIAL_PRODUCT_COMPOSITION;
}

/** @deprecated Use COMMERCIAL_PRODUCT_COMPOSITION */
export const OFFICIAL_PACKAGE_COMPOSITION = COMMERCIAL_PRODUCT_COMPOSITION;
/** @deprecated Use CommercialCompositeProductId */
export type OfficialPackageId = CommercialCompositeProductId;
/** @deprecated Use COMMERCIAL_COMPOSITE_PRODUCT_IDS */
export const OFFICIAL_PACKAGE_IDS = COMMERCIAL_COMPOSITE_PRODUCT_IDS;
/** @deprecated Use COMMERCIAL_PRODUCT_LABELS */
export const PACKAGE_CATALOG_LABELS = COMMERCIAL_PRODUCT_LABELS;
/** @deprecated Use getCommercialProductComposition */
export const getOfficialPackageComposition = getCommercialProductComposition;
/** @deprecated Use isCommercialCompositeProductId */
export const isOfficialPackageId = isCommercialCompositeProductId;
