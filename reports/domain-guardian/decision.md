# Domain Decision

**Gerado em:** 2026-07-06T00:38:53.879Z
**Branch:** main
**HEAD:** fd9ff6d
**Mensagem:** hardening completo sistema: cupons, webhook, idempotencia, sync e validações finais

---

## 1. Decisão final

🛑 **BLOCKED**

| Sinal | Valor |
|-------|-------|
| Risco (Change Analyzer) | CRITICAL |
| Escopo de revisão | FULL |
| Guardian errors | 0 |
| Guardian warnings | 0 |
| Advisor status | HEALTHY |
| Arquivos alterados | 154 |
| Arquivos HIGH/CRITICAL | 59 |

---

## 2. Motivos

### Bloqueio

- Risco geral **CRITICAL** (Change Analyzer).
- Invariantes críticos afetados: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4.
- Alteração toca `prisma/schema.prisma` com entidades **Payment** e **Appointment** simultaneamente.

---

## 3. Entidades afetadas

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

- … e mais 25 fluxo(s)

---

## 4. Invariantes afetados

**Total no diff:** 38

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

**Invariantes críticos tocados:**

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

---

## 5. Checks Guardian relevantes

- **A5** — OK — errors: 0, warnings: 0, info: 0
- **A8** — OK — errors: 0, warnings: 0, info: 0
- **C1** — OK — errors: 0, warnings: 0, info: 0
- **C2** — OK — errors: 0, warnings: 0, info: 0
- **F1** — OK — errors: 0, warnings: 0, info: 0
- **F4** — OK — errors: 0, warnings: 0, info: 0
- **P2** — OK — errors: 0, warnings: 0, info: 0
- **S1** — OK — errors: 0, warnings: 0, info: 0
- **S2** — OK — errors: 0, warnings: 0, info: 0
- **S3** — OK — errors: 0, warnings: 0, info: 0
- **S4** — INFO — errors: 0, warnings: 0, info: 1 — Legado no banco: 0 cupom(ns) TESTE_AGEND_*, 0 cupom(ns) TESTE_PAY_*
- **X1** — OK — errors: 0, warnings: 0, info: 0
- **X2** — OK — errors: 0, warnings: 0, info: 0

**Advisor (checks com ocorrências):**

- **S4** (INFO) — 1 info

---

## 6. Testes obrigatórios

Escopo **FULL** — 29 teste(s) obrigatório(s) no checklist.

- Webhook PAYMENT_RECEIVED cria Payment approved com asaasId único (F1/F3)
- Pagamento agendamento aprovado vincula appointmentId ou appointmentIds (F4)
- Pagamento plano aprovado materializa UserPlan na janela esperada (F5)
- Classificação simbólico vs real por metadata (symbolicAgendamento/symbolicPlano)
- Idempotência: segundo webhook para mesmo asaasId não duplica Payment
- Checkout cria PaymentMetadata antes do POST Asaas (M1)
- asaasId preenchido após sucesso do checkout (M2)
- Webhook resolve metadata válida (expiresAt não expirado — M3)
- Flags simbólicas presentes quando checkout de teste
- Criação pós-pagamento com userId correto (A1)
- Agendamento visível em Minha Conta após pagamento
- Cancelamento com opção reembolso ou cupom (A3)
- Conflito de horário bloqueado no checkout (A8)
- Reembolso direto exige Payment approved vinculado (A2)
- Criar cupom (geração pós-pagamento / plano)
- Resgatar cupom no checkout ou agendamento com cupom
- Reembolso direto de cupom avulso
- Remarcação via cupom de reembolso (refundCouponId)
- Cupom ocultado pelo usuário (`userRemovedAt`) some de Minha Conta
- Criação de plano pós-pagamento approved
- Geração inicial de cupons conforme catálogo do plano (P2)
- Plano ativo visível em Minha Conta
- Solicitar reembolso bloqueia cupons não usados (P3)
- Criação de Service por item pós-checkout agendamento
- Vínculo Service.appointmentId correto

- … e mais 4 teste(s) em `review-checklist.md`

---

## 7. Próximos passos

- Não fazer merge até resolver os motivos de bloqueio.
- Reduzir escopo do diff ou dividir em PRs menores (split-to-prs).
- Revisar migration Prisma com foco em Payment ↔ Appointment (F4, A2, X2).
- Reexecutar pipeline: change-analyzer → review-engine → decision-engine.

---

## Critérios aplicados

| Decisão | Condição |
|---------|----------|
| **BLOCKED** | Risco CRITICAL · Guardian errors > 0 · invariantes críticos · schema + Payment + Appointment |
| **REVIEW_REQUIRED** | Risco HIGH · Guardian warnings > 0 · entidades financeiras afetadas |
| **APPROVED** | Risco LOW/MEDIUM · sem errors · sem invariantes críticos · demais critérios de bloqueio/revisão ausentes |

_Motor somente leitura — nenhuma alteração de banco, API ou regra de negócio._
_Fontes: change-analysis.md, review-checklist.md, latest.json, advisor.md, domain-map.md, domain-invariants.md_
