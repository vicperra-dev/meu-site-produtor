# TE-01B — Core do Test Engine

**Modo:** Staff Software Engineer · Software Architect · QA Automation · Domain Guardian  
**Gerado:** 2026-07-13  
**Commit:** `feat(test-engine): implement core scenario runner (TE-01B)`

---

## Escopo

Implementado **somente o núcleo** (sem UI, sem páginas admin, sem StudioOS).

| Componente | Local |
|------------|--------|
| Scenario Runner | `src/app/lib/test-engine/scenario-runner.ts` |
| Scenario Registry | `src/app/lib/test-engine/scenario-registry.ts` |
| Official Pipeline Adapter | `src/app/lib/test-engine/pipeline-adapter.ts` |
| Assert Engine | `src/app/lib/test-engine/assert-engine.ts` |
| Execution Report | `src/app/lib/test-engine/execution-report.ts` |
| Permissions | `src/app/lib/test-engine/permissions.ts` |
| CLI | `scripts/te-run.ts` (`npm run te:list` / `te:run`) |

---

## Premissa

Nenhum fluxo paralelo. TE-S01 usa:

1. `seedTestUser` (mesmo model User do registro)  
2. `writeAgendamentoPaymentMetadata` (mesmo formato do checkout)  
3. `processPaymentWebhook` (**orquestrador oficial**)  
4. Asserts Prisma (`assertPayment` / `Appointment` / `Service` / `MinhaConta`)

---

## Registry

| ID | Status TE-01B |
|----|----------------|
| TE-S01 Compra simples | **implemented** + smoke PASS |
| TE-S02 … TE-S13 | **stub** (extensível) |

---

## Permissões / Segurança

| Ambiente | Política |
|----------|----------|
| Production | **Bloqueado** |
| Preview | `TEST_ENGINE_ENABLED=1` + ADMIN ou CLI secret |
| Local / Development | ADMIN, ou `TEST_ENGINE_CLI_SECRET`, ou CLI local com warning |

- **Nenhuma rota HTTP** pública ou admin neste sprint.  
- Usuário comum **não** tem superfície de execução.

---

## CLI

```bash
npm run te:list
npm run te:run -- --id TE-S01
npm run te:run -- --all
npm run te:run -- --id TE-S01 --token "$TEST_ENGINE_CLI_SECRET"
```

---

## Validação

| Check | Resultado |
|-------|-----------|
| `tsc --noEmit` | PASS |
| `prisma validate` | PASS |
| `npm run build` | (executado na sprint) |
| Smoke interno TE-S01 | **PASS** (Payment+Appointment+Service) |

---

## Não implementado (conforme escopo)

UI · Botões · Dashboard TE · Página Admin · Regression suite completa · StudioOS

---

## Próximo

TE-01C — implementar TE-S02…S05 no runner; TE-01D — UI admin opcional.
