ALTER TABLE "Coupon" ADD COLUMN "refundRequestedAt" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "refundProcessedAt" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "refundAmount" DOUBLE PRECISION;
ALTER TABLE "Coupon" ADD COLUMN "refundAsaasStatus" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "refundUserConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "refundUserDisputedAt" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "userRemovedAt" TIMESTAMP(3);
