# Pipeline GitHub — Domain Guardian

Integração CI/CD do **Agente de Arquitetura** (Fases 1–8). O workflow executa auditoria de banco, análise de diff, checklist de revisão, decisão de merge e plano de ação — **somente leitura**, sem alterar APIs nem regras de negócio.

**Workflow:** [`.github/workflows/domain-guardian.yml`](../../.github/workflows/domain-guardian.yml)

---

## 1. Fluxo completo

```
push / pull_request / workflow_dispatch
        │
        ▼
┌───────────────────────────────────────┐
│  checkout (fetch-depth: 0)            │
│  npm ci → prisma generate             │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 1. domain-guardian-runner.ts          │──► latest.json, summary.md
│    + domain-guardian-advisor.ts       │──► advisor.md
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 2. domain-change-analyzer.ts          │──► change-analysis.md
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 3. domain-review-engine.ts            │──► review-checklist.md
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 4. domain-decision-engine.ts  ◄ GATE  │──► decision.md
│    APPROVED / REVIEW_REQUIRED → OK    │
│    BLOCKED → exit 1 → job falha       │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 5. domain-architecture-planner.ts     │──► action-plan.md
│    (sempre exit 0 — orientação)       │
└───────────────────────────────────────┘
        │
        ▼
   upload-artifact (sempre, if: always)
   job summary (decisão + contagens Guardian)
```

### Duas camadas de avaliação

| Camada | Fonte | O que mede |
|--------|-------|------------|
| **Banco (Guardian)** | `latest.json` | Integridade dos dados em produção/staging |
| **Diff (Decision)** | `change-analysis.md` | Risco das mudanças no PR/working tree |

O **gate de CI** usa apenas o **Decision Engine** (diff). O Guardian pode reportar problemas no banco sem falhar o job, desde que a decisão de merge não seja `BLOCKED`.

---

## 2. Ordem dos scripts

| # | Script | Saída principal | Falha o job? |
|---|--------|-----------------|--------------|
| 1 | `domain-guardian-runner.ts` | `latest.json`, `summary.md` | Não (`\|\| true`) |
| 1b | `domain-guardian-advisor.ts` | `advisor.md` | Não (`\|\| true`) |
| 2 | `domain-change-analyzer.ts` | `change-analysis.md` | Não |
| 3 | `domain-review-engine.ts` | `review-checklist.md` | Não |
| 4 | `domain-decision-engine.ts` | `decision.md` | **Sim, se BLOCKED** |
| 5 | `domain-architecture-planner.ts` | `action-plan.md` | Nunca |

> O passo **1b** (`advisor`) roda imediatamente após o runner porque o runner ainda não o invoca internamente; `decision.md` e `action-plan.md` dependem de `advisor.md`.

### Pré-requisitos

- **Node.js 20**
- **`DATABASE_URL`** em [GitHub Secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) — necessário para `domain-guardian-audit.ts` (Prisma)
- **Git history** — `fetch-depth: 0` para o Change Analyzer enxergar o diff completo em PRs

---

## 3. Como interpretar artifacts

Após cada execução, baixe o artifact **`domain-guardian-reports`** (retenção 30 dias).

| Arquivo | Conteúdo | Quando ler |
|---------|----------|------------|
| `latest.json` | Resultado estruturado dos 13 checks (F1–S4) | Automação, dashboards |
| `summary.md` | Resumo operacional + diff vs execução anterior | Triagem rápida do banco |
| `advisor.md` | Playbook por check com criticidade e ações | Incidentes no banco |
| `change-analysis.md` | Risco por arquivo/entidade/invariante | Revisão de PR |
| `review-checklist.md` | Testes obrigatórios por entidade (SMOKE/NORMAL/FULL) | QA antes do merge |
| `decision.md` | **APPROVED** / **REVIEW_REQUIRED** / **BLOCKED** | Gate de merge |
| `action-plan.md` | Planos corretivos se Guardian com errors/warnings | Operação pós-incidente |

### Decisões

| Decisão | CI | Significado |
|---------|-----|-------------|
| **APPROVED** | Sucesso | Diff de baixo/médio risco; merge permitido com smoke tests |
| **REVIEW_REQUIRED** | Sucesso | Revisão humana + testes do checklist; merge com cautela |
| **BLOCKED** | **Falha** | Risco CRITICAL, invariantes críticos ou combinação schema+Payment+Appointment |

O **Job summary** na página do workflow exibe o trecho de `decision.md` e contagens do Guardian.

---

## 4. Como rodar localmente

Reproduzir o pipeline completo:

```bash
# Pré-requisitos: DATABASE_URL no .env, dependências instaladas
npm ci
npx prisma generate

node --experimental-strip-types scripts/domain-guardian-runner.ts
node --experimental-strip-types scripts/domain-guardian-advisor.ts
node --experimental-strip-types scripts/domain-change-analyzer.ts
node --experimental-strip-types scripts/domain-review-engine.ts
node --experimental-strip-types scripts/domain-decision-engine.ts    # exit 1 se BLOCKED
node --experimental-strip-types scripts/domain-architecture-planner.ts
```

Relatórios em `reports/domain-guardian/`.

### Apenas o gate (sem banco)

Se não houver `DATABASE_URL`, os passos 2–5 ainda funcionam (análise de diff). O runner falhará na auditoria, mas `change-analysis.md` será gerado a partir do git local.

---

## 5. Como expandir futuramente

### Integrar advisor no runner

Mover `domain-guardian-advisor.ts` para dentro de `domain-guardian-runner.ts` e remover o passo 1b do workflow.

### Comentário automático em PR

```yaml
- uses: actions/github-script@v7
  if: github.event_name == 'pull_request' && always()
  with:
    script: |
      const fs = require('fs');
      const decision = fs.readFileSync('reports/domain-guardian/decision.md', 'utf8');
      // postar comentário com seção "## 1. Decisão final"
```

### Branch protection

Exigir o check **Domain Guardian / Governança de domínio** como required status em `main`.

### Checks adicionais

1. Adicionar check em `domain-guardian-audit.ts`
2. Atualizar `CHECK_ADVISORY` em `domain-guardian-advisor.ts`
3. Atualizar playbooks em `domain-architecture-planner.ts`
4. Documentar em `domain-invariants.md`

### Agendamento

```yaml
on:
  schedule:
    - cron: '0 6 * * 1'  # segunda-feira 06:00 UTC
```

### Staging vs produção

Usar `DATABASE_URL` por environment (`staging`, `production`) via GitHub Environments.

---

## Referências

- [domain-map.md](./domain-map.md)
- [domain-invariants.md](./domain-invariants.md)
- [domain-dependencies.md](./domain-dependencies.md)
- [domain-risks.md](./domain-risks.md)

---

*Última atualização: Fase 8 — integração GitHub Actions.*
