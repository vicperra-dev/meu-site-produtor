-- GO-06E: Homologation runs no banco (Vercel/serverless sem disco gravável)
CREATE TABLE IF NOT EXISTS "HomologationRunRecord" (
    "id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomologationRunRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HomologationRunRecord_createdAt_idx" ON "HomologationRunRecord"("createdAt");
CREATE INDEX IF NOT EXISTS "HomologationRunRecord_ok_idx" ON "HomologationRunRecord"("ok");
