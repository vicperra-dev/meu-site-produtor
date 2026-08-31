-- GO-H10B: ponteiro do ciclo mensal de benefícios do plano
ALTER TABLE "UserPlan" ADD COLUMN IF NOT EXISTS "lastBenefitCycleAt" TIMESTAMP(3);
