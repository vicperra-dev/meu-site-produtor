-- Cria a tabela se ainda não existir (útil quando migrate deploy falha no histórico).
-- Executar: npx prisma db execute --file prisma/ensure_account_deletion_log.sql

CREATE TABLE IF NOT EXISTS "AccountDeletionLog" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountCreatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AccountDeletionLog_deletedAt_idx" ON "AccountDeletionLog"("deletedAt");
