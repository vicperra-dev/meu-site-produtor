-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "adminArchivedAt" TIMESTAMP(3),
ADD COLUMN "adminArchivedReason" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_adminArchivedAt_idx" ON "Appointment"("adminArchivedAt");
