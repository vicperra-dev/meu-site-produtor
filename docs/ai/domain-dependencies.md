# Dependências de domínio — THouse

Cadeias de dependência entre entidades e impacto operacional quando a ligação quebra.

**Uso:** agentes de IA, triagem de incidentes, Domain Guardian Advisor, planejamento de migrations.

**Documentos relacionados:** [domain-map.md](./domain-map.md) · [domain-invariants.md](./domain-invariants.md) · [domain-risks.md](./domain-risks.md)

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| **FK** | Foreign key no Prisma |
| **Lógico** | Referência sem FK — maior risco de órfão |
| **Se quebrar** | Impacto ao usuário ou ao negócio |

---

## Cadeias principais

### Checkout agendamento

```
User
↓ (FK)
PaymentMetadata.create
↓ (asaasId após checkout)
Asaas cobrança
↓
Webhook PAYMENT_RECEIVED
↓
Payment.create (asaasId único — F1/F3)
↓
PaymentMetadata resolve → metadata simbólica/real
↓
Appointment.create
↓
Payment.appointmentId / appointmentIds update
↓
Service.create (por item)
↓
Coupon.create (se aplicável)
```

**Se quebrar entre Payment e Appointment:**  
Usuário pagou mas não vê agendamento nem cupons — **F4 violado**. Guardian: F4.

**Se quebrar entre Appointment e Service:**  
Agendamento existe sem itens de trabalho — entrega incompleta. Guardian: A5.

**Se quebrar PaymentMetadata antes do webhook:**  
Webhook sem contexto de itens/data — efeitos incompletos ou falha total.

---

### Checkout plano

```
User
↓
PaymentMetadata.create
↓
Asaas cobrança
↓
Webhook PAYMENT_RECEIVED
↓
Payment.create (type = plano)
↓
UserPlan.create
↓
Subscription.create (se recorrente)
↓
Coupon[] via plan-coupons
```

**Se quebrar Payment ↔ UserPlan (lógico):**  
Reembolso de plano usa heurística 48h — ambiguidade com múltiplos pagamentos. Guardian: P2 se cupons faltando.

**Se quebrar UserPlan → Coupon (FK Cascade):**  
Delete de plano apaga todos os cupons do plano.

---

### Reembolso

```
Appointment | Coupon | UserPlan
↓ (resolve Payment.asaasId)
Payment (status permanece approved)
↓
refundAsaasPayment (outbound)
↓
refundProcessedAt + refundAsaasStatus nas entidades
↓
Webhook PAYMENT_REFUNDED (inbound sync)
```

**Se quebrar resolução Payment.asaasId:**  
Estorno no Asaas no pagamento errado ou falha total — **F6**.

**Se quebrar sync inbound:**  
Estado local `pending` indefinido apesar de estorno real no Asaas.

---

### Remarcação (cupom)

```
Appointment (cancelado/recusado)
↓
escolher-reembolso (opção cupom)
↓
Coupon.create (tipo reembolso)
↓
Appointment.refundCouponId = Coupon.id
↓
Usuário resgata em novo checkout
↓
Coupon.appointmentId → novo Appointment
```

**Se quebrar refundCouponId (lógico, sem FK):**  
Cupom deletado ou ID inválido — remarcação inacessível. Guardian: X2.

**Se quebrar ownership (userId divergente):**  
Cupom de remarcação visível para usuário errado. Guardian: X1.

---

### Minha Conta (leitura)

```
User
↓
Appointment[] (userId + userHiddenAt)
Payment[] (userId)
UserPlan[] (userId + userHiddenAt)
Coupon[] (usedBy | userPlanId | appointmentId | paymentId | assignedUserId)
↓
buildCouponSimulationLookupFromUserPayments
↓
resolveCouponIsSimulacao
```

**Se quebrar vínculo Coupon sem assignedUserId/paymentId:**  
Cupom de simulação não aparece (pós-A2). Guardian: S2.

**Se quebrar classificação simbólica (metadata):**  
Cupom real tratado como teste ou vice-versa. Guardian: S1, S3.

---

## Dependências por par de entidades

### PaymentMetadata → Payment

```
PaymentMetadata
↓ (asaasId)
Payment
```

**Se quebrar:** Webhook cria Payment sem saber itens do checkout; agendamento/plano não materializa.

**Arquivos:** `process-payment-webhook.ts`, `checkout-agendamento/route.ts`

---

### Payment → Appointment

```
Payment
↓ (appointmentId / appointmentIds — LÓGICO)
Appointment
```

**Se quebrar:** Usuário perde acesso ao agendamento pago; reembolso sem alvo; admin vê pagamento órfão.

**Invariantes:** F4, X3  
**Guardian:** F4

---

### Payment → Coupon

```
Payment
↓ (paymentId — FK SetNull)
Coupon
```

**Se quebrar:** Cupom gerado no pagamento perde origem; simulação não classificada; reembolso de cupom avulso falha.

**Arquivos:** `agendamento-payment-coupons.ts`, `simulation-coupon.ts`

---

### Payment → UserPlan

```
Payment
↓ (heurística temporal ~48h — LÓGICO)
UserPlan
```

**Se quebrar:** Plano ativo sem pagamento associável; reembolso de plano ambíguo.

**Invariantes:** F5  
**Guardian:** P2

---

### Appointment → Service

```
Appointment
↓ (appointmentId — FK SetNull)
Service
```

**Se quebrar:** Agendamento confirmado sem serviços; status `concluido` inconsistente.

**Invariantes:** A5, A6  
**Guardian:** A5

---

### Appointment → Coupon (remarcação)

```
Appointment
↓ (refundCouponId — LÓGICO)
Coupon
```

**Se quebrar:** Fluxo de remarcação quebrado; usuário não consegue reagendar com crédito.

**Invariantes:** X2, C3  
**Guardian:** X2

---

### Coupon → Appointment (consumo)

```
Coupon
↓ (appointmentId — LÓGICO)
Appointment
```

**Se quebrar:** Cupom `used` apontando para agendamento inexistente; stale link.

**Invariantes:** C2  
**Guardian:** C2  
**Arquivos:** `coupon-stale-appointment.ts`

---

### UserPlan → Coupon

```
UserPlan
↓ (userPlanId — FK Cascade)
Coupon
```

**Se quebrar:** Delete de plano remove cupons; cupons de plano cancelado ainda resgatáveis.

**Invariantes:** C4, C5, P3  
**Guardian:** P2, C2

---

### User → Payment / Appointment / UserPlan / Service

```
User
↓ (FK Cascade)
Payment | Appointment | UserPlan | Service
```

**Se quebrar (delete User):** Todo histórico financeiro e operacional apagado — apenas `AccountDeletionLog` sobrevive.

**Risco:** CRÍTICO — domain-risks.md #1

---

### User → Coupon (assigned)

```
User
↓ (assignedUserId — FK SetNull)
Coupon
```

**Se quebrar:** Cupom não aparece em Minha Conta apesar de existir no admin.

**Arquivos:** `meus-dados/route.ts`, `vincular-cupons-teste/route.ts`  
**Guardian:** S2

---

## Dependências de infraestrutura externa

```
Asaas API
↓
Payment.asaasId / Subscription.asaasSubscriptionId
↓
Webhook (PAYMENT_RECEIVED | PAYMENT_REFUNDED)
↓
process-payment-webhook.ts
↓
[Efeitos de domínio]
```

**Se quebrar:** Pagamentos ficam `pending`; efeitos nunca aplicados; reconciliação manual necessária.

---

## Dependências de simulação

```
PaymentMetadata (symbolicAgendamento | symbolicPlano)
↓
Payment (approved, metadata-first — A1)
↓
Coupon (TESTE_*)
↓
assignedUserId | paymentId (vínculo explícito — A2)
```

**Se quebrar metadata (fallback amount=5):** Classificação legada frágil. Guardian: S1.

**Se quebrar vínculo cupom:** Simulação invisível em Minha Conta. Guardian: S2.

**Se quebrar prefixos legados:** Resíduo migração. Guardian: S4.

---

## Grafo de acoplamento (resumo)

```
                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
           Cascade         │         Lógico (usedBy)
      ┌──────────┬─────────┼─────────┬──────────┐
      ▼          ▼         ▼         ▼          ▼
  Payment   Appointment UserPlan  Service    Coupon
      │          │         │         │          │
      │ Lógico   │ FK      │ FK      │          │ FK
      └────►─────┘         └────►────┘          │
      │                                        │
 PaymentMetadata (asaasId)              refundCouponId
      │                                  (Lógico)
      └──────── webhook ────────────────────────┘
```

**Maior acoplamento (risco):**

1. **Webhook → Payment → Appointment → Service** — cadeia síncrona pós-pagamento; falha parcial = F4/A5.
2. **Payment ↔ Appointment sem FK** — purge/simulação/cascade deixam referências mortas.
3. **Appointment ↔ Coupon (remarcação) sem FK** — delete de cupom quebra X2.
4. **Payment ↔ UserPlan sem FK** — reembolso e auditoria dependem de heurística temporal.
5. **User Cascade** — delete de conta é operação destrutiva em todo o grafo financeiro.
6. **PaymentMetadata TTL** — checkout antigo sem webhook perde contexto irreversivelmente.

**Menor acoplamento (isolável):**

- `AccountDeletionLog` (estatística)
- `BlockedTimeSlot` (agenda)
- Ocultação usuário (`userHiddenAt`, `userRemovedAt`) — não altera domínio financeiro

---

## Como usar em triagem

| Sintoma | Seguir cadeia |
|---------|---------------|
| "Paguei e não vejo agendamento" | PaymentMetadata → Payment → Appointment (F4) |
| "Plano sem cupons" | Payment → UserPlan → Coupon (P2) |
| "Cupom de remarcação sumiu" | Appointment.refundCouponId → Coupon (X2) |
| "Reembolso não atualizou" | Payment.asaasId → PAYMENT_REFUNDED → refundAsaasStatus |
| "Cupom teste não aparece" | Payment metadata → Coupon → assignedUserId (S2) |
| "Dois clientes no mesmo horário" | Appointment × Appointment (A8) |

---

*Atualizar junto com `domain-map.md` e `domain-invariants.md` quando o modelo ou fluxos mudarem.*
