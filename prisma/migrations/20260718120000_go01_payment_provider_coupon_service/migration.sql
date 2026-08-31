-- GO-01.1 — Payment gateway identity (provider + providerPaymentId) + Coupon → Service FK
-- Aplicar com: npx prisma migrate deploy
-- NUNCA usar prisma db push em produção / preview / homologação.

-- Payment: identidade canônica multi-gateway (OP-02B / F9)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_provider_idx" ON "Payment"("provider");
CREATE INDEX IF NOT EXISTS "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");

-- Coupon: vínculo ao Service no resgate (OP-02A)
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
CREATE INDEX IF NOT EXISTS "Coupon_serviceId_idx" ON "Coupon"("serviceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Coupon_serviceId_fkey'
  ) THEN
    ALTER TABLE "Coupon"
      ADD CONSTRAINT "Coupon_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
