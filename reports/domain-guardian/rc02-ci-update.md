# RC-02 — Correção da Infraestrutura de CI

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` · **Data:** 2026-07-11

---

## Alteração executada

| Campo | Valor |
|-------|--------|
| Arquivo | `.github/workflows/domain-guardian.yml` |
| Linha | 30 |
| Antes | `node-version: "20"` |
| Depois | `node-version: "22"` |

**Motivo:** Node 20 não reconhece `--experimental-strip-types` → exit **9** (Invalid Argument). Node **22** (LTS, suporte desde 22.6+) executa os scripts TypeScript nativamente.

---

## Revisão do workflow — scripts referenciados

| Step | Script | Existe? |
|------|--------|---------|
| 1 | `domain-guardian-runner.ts` | SIM |
| 1 | `domain-guardian-advisor.ts` | SIM |
| 2 | `domain-change-analyzer.ts` | SIM |
| 3 | `domain-review-engine.ts` | SIM |
| 4 | `domain-decision-engine.ts` | SIM |
| 5 | `domain-architecture-planner.ts` | **NÃO** |

### Script inexistente (não corrigido neste RC)

| Campo | Valor |
|-------|--------|
| **Arquivo** | `.github/workflows/domain-guardian.yml` |
| **Linha** | 56 |
| **Referência** | `scripts/domain-architecture-planner.ts` |
| **Menor correção** | Adicionar `\|\| true` ao passo 5 ou remover o passo até o script existir no repositório |

Sem implementação nova do planner (conforme escopo RC-02).

---

## Validação local

| Teste | Resultado |
|-------|-----------|
| `node --experimental-strip-types scripts/domain-decision-engine.ts` | **OK** — script inicia e executa |
| Exit code | `1` (BLOCKED — gate de domínio, não erro de infra) |

---

## Confirmações

| Pergunta | Resposta |
|----------|----------|
| **Workflow corrigido?** | **PARCIAL** — exit 9 resolvido; passo 5 pendente |
| **Build da aplicação afetado?** | **NÃO** |
| **Correção somente de infraestrutura?** | **SIM** |

---

## Commit

```
ci: update domain guardian workflow to Node 22
```

Arquivo: `.github/workflows/domain-guardian.yml` apenas.

---

## Veredito

**APROVADO PARCIAL** — Infraestrutura Node corrigida. Próximo passo: tratar passo 5 (script ausente) em RC separado.
