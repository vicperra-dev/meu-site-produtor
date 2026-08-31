# Refactor Report — THouse

**Gerado em:** 2026-07-05T22:06:03.875Z
**Dívida técnica:** 100/100 (Crítico)

---

## Resumo Executivo

O projeto THouse tem dívida técnica crítico (100/100). 21 arquivos excedem 500 linhas; 15 blocos duplicados detectados. Domínios mais afetados: Backend, Financeiro, Appointment, Admin, Frontend. Execução do roadmap de estabilização: 0% — refatorar após Sprint 1 reduz risco. Priorize dividir páginas monolíticas (agendamento, minha-conta) e centralizar lógica financeira.

| Métrica | Valor |
|---------|-------|
| Arquivos analisados | 206 |
| Problemas encontrados | 464 |
| Dívida técnica | 100/100 |
| Linhas totais | 46.308 |
| Arquivos > 500 linhas | 21 |
| Blocos duplicados | 15 |
| Dependências circulares | 0 |

---

## Heatmap de Dívida Técnica

| Domínio | Score | Issues | Barra | Top arquivo |
|---------|-------|--------|-------|-------------|
| Backend | 100 | 142 | ██████████ | src/app/lib/sendEmail.ts |
| Financeiro | 100 | 70 | ██████████ | src/app/api/webhooks/asaas/route.ts |
| Appointment | 100 | 54 | ██████████ | src/app/agendamento/page.tsx |
| Admin | 81 | 38 | ████████░░ | src/app/admin/manutencao/page.tsx |
| Frontend | 80 | 37 | ████████░░ | src/app/registro/page.tsx |
| MinhaConta | 61 | 32 | ██████░░░░ | src/app/api/meus-dados/route.ts |
| Scripts | 52 | 46 | █████░░░░░ | scripts/verificar-todos-usuarios-local.js |
| Coupon | 34 | 19 | ███░░░░░░░ | src/app/api/agendamentos/com-cupom/route.ts |
| Prisma | 18 | 24 | ██░░░░░░░░ | src/app/api/asaas/checkout-agendamento/route.ts |
| Infraestrutura | 2 | 1 | ░░░░░░░░░░ | src/app/middleware.ts |
| Webhook | 1 | 1 | ░░░░░░░░░░ | src/app/api/webhooks/mercadopago/route.ts |
| Guardian | 0 | 0 | ░░░░░░░░░░ | — |

---

## Top 20 Oportunidades

| # | Tipo | Severidade | Domínio | Descrição | Benefício |
|---|------|------------|---------|-----------|-----------|
| 1 | large_file | CRITICAL | Financeiro | Arquivo com 1003 linhas (limite sugerido: 1000) | Dividir em módulos menores; meta < 600 l |
| 2 | large_file | CRITICAL | Admin | Arquivo com 1175 linhas (limite sugerido: 1000) | Dividir em módulos menores; meta < 600 l |
| 3 | large_file | CRITICAL | Appointment | Arquivo com 2393 linhas (limite sugerido: 1000) | Dividir em módulos menores; meta < 600 l |
| 4 | large_file | CRITICAL | MinhaConta | Arquivo com 1097 linhas (limite sugerido: 1000) | Dividir em módulos menores; meta < 600 l |
| 5 | large_file | CRITICAL | Backend | Arquivo com 1299 linhas (limite sugerido: 1000) | Dividir em módulos menores; meta < 600 l |
| 6 | large_file | CRITICAL | MinhaConta | Arquivo com 2094 linhas (limite sugerido: 1000) | Dividir em módulos menores; meta < 600 l |
| 7 | large_file | CRITICAL | Frontend | Arquivo com 1865 linhas (limite sugerido: 1000) | Dividir em módulos menores; meta < 600 l |
| 8 | large_file | HIGH | Financeiro | Arquivo com 569 linhas (limite sugerido: 500) | Dividir em módulos menores; meta < 300 l |
| 9 | large_file | HIGH | Appointment | Arquivo com 638 linhas (limite sugerido: 500) | Dividir em módulos menores; meta < 300 l |
| 10 | excessive_complexity | HIGH | Financeiro | Complexidade ciclomática ~119, if depth 3 | Early return, strategy pattern ou tabela |
| 11 | large_file | HIGH | Appointment | Arquivo com 533 linhas (limite sugerido: 500) | Dividir em módulos menores; meta < 300 l |
| 12 | excessive_complexity | HIGH | Financeiro | Complexidade ciclomática ~60, if depth 2 | Early return, strategy pattern ou tabela |
| 13 | large_file | HIGH | Coupon | Arquivo com 515 linhas (limite sugerido: 500) | Dividir em módulos menores; meta < 300 l |
| 14 | large_file | HIGH | Appointment | Arquivo com 509 linhas (limite sugerido: 500) | Dividir em módulos menores; meta < 300 l |
| 15 | excessive_complexity | HIGH | Financeiro | Complexidade ciclomática ~85, if depth 2 | Early return, strategy pattern ou tabela |
| 16 | excessive_complexity | HIGH | Financeiro | Complexidade ciclomática ~78, if depth 2 | Early return, strategy pattern ou tabela |
| 17 | excessive_complexity | HIGH | Financeiro | Complexidade ciclomática ~65, if depth 2 | Early return, strategy pattern ou tabela |
| 18 | large_function | HIGH | Financeiro | Função POST com 222 linhas (limite: 150) | Extrair subfunções puras e testáveis |
| 19 | large_function | HIGH | Financeiro | Função POST com 768 linhas (limite: 150) | Extrair subfunções puras e testáveis |
| 20 | excessive_complexity | HIGH | Financeiro | Complexidade ciclomática ~187, if depth 3 | Early return, strategy pattern ou tabela |

---

## Quick Wins

- [ ] **legacy_code** — TODO na linha 4 (scripts/migrar-para-postgresql.js)
- [ ] **legacy_code** — TODO na linha 38 (scripts/migrar-todas-faqs-producao.js)
- [ ] **legacy_code** — TODO na linha 86 (scripts/migrar-todas-faqs-producao.js)
- [ ] **legacy_code** — TODO na linha 214 (scripts/migrar-todas-faqs-producao.js)
- [ ] **legacy_code** — TODO na linha 226 (scripts/migrar-todas-faqs-producao.js)
- [ ] **legacy_code** — TODO na linha 230 (scripts/migrar-todas-faqs-producao.js)
- [ ] **legacy_code** — TODO na linha 44 (scripts/tornar-admin-producao.js)
- [ ] **legacy_code** — TODO na linha 90 (scripts/verificar-dados-completos.js)
- [ ] **legacy_code** — TODO na linha 14 (scripts/verificar-dados-usuario-producao.js)
- [ ] **legacy_code** — TODO na linha 15 (scripts/verificar-dados-usuario-producao.js)
- [ ] **legacy_code** — TODO na linha 28 (scripts/verificar-dados-usuario-producao.js)
- [ ] **legacy_code** — TODO na linha 29 (scripts/verificar-dados-usuario-producao.js)
- [ ] **legacy_code** — TODO na linha 30 (scripts/verificar-dados-usuario-producao.js)
- [ ] **legacy_code** — TODO na linha 24 (scripts/verificar-e-migrar-dados-local.js)
- [ ] **legacy_code** — TODO na linha 25 (scripts/verificar-e-migrar-dados-local.js)

---

## Grandes Refatorações

### large_function — HIGH
**Arquivos:** scripts/migrar-para-postgresql-v2.js
**Impacto:** Alta complexidade ciclomática provável; difícil testar isoladamente
**Benefício:** Extrair subfunções puras e testáveis

### large_function — HIGH
**Arquivos:** scripts/migrar-para-postgresql.js
**Impacto:** Alta complexidade ciclomática provável; difícil testar isoladamente
**Benefício:** Extrair subfunções puras e testáveis

### large_function — HIGH
**Arquivos:** scripts/verificar-e-migrar-dados-local.js
**Impacto:** Alta complexidade ciclomática provável; difícil testar isoladamente
**Benefício:** Extrair subfunções puras e testáveis

### large_file — HIGH
**Arquivos:** src/app/admin/agendamentos/page.tsx
**Impacto:** Dificulta revisão, testes e manutenção; aumenta risco de regressão
**Benefício:** Dividir em módulos menores; meta < 480 linhas

### large_function — HIGH
**Arquivos:** src/app/admin/agendamentos/page.tsx
**Impacto:** Alta complexidade ciclomática provável; difícil testar isoladamente
**Benefício:** Extrair subfunções puras e testáveis

### large_file — HIGH
**Arquivos:** src/app/admin/controle-agendamento/page.tsx
**Impacto:** Dificulta revisão, testes e manutenção; aumenta risco de regressão
**Benefício:** Dividir em módulos menores; meta < 300 linhas

### large_file — HIGH
**Arquivos:** src/app/admin/estatisticas/page.tsx
**Impacto:** Dificulta revisão, testes e manutenção; aumenta risco de regressão
**Benefício:** Dividir em módulos menores; meta < 480 linhas

### large_file — HIGH
**Arquivos:** src/app/admin/faq/page.tsx
**Impacto:** Dificulta revisão, testes e manutenção; aumenta risco de regressão
**Benefício:** Dividir em módulos menores; meta < 480 linhas

### large_file — HIGH
**Arquivos:** src/app/admin/pagamentos/page.tsx
**Impacto:** Dificulta revisão, testes e manutenção; aumenta risco de regressão
**Benefício:** Dividir em módulos menores; meta < 300 linhas

### large_file — CRITICAL
**Arquivos:** src/app/admin/planos/page.tsx
**Impacto:** Dificulta revisão, testes e manutenção; aumenta risco de regressão
**Benefício:** Dividir em módulos menores; meta < 600 linhas

---

## Arquivos Grandes

| Arquivo | Linhas | Domínio | Severidade |
|---------|--------|---------|------------|
| scripts/migrar-para-postgresql-v2.js | 497 | Scripts | MEDIUM |
| scripts/migrar-para-postgresql.js | 324 | Scripts | MEDIUM |
| scripts/migrar-todas-faqs-producao.js | 310 | Scripts | MEDIUM |
| src/app/admin/agendamentos/page.tsx | 959 | Appointment | HIGH |
| src/app/admin/chat/page.tsx | 305 | Admin | MEDIUM |
| src/app/admin/chats-pendentes/page.tsx | 487 | Admin | MEDIUM |
| src/app/admin/controle-agendamento/page.tsx | 638 | Appointment | HIGH |
| src/app/admin/estatisticas/page.tsx | 862 | Admin | HIGH |
| src/app/admin/faq/page.tsx | 871 | Admin | HIGH |
| src/app/admin/pagamentos/page.tsx | 569 | Financeiro | HIGH |
| src/app/admin/page.tsx | 367 | Admin | MEDIUM |
| src/app/admin/planos/page.tsx | 1175 | Admin | CRITICAL |
| src/app/admin/servicos-aceitos/page.tsx | 400 | Admin | MEDIUM |
| src/app/admin/servicos-solicitados/page.tsx | 441 | Admin | MEDIUM |
| src/app/admin/usuarios/page.tsx | 461 | Admin | MEDIUM |
| src/app/agendamento/page.tsx | 2393 | Appointment | CRITICAL |
| src/app/api/admin/agendamentos/route.ts | 533 | Appointment | HIGH |
| src/app/api/admin/chat/route.ts | 310 | Backend | MEDIUM |
| src/app/api/admin/reprocessar-pagamento-teste/route.ts | 320 | Financeiro | MEDIUM |
| src/app/api/admin/servicos/route.ts | 351 | Backend | MEDIUM |

---

## Roadmap de Refatoração

### sprint1
- [ ] Quick wins: remover imports mortos e exports não utilizados
- [ ] Documentar código @legacy (simulation-coupon-codes, symbolic-payment)
- [ ] Extrair helpers duplicados de menor risco

### sprint2
- [ ] Prioridade: src/app/admin/agendamentos/page.tsx, src/app/admin/estatisticas/page.tsx, src/app/admin/faq/page.tsx
- [ ] Dividir arquivos > 800 linhas (agendamento/page, minha-conta/page, meus-dados/route)
- [ ] Centralizar queries Prisma repetidas em repositories
- [ ] Resolver dependências circulares em src/app/lib

### sprint3
- [ ] Refatorar webhook Asaas e process-payment-webhook (domínio Financeiro)
- [ ] Unificar validações e schemas repetidos
- [ ] Reduzir complexidade ciclomática em rotas críticas

### sprint4
- [ ] Modularizar páginas admin monolíticas
- [ ] Eliminar APIs órfãs confirmadas
- [ ] Consolidar scripts utilitários em pacote ops documentado

---

## Recomendações

- Não refatorar domínio Financeiro/Webhook antes de concluir Sprint 1 de estabilização
- Dividir arquivos > 500 linhas antes de adicionar novas features
- Extrair repository Prisma para Payment e Appointment primeiro
- Remover @legacy apenas após ADR-010 e Guardian S4 validados
- Usar refactor-report.json como input do design-planner em refatorações futuras
- Reexecutar após cada sprint de estabilização para medir evolução da dívida

---

## Limitações V1

- Análise estática por regex — não substitui TypeScript compiler ou ESLint
- Duplicações detectam blocos de 6+ linhas similares, não AST semântico
- Código morto é heurístico — exports dinâmicos e rotas externas podem ser falso positivo
- Imports não utilizados podem falhar com re-exports e tipos
- Dependências circulares apenas em imports relativos resolvidos
- Não analisa cobertura de testes
- Páginas Next.js (page.tsx) excluídas de componentes não utilizados

---
_Refactor Agent — somente análise. Nenhum código foi alterado._