-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BlockedTimeSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_BlockedTimeSlot" ("createdAt", "data", "hora", "id") SELECT "createdAt", "data", "hora", "id" FROM "BlockedTimeSlot";
DROP TABLE "BlockedTimeSlot";
ALTER TABLE "new_BlockedTimeSlot" RENAME TO "BlockedTimeSlot";
CREATE INDEX "BlockedTimeSlot_data_idx" ON "BlockedTimeSlot"("data");
CREATE INDEX "BlockedTimeSlot_ativo_idx" ON "BlockedTimeSlot"("ativo");
CREATE UNIQUE INDEX "BlockedTimeSlot_data_hora_key" ON "BlockedTimeSlot"("data", "hora");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
