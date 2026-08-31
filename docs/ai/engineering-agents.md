# Agentes de Engenharia THouse — Catálogo Central

**Versão:** 1.0  
**Atualizado em:** 2026-07-06  
**Comando padrão:** `node --experimental-strip-types scripts/<script>.ts`

---

## 1. Visão geral

### Por que os agentes existem

O THouse é um sistema com regras de negócio críticas — pagamentos, webhooks, cupons, agendamentos e área do cliente. Uma mudança pequena pode causar cobrança duplicada, perda de sincronização ou regressão invisível no admin.

Os agentes de engenharia existem para **reduzir esse risco sem alterar o produto automaticamente**. Eles leem o código, o git, o banco e a documentação de domínio, e produzem **relatórios e decisões** que orientam humanos (engenheiro e proprietário) antes de commitar, fazer merge ou publicar.

Todos os agentes são **read-only por padrão**: não implementam features, não rodam migrations e não mudam APIs ou UI de negócio.

### Qual problema resolvem

| Problema | Agente(s) que ajudam |
|--------|---------------------|
| “Posso fazer merge?” | Change Analyzer, Review Engine, Decision Engine, PR Reviewer |
| “O banco está íntegro?” | Guardian Audit, Guardian Runner, Advisor |
| “O que mudou desde o último deploy?” | Evolution Agent, Change Analyzer |
| “Como implementar esta feature?” | Design Planner → Implementation Planner → Implementation Executor |
| “Como dividir 200 arquivos em PRs?” | Stabilization Planner, Execution Manager |
| “Posso publicar hoje?” | Release Manager, CTO Agent |
| “O que priorizar no backlog?” | Engineering Assistant, CTO Agent |
| “Por que essa decisão arquitetural?” | Architecture Decision Agent, Knowledge Graph |

### Como trabalham juntos

Os agentes formam **camadas**:

1. **Governança de domínio** — verificam integridade (Guardian) e classificam risco (Decision).
2. **Planejamento** — transformam intenção em plano (Design → Implementation → Stabilization).
3. **Inteligência consolidada** — leem todos os relatórios (CTO, Engineering Assistant, Release).
4. **Apresentação** — Dashboard `/admin/engenharia` e Human Report traduzem para humanos.

Nenhum agente substitui o outro: o **CTO** não audita o banco; o **Guardian** não prioriza backlog. Cada um tem papel definido.

### Ordem correta de execução (pipeline diário)

```text
1.  Git (mudanças locais ou PR)
2.  domain-guardian-runner.ts      ← banco + diff histórico
3.  domain-change-analyzer.ts      ← impacto do diff
4.  domain-review-engine.ts        ← checklist de testes
5.  domain-decision-engine.ts      ← APPROVED | REVIEW_REQUIRED | BLOCKED
6.  domain-architecture-planner.ts ← action-plan (se necessário)
7.  Agentes de consolidação        ← CTO, Release, Execution (sob demanda)
8.  Dashboard / Human Report       ← leitura humana
```

**Regra de ouro:** nunca pular o **Decision Engine** antes de merge em área financeira ou de schema.

---

## 2. Catálogo completo

Legenda:
- **Bloqueia deploy?** — influencia `release-report` ou decisão humana de publicação.
- **Bloqueia merge?** — exit code 1 ou gate CI; caso contrário só recomenda.
- **Tempo** — ordem de grandeza em máquina local (varia com tamanho do diff e banco).

---

### 2.1 Governança de domínio (núcleo)

#### Domain Guardian Audit
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-guardian-audit.ts` |
| **Arquivos gerados** | `reports/domain-guardian/latest.json`, `reports/domain-guardian/YYYY-MM-DD-HH-MM.json` |
| **Entradas** | `docs/ai/domain-invariants.md`, `docs/ai/domain-risks.md`, banco via Prisma (`DATABASE_URL`) |
| **Saídas** | JSON com checks F1, F4, A5, A8, A9, C1, C2, P2, X1, X2, S1–S4 |
| **Quando executar** | Antes de merge, após migration, pós-deploy |
| **Quem consome** | Guardian Runner, Advisor, Decision Engine, CI workflow |
| **Dependências** | Prisma, banco acessível, invariantes documentados |
| **Bloqueia deploy?** | Sim (indireto — falhas viram erros no Guardian) |
| **Bloqueia merge?** | Sim (via Runner exit 1 se erros) |
| **Tempo** | ~1–5 s |

#### Domain Guardian Runner
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-guardian-runner.ts` |
| **Arquivos gerados** | `latest.json`, `summary.md`, relatório timestampado |
| **Entradas** | Orquestra `domain-guardian-audit.ts`, `domain-guardian-diff.ts` |
| **Saídas** | Resumo HEALTHY / erros; histórico em `reports/domain-guardian/` |
| **Quando executar** | Todo PR; gate CI passo 1 |
| **Quem consome** | Advisor, Memory Engine, Dashboard, CI |
| **Dependências** | Audit + Diff; `DATABASE_URL` |
| **Bloqueia deploy?** | Sim |
| **Bloqueia merge?** | Sim (exit 1 com erros de auditoria) |
| **Tempo** | ~5–15 s |

#### Domain Guardian Diff
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-guardian-diff.ts` |
| **Arquivos gerados** | Saída no stdout; alimenta `summary.md` via Runner |
| **Entradas** | `latest.json`, relatórios timestampados anteriores |
| **Saídas** | Novos erros / erros resolvidos vs execução anterior |
| **Quando executar** | Automaticamente pelo Runner |
| **Quem consome** | Guardian Runner, Memory Engine |
| **Dependências** | Pelo menos 1 execução anterior |
| **Bloqueia deploy?** | Não diretamente |
| **Bloqueia merge?** | Não |
| **Tempo** | ~1 s |

#### Domain Guardian Advisor
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-guardian-advisor.ts` |
| **Arquivos gerados** | `reports/domain-guardian/advisor.md` |
| **Entradas** | `latest.json` |
| **Saídas** | Playbook por check: impacto, causa, arquivos suspeitos |
| **Quando executar** | Após Runner; diagnóstico de findings |
| **Quem consome** | Humanos, Issue Generator, CTO, Dashboard |
| **Dependências** | `latest.json` |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~1 s |

#### Domain Change Analyzer
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-change-analyzer.ts` |
| **Arquivos gerados** | `reports/domain-guardian/change-analysis.md` |
| **Entradas** | `git diff`, `git status`, `git log -1` |
| **Saídas** | Entidades, fluxos, arquivos HIGH/CRITICAL, risco do diff |
| **Quando executar** | Antes de cada commit/PR significativo |
| **Quem consome** | Decision Engine, Review Engine, PR Reviewer, Evolution |
| **Dependências** | Git |
| **Bloqueia deploy?** | Indireto (alimenta Decision) |
| **Bloqueia merge?** | Indireto |
| **Tempo** | ~2–10 s |

#### Domain Review Engine
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-review-engine.ts` |
| **Arquivos gerados** | `reports/domain-guardian/review-checklist.md` |
| **Entradas** | `change-analysis.md`, `domain-map.md`, `domain-dependencies.md` |
| **Saídas** | Checklist técnico, funcional, financeiro, admin, webhook |
| **Quando executar** | Após Change Analyzer |
| **Quem consome** | Decision Engine, PR Reviewer, Release Manager |
| **Dependências** | Change Analyzer |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~2–5 s |

#### Domain Decision Engine
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-decision-engine.ts` |
| **Arquivos gerados** | `reports/domain-guardian/decision.md` |
| **Entradas** | `change-analysis.md`, `review-checklist.md`, `latest.json`, `advisor.md`, docs de domínio |
| **Saídas** | `APPROVED` \| `REVIEW_REQUIRED` \| `BLOCKED` |
| **Quando executar** | **Obrigatório** antes de merge/deploy |
| **Quem consome** | CI (gate), Release Manager, CTO, Dashboard, Execution Manager |
| **Dependências** | Change Analyzer, Guardian, docs |
| **Bloqueia deploy?** | **Sim** |
| **Bloqueia merge?** | **Sim** (exit 1 se BLOCKED) |
| **Tempo** | ~2–5 s |

#### Domain Architecture Planner
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-architecture-planner.ts` |
| **Arquivos gerados** | `reports/domain-guardian/action-plan.md` |
| **Entradas** | `latest.json`, `advisor.md`, `decision.md`, docs de domínio |
| **Saídas** | Plano de ação por findings e risco |
| **Quando executar** | Após Decision; quando BLOCKED ou REVIEW_REQUIRED |
| **Quem consome** | Humanos, Issue Generator, CTO |
| **Dependências** | Guardian + Decision |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~3–8 s |

#### Domain PR Reviewer
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-pr-reviewer.ts` |
| **Arquivos gerados** | `reports/domain-guardian/pr-review.md` |
| **Entradas** | `change-analysis.md`, `review-checklist.md`, `decision.md`, docs |
| **Saídas** | Parecer de revisão humana recomendada |
| **Quando executar** | Antes do merge do PR |
| **Quem consome** | Proprietário, tech lead |
| **Dependências** | Change Analyzer, Decision |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não (recomendação) |
| **Tempo** | ~2–5 s |

#### Domain Issue Generator
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-issue-generator.ts` |
| **Arquivos gerados** | `reports/domain-guardian/issues.md` |
| **Entradas** | `latest.json`, `advisor.md`, `decision.md`, `action-plan.md`, docs |
| **Saídas** | Issues estruturadas a partir de findings |
| **Quando executar** | Quando há erros/warnings Guardian |
| **Quem consome** | Backlog humano, Engineering Assistant |
| **Dependências** | Guardian, Decision |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~2–5 s |

#### Domain Memory Engine
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/domain-memory-engine.ts` |
| **Arquivos gerados** | `memory.json`, `memory.md` |
| **Entradas** | Todos os relatórios Guardian + histórico timestampado |
| **Saídas** | Memória acumulada de decisões e tendências |
| **Quando executar** | Após pipeline Guardian completo |
| **Quem consome** | Evolution Agent, Dashboard, auditorias |
| **Dependências** | Relatórios Guardian |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~2–5 s |

---

### 2.2 Contexto e arquitetura

#### Architecture Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/architecture-agent.ts` |
| **Arquivos gerados** | `project-context.json`, `project-summary.md`, `architecture-agent.md` |
| **Entradas** | Git, docs, relatórios Guardian existentes |
| **Saídas** | Snapshot consolidado do projeto |
| **Quando executar** | Início de sprint; antes de Design Planner |
| **Quem consome** | Design Planner, Implementation Planner, Knowledge Graph, CTO |
| **Dependências** | Docs de domínio (recomendado) |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~5–15 s |

#### Architecture Decision Agent (ADR)
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/architecture-decision-agent.ts` |
| **Arquivos gerados** | `architecture-decisions.json`, `architecture-decisions.md`, `docs/adr/README.md` |
| **Entradas** | Relatórios Guardian, git, docs |
| **Saídas** | ADR-001 a ADR-015+ com justificativas |
| **Quando executar** | Após mudanças arquiteturais; trimestral |
| **Quem consome** | Dashboard, Implementation Executor, humanos |
| **Dependências** | project-context (recomendado) |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~10–30 s |

#### Project Knowledge Graph Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/project-knowledge-graph-agent.ts` |
| **Arquivos gerados** | `project-knowledge-graph.json`, `project-knowledge-graph.md` |
| **Entradas** | Código-fonte, schema, docs |
| **Saídas** | Grafo entidades → arquivos → fluxos |
| **Quando executar** | Após mudanças estruturais grandes |
| **Quem consome** | Engineering Assistant, Implementation Executor, Refactor, CTO |
| **Dependências** | Código legível no disco |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~15–60 s |

---

### 2.3 Planejamento de features

#### Design Planner Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/design-planner-agent.ts` |
| **Arquivos gerados** | `design-plan.json`, `design-plan.md` |
| **Entradas** | `design-request.md` (raiz), `project-context.json` |
| **Saídas** | Plano arquitetural da feature |
| **Quando executar** | Nova feature solicitada pelo proprietário |
| **Quem consome** | Implementation Planner, humanos |
| **Dependências** | design-request.md, project-context |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~5–15 s |

#### Implementation Planner Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/implementation-planner-agent.ts` |
| **Arquivos gerados** | `implementation-plan.json`, `implementation-plan.md` |
| **Entradas** | `design-plan.json` |
| **Saídas** | Fases, arquivos, riscos, rollback, critérios |
| **Quando executar** | Após Design Planner aprovado |
| **Quem consome** | Engenheiro, Implementation Executor |
| **Dependências** | design-plan.json |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~5–15 s |

#### Implementation Executor Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/implementation-executor-agent.ts --item=EB-XXX` |
| **Arquivos gerados** | `execution-plan-<ID>.json`, `execution-plan-<ID>.md` |
| **Entradas** | `engineering-backlog.json`, knowledge graph, ADRs, invariantes, etc. |
| **Saídas** | Plano passo a passo para um item do backlog |
| **Quando executar** | Antes de implementar item específico do backlog |
| **Quem consome** | Engenheiro |
| **Dependências** | Engineering Assistant (backlog) |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~3–10 s |

---

### 2.4 Estabilização e execução (Sprint 1)

#### Stabilization Planner
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/stabilization-planner.ts` |
| **Arquivos gerados** | `stabilization-plan.json`, `stabilization-plan.md` |
| **Entradas** | Git status/diff, docs, relatórios Guardian |
| **Saídas** | 9 PRs, 22 commits, ordem, migrations, rollback |
| **Quando executar** | Início Sprint 1; quando diff > 50 arquivos |
| **Quem consome** | Execution Manager, engenheiro |
| **Dependências** | Git |
| **Bloqueia deploy?** | Não (planeja caminho seguro) |
| **Bloqueia merge?** | Não |
| **Tempo** | ~10–30 s |

#### Execution Manager Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/execution-manager-agent.ts` |
| **Arquivos gerados** | `execution-status.json`, `execution-status.md` |
| **Entradas** | `stabilization-plan.json`, git, decision, guardian |
| **Saídas** | Progresso sprint, PR atual, próximo commit, bloqueios |
| **Quando executar** | Diário durante Sprint 1 |
| **Quem consome** | Dashboard, engenheiro, CTO |
| **Dependências** | stabilization-plan |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~5–20 s |

---

### 2.5 Qualidade e evolução

#### Code Health Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/code-health-agent.ts` |
| **Arquivos gerados** | `code-health.json`, `code-health.md` |
| **Entradas** | Código-fonte, knowledge graph |
| **Saídas** | Score 0–100, dívida por módulo, tendência |
| **Quando executar** | Semanal; após sprint |
| **Quem consome** | CTO, Dashboard, Engineering Assistant |
| **Dependências** | Código no disco |
| **Bloqueia deploy?** | Não (informativo) |
| **Bloqueia merge?** | Não |
| **Tempo** | ~20–90 s |

#### Refactor Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/refactor-agent.ts` |
| **Arquivos gerados** | `refactor-report.json`, `refactor-report.md` |
| **Entradas** | Código-fonte, git |
| **Saídas** | Duplicações, legacy, ROI de refatoração |
| **Quando executar** | Mensal; pós-estabilização |
| **Quem consome** | Engineering Assistant, engenheiro |
| **Dependências** | Código no disco |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~30–120 s |

#### Evolution Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/evolution-agent.ts` |
| **Arquivos gerados** | `evolution-report.json`, `evolution-report.md` |
| **Entradas** | Git, memory, planos, decision |
| **Saídas** | Timeline, deploy readiness, migrations pendentes |
| **Quando executar** | Antes de release; após sprint |
| **Quem consome** | Release Manager, CTO, Dashboard |
| **Dependências** | Vários relatórios |
| **Bloqueia deploy?** | Indireto |
| **Bloqueia merge?** | Não |
| **Tempo** | ~10–30 s |

---

### 2.6 Consolidação e decisão executiva

#### Engineering Assistant
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/engineering-assistant.ts` |
| **Arquivos gerados** | `engineering-backlog.json`, `engineering-backlog.md` |
| **Entradas** | Todos os relatórios de agentes |
| **Saídas** | Backlog priorizado por ROI (EB-001…) |
| **Quando executar** | Semanal; após rodar agentes de qualidade |
| **Quem consome** | Implementation Executor, engenheiro, CTO |
| **Dependências** | Relatórios existentes |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~10–30 s |

#### CTO Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/cto-agent.ts` |
| **Arquivos gerados** | `cto-report.json`, `cto-report.md` |
| **Entradas** | Todos os relatórios |
| **Saídas** | Score 8 pilares, prioridade #1, veredito |
| **Quando executar** | Diário/semanal; ponto único “o que fazer agora?” |
| **Quem consome** | Proprietário, Dashboard, Release Manager |
| **Dependências** | Pipeline parcial ou completo |
| **Bloqueia deploy?** | Não (recomenda) |
| **Bloqueia merge?** | Não |
| **Tempo** | ~5–15 s |

#### Release Manager Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/release-manager-agent.ts` |
| **Arquivos gerados** | `release-report.json`, `release-report.md` |
| **Entradas** | execution-status, backlog, stabilization, decision, code-health, etc. |
| **Saídas** | `READY` \| `READY_WITH_WARNINGS` \| `NOT_READY`, score 0–100 |
| **Quando executar** | Antes de cada deploy |
| **Quem consome** | Proprietário, engenheiro, CI (futuro) |
| **Dependências** | Relatórios atualizados |
| **Bloqueia deploy?** | **Sim** (decisão humana baseada no relatório) |
| **Bloqueia merge?** | Não |
| **Tempo** | ~5–15 s |

#### Human Report Agent
| Campo | Valor |
|-------|-------|
| **Script** | `scripts/human-report-agent.ts` |
| **Arquivos gerados** | `reports/human/project-report.json`, `reports/human/project-report.md` |
| **Entradas** | Relatórios técnicos |
| **Saídas** | Linguagem de negócio para o proprietário |
| **Quando executar** | Semanal; antes de reunião com proprietário |
| **Quem consome** | Proprietário, Dashboard |
| **Dependências** | Relatórios Guardian e planos |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |
| **Tempo** | ~10–20 s |

---

### 2.7 Apresentação (não é agente, consome relatórios)

#### Engineering Dashboard
| Campo | Valor |
|-------|-------|
| **Local** | `/admin/engenharia` |
| **Loader** | `src/app/lib/engineering-reports.ts` |
| **API** | `src/app/api/admin/engenharia/reports/route.ts` |
| **Entradas** | JSON/MD em `reports/domain-guardian/` |
| **Saídas** | UI com cards: Guardian, Decision, CTO, Execution, etc. |
| **Quando usar** | Leitura diária pelo proprietário/admin |
| **Bloqueia deploy?** | Não |
| **Bloqueia merge?** | Não |

#### CI — Domain Guardian Workflow
| Campo | Valor |
|-------|-------|
| **Arquivo** | `.github/workflows/domain-guardian.yml` |
| **Entradas** | Push/PR + `DATABASE_URL` secret |
| **Saídas** | Artefatos + gate Decision no CI |
| **Quando** | Automático em push/PR |
| **Bloqueia merge?** | Sim (se Decision BLOCKED no CI) |

---

## 3. Pipeline completo

```text
                         ┌─────────────────────────────────────┐
                         │              GIT                     │
                         │  (commits, PRs, working tree)        │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │           GUARDIAN RUNNER            │
                         │  audit → diff → latest.json          │
                         │  (+ advisor opcional)                │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │        CHANGE ANALYZER               │
                         │  entidades, risco, arquivos críticos │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │         REVIEW ENGINE                │
                         │  checklist de testes/regressão       │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │        DECISION ENGINE  ◄── GATE    │
                         │  APPROVED | REVIEW_REQUIRED | BLOCKED│
                         └─────────────────┬───────────────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
               ┌──────────────────┐ ┌────────────┐ ┌──────────────────┐
               │ ARCHITECTURE     │ │ PR REVIEWER│ │ ISSUE GENERATOR  │
               │ PLANNER          │ │            │ │                  │
               │ → action-plan    │ │            │ │                  │
               └────────┬─────────┘ └────────────┘ └──────────────────┘
                        │
        ┌───────────────┼───────────────┬──────────────────┐
        ▼               ▼               ▼                  ▼
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  ┌─────────────┐
 │ PLANNERS    │ │ QUALITY     │ │ CONSOLIDAÇÃO│  │ MEMORY      │
 │ Design      │ │ Code Health │ │ CTO         │  │ ENGINE      │
 │ Stabiliz.   │ │ Refactor    │ │ Engineering │  │             │
 │ Execution   │ │ Evolution   │ │ Release     │  │             │
 └──────┬──────┘ └──────┬──────┘ └──────┬──────┘  └─────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
              ┌─────────────────────┐
              │   DASHBOARD + HUMAN │
              │   REPORT            │
              └─────────────────────┘
```

### Explicação de cada etapa

| Etapa | O que faz | Por que importa |
|-------|-----------|-----------------|
| **Git** | Fonte da verdade das mudanças | Sem git limpo por PR, Decision fica BLOCKED |
| **Guardian** | Verifica integridade do banco | Detecta cobrança duplicada, cupom órfão, etc. |
| **Change Analyzer** | Mapeia impacto do diff | Revela escopo CRITICAL antes do merge |
| **Review Engine** | Lista o que testar | Evita esquecer webhook ou checkout |
| **Decision Engine** | Classifica risco final | Único gate automático obrigatório |
| **Planner** | Gera planos de ação/implementação | Traduz BLOCKED em passos executáveis |
| **CTO** | Prioriza o que fazer agora | Uma resposta para “por onde começo?” |
| **Dashboard** | Visualiza tudo | Proprietário não lê JSON |

---

## 4. Fluxo para desenvolvimento (nova feature)

```text
Proprietário descreve necessidade
        ↓
Criar design-request.md
        ↓
architecture-agent.ts (contexto atualizado)
        ↓
design-planner-agent.ts
        ↓
[Revisão humana do design-plan]
        ↓
implementation-planner-agent.ts
        ↓
[Implementação manual pelo engenheiro]
        ↓
domain-guardian-runner.ts
        ↓
domain-change-analyzer.ts
        ↓
domain-review-engine.ts
        ↓
domain-decision-engine.ts
        ↓
[Se APPROVED → merge]
        ↓
release-manager-agent.ts (antes do deploy)
```

**Regras:**
- Não implementar sem `design-plan` aprovado em features médias/grandes.
- Não fazer merge com Decision BLOCKED.
- Features financeiras exigem sandbox Asaas manual.

---

## 5. Fluxo para correção de bugs

```text
Bug reportado
        ↓
domain-guardian-runner.ts (é problema de dados?)
        ↓
Identificar item no engineering-backlog OU hotfix direto
        ↓
[Correção mínima no código]
        ↓
domain-change-analyzer.ts (escopo pequeno?)
        ↓
domain-decision-engine.ts
        ↓
Guardian exit 0
        ↓
Merge rápido (1 PR pequeno)
        ↓
Monitorar 24h (webhook logs)
```

**Regras:**
- Hotfix financeiro: máximo 5 arquivos por PR.
- Se bug envolve migration: seguir fluxo de deploy (PR-02).

---

## 6. Fluxo para deploy

```text
Sprint / PRs mergeados em ordem (stabilization-plan)
        ↓
execution-manager-agent.ts (progresso 100%?)
        ↓
npx prisma migrate deploy (staging → produção)
        ↓
domain-guardian-runner.ts (pós-migration)
        ↓
release-manager-agent.ts
        ↓
Se NOT_READY → parar
Se READY_WITH_WARNINGS → checklist completo
Se READY → deploy Vercel
        ↓
Monitorar 24h (webhooks, F1/F4)
        ↓
evolution-agent.ts (registrar o que mudou)
```

---

## 7. Fluxo para rollback

```text
Incidente detectado (Guardian, logs, cliente)
        ↓
release-report.md → seção rollback
        ↓
git revert merge commit do PR problemático
        ↓
Redeploy Vercel (versão anterior)
        ↓
[NÃO reverter migration sem SQL manual]
        ↓
domain-guardian-runner.ts (confirmar baseline)
        ↓
human-report-agent.ts (comunicar proprietário)
        ↓
evolution-agent.ts (documentar incidente)
```

---

## 8. Fluxo para auditoria

```text
Auditoria pontual (mensal / pré-release)
        ↓
architecture-agent.ts
        ↓
project-knowledge-graph-agent.ts
        ↓
architecture-decision-agent.ts
        ↓
code-health-agent.ts
        ↓
refactor-agent.ts
        ↓
domain-guardian-runner.ts (banco)
        ↓
engineering-assistant.ts (backlog atualizado)
        ↓
cto-agent.ts
        ↓
human-report-agent.ts → reunião com proprietário
```

---

## 9. Agentes que podem ser removidos no futuro

| Agente | Motivo para remoção futura | Condição |
|--------|---------------------------|----------|
| **Stabilization Planner** | Plano Sprint 1 concluído | Após 9 PRs mergeados |
| **Refactor Agent** | Dívida técnica < 20/100 | Pós-code health estável |
| **Implementation Executor** | Backlog vazio ou processo maduro | Quando engenheiro não precisar de plano por item |
| **Evolution Agent** | Substituído por changelog automático | CI/CD maduro |
| **Human Report Agent** | Dashboard cobre 100% das necessidades | Proprietário usa só dashboard |
| **Domain Issue Generator** | Integrado ao GitHub Issues | Automação de tickets |
| **Múltiplos planners** | Unificar Design + Implementation | Se fluxo estabilizar |

**Nunca remover:** Guardian Audit, Change Analyzer, Decision Engine.

---

## 10. Agentes obrigatórios

### Sempre (cada PR com código de negócio)

1. `domain-guardian-runner.ts`
2. `domain-change-analyzer.ts`
3. `domain-decision-engine.ts`

### Antes de merge em área financeira / schema

4. `domain-review-engine.ts`
5. `domain-guardian-advisor.ts` (se houver findings)

### Antes de deploy

6. `release-manager-agent.ts`
7. `domain-guardian-runner.ts` (pós-migration)

### Sprint 1 (agora)

8. `stabilization-planner.ts` (referência)
9. `execution-manager-agent.ts` (acompanhamento diário)

---

## 11. Roadmap dos agentes

### Essenciais (núcleo permanente)

| Agente | Papel |
|--------|-------|
| Domain Guardian Audit | Integridade do banco |
| Domain Guardian Runner | Orquestração |
| Domain Change Analyzer | Impacto do diff |
| Domain Decision Engine | Gate de risco |
| Domain Review Engine | Checklist de testes |

### Importantes (operação madura)

| Agente | Papel |
|--------|-------|
| Architecture Agent | Contexto do projeto |
| Architecture Decision Agent | Memória ADR |
| Project Knowledge Graph | Mapa código ↔ domínio |
| Design Planner | Novas features |
| Implementation Planner | Fases de implementação |
| Stabilization Planner | Sprint 1 |
| Execution Manager | Progresso sprint |
| CTO Agent | Priorização |
| Release Manager | Gate de deploy |
| Engineering Assistant | Backlog ROI |
| CI Workflow | Automação GitHub |

### Opcionais (valor alto, não bloqueiam)

| Agente | Papel |
|--------|-------|
| Code Health Agent | Saúde estrutural |
| Refactor Agent | Dívida técnica |
| Evolution Agent | Timeline de mudanças |
| Human Report Agent | Tradução para proprietário |
| Implementation Executor | Plano por item backlog |
| Domain PR Reviewer | Parecer de revisão |
| Domain Issue Generator | Issues estruturadas |
| Domain Memory Engine | Histórico acumulado |
| Domain Architecture Planner | Action plan |
| Engineering Dashboard | UI de leitura |

### Experimentais (V1 recente)

| Agente | Papel |
|--------|-------|
| Implementation Executor Agent | Plano por EB-XXX |
| Release Manager Agent | Score de release |
| Git Stabilization Report | Auditoria manual (artefato, não script permanente) |

---

## 12. Resumo executivo para o proprietário

**O que são os agentes?**  
São assistentes automáticos que **leem** o projeto e **escrevem relatórios**. Eles não mudam o site sozinhos. Funcionam como um “painel de saúde” + “consultor técnico” para decidir com segurança.

**O que você ganha?**  
- Saber se é seguro publicar uma versão.  
- Ver prioridades claras (o que fazer primeiro).  
- Entender mudanças em linguagem simples (Human Report + Dashboard).  
- Reduzir risco de erro em pagamentos e agendamentos.

**O que precisa fazer?**  
- Aprovar planos de feature (`design-plan`) antes da implementação.  
- Não autorizar deploy quando o relatório diz `NOT_READY`.  
- Usar o Dashboard em `/admin/engenharia` para acompanhar.

**Situação atual (Sprint 1):**  
O sistema de verificação (Guardian) está saudável no banco, mas há muitas mudanças pendentes agrupadas. Por isso a decisão automática está **bloqueada** — é proposital. A estabilização divide o trabalho em 9 entregas pequenas (PRs) para voltar a publicar com segurança.

---

## Métricas do ecossistema

| Métrica | Quantidade |
|---------|------------|
| **Scripts de agentes/engines** | **26** |
| **Relatórios em `reports/domain-guardian/`** | **~50** arquivos (JSON + MD + histórico) |
| **Relatórios em `reports/human/`** | **2** |
| **Workflows CI** | **1** |
| **Dashboard UI** | **1** (`/admin/engenharia`) |

### Cobertura do ciclo de desenvolvimento

| Fase | Cobertura | Agentes |
|------|-----------|---------|
| Ideação / design | ✅ Alta | Design Planner, Architecture Agent |
| Planejamento | ✅ Alta | Implementation Planner, Stabilization, Executor |
| Implementação | ⚠️ Manual | (humano) — agentes só orientam |
| Teste / revisão | ✅ Alta | Review Engine, PR Reviewer, Guardian |
| Gate de qualidade | ✅ Alta | Decision Engine |
| Merge / CI | ✅ Média | GitHub Workflow (parcial até PR-02) |
| Deploy | ✅ Alta | Release Manager, Evolution |
| Rollback | ✅ Média | Release Report + stabilization rollback |
| Operação / monitoramento | ✅ Média | Guardian, Memory, Advisor |
| Priorização | ✅ Alta | CTO, Engineering Assistant |
| Comunicação proprietário | ✅ Alta | Human Report, Dashboard |

**Cobertura global estimada:** ~85% do ciclo com agentes read-only; **implementação de código permanece 100% humana** (por design).

---

## Referências rápidas

| Documento | Caminho |
|-----------|---------|
| Mapa de domínio | `docs/ai/domain-map.md` |
| Invariantes | `docs/ai/domain-invariants.md` |
| Pipeline GitHub | `docs/ai/github-pipeline.md` |
| ADRs | `docs/adr/README.md` |
| Relatórios | `reports/domain-guardian/` |
| Dashboard | `/admin/engenharia` |

---

*Documentação gerada como parte da Sprint 1 — sem alteração de código de negócio, banco, APIs ou UI.*
