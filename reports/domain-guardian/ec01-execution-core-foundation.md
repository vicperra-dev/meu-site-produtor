# EC-01 — Execution Core Foundation + SIM-02

**Modo:** Staff Software Engineer · Software Architect · Domain Architect · Test Engine Owner · QA Lead · Platform Engineer · Domain Guardian  
**Gerado:** 2026-07-15  
**Branch:** `backup-pre-formatacao`  
**Commit:** `refactor(core): introduce unified execution core platform (EC-01)`

---

## Veredicto

Núcleo oficial de execução consolidado. TE, SIM e CLI/API passam por `ExecutionCore.run()`.  
SIM-02 aprovado automaticamente (mesmos cenários SIM-01 via Execution Core).

**Gates:** TypeScript · Prisma · Build · Domain · Workflow · Sync · Simulation · Execution · Knowledge Graph · Discovery · Regression · TE-02A (21/21) · SYNC-01A (7/7) · SIM-01 (10/10) · SIM-02 (10/10) — **PASS**.

---

## Pipeline oficial

```
ExecutionCore.run()
  → Workflow
  → State Machine
  → Domain Events
  → Synchronization
  → Assertions
  → Reports
  → Cleanup
```

---

## Arquivos criados

| Arquivo | Papel |
|---------|--------|
| `src/app/lib/execution/*` | Core, context, session, runner, result, observer, hooks, registry, pipeline, report, cleanup, history, impact, discovery, permissions, studio-template |
| `src/app/lib/domain/graph/*` | Knowledge Graph (nodes, queries, types) |
| `src/app/api/execution/run/route.ts` | API prep QA Center / Operator / StudioOS |
| `scripts/execution-audit.ts` | Execution Audit |
| `scripts/knowledge-graph-audit.ts` | Graph Audit |
| `scripts/discovery-audit.ts` | Discovery Audit |
| `scripts/regression-audit.ts` | Regression aggregate |
| `scripts/sim-watch.ts` | Incremental watch via impact analysis |

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Scripts `sim:watch`, `sim:batch:sim02`, `exec:audit`, `graph:audit`, `discovery:audit`, `regression:audit` |
| `scripts/sim-run.ts` | Suporte `--engine sim02` |
| `src/app/lib/test-engine/scenario-runner.ts` | Delega a `ExecutionCore` |
| `src/app/lib/test-engine/scenario-registry.ts` | Discovery-backed |
| `src/app/lib/test-engine/permissions.ts` | Delega ao gate unificado |
| `src/app/lib/test-engine/index.ts` | Re-exports EC |
| `src/app/lib/simulation/runner.ts` | Delega a `ExecutionCore` (sim01/sim02) |
| `src/app/lib/simulation/registry.ts` | Discovery-backed |
| `src/app/lib/simulation/permissions.ts` | Delega ao gate unificado |
| `src/app/lib/simulation/types.ts` | `SIM-02-execution` reportId |
| `src/app/lib/simulation/index.ts` | Export EC + SIM-02 helper |
| `src/app/lib/domain/index.ts` | Export graph |
| `src/app/lib/test-engine/scenarios/sync01a-batch.ts` | Cursor replay não-flaky |

---

## Execution Core

- **Entry:** `ExecutionCore.run()`
- **Discovery:** 51 cenários · 6 suites (`te-s01`, `te-stubs`, `te02a`, `sync01a`, `sim01`, `sim02`)
- **History:** in-memory (prep Timeline StudioOS)
- **Impact:** `analyzeImpact()` preparado (`preparedOnly: true`)

## Knowledge Graph

- 12 entidades · 67 edges
- Queries: dependents, surfaces, events, tests covering entity

## Impact Analyzer + Watch Mode

- `npm run sim:watch -- --files path.ts`
- Usa Knowledge Graph → executa só SIM afetados (sem batch completo desnecessário)

## QA / Studio preparation

- `GET/POST /api/execution/run` — sem UI
- `studio-template.ts` — boundary reutilizável vs THouse-specific

## Cobertura / Tempo

| Suite | Resultado | Tempo médio |
|-------|-----------|-------------|
| TE-02A | 21/21 | — |
| SYNC-01A | 7/7 | — |
| SIM-01 | 10/10 | ~6.7s/cenário |
| SIM-02 | 10/10 | ~7.0s/cenário |

## Riscos / Limitações

1. Discovery de batches ainda lista export arrays (não filesystem scan puro)
2. Execution history não persistida em DB
3. Impact analysis é heurística de path → entidade
4. APIs admin de produção ainda chamam Workflow diretamente (domínio HTTP ≠ scenario runners)
5. TE-01C catalog (132) não está wired como cenários runnable

## Próximos passos (não iniciados)

- EC-02 / persistência de Execution History
- QA Center UI
- StudioOS package extraction
- Impact CI automático em PR

---

**Parado. Aguardando aprovação. Não iniciar EC-02 / StudioOS / QA Center.**
