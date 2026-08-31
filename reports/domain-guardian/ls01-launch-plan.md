# LS-01 — Plano Executivo de Lançamento

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Lançamento:** Dia 10 · **Escopo:** MVP agendamento avulso via Asaas

---

## Resumo executivo

| | |
|---|---|
| **Estado atual** | RC PR-03 fechada; GL-01 B1 commitado; gates operacionais Asaas/Neon pendentes |
| **Escopo de lançamento** | Agendamento avulso pago — planos **fora** até GL-01 B2 commit |
| **Caminho crítico** | Backup → migrate → Preview smoke → envs prod → deploy → 1º pagamento → 1º cliente |
| **Autoridade Go/No-Go** | Proprietário THouse + Engenheiro |

### Fontes consolidadas

| Domínio | Relatório | Veredito |
|---------|-----------|----------|
| Release Candidate | RL-03 | FECHADA — build PASSOU |
| Quality Engineering | QE-03 | GO condicional (avulso); planos OUT |
| Go Live | GL-01 / GL-02 | B1 OK; 17 gates operacionais |
| Production Readiness | PRD-01 | Condicional — checklist H1 |
| Operational Runbook | OPS-01 | 17 procedimentos + 3 avisos críticos |
| Hardening | E2E-02 | H1 pós-launch recomendado |

---

## Cronograma — 10 dias até o lançamento

### Dia 1 — Kickoff e Release Candidate

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Congelar baseline deployável (RC PR-03) |
| **Responsável** | Engenheiro + Proprietário |
| **Pré-requisitos** | Branch `pr03-clean`; acesso repo e Vercel |
| **Critério de aprovação** | Commit `3f20ad0` confirmado; build PASS; escopo MVP assinado |
| **Tempo** | 3–4 h |
| **Riscos** | Deploy commit errado; GL-01 B2 não commitado incluído sem decisão |

| Tipo | Tarefas |
|------|---------|
| Técnicas | `git log`, `npm run build`, `tsc`, CI Domain Guardian |
| Operacionais | Kickoff; documentar planos FORA do escopo |
| Manuais | Proprietário aprova escopo/data; salvar OPS-01 |
| Automatizáveis | Build CI, Domain Guardian |

---

### Dia 2 — Quality Engineering

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Fechar gates QE para agendamento avulso |
| **Responsável** | Engenheiro (QE) |
| **Pré-requisitos** | Dia 1 aprovado |
| **Critério de aprovação** | Fluxo compra serviço = GO; planos = OUT OF SCOPE |
| **Tempo** | 4–5 h |
| **Riscos** | Legado financeiro ~40%; metadata fallback |

| Tipo | Tarefas |
|------|---------|
| Técnicas | Revalidar caminho checkout-carrinho → webhook canônico |
| Operacionais | Registrar 5 gates Asaas QE-03 |
| Manuais | Go/No-Go documentado |
| Automatizáveis | `domain-guardian-runner.ts` |

---

### Dia 3 — Production Readiness

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Inventário envs e infra antes de produção |
| **Responsável** | Engenheiro / DevOps |
| **Pré-requisitos** | Dia 2 aprovado; acesso Vercel e Neon |
| **Critério de aprovação** | Tabela envs completa; PITR Neon confirmado |
| **Tempo** | 3–4 h |
| **Riscos** | Env faltando; sem PITR |

| Tipo | Tarefas |
|------|---------|
| Técnicas | Inventário envs; `prisma migrate status` |
| Operacionais | Neon PITR; Vercel env slots |
| Manuais | Credenciais Asaas; domínio final definido |
| Automatizáveis | `release-manager-agent.ts` |

---

### Dia 4 — Infraestrutura (staging + backup)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Banco staging migrado + backup |
| **Responsável** | Engenheiro / DevOps |
| **Pré-requisitos** | Dia 3 aprovado |
| **Critério de aprovação** | `migrate deploy` staging OK; snapshot registrado |
| **Tempo** | 2–3 h |
| **Riscos** | Migration drift; backup esquecido |

| Tipo | Tarefas |
|------|---------|
| Técnicas | `prisma migrate deploy` staging; smoke queries |
| Operacionais | OPS P10 snapshot Neon |
| Manuais | Snapshot manual Neon Console |
| Automatizáveis | migrate deploy; Neon API (futuro) |

---

### Dia 5 — Deploy Preview + Asaas Sandbox

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Preview HTTPS + webhook sandbox |
| **Responsável** | Engenheiro |
| **Pré-requisitos** | Dia 4 aprovado; chave sandbox |
| **Critério de aprovação** | Preview online; webhook recebe evento teste |
| **Tempo** | 3–4 h |
| **Riscos** | URL preview muda; token mismatch |

| Tipo | Tarefas |
|------|---------|
| Técnicas | Deploy Preview; envs preview |
| Operacionais | Registrar webhook sandbox |
| Manuais | Painel Asaas: URL + token |
| Automatizáveis | Vercel preview deploy |

---

### Dia 6 — Smoke E2E Sandbox

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Jornada completa cliente em sandbox (GL-14) |
| **Responsável** | Engenheiro + Proprietário (tester) |
| **Pré-requisitos** | Dia 5 aprovado |
| **Critério de aprovação** | Payment + Appointment em Minha Conta; logs webhook OK |
| **Tempo** | 4–6 h |
| **Riscos** | CPF inválido; metadata incompleto |

| Tipo | Tarefas |
|------|---------|
| Técnicas | E2E-01 passos 1–10; verificar banco |
| Operacionais | GL-15 logs Vercel |
| Manuais | Formulário carrinho; pagamento sandbox humano |
| Automatizáveis | Futuro Playwright |

---

### Dia 7 — Configuração Produção

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Envs produção + Asaas prod (sem divulgação) |
| **Responsável** | Engenheiro / DevOps |
| **Pré-requisitos** | Dia 6 smoke PASS |
| **Critério de aprovação** | Envs GL-02 em Production; webhook prod; domínio Asaas |
| **Tempo** | 3–4 h |
| **Riscos** | Chave sandbox em prod; URL errada |

| Tipo | Tarefas |
|------|---------|
| Técnicas | Vercel Production envs; validar `$aact_prod_*` |
| Operacionais | Webhook prod; domínio painel Asaas |
| Manuais | Aprovar domínio; gerar CRON_SECRET |
| Automatizáveis | Script validação prefixo chave |

---

### Dia 8 — Deploy Produção

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Produção no ar com migrate e backup |
| **Responsável** | Engenheiro / DevOps |
| **Pré-requisitos** | Dia 7 aprovado |
| **Critério de aprovação** | OPS P01; migrate prod; snapshot pré-deploy; HTTPS OK |
| **Tempo** | 2–4 h |
| **Riscos** | Migrate sem backup; env incompleta |

| Tipo | Tarefas |
|------|---------|
| Técnicas | Snapshot → migrate prod → deploy Vercel |
| Operacionais | Registrar commit deployado |
| Manuais | Proprietário ciente: prod sem divulgação |
| Automatizáveis | Deploy hook; migrate deploy |

---

### Dia 9 — Primeiro pagamento real (OPS P15)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Provar cadeia real money antes do cliente externo |
| **Responsável** | Proprietário + Engenheiro |
| **Pré-requisitos** | Dia 8 deploy OK |
| **Critério de aprovação** | Pagamento RECEIVED; Payment + Appointment; runbook replay documentado |
| **Tempo** | 2–3 h |
| **Riscos** | Falha webhook prod; atraso lançamento |

| Tipo | Tarefas |
|------|---------|
| Técnicas | Fluxo conta teste PROD; testar curl replay com token |
| Operacionais | Plantão H+24; texto 1º cliente |
| Manuais | Pagamento real valor mínimo |
| Automatizáveis | `verificar?paymentId=` |

---

### Dia 10 — LANÇAMENTO

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | 1º cliente real + operação assistida |
| **Responsável** | Proprietário + Engenheiro (plantão) + Admin |
| **Pré-requisitos** | Dia 9 PASS; suporte ativo; OPS runbook |
| **Critério de aprovação** | 1º cliente compra OU lançamento controlado; zero P0 em 4h; plantão 24h |
| **Tempo** | Dia inteiro (~4h efetivas plantão) |
| **Riscos** | "Paguei e não apareceu"; webhook pós-smoke |

| Tipo | Tarefas |
|------|---------|
| Técnicas | OPS P16 checks H+1, H+4; incidentes P04/P07/P08 |
| Operacionais | Divulgação controlada; admin monitora pagamentos |
| Manuais | Comunicação 1º cliente; suporte ativo |
| Automatizáveis | Log checks agendados (futuro DevOS) |

---

## Pós-lançamento

### Dias 11–17 — Primeira semana (OPS P17)

- Monitoramento diário OPS P14
- Retrospectiva Dia 14 e Dia 17
- Decisão H1 UX (polling, redirect) vs suporte manual

### Dias 18–40 — Primeiro mês

- Backup Neon semanal
- Domain Guardian semanal
- Avaliar GL-01 B2 (planos) e alertas webhook
- Relatório Dia 30: receita, conversão, tickets

---

## Checklists

### Lançamento (Dias 1–10)

- [ ] RC validada — `3f20ad0` (D1)
- [ ] QE GO avulso; planos OUT (D2)
- [ ] Envs inventariadas PRD-01 (D3)
- [ ] Backup + migrate staging (D4)
- [ ] Preview + webhook sandbox (D5)
- [ ] Smoke E2E sandbox PASS (D6)
- [ ] Envs prod + Asaas prod (D7)
- [ ] Backup + migrate + deploy prod (D8)
- [ ] 1º pagamento real PASS (D9)
- [ ] Runbook + plantão (D9)
- [ ] **Go Live** — 1º cliente (D10)

### Pós-lançamento (24h)

- [ ] H+1: logs sem erro crítico
- [ ] H+4: zero pagamentos órfãos
- [ ] H+24: relatório pagamentos/tickets
- [ ] Incidentes registrados com asaasId
- [ ] Sem alteração env salvo P0

### Primeira semana

- [ ] Monitoramento diário 7 dias
- [ ] Taxa abandono carrinho revisada
- [ ] Replay webhook documentado
- [ ] Crons configurados se pendente
- [ ] Backup Neon verificado
- [ ] Retrospectiva + decisão H1 UX

### Primeiro mês

- [ ] Guardian semanal
- [ ] 4 backups Neon
- [ ] Zero P0 não resolvido em < 4h
- [ ] Revisar ASAAS_API_KEY
- [ ] Avaliar planos (GL-01 B2)
- [ ] Relatório Dia 30
- [ ] Decisão escalar divulgação

---

## Resumo de tarefas (10 dias)

| Categoria | Qtd. aprox. |
|-----------|-------------|
| Técnicas | 28 |
| Operacionais | 22 |
| Manuais | 18 |
| Automatizáveis | 14 |

Concentração manual: Dias 6, 9 e 10 (testes humanos, pagamento real, cliente).

---

## Probabilidade de sucesso

> **Se o plano for seguido exatamente, qual a probabilidade do THouse Rec entrar em produção com sucesso?**

### **74%** (faixa 70–78%)

**Definição de sucesso:** deploy estável + migrate OK + 1º pagamento real validado + 1º cliente completa compra na primeira semana sem perda financeira irrecuperável.

| Cenário | Prob. |
|---------|-------|
| Deploy técnico bem-sucedido | ~88% |
| 1º cliente sem ticket crítico | ~70% |
| 1ª semana sem incidente P0 | ~65% |
| **Plano completo (definição acima)** | **~74%** |
| Sem seguir o plano | ~45% |

**Por que não 100%:** monitoramento ainda manual; webhook sempre HTTP 200; UX pós-pagamento parcial; risco residual pós-smoke Dia 9.

---

## Decisões registradas

| Decisão | Detalhe |
|---------|---------|
| **Fora do escopo** | Planos, Mercado Pago, InfinityPay, Loja |
| **Hardening pós-launch** | Redirect minha-conta, polling pós-pagamento, alertas webhook |
| **Rollback** | Bug financeiro reproduzível ou > 1 cliente com pagamento perdido |

---

*Relatório gerado em modo READ ONLY — nenhum código ou commit alterado.*
