# Mapa de domínio — THouse

Mapa estruturado das entidades principais para consumo por agentes de IA, Domain Guardian e revisões arquiteturais.

**Documentos relacionados:** [domain-invariants.md](./domain-invariants.md) · [domain-risks.md](./domain-risks.md) · [domain-dependencies.md](./domain-dependencies.md)

**Última consolidação:** Fase 3 — Agente de Arquitetura (pós-migração simulação A1/A2).

---

## Payment

**Responsabilidade:**  
Representa um pagamento registrado no sistema (Asaas ou simbólico). É a fonte de verdade financeira após confirmação (`status = approved`). Não armazena trilha de reembolso — esta vive em `Appointment`, `Coupon` e `UserPlan`.

**Relacionamentos:**

| Direção | Entidade | Tipo | Campos |
|---------|----------|------|--------|
| → | **User** | FK | `userId` (Cascade) |
| → | **Appointment** | Lógico | `appointmentId`, `appointmentIds` (JSON) — **sem FK** |
| ← | **Coupon** | FK | `Coupon.paymentId` (SetNull) |
| ↔ | **PaymentMetadata** | Lógico | `Payment.asaasId` ↔ `PaymentMetadata.asaasId` |
| ↔ | **UserPlan** | Lógico | Heurística temporal (~48h `createdAt`), sem FK |

**Dependências:**

- Asaas (`asaasId`, webhooks `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`)
- `PaymentMetadata` válido no momento do webhook (checkout prévio)
- `process-payment-webhook.ts` / `asaas-*-payment-effects.ts` para efeitos pós-pagamento

**Arquivos principais:**

- `src/app/lib/process-payment-webhook.ts`
- `src/app/api/webhooks/asaas/route.ts`
- `src/app/lib/asaas-agendamento-payment-effects.ts`
- `src/app/lib/asaas-plano-payment-effects.ts`
- `src/app/lib/asaas-agendamento-reconcile.ts`
- `src/app/lib/appointment-refund-payment.ts`
- `src/app/lib/symbolic-payment.ts`
- `src/app/lib/admin-delete-payment.ts`
- `src/app/api/asaas/checkout-agendamento/route.ts`
- `src/app/api/admin/pagamentos/route.ts`

**Invariantes relacionados:** F1, F2, F3, F4, F5, F6, F7, F8, X1, X3, X5

**Fluxos de negócio impactados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)

**Operações críticas:**

| Operação | Onde |
|----------|------|
| `PAYMENT_RECEIVED` | `webhooks/asaas/route.ts` → `process-payment-webhook.ts` |
| `PAYMENT_REFUNDED` | `webhooks/asaas/route.ts` → sync `refundAsaasStatus` |
| `Payment.create` (idempotente por `asaasId`) | Webhook / reconcile |
| Reprocessamento admin | `reprocessar-pagamento-teste`, `reprocessar-pagamento-plano-teste` |
| Delete admin | `canAdminDeletePayment` (restrito) |

**Guardian:** F1, F4

---

## PaymentMetadata

**Responsabilidade:**  
Cache transitório do payload completo de checkout **antes** da criação do pagamento no Asaas. Permite `externalReference` limitado a `userId` (limite Asaas ~100 chars). Expira em ~24h.

**Relacionamentos:**

| Direção | Entidade | Tipo | Campos |
|---------|----------|------|--------|
| → | **User** | Lógico | `userId` (sem FK) |
| ↔ | **Payment** | Lógico | `asaasId` preenchido após checkout Asaas |

**Dependências:**

- Checkout deve criar metadata **antes** do POST Asaas
- Webhook resolve metadata por `asaasId` ou janela temporal (`symbolic-payment-resolve.ts`)
- Após `Payment.create`, fonte de verdade migra para `Payment`

**Arquivos principais:**

- `src/app/api/asaas/checkout-agendamento/route.ts`
- `src/app/lib/process-payment-webhook.ts`
- `src/app/lib/symbolic-payment-resolve.ts`
- `src/app/api/admin/reprocessar-pagamento-teste/route.ts`
- `src/app/api/admin/reprocessar-pagamento-plano-teste/route.ts`

**Invariantes relacionados:** M1, M2, M3, M4

**Fluxos de negócio impactados:**

- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)

**Operações críticas:**

| Operação | Onde |
|----------|------|
| `PaymentMetadata.create` | Checkout routes |
| `PaymentMetadata.asaasId` update | Pós-sucesso Asaas |
| Resolução no webhook | `process-payment-webhook.ts`, `findNearestMetadataForPayment` |
| Expiração TTL | `expiresAt` (~24h) — sem job automático de limpeza |

**Guardian:** — (indireto via S1, S3)

---

## Appointment

**Responsabilidade:**  
Representa um slot de agendamento do usuário (sessão, captação, etc.). Concentra estado operacional (`status`), escolha de reembolso/remarcação e visibilidade na Minha Conta.

**Relacionamentos:**

| Direção | Entidade | Tipo | Campos |
|---------|----------|------|--------|
| → | **User** | FK | `userId` (Cascade) |
| ← | **Service** | FK | `Service.appointmentId` (SetNull) |
| ↔ | **Payment** | Lógico | `Payment.appointmentId`, `appointmentIds` |
| ↔ | **Coupon** | Lógico | `refundCouponId`, `Coupon.appointmentId` — **sem FK** |

**Dependências:**

- `Payment` approved para fluxos de reembolso direto
- `Service` para entregas e sync de status
- `BlockedTimeSlot` / validação de conflito no checkout

**Arquivos principais:**

- `src/app/lib/asaas-agendamento-payment-effects.ts`
- `src/app/lib/appointment-hidden.ts`
- `src/app/lib/appointment-refund-payment.ts`
- `src/app/lib/appointment-refund-value.ts`
- `src/app/lib/appointment-service-sync.ts`
- `src/app/api/agendamentos/route.ts`
- `src/app/api/agendamentos/escolher-reembolso/route.ts`
- `src/app/api/asaas/checkout-agendamento/route.ts`

**Invariantes relacionados:** A1–A8, F4, X1, X2, X3

**Fluxos de negócio impactados:**

- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)

**Operações críticas:**

| Operação | Onde |
|----------|------|
| `Appointment.create` | `asaas-agendamento-payment-effects.ts` |
| `cancelRefundOption` + reembolso | `escolher-reembolso/route.ts` |
| `refundCouponId` (remarcação) | `escolher-reembolso`, `coupon-refund.ts` |
| Sync status ↔ Service | `appointment-service-sync.ts`, `reconcileAppointmentWithServices` |
| Ocultar da conta | `appointment-hidden.ts` |

**Guardian:** F4, A5, A8, X1, X2

---

## Coupon

**Responsabilidade:**  
Representa benefício resgatável (plano, agendamento, reembolso/remarcação). Pode ser gerado por pagamento, plano ou fluxo de reembolso. Código único global (`code`).

**Relacionamentos:**

| Direção | Entidade | Tipo | Campos |
|---------|----------|------|--------|
| → | **UserPlan** | FK | `userPlanId` (Cascade) |
| → | **Payment** | FK | `paymentId` (SetNull) |
| → | **User** | FK | `assignedUserId` (SetNull) |
| → | **User** | Lógico | `usedBy` — **sem FK** |
| ↔ | **Appointment** | Lógico | `appointmentId`, `Appointment.refundCouponId` |

**Dependências:**

- `UserPlan` ativo para cupons de plano (`isPlanCouponBlockedByPlanRefund`)
- `Payment` simbólico ou real para classificação (`simulation-coupon.ts`)
- Regras de booking (`coupon-booking-rules.ts`, `validate-coupon-checkout.ts`)

**Arquivos principais:**

- `src/app/lib/agendamento-payment-coupons.ts`
- `src/app/lib/plan-coupons.ts`
- `src/app/lib/coupon-refund.ts`
- `src/app/lib/coupon-visibility.ts`
- `src/app/lib/coupon-account-ownership.ts`
- `src/app/lib/simulation-coupon.ts`
- `src/app/lib/simulation-coupon-user-link.ts`
- `src/app/lib/coupon-stale-appointment.ts`
- `src/app/api/meus-dados/route.ts`

**Invariantes relacionados:** C1–C7, X1, X2, X5

**Fluxos de negócio impactados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Operações críticas:**

| Operação | Onde |
|----------|------|
| Geração em lote | `agendamento-payment-coupons.ts`, `plan-coupons.ts` |
| Consumo / `used = true` | Checkout, `POST /api/agendamentos` |
| Reembolso cupom | `coupon-refund.ts`, `escolher-reembolso` |
| Vinculação simulação | `vincular-cupons-teste/route.ts` |
| Reparo stale link | `coupon-stale-appointment.ts` |
| Liberação admin | `adminPodeLiberarCupomPorCodigo` |

**Guardian:** C1, C2, S2, S4

---

## UserPlan

**Responsabilidade:**  
Representa assinatura de plano do usuário (teste, bronze, prata, ouro). Agrupa cupons de serviço e trilha de reembolso proporcional.

**Relacionamentos:**

| Direção | Entidade | Tipo | Campos |
|---------|----------|------|--------|
| → | **User** | FK | `userId` (Cascade) |
| ← | **Coupon** | FK | `Coupon.userPlanId` (Cascade) |
| → | **Subscription** | FK | `Subscription.userPlanId` (1:1, Cascade) |
| ↔ | **Payment** | Lógico | Janela temporal ~48h, sem FK |

**Dependências:**

- `Payment` approved tipo `plano` para criação
- `Subscription.asaasSubscriptionId` para ciclo recorrente
- Catálogo de preços (`plan-prices.ts`, `plan-coupons.ts`)

**Arquivos principais:**

- `src/app/lib/asaas-plano-payment-effects.ts`
- `src/app/lib/plan-coupons.ts`
- `src/app/lib/active-user-plan.ts`
- `src/app/lib/user-plan-hidden.ts`
- `src/app/lib/plan-refund.ts`
- `src/app/api/planos/solicitar-reembolso/route.ts`

**Invariantes relacionados:** P1–P6, F5, C4, C5, X1

**Fluxos de negócio impactados:**

- Checkout plano
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Ocultação Minha Conta (`userHiddenAt`)

**Operações críticas:**

| Operação | Onde |
|----------|------|
| `UserPlan.create` | `asaas-plano-payment-effects.ts` |
| Geração cupons plano | `plan-coupons.ts` |
| Solicitar reembolso | `solicitar-reembolso/route.ts` |
| Bloqueio cupons não usados | `lockUnusedPlanCouponsForRefund` |
| Cancelamento assinatura Asaas | Webhook / admin |

**Guardian:** P2

---

## Service

**Responsabilidade:**  
Representa um item de trabalho/entrega vinculado ao usuário e opcionalmente a um agendamento (sessão, mix, captação, etc.). Estado de entrega (`deliveryAudioUrl`) após conclusão.

**Relacionamentos:**

| Direção | Entidade | Tipo | Campos |
|---------|----------|------|--------|
| → | **User** | FK | `userId` (Cascade) |
| → | **Appointment** | FK | `appointmentId` (SetNull) |

**Dependências:**

- Criação em `asaas-agendamento-payment-effects.ts` (pós-pagamento)
- Sync bidirecional com `Appointment.status` (`appointment-service-sync.ts`)

**Arquivos principais:**

- `src/app/lib/asaas-agendamento-payment-effects.ts`
- `src/app/lib/appointment-service-sync.ts`
- `src/app/api/admin/servicos/` (rotas admin)

**Invariantes relacionados:** A5, A6

**Fluxos de negócio impactados:**

- Criação pós-checkout agendamento
- Aceite / recusa / conclusão admin
- Entrega de áudio
- Reconciliação status agendamento ↔ serviços

**Operações críticas:**

| Operação | Onde |
|----------|------|
| `Service.create` (lote) | `asaas-agendamento-payment-effects.ts` |
| `reconcileAppointmentWithServices` | `appointment-service-sync.ts` |
| Conclusão + entrega | Admin serviços |

**Guardian:** A5

---

## User

**Responsabilidade:**  
Identidade da conta (artista/cliente). Âncora de ownership para todo o domínio financeiro e operacional. `role` distingue USER vs admin (`hasAdminAccess`).

**Relacionamentos:**

| Direção | Entidade | Tipo | onDelete |
|---------|----------|------|----------|
| ← | **Payment** | FK | Cascade |
| ← | **Appointment** | FK | Cascade |
| ← | **Coupon** | FK | SetNull (`assignedUserId`) |
| ← | **UserPlan** | FK | Cascade |
| ← | **Service** | FK | Cascade |
| ← | **Subscription** | FK | Cascade |
| → | **AccountDeletionLog** | Lógico | Estatística pós-LGPD |

**Dependências:**

- Auth (`requireAuth`, sessões)
- Cascade delete apaga histórico financeiro inteiro (risco crítico — ver domain-risks.md)

**Arquivos principais:**

- `src/app/lib/auth.ts`
- `src/app/lib/adminAccess.ts`
- `src/app/lib/coupon-account-ownership.ts`
- `src/app/api/meus-dados/route.ts`
- `src/app/api/auth/` (login, registro, exclusão conta)

**Invariantes relacionados:** A1, C4, X1, X4

**Fluxos de negócio impactados:**

- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Operações críticas:**

| Operação | Onde |
|----------|------|
| Login / sessão | `auth.ts`, `Session` |
| Exclusão conta | Cascade em Payment, Appointment, UserPlan, Service |
| `assignedUserId` (admin) | Associação manual de cupons |
| Bloqueio usuário | `User.blocked` |

**Guardian:** X1 (divergência cross-entity)

---

## Matriz entidade × Guardian

| Entidade | Checks Guardian |
|----------|---------------|
| Payment | F1, F4, S1, S3 |
| PaymentMetadata | S1, S3 (indireto) |
| Appointment | F4, A5, A8, X2 |
| Coupon | C1, C2, S2, S4 |
| UserPlan | P2 |
| Service | A5 |
| User | X1 |

---

## Referência cruzada — simulação

| Conceito | Entidades | Arquivos |
|----------|-----------|----------|
| Pagamento simbólico | Payment + PaymentMetadata | `symbolic-payment.ts`, `symbolic-payment-resolve.ts` |
| Cupons teste | Coupon | `simulation-coupon.ts`, `simulation-coupon-codes.ts` |
| Reset ambiente | Todas (filtro simbólico) | `simulation-reset.ts` |
| Vinculação manual | Coupon, Payment, Appointment | `vincular-cupons-teste/route.ts` |

---

*Manter este mapa alinhado a `domain-invariants.md` e ao schema Prisma. Alterações de modelo exigem atualização conjunta.*
