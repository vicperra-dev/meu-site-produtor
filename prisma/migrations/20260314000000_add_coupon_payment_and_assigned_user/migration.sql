-- AlterTable: add paymentId and assignedUserId to Coupon (cupons por pagamento de teste e associação manual no admin)
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Coupon_paymentId_idx" ON "Coupon"("paymentId");
CREATE INDEX IF NOT EXISTS "Coupon_assignedUserId_idx" ON "Coupon"("assignedUserId");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
