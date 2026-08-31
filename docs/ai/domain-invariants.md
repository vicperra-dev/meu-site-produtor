# Invariantes de domínio — THouse

Documentação permanente derivada da auditoria de integridade do domínio (schema Prisma + código atual).

**Uso:** agentes de IA, Domain Guardian, revisões de PR em áreas financeiras/operacionais.

**Classificação:** CRÍTICO | ALTO | MÉDIO | BAIXO

**Nota:** `adminArchivedAt` / `adminArchivedReason` arquivam soft no admin; não alteram Minha Conta nem `Payment`. Exclusão física admin permanece bloqueada (HTTP 422).

---

# Financeiro

| ID | Invariante | Classificação |
|----|------------|---------------|
| **F1** | `Payment.asaasId` é único globalmente quando preenchido. | CRÍTICO |
| **F2** | `Payment.status = approved` com `asaasId` real implica cobrança existente no Asaas. | CRÍTICO |
| **F3** | Webhook `PAYMENT_RECEIVED` não deve criar segundo `Payment` para o mesmo `asaasId`. | CRÍTICO |
| **F4** | `Payment.type = agendamento` e `status = approved` deve ter `appointmentId` ou `appointmentIds` resolvíveis após efeitos pós-pagamento (`asaas-agendamento-payment-effects`, reconcile). | ALTO |
| **F5** | `Payment.type = plano` e `status = approved` deve ter `UserPlan` do mesmo usuário em janela temporal coerente (~48h de `createdAt`). | ALTO |
| **F6** | Reembolso outbound (`refundAsaasPayment`) deve usar `Payment.asaasId` do pagamento correto do agendamento, cupom ou plano. | CRÍTICO |
| **F7** | Webhook `PAYMENT_REFUNDED` deve sincronizar `refundAsaasStatus` apenas em entidades com `refundProcessedAt` já preenchido (Appointment, Coupon, UserPlan). | ALTO |
| **F8** | `Payment` approved com integração real (`asaasId` não simbólico) não deve ser excluído fisicamente; `canAdminDeletePayment` restringe delete a `pending`/`rejected`, simbólico órfão ou casos explícitos. | CRÍTICO |
| **F9** | Identidade canônica de gateway: `Payment.provider` + `Payment.providerPaymentId`. Simulation NÃO usa `asaasId`. Lookups via `paymentByProviderIdWhere`. | CRÍTICO |
| **H1** | Toda alteração em pagamentos/workflow/agendamento/planos/cupons/reembolso deve ter cenário no Homologation Engine (`docs/architecture/homologation-engine.md`). | CRÍTICO |
| **S1** | Upload/leitura de entrega usa apenas `StorageProvider` (`src/app/lib/storage`); default `LocalStorageProvider`. Sem `fs`/`public/uploads` nas rotas de produto. | ALTO |

## PaymentMetadata (pré-pagamento)

| ID | Invariante | Classificação |
|----|------------|---------------|
| **M1** | Checkout deve criar `PaymentMetadata` **antes** do POST ao Asaas (payload completo; `externalReference` limitado a `userId`). | CRÍTICO |
| **M2** | `PaymentMetadata.asaasId` deve ser preenchido após sucesso do checkout Asaas. | ALTO |
| **M3** | Metadata deve estar válido (`expiresAt` não expirado) quando o webhook processa o pagamento (TTL ~24h). | ALTO |
| **M4** | `PaymentMetadata` é cache transitório; após `Payment.create` a fonte de verdade financeira é `Payment`, não metadata. | MÉDIO |

**Campos de reembolso:** não existem em `Payment`. Trilha de reembolso vive em `Appointment`, `Coupon` e `UserPlan`.

---

# Appointment

| ID | Invariante | Classificação |
|----|------------|---------------|
| **A1** | `Appointment.userId` sempre referencia `User` existente (FK com `onDelete: Cascade`). | CRÍTICO |
| **A2** | Agendamento vinculado a `Payment` approved deve existir antes de iniciar reembolso direto (`escolher-reembolso`). | CRÍTICO |
| **A3** | `cancelRefundOption = reembolso` implica `status` em `cancelado` ou `recusado`. | ALTO |
| **A4** | `refundProcessedAt` preenchido implica `cancelRefundOption = reembolso`. | ALTO |
| **A5** | Agendamento aceito/confirmado com cobrança real deve ter ≥1 `Service` com `appointmentId` (backfill admin existe; não é garantido automaticamente em todos os fluxos). | MÉDIO |
| **A6** | `Appointment.status = concluido` com serviços ainda abertos é corrigido por `reconcileAppointmentWithServices` (rebaixa para `em_andamento` ou `aceito`). | MÉDIO |
| **A7** | `userHiddenAt` altera apenas visibilidade na Minha Conta; não altera status financeiro nem `Payment`. | ALTO |
| **A8** | Não deve haver dois agendamentos não cancelados e não arquivados no mesmo slot de horário; conflito verificado em checkout e `POST /api/agendamentos` (`status` ≠ `cancelado`; `adminArchivedAt` IS NULL). | ALTO |
| **A9** | `adminArchivedAt` só em `concluido` / `cancelado` / `recusado` resolvido; não altera Minha Conta; `adminArchivedReason` obrigatória (mín. 3 caracteres). | ALTO |

---

# Coupon

| ID | Invariante | Classificação |
|----|------------|---------------|
| **C1** | `Coupon.code` é único globalmente. | CRÍTICO |
| **C2** | Cupom `used = true` deve ter rastreabilidade: `usedBy` e/ou `appointmentId` e/ou consumo resolvível via `paymentId` / `userPlanId`. | ALTO |
| **C3** | Cupom `couponType = reembolso` ativo ligado a `Appointment.refundCouponId` deve pertencer ao mesmo `userId` do agendamento origem. | ALTO |
| **C4** | Cupom com `userPlanId` deve pertencer ao `UserPlan.userId` (FK `userPlanId` → `UserPlan`). | CRÍTICO |
| **C5** | Cupom de plano não deve ser utilizável quando o plano está cancelado, inativado pelo admin ou em fluxo de reembolso (`isPlanCouponBlockedByPlanRefund`, `getPlanCouponUsageBlockMessage`). | ALTO |
| **C6** | `userRemovedAt` oculta cupom na Minha Conta; registro permanece no admin e em estatísticas. | MÉDIO |
| **C7** | Cupons de simulação (`TESTE_`, pagamento simbólico R$ 5, `isSimulationCoupon`) devem permanecer isoláveis de cupons de produção. | MÉDIO |

---

# UserPlan

| ID | Invariante | Classificação |
|----|------------|---------------|
| **P1** | `UserPlan.status = active` implica plano vigente (não `cancelled` sem transição; `adminInactiveAt` inativa operacionalmente). | ALTO |
| **P2** | Plano recém-criado deve ter gerado cupons de serviço conforme catálogo do plano (`plan-coupons.ts`). Plano ativo com todos os cupons usados é válido; invariante é sobre geração inicial, não sobre cupons restantes. | ALTO |
| **P3** | `refundProcessedAt` implica `refundRequestedAt` e bloqueio de cupons não usados para reembolso (`lockUnusedPlanCouponsForRefund`). | CRÍTICO |
| **P4** | `adminInactiveAt` bloqueia cupons não usados na Minha Conta do usuário. | ALTO |
| **P5** | `UserPlan` com cupons usados ou reembolso em trilha não deve ser excluído fisicamente (admin DELETE bloqueado 422). | CRÍTICO |
| **P6** | `Subscription.asaasSubscriptionId` deve estar coerente com ciclo de vida do plano (cancelamento no Asaas ao inativar/reembolsar). | ALTO |

---

# Cross-domain

| ID | Invariante | Classificação |
|----|------------|---------------|
| **X1** | Mesmo `userId` em `Payment`, `Appointment` e `Coupon` de um único fluxo de negócio (ownership via `coupon-account-ownership`, `couponBelongsToUser`). | CRÍTICO |
| **X2** | Tríade remarcação: `Appointment.refundCouponId` → `Coupon.id` → mesmo `userId` do agendamento origem. | CRÍTICO |
| **X3** | Carrinho: `Payment.appointmentIds` deve ser subconjunto dos `Appointment` criados no mesmo processamento de webhook/payment-effects. | ALTO |
| **X4** | Exclusão física admin de entidades históricas (agendamento, plano, lote cupons) bloqueada (422); purge via `purge-cancelled-appointment` sem caller ativo. | CRÍTICO |
| **X5** | Artefatos de simulação (R$ 5, `resetSimulationArtifacts`) não devem apagar ou corromper registros de produção. | MÉDIO |

---

## Registros de histórico permanente

Não excluir fisicamente (arquivar no futuro; hoje: reter no banco):

- `Payment` approved com `asaasId` real
- `Appointment` cancelado/recusado com reembolso ou cupom de remarcação resolvido
- `Coupon` usado ou em fluxo de reembolso
- `UserPlan` com pagamento, reembolso ou cupons usados
- `Service` concluído com `deliveryAudioUrl`
- `AccountDeletionLog` (estatística pós-LGPD)

Descartáveis: `PaymentMetadata` expirado, `Payment` pending/rejected sem `asaasId`, cupom de reserva não usado (`coupon-release`), artefatos puramente simbólicos.

---

## Referência rápida — proteções no código

| Área | Mecanismo |
|------|-----------|
| Webhook duplicado | Idempotência por `Payment.asaasId`; `reconcileAgendamentoPaymentArtifacts` |
| Delete admin Payment | `canAdminDeletePayment` |
| Delete admin Coupon | `canAdminDeleteCoupon` |
| Purge admin | HTTP 422 em agendamentos, planos, excluir-cancelados, excluir-lote |
| Apt ↔ Service | `reconcileAppointmentWithServices` |
| Cupom stale | `normalizeStaleCouponAppointmentLink` |
| Reembolso inbound | `syncInboundRefundConfirmation` (`payment-refund-sync`) |
| Ocultação usuário | `appointment-hidden`, `coupon-visibility`, `user-plan-hidden` |

---

*Última consolidação: auditoria de integridade do domínio THouse. Não alterar invariantes sem revisão humana e atualização deste documento.*
