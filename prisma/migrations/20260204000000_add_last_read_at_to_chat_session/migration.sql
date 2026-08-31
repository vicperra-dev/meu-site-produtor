-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "lastReadAt" TIMESTAMP(3);
