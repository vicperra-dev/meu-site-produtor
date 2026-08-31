-- HS-01: Service.appointmentId FK + CPF unique
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "appointmentId" INTEGER;

CREATE INDEX IF NOT EXISTS "Service_appointmentId_idx" ON "Service"("appointmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Service_appointmentId_fkey'
  ) THEN
    ALTER TABLE "Service"
      ADD CONSTRAINT "Service_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_cpf_key" ON "User"("cpf");
