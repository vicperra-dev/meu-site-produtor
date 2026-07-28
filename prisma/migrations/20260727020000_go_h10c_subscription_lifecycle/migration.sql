-- GO-H10C: campos de ciclo de vida da Assinatura
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cyclesRemaining" INTEGER;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "failureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastFailureAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "gracePeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "rootPaymentId" TEXT;
