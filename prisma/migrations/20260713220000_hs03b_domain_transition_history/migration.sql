-- HS-03B — DomainTransitionHistory (histórico oficial de transições SM)
CREATE TABLE IF NOT EXISTS "DomainTransitionHistory" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "reason" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainTransitionHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DomainTransitionHistory_entity_entityId_idx" ON "DomainTransitionHistory"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "DomainTransitionHistory_eventName_idx" ON "DomainTransitionHistory"("eventName");
CREATE INDEX IF NOT EXISTS "DomainTransitionHistory_createdAt_idx" ON "DomainTransitionHistory"("createdAt");
