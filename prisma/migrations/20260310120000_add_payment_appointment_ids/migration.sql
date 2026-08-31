-- AlterTable
-- Coluna opcional para carrinho (múltiplos agendamentos por pagamento)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "appointmentIds" JSONB;
