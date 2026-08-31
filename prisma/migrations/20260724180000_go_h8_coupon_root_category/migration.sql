-- GO-H8: categorias de cupom, Pedido Raiz e cadeia de remarcações
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "couponCategory" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "rootPaymentId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "parentCouponId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "originAppointmentId" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

CREATE INDEX IF NOT EXISTS "Coupon_couponCategory_idx" ON "Coupon"("couponCategory");
CREATE INDEX IF NOT EXISTS "Coupon_rootPaymentId_idx" ON "Coupon"("rootPaymentId");
CREATE INDEX IF NOT EXISTS "Coupon_parentCouponId_idx" ON "Coupon"("parentCouponId");
CREATE INDEX IF NOT EXISTS "Coupon_originAppointmentId_idx" ON "Coupon"("originAppointmentId");

-- Backfill: origem de remarcação (antes appointmentId era sobrescrito no resgate)
UPDATE "Coupon"
SET "originAppointmentId" = "appointmentId"
WHERE "originAppointmentId" IS NULL
  AND "appointmentId" IS NOT NULL
  AND ("couponType" IN ('remarcacao', 'reembolso', 'REBOOK', 'REFUND') OR "used" = false);

UPDATE "Coupon"
SET "rootPaymentId" = "paymentId"
WHERE "rootPaymentId" IS NULL AND "paymentId" IS NOT NULL;

-- Categorias a partir do tipo/serviço
UPDATE "Coupon"
SET "couponCategory" = 'reembolso'
WHERE "couponCategory" IS NULL
  AND "couponType" IN ('remarcacao', 'reembolso', 'REBOOK', 'REFUND');

UPDATE "Coupon"
SET "couponCategory" = 'plano'
WHERE "couponCategory" IS NULL
  AND "couponType" IN ('plano', 'PLAN')
  AND "discountType" = 'service';

UPDATE "Coupon"
SET "couponCategory" = 'desconto'
WHERE "couponCategory" IS NULL
  AND (
    "couponType" IN ('desconto', 'DISCOUNT')
    OR "discountType" IN ('percent', 'fixed')
  );

UPDATE "Coupon"
SET "couponCategory" = 'servico'
WHERE "couponCategory" IS NULL
  AND "serviceType" IN ('sessao', 'captacao');

UPDATE "Coupon"
SET "couponCategory" = 'producao'
WHERE "couponCategory" IS NULL
  AND (
    "serviceType" IN ('mix', 'master', 'sonoplastia', 'beat1', 'beat2', 'beat3', 'beat4', 'beat_mix_master', 'mix_master', 'producao_completa')
    OR "serviceType" LIKE 'beat%'
  );

UPDATE "Coupon"
SET "couponCategory" = 'servico'
WHERE "couponCategory" IS NULL;
