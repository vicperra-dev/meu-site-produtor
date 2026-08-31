-- Cronômetro operacional de Sessão/Captação (additive, nullable).
-- Serviços existentes permanecem válidos: campos novos ficam NULL.

ALTER TABLE "Service" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "Service" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Service" ADD COLUMN "actualDurationSeconds" INTEGER;
ALTER TABLE "Service" ADD COLUMN "contractedDurationSeconds" INTEGER;
ALTER TABLE "Service" ADD COLUMN "overtimeBasePriceCents" INTEGER;
ALTER TABLE "Service" ADD COLUMN "suggestedOvertimeAmountCents" INTEGER;

CREATE INDEX "Service_startedAt_idx" ON "Service"("startedAt");
CREATE INDEX "Service_completedAt_idx" ON "Service"("completedAt");
