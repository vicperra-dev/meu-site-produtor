-- GO-H12 — Central de notificações da conta
CREATE TABLE IF NOT EXISTS "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionLabel" TEXT,
    "actionHref" TEXT,
    "appointmentId" INTEGER,
    "serviceId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserNotification_dedupeKey_key" ON "UserNotification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserNotification_userId_readAt_idx" ON "UserNotification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "UserNotification_appointmentId_idx" ON "UserNotification"("appointmentId");
CREATE INDEX IF NOT EXISTS "UserNotification_type_idx" ON "UserNotification"("type");

ALTER TABLE "UserNotification"
  ADD CONSTRAINT "UserNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
