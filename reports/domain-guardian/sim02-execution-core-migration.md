# SIM-02 — Execution Core Migration

**Gerado:** 2026-07-15  
**Status:** APROVADO automaticamente (EC-01 Phase 11)

---

## Veredicto

SIM-02 utiliza exclusivamente o Execution Core.  
Mesmos cenários SIM-001…SIM-010. Nenhum pipeline paralelo.  
Mesmo Workflow · State Machine · Synchronization · Cleanup.

**Batch:** 10/10 PASS · avg ~7.0s · reportId `SIM-02-execution`

---

## Critérios SIM-02

| Critério | Status |
|----------|--------|
| `ExecutionCore.run()` exclusivo | PASS |
| Mesmos cenários SIM-01 | PASS (`SIM01_IDS`) |
| Sem pipeline paralelo | PASS |
| Sem regras duplicadas | PASS |
| Sync Engine oficial | PASS |
| Workflow / SM oficiais | PASS |
| Cleanup `@homolog.test` | PASS |

## Como executar

```bash
npm run sim:batch:sim02
npm run sim:run -- --id SIM-001 --engine sim02
npm run sim:watch -- --files src/app/lib/domain/workflow.ts
```

## Relatório de execução

`reports/domain-guardian/sim02-last-run.json`

## Diferença vs SIM-01

| | SIM-01 | SIM-02 |
|--|--------|--------|
| Entry | ExecutionCore | ExecutionCore |
| Suite label | `sim01` | `sim02` |
| reportId | `SIM-01-execution` | `SIM-02-execution` |
| Cenários | SIM-001…010 | SIM-001…010 (idênticos) |
| Pipeline domínio | Oficial | Oficial |

---

**SIM-02 concluído como parte de EC-01. Não iniciar novas sprints.**
