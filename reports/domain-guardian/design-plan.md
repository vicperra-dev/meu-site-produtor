# Design Plan — Design Planner Agent V1

**Gerado em:** 2026-07-05T19:55:02.011Z
**Agente:** 1.0.0
**Solicitação:** Adicionar arquivamento administrativo de pagamentos
**Classificação:** Feature

---

## Solicitação

Implementar soft-delete admin em Payment com adminArchivedAt e adminArchivedReason.
Preservar histórico financeiro e Minha Conta inalterada.

---

## Classificação

| Tipo | Score |
|------|-------|
| Feature | 2 |
| Infrastructure | 1 |
| Bug | 0 |
| Refactor | 0 |
| Migration | 0 |
| Performance | 0 |
| Security | 0 |
| Documentation | 0 |

**Racional:** Palavras-chave indicam Feature (score 2).

---

## Escopo descoberto

**Entidades:** Payment, Appointment, User

**Fluxos:** Checkout (agendamento e plano), Webhook Asaas, Reembolso (outbound e inbound), Remarcação (resolução de pagamento origem), Simulação admin (`symbolicAgendamento`, `symbolicPlano`), Minha Conta (listagem de pagamentos), Checkout agendamento, Checkout plano, Reembolso, Checkout → criação pós-pagamento, Aceite/recusa admin, Reembolso direto ou cupom de remarcação, Ocultação Minha Conta (`userHiddenAt`), Conflito de horário (agenda), Remarcação (cupom), Autenticação e autorização, Minha Conta (agregação de todas as entidades), Ownership de cupons e agendamentos, Exclusão de conta (LGPD), Simulação admin (`canUseSymbolicSimulation`), Minha Conta (leitura), Autenticação

**Invariantes:** A1, A2, A3, A4, A5, A6, A7, A8, A9, C4, F1, F2, F3, F4, F5, F6, F7, F8, X1, X2, X3, X4, X5

**Checks Guardian:** A5, A8, A9, C1, F1, F4, S1, S3, X1, X2

---

## Matriz de impacto

| Entidade | Impacto | Risco | Arquivos prováveis | Fluxos |
|----------|---------|-------|-------------------|--------|
| Payment | Alteração financeira — webhook, checkout ou histórico | Crítico | src/app/lib/process-payment-webhook.ts, src/app/api/webhooks/asaas/route.ts, src/app/lib/asaas-agendamento-payment-effects.ts | Checkout (agendamento e plano); Webhook Asaas |
| Appointment | Alteração operacional — agenda, reembolso ou visibilidade | Alto | src/app/lib/asaas-agendamento-payment-effects.ts, src/app/lib/appointment-hidden.ts, src/app/lib/appointment-refund-payment.ts | Checkout → criação pós-pagamento; Aceite/recusa admin |
| User | Impacto em User e fluxos dependentes | Médio | src/app/lib/auth.ts, src/app/lib/adminAccess.ts, src/app/lib/coupon-account-ownership.ts | Autenticação e autorização; Minha Conta (agregação de todas as entidades) |

---

## Plano arquitetural (fases)

### Backend / Regras de domínio

**Objetivo:** Implementar lógica de negócio e guards sem alterar contratos existentes inadvertidamente.

**Arquivos:** `src/app/lib/process-payment-webhook.ts`, `src/app/api/webhooks/asaas/route.ts`, `src/app/lib/asaas-agendamento-payment-effects.ts`, `src/app/lib/asaas-plano-payment-effects.ts`, `src/app/lib/asaas-agendamento-reconcile.ts`, `src/app/lib/appointment-refund-payment.ts`, `src/app/lib/symbolic-payment.ts`, `src/app/lib/admin-delete-payment.ts`, `src/app/api/asaas/checkout-agendamento/route.ts`, `src/app/api/admin/pagamentos/route.ts`, `src/app/lib/appointment-hidden.ts`, `src/app/lib/appointment-refund-value.ts`, `src/app/lib/appointment-service-sync.ts`, `src/app/api/agendamentos/route.ts`, `src/app/api/agendamentos/escolher-reembolso/route.ts`

**Dependências:** Nenhuma

**Pré-requisitos:** ProjectContext e design-plan revisados

**Critérios de conclusão:**
- Endpoints novos ou PATCH documentados
- Regras de bloqueio alinhadas à auditoria
- Nenhum purge físico onde soft-archive é esperado

### Webhook / Efeitos pós-pagamento

**Objetivo:** Garantir idempotência e efeitos colaterais consistentes.

**Arquivos:** `src/app/api/webhooks/asaas/route.ts`, `src/app/lib/asaas-agendamento-payment-effects.ts`, `src/app/lib/asaas-agendamento-reconcile.ts`

**Dependências:** Fase Backend

**Pré-requisitos:** F1/F3/F4 validados no plano

**Critérios de conclusão:**
- PAYMENT_RECEIVED idempotente por asaasId
- Efeitos de agendamento executados após Payment.create
- Reconcile cobre retries

### Admin UI

**Objetivo:** Expor operações administrativas com confirmação e justificativa.

**Arquivos:** `src/app/api/admin/pagamentos/route.ts`, `src/app/api/admin/agendamentos/route.ts`

**Dependências:** Fase Backend com APIs estáveis

**Pré-requisitos:** Nenhum

**Critérios de conclusão:**
- Ações destrutivas substituídas por soft-archive quando aplicável
- Filtros e restauração testados manualmente

### Minha Conta (se aplicável)

**Objetivo:** Avaliar impacto em visibilidade do usuário — preferir ortogonalidade com admin.

**Arquivos:** `src/app/api/meus-dados/route.ts`, `src/app/lib/appointment-hidden.ts`

**Dependências:** Fase Backend

**Pré-requisitos:** Confirmar que adminArchivedAt não filtra Minha Conta

**Critérios de conclusão:**
- Comportamento de userHiddenAt preservado
- Fluxos de reembolso intactos

### Domain Guardian

**Objetivo:** Atualizar checks e documentação de invariantes.

**Arquivos:** `scripts/domain-guardian-audit.ts`, `docs/ai/domain-invariants.md`, `scripts/domain-guardian-advisor.ts`

**Dependências:** Fases de implementação estáveis

**Pré-requisitos:** Nenhum

**Critérios de conclusão:**
- Novos invariantes documentados (se houver)
- Checks A5/A8/A9/F4 atualizados conforme plano
- domain-guardian-runner.ts sem errors

### Validação

**Objetivo:** Smoke, funcional, Guardian e regressão antes de merge.

**Arquivos:** `reports/domain-guardian/`

**Dependências:** Todas as fases anteriores

**Pré-requisitos:** design-plan.json arquivado neste run

**Critérios de conclusão:**
- Checklist de validação executado
- Decision Engine reavaliado
- Architecture Agent reexecutado


---

## Análise de risco

**Risco geral:** Crítico

- **Crítico** — Domínio financeiro: Payment e webhook Asaas são Tier 1 — falhas causam cobrança sem artefato ou duplicidade (F1/F4).
- **Crítico** — Invariantes críticos no escopo: Invariantes: F1, F2, F3, F4, F5, F6, F7, F8, X1, X2, X3, X4, X5.
- **Alto** — Decision Engine BLOCKED: Há diff CRITICAL em andamento — novo trabalho aumenta escopo de merge.

---

## Plano de validação

### Smoke tests
- Aplicação inicia sem erro (`npm run build`)
- Prisma generate após migration (se houver)
- Login admin e usuário de teste

### Testes funcionais
- Checkout agendamento e plano em sandbox Asaas
- Webhook PAYMENT_RECEIVED idempotente
- Listagem admin de pagamentos
- Conflito de horário no checkout
- Cancelamento + escolher reembolso/cupom
- Arquivar/restaurar no admin (se aplicável)

### Testes Guardian
- node --experimental-strip-types scripts/domain-guardian-runner.ts
- Verificar check A5 sem novos findings
- Verificar check A8 sem novos findings
- Verificar check A9 sem novos findings
- Verificar check C1 sem novos findings
- Verificar check F1 sem novos findings
- Verificar check F4 sem novos findings
- Verificar check S1 sem novos findings
- Verificar check S3 sem novos findings
- Verificar check X1 sem novos findings
- Verificar check X2 sem novos findings
- node --experimental-strip-types scripts/domain-decision-engine.ts

### Regressão
- meus-dados: listagem agendamentos/cupons/planos
- Admin stats sem divergência abrupta
- Reprocessar pagamento teste admin

---

## Checklist de implementação (arquitetura)

- [ ] Revisar design-plan.md com stakeholder antes de codar
- [ ] Confirmar que solicitação não viola invariantes críticos listados
- [ ] Executar Architecture Agent para baseline atualizado
- [ ] Classificação Feature — escopo alinhado
- [ ] Validar impacto em F1/F4 e idempotência webhook
- [ ] Não deletar Payment approved com asaasId real
- [ ] Separar adminArchivedAt de userHiddenAt (ortogonalidade A7)
- [ ] Atualizar todas as queries de conflito de horário
- [ ] [Backend / Regras de domínio] Endpoints novos ou PATCH documentados
- [ ] [Webhook / Efeitos pós-pagamento] PAYMENT_RECEIVED idempotente por asaasId
- [ ] [Admin UI] Ações destrutivas substituídas por soft-archive quando aplicável
- [ ] [Minha Conta (se aplicável)] Comportamento de userHiddenAt preservado
- [ ] [Domain Guardian] Novos invariantes documentados (se houver)
- [ ] [Validação] Checklist de validação executado
- [ ] Reexecutar Design Planner Agent após mudança de escopo
- [ ] Anexar design-plan.json ao PR

---

## Contexto consultado

| Fonte | Valor |
|-------|-------|
| ProjectContext | ✅ |
| Guardian | HEALTHY |
| Decision | BLOCKED |
| Risco diff | CRITICAL |

**Fontes:** design-request-test.md, reports/domain-guardian/project-context.json, reports/domain-guardian/decision.md, reports/domain-guardian/change-analysis.md, reports/domain-guardian/review-checklist.md, reports/domain-guardian/action-plan.md, docs/ai/domain-map.md, docs/ai/domain-dependencies.md, docs/ai/domain-invariants.md

---

## Limitações V1

- Descoberta de entidades/fluxos é heurística por palavras-chave — revisar manualmente.
- Não analisa código-fonte nem AST — arquivos prováveis vêm do domain-map.
- Não substitui revisão humana nem Decision Engine.
- Não gera estimativas de esforço ou diagramas.
- Uma solicitação por execução (design-request.md).
- Não valida viabilidade técnica de integrações externas (ex.: Stripe).

---

_Design Planner Agent V1 — somente plano arquitetural. Nenhum código foi alterado._
