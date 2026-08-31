-- AlterTable
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "deliveryAudioUrl" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "deliveryAudioFormat" TEXT;
