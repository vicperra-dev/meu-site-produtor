# RC-03 — Finalização da Pipeline de Release

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` · **Data:** 2026-07-11

---

## Objetivo

Remover dependência obrigatória de agentes StudioOS ainda não implementados, mantendo os componentes existentes do Domain Guardian como obrigatórios.

---

## Inspeção do workflow

### Scripts existentes (obrigatórios — inalterados)

| Step | Script | Gate |
|------|--------|------|
| 1 | `domain-guardian-runner.ts` + `domain-guardian-advisor.ts` | `|| true` (banco) |
| 2 | `domain-change-analyzer.ts` | `|| true` |
| 3 | `domain-review-engine.ts` | `|| true` |
| 4 | `domain-decision-engine.ts` | **obrigatório** |

### Script inexistente (tornado opcional)

| Campo | Valor |
|-------|--------|
| Script | `scripts/domain-architecture-planner.ts` |
| Agente | StudioOS — Fase 7 (Domain Architecture Planner) |
| Linha anterior | 55–56 |

**Nenhum script novo foi implementado.**

---

## Alteração aplicada

Step 5 agora executa **somente se o arquivo existir**:

```yaml
# StudioOS: domain-architecture-planner.ts pertence ao agente de arquitetura
# (Fase 7) — ainda não commitado neste repositório; opcional até implementação.
- name: 5. Domain Architecture Planner (StudioOS — opcional)
  run: |
    if [ -f scripts/domain-architecture-planner.ts ]; then
      node --experimental-strip-types scripts/domain-architecture-planner.ts
    else
      echo "Skipping domain-architecture-planner.ts — StudioOS agent not present in this repo."
    fi
```

O artifact `action-plan.md` permanece com `if-no-files-found: warn` (já tolerante à ausência).

---

## Validação local

| Passo | Resultado |
|-------|-----------|
| Step 5 (planner ausente) | Skip — exit **0** |
| Step 4 (gate) | **APPROVED** — risco LOW — exit **0** |

### Workflow completo?

**PASS**

---

## Commit

```
ci: make optional StudioOS-only workflow steps
```

Arquivo: `.github/workflows/domain-guardian.yml` apenas.

---

## Veredito

**APROVADO** — Pipeline de governança completa com componentes existentes; etapas StudioOS opcionais até implementação futura.
