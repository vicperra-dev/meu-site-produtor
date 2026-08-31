-- Cupons promocionais de parceria: usos múltiplos, SKUs, domínio, auditoria admin.
-- Preserva cupons existentes: used permanece a fonte de “esgotado”; useCount espelha o legado.

ALTER TABLE "Coupon" ADD COLUMN "maxUses" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN "useCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Coupon" ADD COLUMN "applicableServiceTypes" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "applicableDomain" TEXT NOT NULL DEFAULT 'STUDIO';
ALTER TABLE "Coupon" ADD COLUMN "createdByAdminId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Coupon"
SET
  "useCount" = CASE WHEN "used" THEN 1 ELSE 0 END,
  "maxUses" = 1
WHERE "maxUses" IS NULL;

CREATE INDEX "Coupon_isActive_idx" ON "Coupon"("isActive");
CREATE INDEX "Coupon_createdByAdminId_idx" ON "Coupon"("createdByAdminId");

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_createdByAdminId_fkey"
  FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
