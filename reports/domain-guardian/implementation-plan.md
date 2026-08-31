# Implementation Plan — Implementation Planner Agent V1

**Gerado em:** 2026-07-05T20:29:09.986Z
**Agente:** 1.0.0
**Origem:** Adicionar arquivamento administrativo de pagamentos
**Classificação:** Feature
**Complexidade geral:** Muito Alta

---

## Cronograma

```
Fase 1: phase-1 (Backend / Regras de domínio)
↓
Fase 2 [paralelo]: phase-2 (Webhook / Efeitos pós-pagamento) | phase-4 (Minha Conta (se aplicável))
↓
Fase 3: phase-3 (Admin UI)
↓
Fase 4 [paralelo]: phase-5 (Domain Guardian) | phase-6 (Validação)
```

---

## Caminho crítico

- **phase-1** — Backend / Regras de domínio
- **phase-2** — Webhook / Efeitos pós-pagamento
- **phase-3** — Admin UI
- **phase-6** — Validação

---

## Paralelização

_Nenhum grupo paralelo detectado — execução sequencial por camada._

---

## Ordem de execução

1. phase-1 — Backend / Regras de domínio
2. phase-2 — Webhook / Efeitos pós-pagamento
3. phase-4 — Minha Conta (se aplicável)
4. phase-3 — Admin UI
5. phase-5 — Domain Guardian
6. phase-6 — Validação

---

## Fases detalhadas

### phase-1 — Backend / Regras de domínio

**Objetivo:** Implementar lógica de negócio e guards sem alterar contratos existentes inadvertidamente.
**Complexidade:** Muito Alta
**Migration:** Não
**Validação manual:** Não

**Arquivos (15):** `src/app/lib/process-payment-webhook.ts`, `src/app/api/webhooks/asaas/route.ts`, `src/app/lib/asaas-agendamento-payment-effects.ts`, `src/app/lib/asaas-plano-payment-effects.ts`, `src/app/lib/asaas-agendamento-reconcile.ts`, `src/app/lib/appointment-refund-payment.ts`, `src/app/lib/symbolic-payment.ts`, `src/app/lib/admin-delete-payment.ts` …

**Dependências:** Nenhuma
**Paralelo com:** —

**Riscos:**
- Alto: Toca rota de webhook em produção.
- Crítico: Domínio Payment no escopo — invariantes F1–F8.

**Critérios de entrada:**
- ProjectContext e design-plan revisados
- Nenhuma dependência de fase pendente

**Critérios de saída:**
- Endpoints novos ou PATCH documentados
- Regras de bloqueio alinhadas à auditoria
- Nenhum purge físico onde soft-archive é esperado

### phase-2 — Webhook / Efeitos pós-pagamento

**Objetivo:** Garantir idempotência e efeitos colaterais consistentes.
**Complexidade:** Muito Alta
**Migration:** Não
**Validação manual:** Sim

**Arquivos (3):** `src/app/api/webhooks/asaas/route.ts`, `src/app/lib/asaas-agendamento-payment-effects.ts`, `src/app/lib/asaas-agendamento-reconcile.ts`

**Dependências:** Fase Backend
**Paralelo com:** —

**Riscos:**
- Crítico: Webhook Asaas — idempotência F1/F3; falha causa F4 ou duplicata.
- Alto: Toca rota de webhook em produção.

**Critérios de entrada:**
- F1/F3/F4 validados no plano
- Dependência satisfeita: Fase Backend

**Critérios de saída:**
- PAYMENT_RECEIVED idempotente por asaasId
- Efeitos de agendamento executados após Payment.create
- Reconcile cobre retries
- Validação manual documentada

### phase-3 — Admin UI

**Objetivo:** Expor operações administrativas com confirmação e justificativa.
**Complexidade:** Média
**Migration:** Não
**Validação manual:** Sim

**Arquivos (2):** `src/app/api/admin/pagamentos/route.ts`, `src/app/api/admin/agendamentos/route.ts`

**Dependências:** Fase Backend com APIs estáveis
**Paralelo com:** —

**Riscos:**
- Médio: UX admin — validação manual obrigatória.

**Critérios de entrada:**
- Dependência satisfeita: Fase Backend com APIs estáveis

**Critérios de saída:**
- Ações destrutivas substituídas por soft-archive quando aplicável
- Filtros e restauração testados manualmente
- Validação manual documentada

### phase-4 — Minha Conta (se aplicável)

**Objetivo:** Avaliar impacto em visibilidade do usuário — preferir ortogonalidade com admin.
**Complexidade:** Alta
**Migration:** Não
**Validação manual:** Sim

**Arquivos (2):** `src/app/api/meus-dados/route.ts`, `src/app/lib/appointment-hidden.ts`

**Dependências:** Fase Backend
**Paralelo com:** —

**Riscos:**
- Alto: Minha Conta — regressão visível ao usuário (A7).

**Critérios de entrada:**
- Confirmar que adminArchivedAt não filtra Minha Conta
- Dependência satisfeita: Fase Backend

**Critérios de saída:**
- Comportamento de userHiddenAt preservado
- Fluxos de reembolso intactos
- Validação manual documentada

### phase-5 — Domain Guardian

**Objetivo:** Atualizar checks e documentação de invariantes.
**Complexidade:** Média
**Migration:** Não
**Validação manual:** Não

**Arquivos (3):** `scripts/domain-guardian-audit.ts`, `docs/ai/domain-invariants.md`, `scripts/domain-guardian-advisor.ts`

**Dependências:** Fases de implementação estáveis
**Paralelo com:** —

**Riscos:**
- Médio: Risco operacional padrão — validar checklist.

**Critérios de entrada:**
- Dependência satisfeita: Fases de implementação estáveis

**Critérios de saída:**
- Novos invariantes documentados (se houver)
- Checks A5/A8/A9/F4 atualizados conforme plano
- domain-guardian-runner.ts sem errors
- domain-guardian-runner.ts exit 0 ou findings explicados

### phase-6 — Validação

**Objetivo:** Smoke, funcional, Guardian e regressão antes de merge.
**Complexidade:** Média
**Migration:** Não
**Validação manual:** Não

**Arquivos (1):** `reports/domain-guardian/`

**Dependências:** Todas as fases anteriores
**Paralelo com:** —

**Riscos:**
- Médio: Risco operacional padrão — validar checklist.

**Critérios de entrada:**
- design-plan.json arquivado neste run
- Dependência satisfeita: Todas as fases anteriores

**Critérios de saída:**
- Checklist de validação executado
- Decision Engine reavaliado
- Architecture Agent reexecutado


---

## Plano de rollback

#### Backend / Regras de domínio
- Migration: Não
- Reversível: git revert do commit da fase; Reexecutar Guardian para confirmar baseline
- Manual: Não

#### Webhook / Efeitos pós-pagamento
- Migration: Não
- Reversível: git revert do commit da fase; Reexecutar Guardian para confirmar baseline; Verificar fila Asaas após revert; Reconcile manual se pagamentos pendentes
- Manual: Smoke test pós-rollback; Verificar pagamentos Asaas pendentes

#### Admin UI
- Migration: Não
- Reversível: git revert do commit da fase; Reexecutar Guardian para confirmar baseline
- Manual: Smoke test pós-rollback; Confirmar UI admin restaurada

#### Minha Conta (se aplicável)
- Migration: Não
- Reversível: git revert do commit da fase; Reexecutar Guardian para confirmar baseline
- Manual: Smoke test pós-rollback

#### Domain Guardian
- Migration: Não
- Reversível: N/A
- Manual: Não

#### Validação
- Migration: Não
- Reversível: git revert do commit da fase; Reexecutar Guardian para confirmar baseline
- Manual: Não

---

## Plano de validação

### Smoke
- Aplicação inicia sem erro (`npm run build`)
- Prisma generate após migration (se houver)
- Login admin e usuário de teste

### Integração
- Checkout sandbox → webhook → Payment.create → efeitos
- Fluxo cancelamento → escolher reembolso/cupom
- Simular PAYMENT_RECEIVED e PAYMENT_REFUNDED

### Guardian
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

### Manual
- [Webhook / Efeitos pós-pagamento] Executar checklist manual da fase
- [Admin UI] Executar checklist manual da fase
- [Minha Conta (se aplicável)] Executar checklist manual da fase
- Revisão de PR com review-checklist.md
- Aprovação explícita antes de deploy em produção

---

## Checklist operacional

- [ ] Confirmar design-plan.json e implementation-plan.json na mesma revisão
- [ ] Solicitação: Adicionar arquivamento administrativo de pagamentos
- [ ] Classificação: Feature
- [ ] Risco design: Crítico
- [ ] Criar branch dedicada à implementação
- [ ] Executar Architecture Agent para baseline
- [ ] [phase-1] Início: validar critérios de entrada
- [ ] [phase-1] Fim: validar critérios de saída
- [ ] [phase-2] Início: validar critérios de entrada
- [ ] [phase-2] Fim: validar critérios de saída
- [ ] [phase-4] Início: validar critérios de entrada
- [ ] [phase-4] Fim: validar critérios de saída
- [ ] [phase-3] Início: validar critérios de entrada
- [ ] [phase-3] Fim: validar critérios de saída
- [ ] [phase-5] Início: validar critérios de entrada
- [ ] [phase-5] Fim: validar critérios de saída
- [ ] [phase-6] Início: validar critérios de entrada
- [ ] [phase-6] Fim: validar critérios de saída
- [ ] Executar domain-guardian-runner.ts
- [ ] Executar domain-decision-engine.ts
- [ ] Reexecutar Design Planner + Implementation Planner se escopo mudar
- [ ] Revisar design-plan.md com stakeholder antes de codar
- [ ] Confirmar que solicitação não viola invariantes críticos listados
- [ ] Executar Architecture Agent para baseline atualizado
- [ ] Classificação Feature — escopo alinhado
- [ ] Validar impacto em F1/F4 e idempotência webhook

---

## Contexto

| Sinal | Valor |
|-------|-------|
| Decision | BLOCKED |
| Guardian | HEALTHY |
| Risco diff | CRITICAL |

---

## Limitações V1

- Cronograma derivado de design-plan — não valida disponibilidade de equipe.
- Paralelização conservadora: apenas admin-ui e minha-conta na mesma camada.
- Caminho crítico heurístico — revisar manualmente para o escopo real.
- Rollback não gera scripts automáticos de migration down.
- Estimativa de complexidade baseada em contagem de arquivos e risco.
- Não substitui code review nem Decision Engine.

---

_Implementation Planner V1 — somente organização de execução. Nenhum código alterado._
