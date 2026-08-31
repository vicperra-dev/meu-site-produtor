-- Garantir colunas de cancelamento/leitura em Appointment (evita erro "cancelReason does not exist" em produção)
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelRefundOption" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundProcessedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundCouponId" TEXT;
