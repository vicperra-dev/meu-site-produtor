-- CreateTable
CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PasswordResetCode_email_idx" ON "PasswordResetCode"("email");

-- CreateIndex
CREATE INDEX "PasswordResetCode_code_idx" ON "PasswordResetCode"("code");

-- CreateIndex
CREATE INDEX "PasswordResetCode_expiresAt_idx" ON "PasswordResetCode"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetCode_used_idx" ON "PasswordResetCode"("used");
