-- AlterTable
-- Colunas de cancelamento e leitura em Appointment (evita erro 500 no webhook e nas páginas que usam agendamentos).
-- PostgreSQL: use npx prisma migrate deploy. Se o lock for sqlite, altere prisma/migrations/migration_lock.toml para provider = "postgresql" ou rode o SQL manualmente no banco.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelRefundOption" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundProcessedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundCouponId" TEXT;
