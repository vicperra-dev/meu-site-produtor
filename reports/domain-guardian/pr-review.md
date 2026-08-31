# Pull Request Review

**Gerado em:** 2026-06-23T07:45:20.853Z

## Resumo

| Campo | Valor |
|-------|-------|
| Branch | main |
| HEAD | fd9ff6d |
| Mensagem | hardening completo sistema: cupons, webhook, idempotencia, sync e validações finais |
| Risco geral | CRITICAL |
| Escopo de revisão | FULL |
| Decision Engine | BLOCKED |
| Guardian (banco) | HEALTHY |
| Arquivos alterados | 154 |
| Arquivos HIGH/CRITICAL | 59 |
| Entidades impactadas | 7 |

## Arquivos alterados

Total: **154** · Exibindo até 30 (ordenados por risco).

- `prisma/schema.prisma` — modified, **CRITICAL**
- `src/app/api/admin/agendamentos/reverter-cancelamento/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/agendamentos/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/cupons/liberar/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/cupons/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/pagamentos/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/planos/excluir-cancelados/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/planos/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/reprocessar-pagamento-teste/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/servicos/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/stats/detalhadas/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/stats/route.ts` — modified, **CRITICAL**
- `src/app/api/admin/usuarios/route.ts` — modified, **CRITICAL**
- `src/app/api/agendamentos/cancelar/route.ts` — modified, **CRITICAL**
- `src/app/api/agendamentos/com-cupom/route.ts` — modified, **CRITICAL**
- `src/app/api/agendamentos/escolher-reembolso/route.ts` — modified, **CRITICAL**
- `src/app/api/asaas/checkout-agendamento/route.ts` — modified, **CRITICAL**
- `src/app/api/asaas/checkout-carrinho/route.ts` — modified, **CRITICAL**
- `src/app/api/asaas/checkout/route.ts` — modified, **CRITICAL**
- `src/app/api/conta/route.ts` — modified, **CRITICAL**
- `src/app/api/conta/update/route.ts` — modified, **CRITICAL**
- `src/app/api/coupons/validate/route.ts` — modified, **CRITICAL**
- `src/app/api/cupons/renunciar/route.ts` — modified, **CRITICAL**
- `src/app/api/esqueci-senha/route.ts` — modified, **CRITICAL**
- `src/app/api/login/route.ts` — modified, **CRITICAL**
- `src/app/api/me/route.ts` — modified, **CRITICAL**
- `src/app/api/meus-dados/route.ts` — modified, **CRITICAL**
- `src/app/api/meus-dados/vincular-cupons-teste/route.ts` — modified, **CRITICAL**
- `src/app/api/planos/cancelar/route.ts` — modified, **CRITICAL**
- `src/app/api/planos/excluir/route.ts` — modified, **CRITICAL**
- … e mais 124 arquivo(s)

## Entidades afetadas

- **Payment**
- **PaymentMetadata**
- **Appointment**
- **Coupon**
- **UserPlan**
- **Service**
- **User**

## Invariantes relevantes

**Críticos no diff:**

- A1
- A2
- C1
- C4
- F1
- F2
- F3
- F6
- F8
- M1
- P3
- P5
- X1
- X2
- X4

**Todos no diff:**

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

## Testes obrigatórios

Escopo **FULL** — validar antes do merge (29 obrigatório(s) no checklist).

- [ ] Webhook PAYMENT_RECEIVED cria Payment approved com asaasId único (F1/F3)
- [ ] Pagamento agendamento aprovado vincula appointmentId ou appointmentIds (F4)
- [ ] Pagamento plano aprovado materializa UserPlan na janela esperada (F5)
- [ ] Classificação simbólico vs real por metadata (symbolicAgendamento/symbolicPlano)
- [ ] Idempotência: segundo webhook para mesmo asaasId não duplica Payment
- [ ] Checkout cria PaymentMetadata antes do POST Asaas (M1)
- [ ] asaasId preenchido após sucesso do checkout (M2)
- [ ] Webhook resolve metadata válida (expiresAt não expirado — M3)
- [ ] Flags simbólicas presentes quando checkout de teste
- [ ] Criação pós-pagamento com userId correto (A1)
- [ ] Agendamento visível em Minha Conta após pagamento
- [ ] Cancelamento com opção reembolso ou cupom (A3)
- [ ] Conflito de horário bloqueado no checkout (A8)
- [ ] Reembolso direto exige Payment approved vinculado (A2)
- [ ] Criar cupom (geração pós-pagamento / plano)
- [ ] Resgatar cupom no checkout ou agendamento com cupom
- [ ] Reembolso direto de cupom avulso
- [ ] Remarcação via cupom de reembolso (refundCouponId)
- [ ] Cupom ocultado pelo usuário (`userRemovedAt`) some de Minha Conta
- [ ] Criação de plano pós-pagamento approved
- … e mais 9 em `review-checklist.md`

## Riscos observados

- Risco geral do diff: **CRITICAL**
- Escopo de revisão: **FULL**
- 59 arquivo(s) HIGH/CRITICAL no diff
- 38 invariante(s) impactado(s)
- Invariantes críticos no diff: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4
- Schema Prisma alterado — migration obrigatória e revisão de FKs lógicas
- Decision Engine: Risco geral **CRITICAL** (Change Analyzer).
- Decision Engine: Invariantes críticos afetados: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4.
- Decision Engine: Alteração toca `prisma/schema.prisma` com entidades **Payment** e **Appointment** simultaneamente.

## Revisão por entidade

### Payment

**Riscos**

- Duplicidade de Payment por asaasId
- Payment approved órfão sem Appointment (F4)
- Reembolso outbound com asaasId incorreto (F6)
- Invariante crítico F1 no diff
- Invariante crítico F2 no diff
- Invariante crítico F3 no diff
- Invariante crítico F6 no diff
- Invariante crítico F8 no diff
- Invariante crítico X1 no diff

**Testes a validar**

- [ ] Webhook PAYMENT_RECEIVED cria Payment approved com asaasId único (F1/F3)
- [ ] Pagamento agendamento aprovado vincula appointmentId ou appointmentIds (F4)
- [ ] Pagamento plano aprovado materializa UserPlan na janela esperada (F5)
- [ ] Classificação simbólico vs real por metadata (symbolicAgendamento/symbolicPlano)
- [ ] Idempotência: segundo webhook para mesmo asaasId não duplica Payment
- [ ] Webhook PAYMENT_REFUNDED sincroniza refundAsaasStatus nas entidades corretas (F7)
- [ ] Reembolso outbound resolve Payment.asaasId correto (F6)
- [ ] Admin delete bloqueado para Payment approved real (F8)
- [ ] Reprocessamento admin (agendamento/plano teste)
- [ ] Listagem em Minha Conta e Admin Pagamentos
- … e mais 4

**Pontos sensíveis**

- Idempotência webhook por asaasId (F1/F3)
- Vínculo lógico appointmentId sem FK — órfão após delete (F4)
- Delete físico de Payment approved real bloqueado (F8)
- Classificação simbólico vs produção (S1/S3)
- Fluxo afetado: Checkout (agendamento e plano)
- Fluxo afetado: Webhook Asaas
- Fluxo afetado: Reembolso (outbound e inbound)
- Fluxo afetado: Remarcação (resolução de pagamento origem)

**Arquivos críticos no diff**

- src/app/api/admin/pagamentos/route.ts (CRITICAL)
- src/app/api/asaas/checkout-agendamento/route.ts (CRITICAL)
- src/app/api/asaas/checkout-carrinho/route.ts (CRITICAL)
- src/app/api/asaas/checkout/route.ts (CRITICAL)
- src/app/api/test-payment/route.ts (CRITICAL)
- src/app/api/webhooks/asaas/route.ts (CRITICAL)
- src/app/lib/admin-delete-payment.ts (CRITICAL)
- src/app/lib/agendamento-payment-coupons.ts (CRITICAL)
- src/app/lib/appointment-refund-payment.ts (CRITICAL)
- src/app/lib/asaas-agendamento-payment-effects.ts (CRITICAL)
- src/app/lib/asaas-agendamento-reconcile.ts (CRITICAL)
- src/app/lib/asaas-plano-payment-effects.ts (CRITICAL)

---

### PaymentMetadata

**Riscos**

- Webhook sem metadata válida — efeitos incompletos
- Metadata expirado sem job de limpeza
- Invariante crítico M1 no diff

**Testes a validar**

- [ ] Checkout cria PaymentMetadata antes do POST Asaas (M1)
- [ ] asaasId preenchido após sucesso do checkout (M2)
- [ ] Webhook resolve metadata válida (expiresAt não expirado — M3)
- [ ] Flags simbólicas presentes quando checkout de teste
- [ ] Metadata expirada: webhook falha de forma controlada
- [ ] Reprocessamento admin grava metadata coerente
- [ ] externalReference limitado a userId
- [ ] Backfill metadata em payments históricos (migração A1)
- [ ] Domain Guardian: S1, S3


**Pontos sensíveis**

- Metadata deve existir antes do POST Asaas (M1)
- TTL expiresAt ~24h — webhook perde contexto se expirado (M3)
- externalReference limitado a userId
- Fluxo afetado: Checkout agendamento
- Fluxo afetado: Checkout plano
- Fluxo afetado: Webhook (resolução de itens, data/hora, flags simbólicas)
- Fluxo afetado: Reprocessamento admin

**Arquivos críticos no diff**

- src/app/api/admin/reprocessar-pagamento-teste/route.ts (CRITICAL)
- src/app/api/asaas/checkout-agendamento/route.ts (CRITICAL)
- src/app/api/asaas/checkout-carrinho/route.ts (CRITICAL)
- src/app/api/asaas/checkout/route.ts (CRITICAL)
- src/app/lib/process-payment-webhook.ts (CRITICAL)
- src/app/lib/symbolic-payment-resolve.ts (CRITICAL)

---

### Appointment

**Riscos**

- Double booking em slot sobreposto
- Agendamento sem Service até backfill
- Reembolso pendente inacessível se ocultado incorretamente
- Invariante crítico A1 no diff
- Invariante crítico A2 no diff
- Invariante crítico X1 no diff
- Invariante crítico X2 no diff

**Testes a validar**

- [ ] Criação pós-pagamento com userId correto (A1)
- [ ] Agendamento visível em Minha Conta após pagamento
- [ ] Cancelamento com opção reembolso ou cupom (A3)
- [ ] Conflito de horário bloqueado no checkout (A8)
- [ ] Reembolso direto exige Payment approved vinculado (A2)
- [ ] Ocultar agendamento (`userHiddenAt`) não altera status financeiro (A7)
- [ ] Sync status com Service (`reconcileAppointmentWithServices`)
- [ ] Aceite/recusa admin
- [ ] Remarcação via cupom de reembolso
- [ ] Carrinho com múltiplos appointments
- … e mais 2

**Pontos sensíveis**

- Conflito de horário — recusado ainda pode bloquear slot (A8)
- userHiddenAt não altera status financeiro (A7)
- Reembolso exige Payment approved vinculado (A2)
- adminArchivedAt ainda não implementado — reter histórico
- Fluxo afetado: Checkout → criação pós-pagamento
- Fluxo afetado: Aceite/recusa admin
- Fluxo afetado: Reembolso direto ou cupom de remarcação
- Fluxo afetado: Ocultação Minha Conta (`userHiddenAt`)

**Arquivos críticos no diff**

- src/app/api/admin/agendamentos/reverter-cancelamento/route.ts (CRITICAL)
- src/app/api/admin/agendamentos/route.ts (CRITICAL)
- src/app/api/agendamentos/cancelar/route.ts (CRITICAL)
- src/app/api/agendamentos/com-cupom/route.ts (CRITICAL)
- src/app/api/agendamentos/escolher-reembolso/route.ts (CRITICAL)
- src/app/api/asaas/checkout-agendamento/route.ts (CRITICAL)
- src/app/lib/agendamento-payment-coupons.ts (CRITICAL)
- src/app/lib/appointment-hidden.ts (CRITICAL)
- src/app/lib/appointment-refund-payment.ts (CRITICAL)
- src/app/lib/appointment-refund-value.ts (CRITICAL)
- src/app/lib/asaas-agendamento-payment-effects.ts (CRITICAL)
- src/app/lib/asaas-agendamento-reconcile.ts (CRITICAL)

---

### Coupon

**Riscos**

- Código duplicado ou cupom usado sem rastreio
- Cupom órfão com assignedUserId null
- Ponte refundCouponId quebrada sem FK
- Invariante crítico C1 no diff
- Invariante crítico C4 no diff
- Invariante crítico X1 no diff
- Invariante crítico X2 no diff

**Testes a validar**

- [ ] Criar cupom (geração pós-pagamento / plano)
- [ ] Resgatar cupom no checkout ou agendamento com cupom
- [ ] Reembolso direto de cupom avulso
- [ ] Remarcação via cupom de reembolso (refundCouponId)
- [ ] Cupom ocultado pelo usuário (`userRemovedAt`) some de Minha Conta
- [ ] Código único global (C1) — sem colisão
- [ ] Cupom usado com rastreabilidade usedBy/appointmentId (C2)
- [ ] Cupom de plano bloqueado quando plano cancelado/reembolso (C5)
- [ ] Vinculação simulação (`vincular-cupons-teste`, assignedUserId)
- [ ] Liberação admin só para cupons de simulação
- … e mais 4

**Pontos sensíveis**

- code único global (C1)
- Cupom de plano bloqueado se plano cancelado/reembolso (C5)
- Tríade remarcação refundCouponId (X2)
- Simulação TESTE_* isolada de produção (C7)
- Fluxo afetado: Geração pós-pagamento (agendamento/plano)
- Fluxo afetado: Resgate no checkout (`com-cupom`)
- Fluxo afetado: Remarcação via cupom de reembolso
- Fluxo afetado: Reembolso de cupom avulso

**Arquivos críticos no diff**

- src/app/api/agendamentos/com-cupom/route.ts (CRITICAL)
- src/app/api/coupons/validate/route.ts (CRITICAL)
- src/app/api/meus-dados/route.ts (CRITICAL)
- src/app/lib/agendamento-payment-coupons.ts (CRITICAL)
- src/app/lib/coupon-account-ownership.ts (CRITICAL)
- src/app/lib/coupon-refund.ts (CRITICAL)
- src/app/lib/coupon-stale-appointment.ts (CRITICAL)
- src/app/lib/coupon-visibility.ts (CRITICAL)
- src/app/lib/plan-coupons.ts (CRITICAL)
- src/app/lib/simulation-coupon-user-link.ts (CRITICAL)
- src/app/lib/simulation-coupon.ts (CRITICAL)

---

### UserPlan

**Riscos**

- Plano ativo sem cupons gerados (P2)
- Ambiguidade Payment ↔ UserPlan com múltiplos planos
- Invariante crítico C4 no diff
- Invariante crítico P3 no diff
- Invariante crítico P5 no diff
- Invariante crítico X1 no diff

**Testes a validar**

- [ ] Criação de plano pós-pagamento approved
- [ ] Geração inicial de cupons conforme catálogo do plano (P2)
- [ ] Plano ativo visível em Minha Conta
- [ ] Solicitar reembolso bloqueia cupons não usados (P3)
- [ ] Inativação admin (`adminInactiveAt`) bloqueia cupons (P4)
- [ ] Ocultar plano (`userHiddenAt`) na Minha Conta
- [ ] Cancelamento de assinatura Asaas coerente (P6)
- [ ] Delete físico bloqueado com histórico (P5)
- [ ] Reembolso proporcional por cupons não usados
- [ ] Plano teste / simbólico
- … e mais 1

**Pontos sensíveis**

- adminInactiveAt bloqueia cupons não usados (P4)
- Delete físico bloqueado com histórico (P5)
- Payment ↔ UserPlan sem FK — heurística 48h (F5)
- Reembolso bloqueia cupons (P3)
- Fluxo afetado: Checkout plano
- Fluxo afetado: Webhook plano
- Fluxo afetado: Reembolso proporcional de plano
- Fluxo afetado: Inativação admin (`adminInactiveAt`)

**Arquivos críticos no diff**

- src/app/api/admin/planos/excluir-cancelados/route.ts (CRITICAL)
- src/app/api/admin/planos/route.ts (CRITICAL)
- src/app/api/planos/cancelar/route.ts (CRITICAL)
- src/app/api/planos/excluir/route.ts (CRITICAL)
- src/app/api/planos/solicitar-reembolso/route.ts (CRITICAL)
- src/app/lib/active-user-plan.ts (CRITICAL)
- src/app/lib/asaas-plano-payment-effects.ts (CRITICAL)
- src/app/lib/plan-coupons.ts (CRITICAL)
- src/app/lib/plan-refund.ts (CRITICAL)
- src/app/lib/user-plan-hidden.ts (CRITICAL)

---

### Service

**Riscos**

- Service com appointmentId null após delete
- Entrega de áudio órfã

**Testes a validar**

- [ ] Criação de Service por item pós-checkout agendamento
- [ ] Vínculo Service.appointmentId correto
- [ ] Agendamento ativo com ≥1 Service quando cobrança real (A5)
- [ ] Sync status Appointment ↔ Service
- [ ] Conclusão com entrega de áudio
- [ ] Aceite/recusa de serviço no admin
- [ ] Backfill admin de serviços faltantes
- [ ] Domain Guardian: A5


**Pontos sensíveis**

- appointmentId SET NULL on delete — entrega órfã
- Sync status com Appointment (A5/A6)
- Backfill admin pode ser necessário pós-pagamento
- Fluxo afetado: Criação pós-checkout agendamento
- Fluxo afetado: Aceite / recusa / conclusão admin
- Fluxo afetado: Entrega de áudio
- Fluxo afetado: Reconciliação status agendamento ↔ serviços

**Arquivos críticos no diff**

- src/app/api/admin/servicos/route.ts (CRITICAL)
- src/app/lib/asaas-agendamento-payment-effects.ts (CRITICAL)

---

### User

**Riscos**

- Cascade delete remove Payment/Appointment/UserPlan
- Divergência userId entre entidades do fluxo
- Invariante crítico A1 no diff
- Invariante crítico C4 no diff
- Invariante crítico X1 no diff
- Invariante crítico X4 no diff

**Testes a validar**

- [ ] Login e sessão autenticada
- [ ] Ownership: Payment/Appointment/Coupon do mesmo userId no fluxo (X1)
- [ ] Minha Conta agrega entidades do usuário logado
- [ ] Associação manual de cupom (`assignedUserId`) pelo admin
- [ ] Exclusão de conta (cascade — verificar impacto em histórico)
- [ ] Bloqueio de usuário (`blocked`)
- [ ] Simulação admin (`canUseSymbolicSimulation`)
- [ ] Cross-entity ownership divergente (Guardian X1)
- [ ] LGPD / AccountDeletionLog


**Pontos sensíveis**

- Delete User cascade apaga histórico financeiro
- Ownership cross-entity (X1)
- Minha Conta agrega múltiplas entidades
- Fluxo afetado: Autenticação e autorização
- Fluxo afetado: Minha Conta (agregação de todas as entidades)
- Fluxo afetado: Ownership de cupons e agendamentos
- Fluxo afetado: Exclusão de conta (LGPD)

**Arquivos críticos no diff**

- src/app/api/admin/usuarios/route.ts (CRITICAL)
- src/app/api/conta/route.ts (CRITICAL)
- src/app/api/conta/update/route.ts (CRITICAL)
- src/app/api/login/route.ts (CRITICAL)
- src/app/api/meus-dados/route.ts (CRITICAL)
- src/app/api/meus-dados/vincular-cupons-teste/route.ts (CRITICAL)
- src/app/lib/adminAccess.ts (CRITICAL)
- src/app/lib/auth.ts (CRITICAL)
- src/app/lib/coupon-account-ownership.ts (CRITICAL)

---

## Recomendação final

🛑 DO_NOT_MERGE

Mapeamento Decision Engine: **BLOCKED** → **DO_NOT_MERGE**

> Não fazer merge até resolver bloqueios do Decision Engine ou reduzir escopo do PR.

**Motivos (Decision Engine):**

- Risco geral **CRITICAL** (Change Analyzer).
- Invariantes críticos afetados: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4.
- Alteração toca `prisma/schema.prisma` com entidades **Payment** e **Appointment** simultaneamente.

---

## Export (comentário de PR — integração futura)

```markdown
## Domain PR Review — 🛑 DO_NOT_MERGE
**Branch:** main · **HEAD:** fd9ff6d
**Decision Engine:** BLOCKED
**Risco:** CRITICAL
### Riscos observados
- Risco geral do diff: **CRITICAL**
- Escopo de revisão: **FULL**
- 59 arquivo(s) HIGH/CRITICAL no diff
- 38 invariante(s) impactado(s)
- Invariantes críticos no diff: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4
- Schema Prisma alterado — migration obrigatória e revisão de FKs lógicas
- Decision Engine: Risco geral **CRITICAL** (Change Analyzer).
- Decision Engine: Invariantes críticos afetados: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4.
- Decision Engine: Alteração toca `prisma/schema.prisma` com entidades **Payment** e **Appointment** simultaneamente.
### Testes obrigatórios (amostra)
- [ ] Webhook PAYMENT_RECEIVED cria Payment approved com asaasId único (F1/F3)
- [ ] Pagamento agendamento aprovado vincula appointmentId ou appointmentIds (F4)
- [ ] Pagamento plano aprovado materializa UserPlan na janela esperada (F5)
- [ ] Classificação simbólico vs real por metadata (symbolicAgendamento/symbolicPlano)
- [ ] Idempotência: segundo webhook para mesmo asaasId não duplica Payment
- [ ] Checkout cria PaymentMetadata antes do POST Asaas (M1)
- [ ] asaasId preenchido após sucesso do checkout (M2)
- [ ] Webhook resolve metadata válida (expiresAt não expirado — M3)
- … e mais 21
### Por entidade
**Payment** — 12 arquivo(s) crítico(s), 14 teste(s) a validar
**PaymentMetadata** — 6 arquivo(s) crítico(s), 9 teste(s) a validar
**Appointment** — 12 arquivo(s) crítico(s), 12 teste(s) a validar
**Coupon** — 11 arquivo(s) crítico(s), 14 teste(s) a validar
_Gerado por domain-pr-reviewer.ts_
```

```json
{
  "version": 1,
  "generatedAt": "2026-06-23T07:45:20.853Z",
  "recommendation": "DO_NOT_MERGE",
  "decision": "BLOCKED",
  "risk": "CRITICAL",
  "scope": "FULL",
  "entities": [
    "Payment",
    "PaymentMetadata",
    "Appointment",
    "Coupon",
    "UserPlan",
    "Service",
    "User"
  ],
  "criticalFiles": [
    "prisma/schema.prisma",
    "src/app/api/admin/agendamentos/reverter-cancelamento/route.ts",
    "src/app/api/admin/agendamentos/route.ts",
    "src/app/api/admin/cupons/liberar/route.ts",
    "src/app/api/admin/cupons/route.ts",
    "src/app/api/admin/pagamentos/route.ts",
    "src/app/api/admin/planos/excluir-cancelados/route.ts",
    "src/app/api/admin/planos/route.ts",
    "src/app/api/admin/reprocessar-pagamento-teste/route.ts",
    "src/app/api/admin/servicos/route.ts",
    "src/app/api/admin/stats/detalhadas/route.ts",
    "src/app/api/admin/stats/route.ts",
    "src/app/api/admin/usuarios/route.ts",
    "src/app/api/agendamentos/cancelar/route.ts",
    "src/app/api/agendamentos/com-cupom/route.ts",
    "src/app/api/agendamentos/escolher-reembolso/route.ts",
    "src/app/api/asaas/checkout-agendamento/route.ts",
    "src/app/api/asaas/checkout-carrinho/route.ts",
    "src/app/api/asaas/checkout/route.ts",
    "src/app/api/conta/route.ts",
    "src/app/api/conta/update/route.ts",
    "src/app/api/coupons/validate/route.ts",
    "src/app/api/cupons/renunciar/route.ts",
    "src/app/api/esqueci-senha/route.ts",
    "src/app/api/login/route.ts"
  ],
  "githubComment": {
    "body": "## Domain PR Review — 🛑 DO_NOT_MERGE\n**Branch:** main · **HEAD:** fd9ff6d\n**Decision Engine:** BLOCKED\n**Risco:** CRITICAL\n### Riscos observados\n- Risco geral do diff: **CRITICAL**\n- Escopo de revisão: **FULL**\n- 59 arquivo(s) HIGH/CRITICAL no diff\n- 38 invariante(s) impactado(s)\n- Invariantes críticos no diff: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4\n- Schema Prisma alterado — migration obrigatória e revisão de FKs lógicas\n- Decision Engine: Risco geral **CRITICAL** (Change Analyzer).\n- Decision Engine: Invariantes críticos afetados: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4.\n- Decision Engine: Alteração toca `prisma/schema.prisma` com entidades **Payment** e **Appointment** simultaneamente.\n### Testes obrigatórios (amostra)\n- [ ] Webhook PAYMENT_RECEIVED cria Payment approved com asaasId único (F1/F3)\n- [ ] Pagamento agendamento aprovado vincula appointmentId ou appointmentIds (F4)\n- [ ] Pagamento plano aprovado materializa UserPlan na janela esperada (F5)\n- [ ] Classificação simbólico vs real por metadata (symbolicAgendamento/symbolicPlano)\n- [ ] Idempotência: segundo webhook para mesmo asaasId não duplica Payment\n- [ ] Checkout cria PaymentMetadata antes do POST Asaas (M1)\n- [ ] asaasId preenchido após sucesso do checkout (M2)\n- [ ] Webhook resolve metadata válida (expiresAt não expirado — M3)\n- … e mais 21\n### Por entidade\n**Payment** — 12 arquivo(s) crítico(s), 14 teste(s) a validar\n**PaymentMetadata** — 6 arquivo(s) crítico(s), 9 teste(s) a validar\n**Appointment** — 12 arquivo(s) crítico(s), 12 teste(s) a validar\n**Coupon** — 11 arquivo(s) crítico(s), 14 teste(s) a validar\n_Gerado por domain-pr-reviewer.ts_"
  }
}
```

_PR Reviewer somente leitura — não bloqueia pipeline (exit 0)._
_Fontes: change-analysis.md, review-checklist.md, decision.md, action-plan.md, domain-map.md, domain-invariants.md, domain-risks.md_
