-- CreateTable
CREATE TABLE "AccountDeletionLog" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountCreatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountDeletionLog_deletedAt_idx" ON "AccountDeletionLog"("deletedAt");
