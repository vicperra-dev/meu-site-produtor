# QE-02 — Auditoria da Jornada de Compra de Serviço

**Modo:** READ ONLY  
**Gerado:** 2026-07-10  
**Branch:** `pr03-clean` @ `66a8e5c`

---

## Veredito

| Item | Resultado |
|------|-----------|
| **Fluxo de Compra de Serviço** | **REPROVADO** |

O pipeline Asaas principal (carrinho → metadata → webhook → effects) está implementado e idempotente em pontos-chave, mas gaps críticos em metadata fallback, orquestração duplicada, UI de teste admin e rotas legadas impedem aprovação para QE funcional sem ressalvas.

---

## Fluxograma textual

```
Escolha do serviço          🟢  agendamento/page.tsx
        ↓
Checkout                    🟢  /api/asaas/checkout-carrinho (produção)
        ↓
PaymentMetadata             🟡  create + asaasId; fallbacks agressivos
        ↓
Asaas                       🟢  AsaasProvider POST /v3/payments
        ↓
Webhook                     🟡  /api/webhooks/asaas (sempre 200)
        ↓
Payment                     🟢  status approved, asaasId unique
        ↓
Effects                     🟢  processCarrinhoPaymentEffects | processAgendamentoPaymentEffects
        ↓
Appointment                 🟢  create idempotente
        ↓
Coupon                      🟢  createCouponsForAgendamentoItems (cupons-only path)
        ↓
Minha Conta                 🟡  /api/meus-dados (+ fallbacks legados)
        ↓
Admin                       🟡  pagamentos/agendamentos OK; teste UI quebrada
```

---

## Mapa por etapa

### 1. Escolha do serviço 🟢

| | |
|---|---|
| **Arquivo** | `src/app/agendamento/page.tsx` |
| **APIs** | `blocked-slots`, `disponibilidade`, `coupons/validate`, `agendamentos/com-cupom` |
| **Libs** | `agendamento-payment-rules.ts`, `validate-coupon-checkout.ts` |
| **Fluxo pago** | sessionStorage → `/carrinho` |
| **Cupom 100%** | `com-cupom` — sem Payment |

### 2. Checkout 🟢

| | |
|---|---|
| **Produção** | `carrinho/page.tsx` → `POST /api/asaas/checkout-carrinho` |
| **API direta** | `POST /api/asaas/checkout-agendamento` (simbólico admin) |
| **Libs** | `payment-providers.ts`, `checkout-coupon-gates.ts`, `appointment-operational-filter.ts` |
| **Prisma** | `PaymentMetadata`, `Appointment` (409 conflito) |

### 3. PaymentMetadata 🟡

| | |
|---|---|
| **Criação** | Antes do POST Asaas; `metadata.tipo = "carrinho"` ou `"agendamento"` |
| **Resolução** | `resolvePaymentMetadataForWebhook` → `loadMetadataForPayment` |
| **Gap** | Fallback até **último metadata do userId** se não achar por asaasId |

### 4. Asaas 🟢

`AsaasProvider` — `externalReference = userId`, `billingType: UNDEFINED`

### 5. Webhook 🟡

| | |
|---|---|
| **Rota** | `POST /api/webhooks/asaas` |
| **Processa** | `PAYMENT_RECEIVED` + `RECEIVED`/`CONFIRMED`; `PAYMENT_REFUNDED` |
| **Idempotência** | `Payment` existente → só `reconcileAgendamentoPaymentArtifacts` |
| **Alternativo** | `process-payment-webhook.ts` (manual/debug — comportamento diferente) |

### 6. Payment 🟢

`status: "approved"`, `asaasId` @unique, `type: "agendamento"`

### 7. Effects 🟢

| Tipo metadata | Lib |
|---------------|-----|
| `carrinho` | `asaas-carrinho-payment-effects.ts` |
| `agendamento` | `asaas-agendamento-payment-effects.ts` |
| Replay | `asaas-agendamento-reconcile.ts` |

### 8. Appointment 🟢

Carrinho: 1 `Appointment` por item com data/hora. Idempotência via `pay.appointmentId`.

### 9. Coupon 🟢

`agendamento-payment-coupons.ts` — idempotente por `paymentId`. Simbólico: prefixo `TESTE_`.

### 10. Minha Conta 🟡

`minha-conta/page.tsx` → `GET /api/meus-dados` — agendamentos + `pagamento.status === "approved"`. Fallbacks R$5/TESTE_.

### 11. Admin 🟡

`admin/pagamentos`, `admin/agendamentos` — OK. **UI teste** em agendamento chama `/api/test-payment` → **410**.

---

## Validações (item 3)

| Verificação | Resultado |
|-------------|-----------|
| PaymentMetadata criado uma vez | **Parcial** — por intent no checkout; fallback pode cruzar pagamentos |
| Webhook idempotente | **Parcial** — Payment único; retry não reexecuta effects |
| Payment criado uma vez | **SIM** |
| Appointment criado uma vez | **SIM** |
| Coupon criado corretamente | **SIM** |
| Minha Conta atualiza status | **SIM** |
| Admin estado correto | **SIM** |

---

## Duplicação e legado (item 4)

| Pergunta | Resposta |
|----------|----------|
| Lógica duplicada? | **SIM** — webhook Asaas vs `process-payment-webhook.ts` |
| Fluxo paralelo antigo? | **SIM** — Mercado Pago / InfinityPay checkout sem metadata |
| Código morto? | **SIM** — `agendamento-checkout` cache; MP webhook stub |
| Webhook antigo em uso? | **NÃO** em produção (Asaas ativo) |
| Effects antigos? | **NÃO** — unificados em `asaas-*-payment-effects` |

---

## Status (item 5)

| Contexto | Valores |
|----------|---------|
| **Asaas** | PENDING, RECEIVED, CONFIRMED, REFUNDED |
| **Webhook processa** | RECEIVED \| CONFIRMED → efeitos |
| **Payment local** | pending, approved, rejected — **sem REFUNDED** |
| **Appointment** | pendente, aceito, confirmado, cancelado |
| **CANCELLED** | Não em Payment |

---

## Admin (item 6)

| Ação | Status |
|------|--------|
| Reprocessamento simbólico | 🟢 `reprocessar-pagamento-teste` |
| Cancelamento | 🟢 user + admin, `alreadyProcessed` |
| Reembolso | 🟢 `escolher-reembolso` + webhook REFUNDED |
| DELETE simbólico | 🟢 `canAdminDeletePayment` |
| DELETE real → 422 | 🟢 integração financeira / appointment / cupons ativos |

---

## Cenário produção: serviço avulso

Usuário real com 1 serviço + data/hora:

```
agendamento → carrinho → checkout-carrinho (tipo=carrinho)
→ webhook → processCarrinhoPaymentEffects → Appointment + Service
```

**Não** passa por `checkout-agendamento` na UI.

---

## Gaps — ordem de criticidade

### 🔴 Crítico

1. **G01** — UI admin teste quebrada (`/api/test-payment` → 410 para agendamento)
2. **G02** — PaymentMetadata fallback usa último metadata do `userId`
3. **G03** — Carrinho referencia `checkout-carrinho` só para Asaas; MP/Infinity incompletos
4. **G04** — Dois orquestradores webhook com comportamento diferente em retry
5. **G05** — Avulso UI = `carrinho`; regras cupons-only vivem só em `checkout-agendamento`

### 🟡 Atenção

6. **G06** — PaymentMetadata.create falha silenciosamente no checkout
7. **G07** — Webhook duplicata não reexecuta effects (só reconcile)
8. **G08** — Payment local sem status REFUNDED
9. **G09** — PAYMENT_OVERDUE / DELETED ignorados
10. **G10** — Minha Conta com fallbacks legados R$5/TESTE_
11. **G11** — Pipeline Mercado Pago incompleto

### 🟢 OK (pontos fortes)

- PaymentMetadata antes do Asaas (checkouts ativos)
- `asaasId` unique + idempotência Payment
- Cupons idempotentes por `paymentId`
- Gate DELETE simbólico vs real (422)
- Conflito de slot no checkout (409)
- Provider produção = Asaas

---

Restrições respeitadas: sem alteração de código, commits ou banco.
