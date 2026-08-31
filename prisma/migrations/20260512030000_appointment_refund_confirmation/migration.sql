ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundAsaasStatus" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundUserConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundUserDisputedAt" TIMESTAMP(3);
