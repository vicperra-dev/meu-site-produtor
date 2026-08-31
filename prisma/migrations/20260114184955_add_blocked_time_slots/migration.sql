-- CreateTable
CREATE TABLE "BlockedTimeSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BlockedTimeSlot_data_idx" ON "BlockedTimeSlot"("data");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedTimeSlot_data_hora_key" ON "BlockedTimeSlot"("data", "hora");
