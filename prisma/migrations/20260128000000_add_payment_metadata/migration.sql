-- CreateTable (IF NOT EXISTS for idempotency when migration was partially applied)
CREATE TABLE IF NOT EXISTS "PaymentMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "asaasId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentMetadata_userId_idx" ON "PaymentMetadata"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMetadata_asaasId_key" ON "PaymentMetadata"("asaasId");
CREATE INDEX IF NOT EXISTS "PaymentMetadata_expiresAt_idx" ON "PaymentMetadata"("expiresAt");
