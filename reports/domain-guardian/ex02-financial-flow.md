# EX-02 — Homologação Completa do Fluxo Financeiro Sandbox

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Veredito

# EX-02 APROVADO

- **Fluxo financeiro aprovado.**
- **Webhook aprovado.**
- **Effects aprovados.**
- **Appointment aprovado.**
- **Service aprovado.**
- **Minha Conta aprovada.**
- **Admin aprovado.**

---

## Launch Confidence Score (LCS)

| | % |
|---|---|
| **Antes** | **74%** |
| **Depois** | **86%** |
| Delta | +12 |

---

## Fluxo executado

| # | Etapa | Status |
|---|--------|--------|
| 1 | initPoint Sandbox | PASS |
| 2 | Pagamento Sandbox (`receiveInCash`) | PASS — `RECEIVED_IN_CASH` |
| 3 | Replay webhook canônico (localhost) | PASS — HTTP 200 |
| 4 | Payment + Appointment + Service | PASS |
| 4b | Idempotência (2º webhook) | PASS |
| 5 | Minha Conta | PASS |
| 6 | Admin | PASS |

---

## Artefatos criados

| Entidade | ID | Status |
|----------|-----|--------|
| Payment (Asaas) | `pay_o7t2umh7fecupg7r` | approved |
| Payment (DB) | `5df4f5c8-c87f-4a9f-8feb-2f2904ea31e8` | approved |
| PaymentMetadata | `1746c284-c15c-49b5-9ebf-b48bf432dfe4` | asaasId vinculado |
| Appointment | `32` | pendente (2026-09-20 14:00) |
| Service | `19b74812-07d3-4f7f-ac9d-fff2718a474f` | pendente (Sessão) |
| Coupon | — | N/A (fluxo com data/hora direta) |

---

## Validações

| Check | OK |
|-------|-----|
| Effects executados uma vez | Sim |
| Sem Appointment duplicado | Sim |
| Sem Payment duplicado | Sim |
| Sem Service duplicado | Sim |
| PaymentMetadata consumido | Sim |

---

## Minha Conta

- `GET /api/meus-dados` → 200
- 1 agendamento visível, status **pendente**

---

## Correção mínima (durante execução)

**Arquivo:** `src/app/api/webhooks/asaas/route.ts`

**Problema:** descrição `Carrinho THouse Rec - 1 agendamento(s)` acionava `isAgendamentoDesc` antes do branch `tipo === "carrinho"`, impedindo `processCarrinhoPaymentEffects`.

**Correção:** processar **carrinho antes de agendamento** no webhook.

Primeira tentativa falhou na etapa 4; após correção + reset do Payment órfão + replay → sucesso.

---

## Pagamento

- **initPoint:** `https://sandbox.asaas.com/i/o7t2umh7fecupg7r`
- **Usuário teste:** `ex01-1783718270772@homolog.test`
- **Webhook:** replay local (`PAYMENT_RECEIVED`, status `RECEIVED`)

---

**Sem commit. Parado após geração dos relatórios.**

Artefatos: `ex02-financial-flow.json`, `scripts/ex02-financial-flow.js`
