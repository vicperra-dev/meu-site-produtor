# Domain Guardian Advisor

terça-feira, 23 de junho de 2026 às 03:20:24

**Status final:**

HEALTHY

## Resumo

* Errors: 0
* Warnings: 0
* Info: 1
* Checks executados: 13
* Duração: 951 ms

## Checks com ocorrências

- **S4** (INFO) — 1 info
  - INFO: Legado no banco: 0 cupom(ns) TESTE_AGEND_*, 0 cupom(ns) TESTE_PAY_*

---

## Playbook por check

## F1 — asaasId duplicado em Payment

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

CRÍTICA

**Impacto:**

Dois ou mais pagamentos compartilham o mesmo asaasId. Risco de reconciliação financeira incorreta, dupla contabilização ou efeitos de webhook aplicados ao registro errado.

**Causa provável:**

Retry de webhook Asaas, race condition na criação de Payment ou reprocessamento manual sem idempotência.

**Arquivos suspeitos:**

* `src/app/api/webhooks/asaas/route.ts`
* `src/app/lib/process-payment-webhook.ts`
* `src/app/lib/asaas-agendamento-reconcile.ts`

**Ação sugerida:**

Identificar o par duplicado, preservar o Payment canônico, anular ou mesclar o duplicado e validar efeitos (appointment, cupons) antes de qualquer purge.

---

## F4 — Payment de agendamento aprovado sem Appointment válido

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

CRÍTICA

**Impacto:**

Pagamento aprovado pode não gerar agendamento visível para o usuário nem cupons associados ao fluxo real.

**Causa provável:**

Falha em webhook, interrupção em `processAgendamentoPaymentEffects` ou ausência de `appointmentId`/`appointmentIds` após o RECEIVED.

**Arquivos suspeitos:**

* `src/app/lib/process-payment-webhook.ts`
* `src/app/api/webhooks/asaas/route.ts`
* `src/app/lib/asaas-agendamento-payment-effects.ts`
* `src/app/lib/asaas-agendamento-reconcile.ts`

**Ação sugerida:**

Executar reconciliação de ownership e reprocessar o pagamento (admin) com metadata válida; confirmar criação de Appointment e vínculo no Payment.

---

## A5 — Appointment ativo sem Service vinculado

**Status nesta execução:** OK (OK) · 1 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

ALTA

**Impacto:**

Agendamento aceito/confirmado aparece sem serviços vinculados — sessão incompleta no admin e possível falha na entrega operacional.

**Causa provável:**

Efeitos pós-pagamento parciais, falha na criação de `Service` ou backfill admin não executado.

**Arquivos suspeitos:**

* `src/app/lib/asaas-agendamento-payment-effects.ts`
* `src/app/lib/asaas-agendamento-reconcile.ts`
* `src/app/api/admin/reprocessar-pagamento-teste/route.ts`

**Ação sugerida:**

Backfill de serviços via fluxo admin ou reprocessar pagamento; validar metadata de itens (servicos/beats) do checkout.

---

## A8 — Conflito de horário entre agendamentos

**Status nesta execução:** OK (OK) · 1 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

ALTA

**Impacto:**

Dois agendamentos não cancelados ocupam o mesmo slot — risco de double booking e conflito operacional na agenda.

**Causa provável:**

Race entre checkouts simultâneos, validação de slot contornada ou status `recusado` ainda bloqueando slot sem política clara.

**Arquivos suspeitos:**

* `src/app/api/asaas/checkout-agendamento/route.ts`
* `src/app/api/agendamentos/route.ts`

**Ação sugerida:**

Remarcar ou cancelar um dos agendamentos em conflito; revisar janela de duração e regras de bloqueio de slot no checkout.

---

## C1 — Coupon.code duplicado

**Status nesta execução:** OK (OK) · 1 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

CRÍTICA

**Impacto:**

Códigos de cupom não são únicos globalmente — consumo, resgate e auditoria podem afetar o cupom errado.

**Causa provável:**

Race na alocação de código, seed manual ou migração com colisão de prefixo.

**Arquivos suspeitos:**

* `src/app/lib/agendamento-payment-coupons.ts`
* `src/app/lib/plan-coupons.ts`
* `src/app/lib/simulation-coupon-codes.ts`

**Ação sugerida:**

Renumerar o cupom duplicado mais recente, investigar transação de geração e impedir nova colisão antes de liberar o código ao cliente.

---

## C2 — Cupom usado sem rastreabilidade

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

ALTA

**Impacto:**

Cupom marcado como usado sem `usedBy`, `appointmentId` ou vínculo resolvível — ownership e auditoria comprometidos.

**Causa provável:**

Update parcial no consumo, reparo manual incompleto ou falha em `repairReleasedBookingCouponsForUser`.

**Arquivos suspeitos:**

* `src/app/lib/coupon-stale-appointment.ts`
* `src/app/api/meus-dados/route.ts`
* `src/app/lib/coupon-booking-rules.ts`

**Ação sugerida:**

Reparar `usedBy`/`appointmentId` com base no agendamento correspondente; evitar liberar cupom sem rastreio completo.

---

## P2 — Plano ativo com cupons abaixo do esperado

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

ALTA

**Impacto:**

Cliente com plano ativo pode não ter recebido a quantidade de cupons prevista no catálogo do plano.

**Causa provável:**

Falha em `processPlanoPaymentEffects`, webhook interrompido ou plano criado sem geração de cupons.

**Arquivos suspeitos:**

* `src/app/lib/asaas-plano-payment-effects.ts`
* `src/app/lib/plan-coupons.ts`
* `src/app/api/webhooks/asaas/route.ts`
* `src/app/api/admin/reprocessar-pagamento-plano-teste/route.ts`

**Ação sugerida:**

Reprocessar pagamento de plano ou gerar cupons faltantes via admin; confirmar `userPlanId` e contagem por `planId`.

---

## X1 — Divergência de userId entre entidades relacionadas

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

CRÍTICA

**Impacto:**

Payment, Appointment ou Coupon podem pertencer a usuários diferentes no mesmo fluxo — risco de vazamento de dados entre contas.

**Causa provável:**

Vinculação incorreta em checkout, cupom de teste ou correção manual sem validar ownership.

**Arquivos suspeitos:**

* `src/app/lib/coupon-account-ownership.ts`
* `src/app/lib/coupon-visibility.ts`
* `src/app/api/meus-dados/route.ts`
* `src/app/lib/simulation-coupon-user-link.ts`

**Ação sugerida:**

Corrigir ownership imediatamente no registro divergente; revisar o fluxo que criou o vínculo antes de reexpor em Minha Conta.

---

## X2 — refundCouponId inconsistente com Appointment/Coupon

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

CRÍTICA

**Impacto:**

Tríade de remarcação quebrada — reembolso/remarcação pode falhar ou apontar para cupom de outro usuário.

**Causa provável:**

Cupom de reembolso excluído, `refundCouponId` órfão ou userId do cupom diferente do agendamento origem.

**Arquivos suspeitos:**

* `src/app/lib/appointment-refund-payment.ts`
* `src/app/api/agendamentos/escolher-reembolso/route.ts`
* `src/app/lib/coupon-refund.ts`

**Ação sugerida:**

Restaurar cupom de reembolso ou limpar `refundCouponId` com confirmação explícita; validar tríade Appointment → Coupon → userId.

---

## S1 — Payment simbólico dependente de fallback amount=5

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

MÉDIA

**Impacto:**

Classificação de simulação ainda depende do valor R$ 5 sem metadata explícita — bloqueia remoção definitiva do fallback (A1-final).

**Causa provável:**

Payments históricos criados antes da migração de metadata (`symbolicAgendamento`, `symbolicPlano`, `isTestPayment`).

**Arquivos suspeitos:**

* `src/app/lib/symbolic-payment.ts`
* `src/app/lib/symbolic-payment-resolve.ts`
* `src/app/api/asaas/checkout-agendamento/route.ts`

**Ação sugerida:**

Backfill de metadata nos payments afetados; monitorar até S1 zerar em produção antes de remover `dependsOnLegacyAmountFallback`.

---

## S2 — Cupom TESTE_* sem vínculo de simulação

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

MÉDIA

**Impacto:**

Cupom de simulação pode não aparecer em Minha Conta nem ser reconhecido como teste no admin.

**Causa provável:**

Ausência de `assignedUserId`, `paymentId` simbólico ou vínculo de agendamento; auto-link legacy removido no A2.

**Arquivos suspeitos:**

* `src/app/lib/simulation-coupon-user-link.ts`
* `src/app/api/meus-dados/vincular-cupons-teste/route.ts`
* `src/app/lib/simulation-coupon.ts`

**Ação sugerida:**

Executar POST `/api/meus-dados/vincular-cupons-teste` ou associar cupons via admin com e-mail do usuário.

---

## S3 — Inconsistência metadata/amount em pagamento simbólico

**Status nesta execução:** OK (OK) · 0 registro(s) verificado(s)

**Ocorrências:**

- (nenhuma ocorrência nesta execução)

**Criticidade:**

MÉDIA

**Impacto:**

Payment classificado como simbólico com amount divergente ou apenas via fallback — risco de tratar pagamento real como teste (ou vice-versa).

**Causa provável:**

Metadata simbólica com valor cobrado incorreto, ou classificação legada ainda ativa sem metadata coerente.

**Arquivos suspeitos:**

* `src/app/lib/symbolic-payment.ts`
* `src/app/lib/plan-payment-simulation.ts`
* `src/app/api/admin/reprocessar-pagamento-teste/route.ts`
* `src/app/api/admin/reprocessar-pagamento-plano-teste/route.ts`

**Ação sugerida:**

Alinhar metadata e amount ao valor simbólico esperado; eliminar dependência de fallback após backfill (ver S1).

---

## S4 — Resíduo legado TESTE_AGEND_* / TESTE_PAY_*

**Status nesta execução:** INFO (1 info) · 0 registro(s) verificado(s)

**Ocorrências:**

- **INFO**: Legado no banco: 0 cupom(ns) TESTE_AGEND_*, 0 cupom(ns) TESTE_PAY_*

**Criticidade:**

BAIXA

**Impacto:**

Cupons com prefixos legados ainda no banco — indicador de migração de simulação incompleta, sem impacto direto em produção se volume for zero.

**Causa provável:**

Cupons gerados antes da padronização `TESTE_*` + código aleatório; não migrados ou não vinculados.

**Arquivos suspeitos:**

* `src/app/lib/simulation-coupon-codes.ts`
* `src/app/lib/simulation-coupon-user-link.ts`
* `src/app/api/meus-dados/vincular-cupons-teste/route.ts`

**Ação sugerida:**

Vincular ou arquivar cupons legados restantes; manter S4 em observação até contagem zero antes de remover helpers `@legacy`.

---

_Diagnóstico operacional apenas — nenhuma correção foi executada automaticamente._
