-- Cupons de pagamento de agendamento que ficaram gravados como plano.
UPDATE "Coupon"
SET "couponType" = 'agendamento'
WHERE "paymentId" IS NOT NULL
  AND "userPlanId" IS NULL
  AND LOWER("couponType") = 'plano';
