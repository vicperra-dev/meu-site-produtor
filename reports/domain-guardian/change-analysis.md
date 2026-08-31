# Domain Change Analysis

**Branch:** main
**HEAD:** fd9ff6d
**Último commit:** fd9ff6d55b8727164c8394422decd26cb47734a5
**Autor:** Victor Pereira <tremv03021@gmail.com>
**Data:** Mon May 4 08:07:33 2026 -0300
**Mensagem:** hardening completo sistema: cupons, webhook, idempotencia, sync e validações finais

## Contexto Git

### git status --porcelain

```
 M .gitignore
 M package.json
 M prisma/schema.prisma
 M src/app/admin/agendamentos/page.tsx
 M src/app/admin/estatisticas/page.tsx
 M src/app/admin/layout.tsx
 M src/app/admin/pagamentos/page.tsx
 M src/app/admin/page.tsx
 M src/app/admin/planos/page.tsx
 M src/app/admin/servicos-aceitos/page.tsx
 M src/app/admin/servicos-solicitados/page.tsx
 M src/app/admin/usuarios/page.tsx
 M src/app/agendamento/page.tsx
 M src/app/api/admin/agendamentos/reverter-cancelamento/route.ts
 M src/app/api/admin/agendamentos/route.ts
 M src/app/api/admin/cupons/liberar/route.ts
 M src/app/api/admin/cupons/route.ts
 M src/app/api/admin/pagamentos/route.ts
 M src/app/api/admin/planos/excluir-cancelados/route.ts
 M src/app/api/admin/planos/route.ts
 M src/app/api/admin/reprocessar-pagamento-teste/route.ts
 M src/app/api/admin/servicos/route.ts
 M src/app/api/admin/stats/detalhadas/route.ts
 M src/app/api/admin/stats/route.ts
 M src/app/api/admin/usuarios/route.ts
 M src/app/api/agendamentos/cancelar/route.ts
 M src/app/api/agendamentos/com-cupom/route.ts
 M src/app/api/agendamentos/escolher-reembolso/route.ts
 M src/app/api/asaas/checkout-agendamento/route.ts
 M src/app/api/asaas/checkout-carrinho/route.ts
 M src/app/api/asaas/checkout/route.ts
 M src/app/api/conta/route.ts
 M src/app/api/conta/update/route.ts
 M src/app/api/coupons/validate/route.ts
 M src/app/api/cupons/renunciar/route.ts
 M src/app/api/esqueci-senha/route.ts
 M src/app/api/login/route.ts
 M src/app/api/me/route.ts
 M src/app/api/meus-dados/route.ts
 M src/app/api/meus-dados/vincular-cupons-teste/route.ts
 M src/app/api/planos/cancelar/route.ts
 M src/app/api/planos/excluir/route.ts
 M src/app/api/planos/solicitar-reembolso/route.ts
 M src/app/api/test-payment/route.ts
 M src/app/api/trocar-senha/route.ts
 M src/app/api/verificar-codigo/route.ts
 M src/app/api/webhooks/asaas/route.ts
 M src/app/carrinho/page.tsx
 M src/app/components/Header.tsx
 M src/app/conta/page.tsx
 M src/app/context/AuthContext.tsx
 M src/app/esqueci-senha/page.tsx
 M src/app/globals.css
 M src/app/hooks/useUnreadChatCount.ts
 M src/app/layout.tsx
 M src/app/lib/agendamento-payment-coupons.ts
 M src/app/lib/asaas-agendamento-reconcile.ts
 M src/app/lib/auth.ts
 M src/app/lib/coupon-booking-rules.ts
 M src/app/lib/coupon-release.ts
 M src/app/lib/coupon-stale-appointment.ts
 M src/app/lib/delivery-url-validation.ts
 M src/app/lib/payment-providers.ts
 M src/app/lib/plan-coupons.ts
 M src/app/lib/process-payment-webhook.ts
 M src/app/lib/sendEmail.ts
 M src/app/lib/service-catalog.ts
 M src/app/lib/validate-coupon-checkout.ts
 M src/app/lib/validations.ts
 M src/app/login/page.tsx
 M src/app/middleware.ts
 M src/app/minha-conta/page.tsx
 M src/app/planos/page.tsx
 M src/app/registro/page.tsx
?? docs/
?? prisma/backfill_coupon_origin.sql
?? prisma/ensure_account_deletion_log.sql
?? prisma/migrations/20260504200000_add_foto_position/
?? prisma/migrations/20260504213000_account_deletion_log/
?? prisma/migrations/20260511231500_user_plan_admin_inactive/
?? prisma/migrations/20260511234500_coupon_refund_tracking/
?? prisma/migrations/20260512030000_appointment_refund_confirmation/
?? prisma/migrations/20260512040000_user_plan_refund_tracking/
?? prisma/migrations/20260604210000_user_plan_user_hidden/
?? prisma/migrations/20260605120000_appointment_user_hidden/
?? prisma/reset_operational_data.sql
?? public/uploads/
?? reports/
?? scripts/check-db.mjs
?? scripts/domain-change-analyzer.ts
?? scripts/domain-guardian-advisor.ts
?? scripts/domain-guardian-audit.ts
?? scripts/domain-guardian-diff.ts
?? scripts/domain-guardian-runner.ts
?? scripts/inspect-payments.mjs
?? scripts/inspect-simulation-coupons.mjs
?? scripts/repair-coupon-ownership.mjs
?? scripts/reset-operational-data.mjs
?? scripts/test-simulation-flags.mjs
?? src/app/agendamento/cupom/
?? src/app/api/admin/cupons/excluir-lote/
?? src/app/api/admin/cupons/resetar-simulacao/
?? src/app/api/admin/reprocessar-pagamento-plano-teste/
?? src/app/api/admin/servicos/entrega/
?? src/app/api/agendamentos/confirmar-reembolso/
?? src/app/api/agendamentos/excluir/
?? src/app/api/conta/alterar-senha/
?? src/app/api/conta/excluir/
?? src/app/api/conta/foto/
?? src/app/api/coupons/resgate/
?? src/app/api/cupons/confirmar-reembolso/
?? src/app/api/cupons/excluir-usado/
?? src/app/api/cupons/solicitar-reembolso/
?? src/app/api/planos/confirmar-reembolso/
?? src/app/components/ConditionalBodyLayout.tsx
?? src/app/components/UserFeedbackDialog.tsx
?? src/app/conta/alterar-senha/
?? src/app/lib/active-user-plan.ts
?? src/app/lib/admin-delete-coupon.ts
?? src/app/lib/admin-delete-payment.ts
?? src/app/lib/adminAccess.ts
?? src/app/lib/agendamento-payment-rules.ts
?? src/app/lib/appointment-hidden.ts
?? src/app/lib/appointment-plan-coupon.ts
?? src/app/lib/appointment-refund-payment.ts
?? src/app/lib/appointment-refund-value.ts
?? src/app/lib/asaas-agendamento-payment-effects.ts
?? src/app/lib/asaas-fetch.ts
?? src/app/lib/asaas-plano-payment-effects.ts
?? src/app/lib/avatarDisplayUrl.ts
?? src/app/lib/coupon-account-ownership.ts
?? src/app/lib/coupon-admin-sections.ts
?? src/app/lib/coupon-origin.ts
?? src/app/lib/coupon-refund.ts
?? src/app/lib/coupon-scheduling-rules.ts
?? src/app/lib/coupon-sections.ts
?? src/app/lib/coupon-visibility.ts
?? src/app/lib/deleteUserAccount.ts
?? src/app/lib/delivery-audio-upload.ts
?? src/app/lib/payment-refund-status.ts
?? src/app/lib/plan-payment-simulation.ts
?? src/app/lib/plan-refund.ts
?? src/app/lib/prisma-errors.ts
?? src/app/lib/purge-cancelled-appointment.ts
?? src/app/lib/refund-coupon.ts
?? src/app/lib/simulation-coupon-codes.ts
?? src/app/lib/simulation-coupon-user-link.ts
?? src/app/lib/simulation-coupon.ts
?? src/app/lib/simulation-reset.ts
?? src/app/lib/support-contact.ts
?? src/app/lib/symbolic-payment-resolve.ts
?? src/app/lib/symbolic-payment.ts
?? src/app/lib/user-feedback.ts
?? src/app/lib/user-plan-hidden.ts
```

### git diff --name-status (unstaged)

```
M	.gitignore
M	package.json
M	prisma/schema.prisma
M	src/app/admin/agendamentos/page.tsx
M	src/app/admin/estatisticas/page.tsx
M	src/app/admin/layout.tsx
M	src/app/admin/pagamentos/page.tsx
M	src/app/admin/page.tsx
M	src/app/admin/planos/page.tsx
M	src/app/admin/servicos-aceitos/page.tsx
M	src/app/admin/servicos-solicitados/page.tsx
M	src/app/admin/usuarios/page.tsx
M	src/app/agendamento/page.tsx
M	src/app/api/admin/agendamentos/reverter-cancelamento/route.ts
M	src/app/api/admin/agendamentos/route.ts
M	src/app/api/admin/cupons/liberar/route.ts
M	src/app/api/admin/cupons/route.ts
M	src/app/api/admin/pagamentos/route.ts
M	src/app/api/admin/planos/excluir-cancelados/route.ts
M	src/app/api/admin/planos/route.ts
M	src/app/api/admin/reprocessar-pagamento-teste/route.ts
M	src/app/api/admin/servicos/route.ts
M	src/app/api/admin/stats/detalhadas/route.ts
M	src/app/api/admin/stats/route.ts
M	src/app/api/admin/usuarios/route.ts
M	src/app/api/agendamentos/cancelar/route.ts
M	src/app/api/agendamentos/com-cupom/route.ts
M	src/app/api/agendamentos/escolher-reembolso/route.ts
M	src/app/api/asaas/checkout-agendamento/route.ts
M	src/app/api/asaas/checkout-carrinho/route.ts
M	src/app/api/asaas/checkout/route.ts
M	src/app/api/conta/route.ts
M	src/app/api/conta/update/route.ts
M	src/app/api/coupons/validate/route.ts
M	src/app/api/cupons/renunciar/route.ts
M	src/app/api/esqueci-senha/route.ts
M	src/app/api/login/route.ts
M	src/app/api/me/route.ts
M	src/app/api/meus-dados/route.ts
M	src/app/api/meus-dados/vincular-cupons-teste/route.ts
M	src/app/api/planos/cancelar/route.ts
M	src/app/api/planos/excluir/route.ts
M	src/app/api/planos/solicitar-reembolso/route.ts
M	src/app/api/test-payment/route.ts
M	src/app/api/trocar-senha/route.ts
M	src/app/api/verificar-codigo/route.ts
M	src/app/api/webhooks/asaas/route.ts
M	src/app/carrinho/page.tsx
M	src/app/components/Header.tsx
M	src/app/conta/page.tsx
M	src/app/context/AuthContext.tsx
M	src/app/esqueci-senha/page.tsx
M	src/app/globals.css
M	src/app/hooks/useUnreadChatCount.ts
M	src/app/layout.tsx
M	src/app/lib/agendamento-payment-coupons.ts
M	src/app/lib/asaas-agendamento-reconcile.ts
M	src/app/lib/auth.ts
M	src/app/lib/coupon-booking-rules.ts
M	src/app/lib/coupon-release.ts
M	src/app/lib/coupon-stale-appointment.ts
M	src/app/lib/delivery-url-validation.ts
M	src/app/lib/payment-providers.ts
M	src/app/lib/plan-coupons.ts
M	src/app/lib/process-payment-webhook.ts
M	src/app/lib/sendEmail.ts
M	src/app/lib/service-catalog.ts
M	src/app/lib/validate-coupon-checkout.ts
M	src/app/lib/validations.ts
M	src/app/login/page.tsx
M	src/app/middleware.ts
M	src/app/minha-conta/page.tsx
M	src/app/planos/page.tsx
M	src/app/registro/page.tsx
```

### git diff --cached --name-status

```
(nenhum)
```

### git log -1

```
fd9ff6d55b8727164c8394422decd26cb47734a5
Victor Pereira <tremv03021@gmail.com>
Mon May 4 08:07:33 2026 -0300
hardening completo sistema: cupons, webhook, idempotencia, sync e validações finais
```

---

## Resumo final

**Risco geral:** CRITICAL

**Arquivos alterados:**

- `.gitignore` (modified, LOW)
- `docs/` (untracked, LOW)
- `package.json` (modified, LOW)
- `prisma/backfill_coupon_origin.sql` (untracked, LOW)
- `prisma/ensure_account_deletion_log.sql` (untracked, LOW)
- `prisma/migrations/20260504200000_add_foto_position/` (untracked, LOW)
- `prisma/migrations/20260504213000_account_deletion_log/` (untracked, LOW)
- `prisma/migrations/20260511231500_user_plan_admin_inactive/` (untracked, LOW)
- `prisma/migrations/20260511234500_coupon_refund_tracking/` (untracked, LOW)
- `prisma/migrations/20260512030000_appointment_refund_confirmation/` (untracked, LOW)
- `prisma/migrations/20260512040000_user_plan_refund_tracking/` (untracked, LOW)
- `prisma/migrations/20260604210000_user_plan_user_hidden/` (untracked, LOW)
- `prisma/migrations/20260605120000_appointment_user_hidden/` (untracked, LOW)
- `prisma/reset_operational_data.sql` (untracked, LOW)
- `prisma/schema.prisma` (modified, CRITICAL)
- `public/uploads/` (untracked, LOW)
- `reports/` (untracked, LOW)
- `scripts/check-db.mjs` (untracked, LOW)
- `scripts/domain-change-analyzer.ts` (untracked, LOW)
- `scripts/domain-guardian-advisor.ts` (untracked, LOW)
- `scripts/domain-guardian-audit.ts` (untracked, LOW)
- `scripts/domain-guardian-diff.ts` (untracked, LOW)
- `scripts/domain-guardian-runner.ts` (untracked, LOW)
- `scripts/inspect-payments.mjs` (untracked, LOW)
- `scripts/inspect-simulation-coupons.mjs` (untracked, MEDIUM)
- `scripts/repair-coupon-ownership.mjs` (untracked, LOW)
- `scripts/reset-operational-data.mjs` (untracked, LOW)
- `scripts/test-simulation-flags.mjs` (untracked, LOW)
- `src/app/admin/agendamentos/page.tsx` (modified, LOW)
- `src/app/admin/estatisticas/page.tsx` (modified, LOW)
- `src/app/admin/layout.tsx` (modified, LOW)
- `src/app/admin/pagamentos/page.tsx` (modified, LOW)
- `src/app/admin/page.tsx` (modified, LOW)
- `src/app/admin/planos/page.tsx` (modified, LOW)
- `src/app/admin/servicos-aceitos/page.tsx` (modified, LOW)
- `src/app/admin/servicos-solicitados/page.tsx` (modified, LOW)
- `src/app/admin/usuarios/page.tsx` (modified, LOW)
- `src/app/agendamento/cupom/` (untracked, LOW)
- `src/app/agendamento/page.tsx` (modified, LOW)
- `src/app/api/admin/agendamentos/reverter-cancelamento/route.ts` (modified, CRITICAL)
- `src/app/api/admin/agendamentos/route.ts` (modified, CRITICAL)
- `src/app/api/admin/cupons/excluir-lote/` (untracked, LOW)
- `src/app/api/admin/cupons/liberar/route.ts` (modified, CRITICAL)
- `src/app/api/admin/cupons/resetar-simulacao/` (untracked, LOW)
- `src/app/api/admin/cupons/route.ts` (modified, CRITICAL)
- `src/app/api/admin/pagamentos/route.ts` (modified, CRITICAL)
- `src/app/api/admin/planos/excluir-cancelados/route.ts` (modified, CRITICAL)
- `src/app/api/admin/planos/route.ts` (modified, CRITICAL)
- `src/app/api/admin/reprocessar-pagamento-plano-teste/` (untracked, LOW)
- `src/app/api/admin/reprocessar-pagamento-teste/route.ts` (modified, CRITICAL)
- `src/app/api/admin/servicos/entrega/` (untracked, LOW)
- `src/app/api/admin/servicos/route.ts` (modified, CRITICAL)
- `src/app/api/admin/stats/detalhadas/route.ts` (modified, CRITICAL)
- `src/app/api/admin/stats/route.ts` (modified, CRITICAL)
- `src/app/api/admin/usuarios/route.ts` (modified, CRITICAL)
- `src/app/api/agendamentos/cancelar/route.ts` (modified, CRITICAL)
- `src/app/api/agendamentos/com-cupom/route.ts` (modified, CRITICAL)
- `src/app/api/agendamentos/confirmar-reembolso/` (untracked, LOW)
- `src/app/api/agendamentos/escolher-reembolso/route.ts` (modified, CRITICAL)
- `src/app/api/agendamentos/excluir/` (untracked, LOW)
- `src/app/api/asaas/checkout-agendamento/route.ts` (modified, CRITICAL)
- `src/app/api/asaas/checkout-carrinho/route.ts` (modified, CRITICAL)
- `src/app/api/asaas/checkout/route.ts` (modified, CRITICAL)
- `src/app/api/conta/alterar-senha/` (untracked, LOW)
- `src/app/api/conta/excluir/` (untracked, LOW)
- `src/app/api/conta/foto/` (untracked, LOW)
- `src/app/api/conta/route.ts` (modified, CRITICAL)
- `src/app/api/conta/update/route.ts` (modified, CRITICAL)
- `src/app/api/coupons/resgate/` (untracked, LOW)
- `src/app/api/coupons/validate/route.ts` (modified, CRITICAL)
- `src/app/api/cupons/confirmar-reembolso/` (untracked, LOW)
- `src/app/api/cupons/excluir-usado/` (untracked, LOW)
- `src/app/api/cupons/renunciar/route.ts` (modified, CRITICAL)
- `src/app/api/cupons/solicitar-reembolso/` (untracked, LOW)
- `src/app/api/esqueci-senha/route.ts` (modified, CRITICAL)
- `src/app/api/login/route.ts` (modified, CRITICAL)
- `src/app/api/me/route.ts` (modified, CRITICAL)
- `src/app/api/meus-dados/route.ts` (modified, CRITICAL)
- `src/app/api/meus-dados/vincular-cupons-teste/route.ts` (modified, CRITICAL)
- `src/app/api/planos/cancelar/route.ts` (modified, CRITICAL)
- `src/app/api/planos/confirmar-reembolso/` (untracked, LOW)
- `src/app/api/planos/excluir/route.ts` (modified, CRITICAL)
- `src/app/api/planos/solicitar-reembolso/route.ts` (modified, CRITICAL)
- `src/app/api/test-payment/route.ts` (modified, CRITICAL)
- `src/app/api/trocar-senha/route.ts` (modified, CRITICAL)
- `src/app/api/verificar-codigo/route.ts` (modified, CRITICAL)
- `src/app/api/webhooks/asaas/route.ts` (modified, CRITICAL)
- `src/app/carrinho/page.tsx` (modified, LOW)
- `src/app/components/ConditionalBodyLayout.tsx` (untracked, LOW)
- `src/app/components/Header.tsx` (modified, LOW)
- `src/app/components/UserFeedbackDialog.tsx` (untracked, LOW)
- `src/app/conta/alterar-senha/` (untracked, LOW)
- `src/app/conta/page.tsx` (modified, LOW)
- `src/app/context/AuthContext.tsx` (modified, LOW)
- `src/app/esqueci-senha/page.tsx` (modified, LOW)
- `src/app/globals.css` (modified, LOW)
- `src/app/hooks/useUnreadChatCount.ts` (modified, LOW)
- `src/app/layout.tsx` (modified, LOW)
- `src/app/lib/active-user-plan.ts` (untracked, CRITICAL)
- `src/app/lib/admin-delete-coupon.ts` (untracked, LOW)
- `src/app/lib/admin-delete-payment.ts` (untracked, CRITICAL)
- `src/app/lib/adminAccess.ts` (untracked, CRITICAL)
- `src/app/lib/agendamento-payment-coupons.ts` (modified, CRITICAL)
- `src/app/lib/agendamento-payment-rules.ts` (untracked, LOW)
- `src/app/lib/appointment-hidden.ts` (untracked, CRITICAL)
- `src/app/lib/appointment-plan-coupon.ts` (untracked, LOW)
- `src/app/lib/appointment-refund-payment.ts` (untracked, CRITICAL)
- `src/app/lib/appointment-refund-value.ts` (untracked, CRITICAL)
- `src/app/lib/asaas-agendamento-payment-effects.ts` (untracked, CRITICAL)
- `src/app/lib/asaas-agendamento-reconcile.ts` (modified, CRITICAL)
- `src/app/lib/asaas-fetch.ts` (untracked, LOW)
- `src/app/lib/asaas-plano-payment-effects.ts` (untracked, CRITICAL)
- `src/app/lib/auth.ts` (modified, CRITICAL)
- `src/app/lib/avatarDisplayUrl.ts` (untracked, LOW)
- `src/app/lib/coupon-account-ownership.ts` (untracked, CRITICAL)
- `src/app/lib/coupon-admin-sections.ts` (untracked, LOW)
- `src/app/lib/coupon-booking-rules.ts` (modified, LOW)
- `src/app/lib/coupon-origin.ts` (untracked, LOW)
- `src/app/lib/coupon-refund.ts` (untracked, CRITICAL)
- `src/app/lib/coupon-release.ts` (modified, LOW)
- `src/app/lib/coupon-scheduling-rules.ts` (untracked, LOW)
- `src/app/lib/coupon-sections.ts` (untracked, LOW)
- `src/app/lib/coupon-stale-appointment.ts` (modified, CRITICAL)
- `src/app/lib/coupon-visibility.ts` (untracked, CRITICAL)
- `src/app/lib/deleteUserAccount.ts` (untracked, LOW)
- `src/app/lib/delivery-audio-upload.ts` (untracked, LOW)
- `src/app/lib/delivery-url-validation.ts` (modified, LOW)
- `src/app/lib/payment-providers.ts` (modified, LOW)
- `src/app/lib/payment-refund-status.ts` (untracked, LOW)
- `src/app/lib/plan-coupons.ts` (modified, CRITICAL)
- `src/app/lib/plan-payment-simulation.ts` (untracked, LOW)
- `src/app/lib/plan-refund.ts` (untracked, CRITICAL)
- `src/app/lib/prisma-errors.ts` (untracked, LOW)
- `src/app/lib/process-payment-webhook.ts` (modified, CRITICAL)
- `src/app/lib/purge-cancelled-appointment.ts` (untracked, LOW)
- `src/app/lib/refund-coupon.ts` (untracked, LOW)
- `src/app/lib/sendEmail.ts` (modified, LOW)
- `src/app/lib/service-catalog.ts` (modified, LOW)
- `src/app/lib/simulation-coupon-codes.ts` (untracked, MEDIUM)
- `src/app/lib/simulation-coupon-user-link.ts` (untracked, CRITICAL)
- `src/app/lib/simulation-coupon.ts` (untracked, CRITICAL)
- `src/app/lib/simulation-reset.ts` (untracked, CRITICAL)
- `src/app/lib/support-contact.ts` (untracked, LOW)
- `src/app/lib/symbolic-payment-resolve.ts` (untracked, CRITICAL)
- `src/app/lib/symbolic-payment.ts` (untracked, CRITICAL)
- `src/app/lib/user-feedback.ts` (untracked, LOW)
- `src/app/lib/user-plan-hidden.ts` (untracked, CRITICAL)
- `src/app/lib/validate-coupon-checkout.ts` (modified, LOW)
- `src/app/lib/validations.ts` (modified, LOW)
- `src/app/login/page.tsx` (modified, LOW)
- `src/app/middleware.ts` (modified, LOW)
- `src/app/minha-conta/page.tsx` (modified, LOW)
- `src/app/planos/page.tsx` (modified, LOW)
- `src/app/registro/page.tsx` (modified, LOW)

**Entidades impactadas:**

- Appointment
- Coupon
- Payment
- PaymentMetadata
- Service
- User
- UserPlan

**Fluxos impactados:**

- Aceite / recusa / conclusão admin
- Aceite/recusa admin
- Autenticação e autorização
- Checkout
- Checkout (agendamento e plano)
- Checkout agendamento
- Checkout plano
- Checkout → criação pós-pagamento
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Conflito de horário (agenda)
- Criação pós-checkout agendamento
- Documentação / tooling
- Entrega de áudio
- Exclusão de conta (LGPD)
- Geração pós-pagamento (agendamento/plano)
- Inativação admin (`adminInactiveAt`)
- Minha Conta (agregação de todas as entidades)
- Minha Conta (listagem de pagamentos)
- Minha Conta (visibilidade, seções)
- Ocultação Minha Conta (`userHiddenAt`)
- Ownership de cupons e agendamentos
- Reconciliação status agendamento ↔ serviços
- Reembolso
- Reembolso (outbound e inbound)
- Reembolso de cupom avulso
- Reembolso direto ou cupom de remarcação
- Reembolso inbound
- Reembolso proporcional de plano
- Remarcação (resolução de pagamento origem)
- Remarcação via cupom de reembolso
- Reprocessamento admin
- Resgate no checkout (`com-cupom`)
- Schema / migrations
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Simulação admin (`canUseSymbolicSimulation`)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Todos os fluxos de domínio
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Webhook Asaas
- Webhook plano

**Invariantes impactados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian relacionados:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

## Análise por arquivo

### `prisma/schema.prisma`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- Service
- User

**Fluxos afetados:**

- Schema / migrations
- Todos os fluxos de domínio

**Invariantes relacionados:**

- F1
- F4
- C1
- X1
- A1
- P2

**Checks Guardian:**

- F1
- F4
- A5
- A8
- C1
- C2
- P2
- X1
- X2

---

### `src/app/api/admin/agendamentos/reverter-cancelamento/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/agendamentos/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/cupons/liberar/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/cupons/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/pagamentos/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/planos/excluir-cancelados/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/planos/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/reprocessar-pagamento-teste/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/servicos/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/stats/detalhadas/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/stats/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/admin/usuarios/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/agendamentos/cancelar/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/agendamentos/com-cupom/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/agendamentos/escolher-reembolso/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/asaas/checkout-agendamento/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/asaas/checkout-carrinho/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/asaas/checkout/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/conta/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/conta/update/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/coupons/validate/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/cupons/renunciar/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/esqueci-senha/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/login/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/me/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/meus-dados/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/meus-dados/vincular-cupons-teste/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/planos/cancelar/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/planos/excluir/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/planos/solicitar-reembolso/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/test-payment/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/trocar-senha/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/verificar-codigo/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- Coupon
- UserPlan
- User

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X3
- X4
- X5

**Checks Guardian:**

- A5
- A8
- C1
- C2
- F1
- F4
- P2
- S1
- S2
- S3
- S4
- X1
- X2

---

### `src/app/api/webhooks/asaas/route.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- UserPlan
- Coupon

**Fluxos afetados:**

- Webhook Asaas
- Reembolso inbound

**Invariantes relacionados:**

- F1
- F3
- F7
- F4
- F5

**Checks Guardian:**

- F1
- F4
- P2

---

### `src/app/lib/active-user-plan.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- UserPlan

**Fluxos afetados:**

- Checkout plano
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Ocultação Minha Conta (`userHiddenAt`)

**Invariantes relacionados:**

- C4
- C5
- F5
- P1
- P2
- P3
- P4
- P5
- P6
- X1

**Checks Guardian:**

- P2

---

### `src/app/lib/admin-delete-payment.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)

**Invariantes relacionados:**

- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- X1
- X3
- X5

**Checks Guardian:**

- F1
- F4

---

### `src/app/lib/adminAccess.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- User

**Fluxos afetados:**

- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- C4
- X1
- X4

**Checks Guardian:**

- X1

---

### `src/app/lib/agendamento-payment-coupons.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Coupon

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- X1
- X2
- X5

**Checks Guardian:**

- C1
- C2
- S2
- S4

---

### `src/app/lib/appointment-hidden.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Appointment

**Fluxos afetados:**

- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- F4
- X1
- X2
- X3

**Checks Guardian:**

- A5
- A8
- F4
- X1
- X2

---

### `src/app/lib/appointment-refund-payment.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- Appointment

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- X1
- X2
- X3
- X5

**Checks Guardian:**

- A5
- A8
- F1
- F4
- X1
- X2

---

### `src/app/lib/appointment-refund-value.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Appointment

**Fluxos afetados:**

- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- F4
- X1
- X2
- X3

**Checks Guardian:**

- A5
- A8
- F4
- X1
- X2

---

### `src/app/lib/asaas-agendamento-payment-effects.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- Appointment
- Service

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)
- Criação pós-checkout agendamento
- Aceite / recusa / conclusão admin
- Entrega de áudio
- Reconciliação status agendamento ↔ serviços

**Invariantes relacionados:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- X1
- X2
- X3
- X5

**Checks Guardian:**

- A5
- A8
- F1
- F4
- X1
- X2

---

### `src/app/lib/asaas-agendamento-reconcile.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)

**Invariantes relacionados:**

- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- X1
- X3
- X5

**Checks Guardian:**

- F1
- F4

---

### `src/app/lib/asaas-plano-payment-effects.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- UserPlan

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout plano
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Ocultação Minha Conta (`userHiddenAt`)

**Invariantes relacionados:**

- C4
- C5
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X3
- X5

**Checks Guardian:**

- F1
- F4
- P2

---

### `src/app/lib/auth.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- User

**Fluxos afetados:**

- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- C4
- X1
- X4

**Checks Guardian:**

- X1

---

### `src/app/lib/coupon-account-ownership.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Coupon
- User

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Invariantes relacionados:**

- A1
- C1
- C2
- C3
- C4
- C5
- C6
- C7
- X1
- X2
- X4
- X5

**Checks Guardian:**

- C1
- C2
- S2
- S4
- X1

---

### `src/app/lib/coupon-refund.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Coupon

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- X1
- X2
- X5

**Checks Guardian:**

- C1
- C2
- S2
- S4

---

### `src/app/lib/coupon-stale-appointment.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Coupon

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- X1
- X2
- X5

**Checks Guardian:**

- C1
- C2
- S2
- S4

---

### `src/app/lib/coupon-visibility.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Coupon

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- X1
- X2
- X5

**Checks Guardian:**

- C1
- C2
- S2
- S4

---

### `src/app/lib/plan-coupons.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Coupon
- UserPlan

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)
- Checkout plano
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Ocultação Minha Conta (`userHiddenAt`)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F5
- P1
- P2
- P3
- P4
- P5
- P6
- X1
- X2
- X5

**Checks Guardian:**

- C1
- C2
- P2
- S2
- S4

---

### `src/app/lib/plan-refund.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- UserPlan

**Fluxos afetados:**

- Checkout plano
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Ocultação Minha Conta (`userHiddenAt`)

**Invariantes relacionados:**

- C4
- C5
- F5
- P1
- P2
- P3
- P4
- P5
- P6
- X1

**Checks Guardian:**

- P2

---

### `src/app/lib/process-payment-webhook.ts`

* **Alteração:** modified
* **Risco:** CRITICAL
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Appointment
- UserPlan

**Fluxos afetados:**

- Webhook Asaas
- Checkout
- Reembolso

**Invariantes relacionados:**

- F1
- F3
- F4
- F5
- M3
- M4

**Checks Guardian:**

- F1
- F4

---

### `src/app/lib/simulation-coupon-user-link.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Coupon

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- X1
- X2
- X5

**Checks Guardian:**

- C1
- C2
- S2
- S4

---

### `src/app/lib/simulation-coupon.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- Coupon

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- X1
- X2
- X3
- X5

**Checks Guardian:**

- C1
- C2
- F1
- F4
- S2
- S4

---

### `src/app/lib/simulation-reset.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- Coupon

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- X1
- X2
- X3
- X5

**Checks Guardian:**

- C1
- C2
- F1
- F4
- S2
- S4

---

### `src/app/lib/symbolic-payment-resolve.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- PaymentMetadata

**Fluxos afetados:**

- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)

**Invariantes relacionados:**

- M1
- M2
- M3
- M4

**Checks Guardian:**

- S1
- S3

---

### `src/app/lib/symbolic-payment.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- Payment
- PaymentMetadata
- Coupon

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)
- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)
- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Invariantes relacionados:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- M1
- M2
- M3
- M4
- X1
- X2
- X3
- X5

**Checks Guardian:**

- C1
- C2
- F1
- F4
- S1
- S2
- S3
- S4

---

### `src/app/lib/user-plan-hidden.ts`

* **Alteração:** untracked
* **Risco:** CRITICAL
* **Mapeamento:** domain-map

**Entidade(s) afetada(s):**

- UserPlan

**Fluxos afetados:**

- Checkout plano
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Ocultação Minha Conta (`userHiddenAt`)

**Invariantes relacionados:**

- C4
- C5
- F5
- P1
- P2
- P3
- P4
- P5
- P6
- X1

**Checks Guardian:**

- P2

---

### `scripts/inspect-simulation-coupons.mjs`

* **Alteração:** untracked
* **Risco:** MEDIUM
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/simulation-coupon-codes.ts`

* **Alteração:** untracked
* **Risco:** MEDIUM
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `.gitignore`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `docs/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- Documentação / tooling

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `package.json`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/backfill_coupon_origin.sql`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/ensure_account_deletion_log.sql`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260504200000_add_foto_position/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260504213000_account_deletion_log/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260511231500_user_plan_admin_inactive/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260511234500_coupon_refund_tracking/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260512030000_appointment_refund_confirmation/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260512040000_user_plan_refund_tracking/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260604210000_user_plan_user_hidden/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/migrations/20260605120000_appointment_user_hidden/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `prisma/reset_operational_data.sql`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `public/uploads/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `reports/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- Documentação / tooling

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/check-db.mjs`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/domain-change-analyzer.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/domain-guardian-advisor.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- Documentação / tooling

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/domain-guardian-audit.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- Documentação / tooling

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/domain-guardian-diff.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- Documentação / tooling

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/domain-guardian-runner.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** heuristic

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- Documentação / tooling

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/inspect-payments.mjs`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/repair-coupon-ownership.mjs`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/reset-operational-data.mjs`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `scripts/test-simulation-flags.mjs`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/agendamentos/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/estatisticas/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/layout.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/pagamentos/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/planos/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/servicos-aceitos/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/servicos-solicitados/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/admin/usuarios/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/agendamento/cupom/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/agendamento/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/admin/cupons/excluir-lote/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/admin/cupons/resetar-simulacao/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/admin/reprocessar-pagamento-plano-teste/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/admin/servicos/entrega/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/agendamentos/confirmar-reembolso/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/agendamentos/excluir/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/conta/alterar-senha/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/conta/excluir/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/conta/foto/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/coupons/resgate/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/cupons/confirmar-reembolso/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/cupons/excluir-usado/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/cupons/solicitar-reembolso/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/api/planos/confirmar-reembolso/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/carrinho/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/components/ConditionalBodyLayout.tsx`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/components/Header.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/components/UserFeedbackDialog.tsx`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/conta/alterar-senha/`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/conta/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/context/AuthContext.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/esqueci-senha/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/globals.css`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/hooks/useUnreadChatCount.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/layout.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/admin-delete-coupon.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/agendamento-payment-rules.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/appointment-plan-coupon.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/asaas-fetch.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/avatarDisplayUrl.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/coupon-admin-sections.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/coupon-booking-rules.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/coupon-origin.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/coupon-release.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/coupon-scheduling-rules.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/coupon-sections.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/deleteUserAccount.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/delivery-audio-upload.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/delivery-url-validation.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/payment-providers.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/payment-refund-status.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/plan-payment-simulation.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/prisma-errors.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/purge-cancelled-appointment.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/refund-coupon.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/sendEmail.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/service-catalog.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/support-contact.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/user-feedback.ts`

* **Alteração:** untracked
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/validate-coupon-checkout.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/lib/validations.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/login/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/middleware.ts`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/minha-conta/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/planos/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

### `src/app/registro/page.tsx`

* **Alteração:** modified
* **Risco:** LOW
* **Mapeamento:** none

**Entidade(s) afetada(s):**

- (não mapeado no domain-map)

**Fluxos afetados:**

- (não identificado)

**Invariantes relacionados:**

- (nenhum)

**Checks Guardian:**

- (nenhum)

---

_Análise somente leitura — nenhuma correção ou alteração de negócio foi executada._
_Fontes: `docs/ai/domain-map.md`, `docs/ai/domain-invariants.md`_
