/*
  Warnings:

  - You are about to drop the column `role` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedAt` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `closedAt` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `userEmail` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `mercadoPagoId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `chatSessionId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderType` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `ChatSession` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ipAddress` on table `LoginLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userAgent` on table `LoginLog` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `type` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Appointment_data_status_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatSessionId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChatMessage" ("content", "createdAt", "id") SELECT "content", "createdAt", "id" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE INDEX "ChatMessage_chatSessionId_idx" ON "ChatMessage"("chatSessionId");
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");
CREATE TABLE "new_ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "humanRequested" BOOLEAN NOT NULL DEFAULT false,
    "adminAccepted" BOOLEAN NOT NULL DEFAULT false,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChatSession" ("adminAccepted", "createdAt", "humanRequested", "id", "status", "updatedAt", "userId") SELECT "adminAccepted", "createdAt", "humanRequested", "id", "status", "updatedAt", "userId" FROM "ChatSession";
DROP TABLE "ChatSession";
ALTER TABLE "new_ChatSession" RENAME TO "ChatSession";
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");
CREATE INDEX "ChatSession_status_idx" ON "ChatSession"("status");
CREATE INDEX "ChatSession_humanRequested_idx" ON "ChatSession"("humanRequested");
CREATE INDEX "ChatSession_adminAccepted_idx" ON "ChatSession"("adminAccepted");
CREATE TABLE "new_LoginLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LoginLog" ("createdAt", "id", "ipAddress", "success", "userAgent", "userId") SELECT "createdAt", "id", "ipAddress", "success", "userAgent", "userId" FROM "LoginLog";
DROP TABLE "LoginLog";
ALTER TABLE "new_LoginLog" RENAME TO "LoginLog";
CREATE INDEX "LoginLog_userId_idx" ON "LoginLog"("userId");
CREATE INDEX "LoginLog_createdAt_idx" ON "LoginLog"("createdAt");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mercadopagoId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL,
    "planId" TEXT,
    "serviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "currency", "id", "status", "updatedAt", "userId") SELECT "amount", "createdAt", "currency", "id", "status", "updatedAt", "userId" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_mercadopagoId_key" ON "Payment"("mercadopagoId");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_mercadopagoId_idx" ON "Payment"("mercadopagoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FAQ_question_idx" ON "FAQ"("question");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_blocked_idx" ON "User"("blocked");
