# EX-01 — Homologação Local (Fase F1)

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Veredito

# EX-01 APROVADO

**Sistema pronto para EX-02.**

---

## Existe erro até o checkout?

**NÃO** (execução final — 10/10 etapas PASS)

---

## Etapas

| # | Etapa | Status | Evidência |
|---|--------|--------|-----------|
| 1 | Abrir Home | **PASS** | `GET /` → 200 (~3.7s) |
| 2 | Registrar usuário | **PASS** | `POST /api/registro` → 200 |
| 3 | Login automático | **PASS** | `GET /api/me` → user + `session_id` |
| 4 | Minha Conta | **PASS** | `/api/meus-dados` 200, `/minha-conta` 200 |
| 5 | Selecionar serviço | **PASS** | Sessão (R$ 40) |
| 6 | Selecionar data | **PASS** | 2026-09-20 14:00 |
| 7 | Adicionar ao carrinho | **PASS** | 1 item, total 40 |
| 8 | Abrir Carrinho | **PASS** | `GET /carrinho` → 200 |
| 9 | Iniciar Checkout | **PASS** | `POST /api/asaas/checkout-carrinho` → 200 |
| 10 | Confirmar checkout | **PASS** | Ver abaixo |

### Etapa 10 — Confirmações

| Campo | Valor |
|-------|--------|
| **paymentId** | `pay_o7t2umh7fecupg7r` |
| **PaymentMetadata** | `1746c284-c15c-49b5-9ebf-b48bf432dfe4` (asaasId vinculado) |
| **initPoint Sandbox** | `https://sandbox.asaas.com/i/o7t2umh7fecupg7r` |

**Pagamento não concluído** — parada no redirect Sandbox conforme escopo.

---

## Usuário de teste

| Campo | Valor |
|-------|--------|
| email | `ex01-1783718270772@homolog.test` |
| userId | `840be10d-e227-4bc9-9522-3282fe987ced` |

---

## Operação auxiliar (sem alterar código)

`npx prisma migrate deploy` — migration `20260617120000_appointment_admin_archive` estava pendente e causava **500** em `/api/meus-dados` (coluna `adminArchivedAt`).

---

## Tentativas durante execução

| # | Parou em | Causa | Resolução |
|---|----------|-------|-----------|
| 1 | Etapa 4 | Schema desalinhado | `prisma migrate deploy` |
| 2 | Etapa 9 | CPF inválido no script de teste | CPF com dígitos verificadores válidos |
| 3 | — | **10/10 PASS** | — |

---

## Pré-condições

| Item | OK |
|------|-----|
| ENV-01 APROVADO | Sim |
| Sandbox ativo | Sim (`$aact_hmlg_`) |
| DATABASE local | Sim |
| Build verde | Sim |
| `npm run dev` | Sim (`localhost:3000`) |

---

## Restrições

- Sem alteração de regra de negócio
- Sem refatoração
- Sem commit
- Pagamento **não** concluído no Asaas

---

## Próximo passo

**EX-02** — fluxo completo com pagamento sandbox + webhook.

---

**Parado após geração dos relatórios.**

Artefatos: `ex01-local-validation.json`, `scripts/ex01-local-smoke.js`
