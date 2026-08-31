# SIM-01 — Official Domain Simulation Engine

**Modo:** Staff Software Engineer · Software Architect · Domain Architect · QA Lead · Test Engine Owner · Domain Guardian  
**Gerado:** 2026-07-15  
**Branch:** `backup-pre-formatacao`

---

## Veredicto

Simulation Engine oficial do domínio implementado.  
**Gates:** TypeScript · Prisma · Build · Domain Audit · Workflow Audit · Synchronization Audit · Simulation Audit · SIM batch (10/10) · TE-02A regressão (21/21) · SYNC-01A regressão (7/7) — **PASS**.

---

## Pipeline oficial

```
Simulation
  → Scenario Runner
  → Official Pipeline Adapter (processPaymentWebhook / Workflow)
  → State Machine
  → Domain Events
  → Synchronization Engine
  → Assertions
  → Cleanup (@homolog.test)
```

Nenhum atalho. Proibido criar Payment/Appointment/Service diretamente nos cenários de pagamento.

---

## Arquivos criados

| Arquivo | Papel |
|---------|--------|
| `src/app/lib/simulation/types.ts` | SimulationId, Session, Report |
| `src/app/lib/simulation/permissions.ts` | Bloqueio production; ADMIN/CLI |
| `src/app/lib/simulation/pipeline.ts` | Adapter oficial + `processPaymentWebhook` |
| `src/app/lib/simulation/assertions.ts` | assertPayment…assertStateMachine |
| `src/app/lib/simulation/cleanup.ts` | `cleanupTeUserArtifacts` |
| `src/app/lib/simulation/hooks.ts` | Sync observer lifecycle |
| `src/app/lib/simulation/session.ts` | Builder de sessão |
| `src/app/lib/simulation/report.ts` | Relatório + print |
| `src/app/lib/simulation/registry.ts` | Simulation Registry |
| `src/app/lib/simulation/runner.ts` | runSimulation / batch / all |
| `src/app/lib/simulation/scenarios/sim01-batch.ts` | SIM-001 … SIM-010 |
| `src/app/lib/simulation/index.ts` | Barrel |
| `scripts/sim-run.ts` | CLI sim:* |
| `scripts/simulation-audit.ts` | Simulation Audit |
| `src/app/api/simulation/report/route.ts` | API prep QA Center (GET registry) |

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Scripts `sim:list`, `sim:run`, `sim:batch`, `sim:cleanup`, `sim:report`, `sim:audit` |
| `src/app/lib/test-engine/index.ts` | Re-export SIM para TE-02B |

---

## Cenários (SIM-001 … SIM-010)

| ID | Cenário | Resultado | Tempo médio |
|----|---------|-----------|-------------|
| SIM-001 | Pagamento aprovado | PASS | ~11.2s |
| SIM-002 | Pagamento recusado | PASS | ~0.6s |
| SIM-003 | Pagamento duplicado | PASS | ~15.8s |
| SIM-004 | Sessão completa | PASS | ~10.0s |
| SIM-005 | Plano Bronze | PASS | ~6.8s |
| SIM-006 | Cupom Serviço | PASS | ~7.8s |
| SIM-007 | Cupom Desconto | PASS | ~0.3s |
| SIM-008 | Reembolso financeiro | PASS | ~7.8s |
| SIM-009 | Cancelamento após aceite | PASS | ~11.1s |
| SIM-010 | Remarcação | PASS | ~8.9s |

**Batch total:** 82.1s · **média por cenário:** 8.2s

---

## Assertions oficiais

`assertPayment`, `assertAppointment`, `assertService`, `assertCoupon`, `assertDashboard`, `assertStatistics`, `assertAgenda`, `assertMinhaConta`, `assertSynchronization`, `assertWorkflow`, `assertStateMachine`

---

## Sincronização validada

Eventos observados: `PaymentConfirmed`, `AppointmentReserved`, `ServiceCompleted`, `PaymentRefunded`, `AppointmentCancelled`, `AppointmentRebooked`.

Superfícies roteadas: Minha Conta, Dashboard, Admin Agendamentos, Agenda, Pagamentos, Estatísticas, Planos, Cupons.

---

## CLI

```bash
npm run sim:list
npm run sim:run -- --id SIM-001
npm run sim:batch
npm run sim:cleanup -- --email user@homolog.test
npm run sim:report
npm run sim:audit
```

---

## Preparação QA Center / TE-02B

- **API:** `GET /api/simulation/report` (registry + pipeline; bloqueado em production)
- **Execution report:** `reports/domain-guardian/sim01-last-run.json`
- **Progress:** `SimulationReport.progress[]`
- **Event stream:** `SimulationSession.eventsProduced` (SyncEnvelope[])
- **TE-02B:** `test-engine/index.ts` re-exporta `runSimulation` — TE executa, SIM produz

---

## Limitações

1. Production bloqueado; preview exige `SIM_ENGINE_ENABLED=1`
2. SIM-007 usa `prisma.coupon.create` apenas para setup de cupom desconto (fora do pipeline de pagamento)
3. API POST reservada para SIM-02 (QA Center UI)
4. Suites paralelas devem usar slots distintos — `simSlot()` por cenário

---

## Próximos passos (SIM-02+)

- QA Center UI integrando Simulation API
- TE-02B consumindo Simulation Engine sem duplicar cenários
- Cenários adicionais: pendente, expirado, webhook fora de ordem, upgrade/downgrade plano

---

**Aguardando aprovação. SIM-02 não iniciado.**
