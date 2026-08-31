# Sprint 1 — Estabilização — Plano de Estabilização THouse

**Gerado em:** 2026-07-05T21:41:15.817Z
**Sprint 1: 223 arquivos → 9 PRs → 22 commits planejados**

---

## Onde estamos?

- **223 arquivos** pendentes de organização em deploy
- **Veredito CTO:** Estabilizar antes de avançar
- **Decisão:** BLOCKED · **Guardian:** HEALTHY
- **9 migrations** aguardando staging

## Quanto falta?

9 PRs para merge, 9 migrations em staging, testes manuais em área financeira, decisão BLOCKED a resolver por PR incremental

## Qual a ordem ideal?

Docs/Guardian → Migrations staging → Pagamentos → Cupons → Agendamentos → Minha Conta → Admin → Simulação → Agentes

### Caminho crítico

→ PR-01 Documentação + Guardian
→ PR-02 Schema/migrations (staging)
→ PR-03 Pagamentos/webhook
→ PR-05 Agendamentos
→ Guardian exit 0
→ Homologação completa
→ Deploy produção incremental

## Qual o caminho mais seguro?

1. PRs pequenos na ordem abaixo — nunca merge de 173 arquivos de uma vez
2. Guardian exit 0 antes de cada merge
3. Migrations em staging antes de PR financeiro em produção
4. Agente IA e docs podem ir primeiro (sem risco runtime)

---

## Grupos de trabalho

| Grupo | Arquivos | Risco | PR separado? |
|-------|----------|-------|--------------|
| Deploy | 4 | Crítico | Sim |
| Financeiro | 37 | Crítico | Sim |
| Coupon | 27 | Alto | Sim |
| Appointment | 22 | Alto | Sim |
| MinhaConta | 28 | Médio | Sim |
| Simulation | 2 | Médio | Sim |
| Admin | 12 | Médio | Sim |
| Guardian | 10 | Baixo | Sim |
| Arquitetura | 9 | Baixo | Sim |
| Scripts | 3 | Baixo | Sim |
| Infraestrutura | 69 | Baixo | Sim |

---

## Plano de PRs

### 1. PR-01 — Documentação e Guardian (baseline)
**Objetivo:** Estabelecer baseline de docs e verificação automática sem alterar runtime de negócio.
**Risco:** Baixo · **Complexidade:** Baixa
**Dependências:** Nenhuma
**Revisor:** Tech lead + proprietário (leitura)
**Commits:** C-01
**Arquivos:** 10

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Decision engine não BLOCKED para escopo do PR

### 2. PR-02 — Schema e migrations
**Objetivo:** Aplicar estrutura de banco: arquivamento, hidden, refund tracking.
**Risco:** Crítico · **Complexidade:** Alta
**Dependências:** PR-01
**Revisor:** Dev backend sênior
**Commits:** C-02
**Arquivos:** 4

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Testes sandbox Asaas
- Decision engine não BLOCKED para escopo do PR

### 3. PR-03 — Pagamentos e webhook
**Objetivo:** Hardening idempotência, checkout e efeitos pós-pagamento.
**Risco:** Crítico · **Complexidade:** Muito Alta
**Dependências:** PR-02
**Revisor:** Dev financeiro + tech lead
**Commits:** C-03, C-04, C-05, C-06
**Arquivos:** 37

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Testes sandbox Asaas
- Decision engine não BLOCKED para escopo do PR

### 4. PR-04 — Cupons e ownership
**Objetivo:** Ownership, reembolso cupom, validação checkout.
**Risco:** Alto · **Complexidade:** Alta
**Dependências:** PR-03
**Revisor:** Dev backend
**Commits:** C-07, C-08, C-09
**Arquivos:** 27

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Decision engine não BLOCKED para escopo do PR

### 5. PR-05 — Agendamentos e arquivamento
**Objetivo:** Arquivamento admin, queries operacionais, disponibilidade.
**Risco:** Alto · **Complexidade:** Alta
**Dependências:** PR-02, PR-03
**Revisor:** Dev backend
**Commits:** C-10
**Arquivos:** 22

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Decision engine não BLOCKED para escopo do PR

### 6. PR-06 — Minha Conta e autenticação
**Objetivo:** UX cliente, login, meus-dados, ocultação usuário.
**Risco:** Médio · **Complexidade:** Média
**Dependências:** PR-04, PR-05
**Revisor:** Dev frontend + QA
**Commits:** C-11, C-12, C-13, C-14
**Arquivos:** 28

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Decision engine não BLOCKED para escopo do PR

### 7. PR-07 — Painel administrativo
**Objetivo:** UI admin, stats, ações arquivar/restaurar.
**Risco:** Médio · **Complexidade:** Média
**Dependências:** PR-05
**Revisor:** Proprietário + dev
**Commits:** C-15
**Arquivos:** 12

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Decision engine não BLOCKED para escopo do PR

### 8. PR-08 — Simulação admin
**Objetivo:** Pagamentos teste, cupons simbólicos, reset.
**Risco:** Médio · **Complexidade:** Média
**Dependências:** PR-03
**Revisor:** Dev backend
**Commits:** C-16
**Arquivos:** 2

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Decision engine não BLOCKED para escopo do PR

### 9. PR-09 — Agentes IA e infraestrutura
**Objetivo:** Pipeline de agentes, scripts utilitários, build e CI.
**Risco:** Baixo · **Complexidade:** Baixa
**Dependências:** PR-01
**Revisor:** Tech lead
**Commits:** C-17, C-18, C-19, C-20, C-21, C-22
**Arquivos:** 81

**Critérios de merge:**
- Guardian exit 0
- npm run build
- Revisão humana aprovada
- Decision engine não BLOCKED para escopo do PR

---

## Plano de commits (amostra)

- **C-01** `chore(guardian): add domain guardian checks and reports` (10 arquivos) → PR-01
- **C-02** `feat(db): add schema migrations for archive and hidden fields` (4 arquivos) → PR-02
- **C-03** `fix(payment): harden webhook idempotency and payment effects` (20 arquivos) → PR-03
- **C-04** `fix(payment): harden webhook idempotency and payment effects (part 2)` (14 arquivos) → PR-03
- **C-05** `fix(payment): harden webhook idempotency and payment effects (part 3)` (6 arquivos) → PR-03
- **C-06** `fix(payment): harden webhook idempotency and payment effects (part 4)` (1 arquivos) → PR-03
- **C-07** `fix(coupon): preserve ownership and refund sync` (21 arquivos) → PR-04
- **C-08** `fix(coupon): preserve ownership and refund sync (part 2)` (4 arquivos) → PR-04
- **C-09** `fix(coupon): preserve ownership and refund sync (part 3)` (2 arquivos) → PR-04
- **C-10** `feat(appointment): implement admin archive and operational filters` (22 arquivos) → PR-05
- **C-11** `fix(account): stabilize account and meus-dados aggregation` (2 arquivos) → PR-06
- **C-12** `fix(account): stabilize account and meus-dados aggregation (part 2)` (12 arquivos) → PR-06
- **C-13** `fix(account): stabilize account and meus-dados aggregation (part 3)` (12 arquivos) → PR-06
- **C-14** `fix(account): stabilize account and meus-dados aggregation (part 4)` (2 arquivos) → PR-06
- **C-15** `feat(admin): admin panel archive restore and stats` (12 arquivos) → PR-07
- … +7 commits

---

## Deploy

### Homologação
- [ ] Criar ambiente staging (Vercel preview ou branch)
- [ ] Configurar DATABASE_URL de staging
- [ ] Merge PR-01 e PR-02 em staging
- [ ] npx prisma migrate deploy
- [ ] Merge PRs 03-08 sequencialmente
- [ ] Executar Guardian após cada merge
- [ ] Testes sandbox Asaas
- [ ] Validação proprietário no admin

### Produção
- [ ] Todos PRs mergeados em main
- [ ] Guardian HEALTHY em produção pós-migration
- [ ] Backup banco Neon
- [ ] npx prisma migrate deploy (produção)
- [ ] Deploy Vercel
- [ ] Smoke pós-deploy
- [ ] Monitorar webhooks Asaas 24h

---

## Roadmap

### Sprint 1 — Estabilização
- Dividir 173 arquivos em PRs independentes
- Merge incremental com Guardian
- Resolver BLOCKED por escopo

### Sprint 2 — Homologação
- Deploy staging
- Migrations
- Testes sandbox Asaas
- Validação proprietário

### Sprint 3 — Deploy Produção
- Deploy incremental
- Monitoramento 24h
- Guardian em produção

### Sprint 4 — Novas Funcionalidades
- Adicionar arquivamento administrativo de pagamentos
- Features do design-plan

---

## Limitações V1

- Agrupamento por heurística de caminho — arquivos podem pertencer a múltiplos domínios.
- Commits sugeridos não validam compilação por chunk — ajustar se build falhar.
- Ordem de PRs conservadora — paralelizar PR-09 com PR-03 apenas após validação.
- Não estima horas por desenvolvedor — apenas esforço qualitativo.
- Migrations listadas do evolution-report — verificar estado real do banco staging.

---
_Stabilization Planner — somente planejamento. Nenhum código foi alterado._