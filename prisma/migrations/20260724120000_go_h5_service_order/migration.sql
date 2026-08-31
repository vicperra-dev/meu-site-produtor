-- GO-H5: Ordem de Serviço (entidade operacional central)
CREATE TABLE IF NOT EXISTS "ServiceOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "commercialSource" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'awaiting_schedule',
    "paymentId" TEXT,
    "couponId" TEXT,
    "appointmentId" INTEGER,
    "dependsOnOrderId" TEXT,
    "sequenceIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceOrder_couponId_key" ON "ServiceOrder"("couponId");
CREATE INDEX IF NOT EXISTS "ServiceOrder_userId_idx" ON "ServiceOrder"("userId");
CREATE INDEX IF NOT EXISTS "ServiceOrder_paymentId_idx" ON "ServiceOrder"("paymentId");
CREATE INDEX IF NOT EXISTS "ServiceOrder_serviceType_idx" ON "ServiceOrder"("serviceType");
CREATE INDEX IF NOT EXISTS "ServiceOrder_phase_idx" ON "ServiceOrder"("phase");
CREATE INDEX IF NOT EXISTS "ServiceOrder_appointmentId_idx" ON "ServiceOrder"("appointmentId");
CREATE INDEX IF NOT EXISTS "ServiceOrder_commercialSource_idx" ON "ServiceOrder"("commercialSource");

DO $$ BEGIN
  ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
