# Engineering Backlog — THouse

**Gerado em:** 2026-07-05T22:33:36.054Z
**Engineering Score:** 78/100

## Resumo Executivo
Backlog executável com 94 itens priorizados por valor. 8 quick wins, 40 alta prioridade. Decision BLOCKED — foco em estabilização incremental antes de refatorações grandes. ROI calculado como (prioridade² × 25) / esforço. Amanhã: Desbloquear decisão de deploy.

## O que faria amanhã?
- Desbloquear decisão de deploy
- Executar Commit C-01
- Resolver: Decision Engine está BLOCKED
- Resolver: 9 migration(s) pendente(s) em staging
- Resolver: Decision Engine BLOCKED

## O que NÃO faria agora?
- Refatorar agendamento/page.tsx (2393 linhas) antes de estabilizar
- Implementar arquivamento de pagamentos (ADR-013) antes do deploy
- Merge monolítico de 173 arquivos
- Novas features em Financeiro
- Novas features em Appointment

## Engineering Score
| Dimensão | Score |
|----------|-------|
| overall | 78 |
| arquitetura | 100 |
| qualidade | 8 |
| escalabilidade | 98 |
| manutenibilidade | 0 |
| financeiro | 5 |
| ux | 40 |
| admin | 35 |
| seguranca | 95 |

## Top 20 Melhorias (ROI)
| # | ROI | Prioridade | Título | Categoria |
|---|-----|------------|--------|-----------|
| 1 | 100 | Critical | Desbloquear decisão de deploy | Correção |
| 2 | 100 | High | Executar migrations em staging | Deploy |
| 3 | 100 | High | Executar checklist de testes obrigatórios | Correção |
| 4 | 100 | Critical | Executar Commit C-01 | Deploy |
| 5 | 100 | Critical | Resolver: Decision Engine está BLOCKED | Correção |
| 6 | 100 | Critical | Resolver: 9 migration(s) pendente(s) em staging | Correção |
| 7 | 100 | Critical | Resolver: Decision Engine BLOCKED | Correção |
| 8 | 100 | Critical | Dividir arquivo monolítico: src/app/api/webhooks/a | Financeiro |
| 9 | 100 | Critical | Dividir arquivo monolítico: src/app/admin/planos/p | Admin |
| 10 | 100 | Critical | Dividir arquivo monolítico: src/app/agendamento/pa | Admin |
| 11 | 100 | Critical | Dividir arquivo monolítico: src/app/api/meus-dados | UX |
| 12 | 100 | Critical | Dividir arquivo monolítico: src/app/lib/sendEmail. | Refatoração |
| 13 | 100 | Critical | Dividir arquivo monolítico: src/app/minha-conta/pa | UX |
| 14 | 100 | Critical | Dividir arquivo monolítico: src/app/termos-contrat | Refatoração |
| 15 | 100 | High | Estabilizar: Documentação e Guardian (baseline) | Documentação |
| 16 | 100 | Critical | Estabilizar: Schema e migrations | Deploy |
| 17 | 100 | Critical | Estabilizar: Pagamentos e webhook | Financeiro |
| 18 | 100 | High | Estabilizar: Cupons e ownership | Financeiro |
| 19 | 100 | High | Estabilizar: Agendamentos e arquivamento | Admin |
| 20 | 100 | High | Criar ambiente staging (Vercel preview ou branch) | Deploy |

## Quick Wins
- [ ] **Congelar domínio Financeiro até estabilização** (ROI 100)
- [ ] **Congelar domínio Appointment até estabilização** (ROI 100)
- [ ] **Executar code-health-agent.ts após cada sprint para medir evolução** (ROI 50)
- [ ] **Manter Guardian HEALTHY antes de refatorar domínios Financeiro/Webhook** (ROI 50)
- [ ] **Priorizar divisão de arquivos monolíticos (21 arquivos > 500 linhas)** (ROI 50)
- [ ] **Coupon e Minha Conta têm health intermediário — refatorar após estabilização** (ROI 50)
- [ ] **Guardian e Infraestrutura são candidatos seguros para novos agentes e tooling** (ROI 50)
- [ ] **Decision BLOCKED — não misturar refatoração com deploy pendente** (ROI 50)

## Alta Prioridade
- [ ] **Desbloquear decisão de deploy**
- [ ] **Executar migrations em staging**
- [ ] **Executar checklist de testes obrigatórios**
- [ ] **Executar Commit C-01**
- [ ] **Resolver: Decision Engine está BLOCKED**
- [ ] **Resolver: 9 migration(s) pendente(s) em staging**
- [ ] **Resolver: Decision Engine BLOCKED**
- [ ] **Dividir arquivo monolítico: src/app/api/webhooks/asaas/route.ts**
- [ ] **Dividir arquivo monolítico: src/app/admin/planos/page.tsx**
- [ ] **Dividir arquivo monolítico: src/app/agendamento/page.tsx**

## Uma semana
Estabilização mínima viável — commits C-01 a C-03, Guardian, desbloquear parcialmente
- Desbloquear decisão de deploy
- Executar Commit C-01
- Resolver: Decision Engine está BLOCKED
- Resolver: 9 migration(s) pendente(s) em staging
- Resolver: Decision Engine BLOCKED

## Um mês
Completar Sprint 1 (9 entregas de valor), homologação, migrations
- Desbloquear decisão de deploy
- Executar migrations em staging
- Executar checklist de testes obrigatórios
- Executar Commit C-01
- Resolver: Decision Engine está BLOCKED
- Resolver: 9 migration(s) pendente(s) em staging
- Resolver: Decision Engine BLOCKED
- Dividir arquivo monolítico: src/app/api/webhooks/asaas/route.ts
- Dividir arquivo monolítico: src/app/admin/planos/page.tsx
- Dividir arquivo monolítico: src/app/agendamento/page.tsx
- Dividir arquivo monolítico: src/app/api/meus-dados/route.ts
- Dividir arquivo monolítico: src/app/lib/sendEmail.ts

## Três meses
Produção estável + redução de dívida técnica + features pós-deploy
- Desbloquear decisão de deploy
- Resolver: Decision Engine está BLOCKED
- Resolver: 9 migration(s) pendente(s) em staging
- Resolver: Decision Engine BLOCKED
- Dividir arquivo monolítico: src/app/api/webhooks/asaas/route.ts
- Estabilizar: Agentes IA e infraestrutura
- Regenerar relatórios de agentes
- TODO na linha 4

## Limitações V1
- Itens sintetizados de relatórios — podem sobrepor semanticamente
- ROI heurístico — não substitui estimativa humana em horas
- Não rastreia status done/in-progress — regenerar após cada sprint
- Buckets podem classificar mesmo item em múltiplas categorias
- Depende de agentes upstream terem sido executados

---
_Engineering Assistant — somente backlog. Nenhum código foi alterado._