# SYNC-01A — Real-Time Domain Synchronization Engine

**Modo:** Staff Software Engineer · Software Architect · Domain Architect · QA Lead · Product Owner · Domain Guardian  
**Gerado:** 2026-07-14  
**Branch:** `backup-pre-formatacao`  
**Commit:** `feat(sync): implement realtime domain synchronization engine (SYNC-01A)`

---

## Veredicto

Infraestrutura oficial de sincronização implementada.  
**Gates:** TypeScript · Prisma · Build · Domain Audit · Workflow Audit · Synchronization Audit · SYNC-01A suite (7/7) · TE-02A regressão (21/21) — **PASS**.

---

## Arquitetura

```
Transition() → State Machine → Domain Event
  → SynchronizationEvent (outbox PostgreSQL)
  → In-process Hub
  → SSE `/api/sync/events` (+ cursor replay / tail fallback)
  → DomainSyncProvider (BroadcastChannel cross-tab)
  → useDomainRefresh / useDomainSubscription
  → Superfícies React (refetch oficial, sem F5)
```

Transporte escolhido: **SSE + outbox persistido + replay por cursor**.  
Sem WebSocket, Redis, event bus distribuído ou microservices.

---

## Arquivos criados

| Arquivo | Papel |
|---------|--------|
| `prisma/migrations/20260714220000_sync01a_synchronization_event/` | Migration outbox |
| `src/app/lib/synchronization/types.ts` | Contratos SyncEnvelope / surfaces |
| `src/app/lib/synchronization/routing.ts` | Mapa evento → superfícies/escopo |
| `src/app/lib/synchronization/hub.ts` | Hub in-process |
| `src/app/lib/synchronization/engine.ts` | Persist + publish + list cursor |
| `src/app/lib/synchronization/lifecycle.ts` | AppointmentReserved / Plan* / CouponGenerated |
| `src/app/lib/synchronization/observer.ts` | Observer TE (sem sleeps) |
| `src/app/lib/synchronization/polling-inventory.ts` | Inventário de polling |
| `src/app/lib/synchronization/DomainSyncProvider.tsx` | Provider React único |
| `src/app/lib/synchronization/index.ts` | Barrel |
| `src/app/api/sync/events/route.ts` | SSE autenticado + poll JSON |
| `src/app/hooks/useDomainSubscription.ts` | Hook |
| `src/app/hooks/useDomainRefresh.ts` | Hook |
| `src/app/hooks/useWorkflowUpdates.ts` | Hook |
| `src/app/hooks/useRealtimeEntity.ts` | Hook |
| `src/app/hooks/useWorkflowAction.ts` | Pending lock de ações |
| `src/app/lib/test-engine/scenarios/sync01a-batch.ts` | 7 cenários SYNC |
| `scripts/synchronization-audit.ts` | Sync Audit |

## Arquivos alterados (principais)

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Model `SynchronizationEvent` |
| `src/app/lib/domain/state-machine/transition.ts` | `publishFromDomainEvent` após persistência |
| `src/app/lib/process-payment-webhook.ts` | `PaymentConfirmed` em create |
| `src/app/lib/asaas-*-payment-effects.ts` | `AppointmentReserved` |
| `src/app/api/agendamentos/**` | Reserved + CouponConsumed; disponibilidade alinhada a conflict |
| `src/app/api/planos/cancelar/route.ts` | `PlanCancelled` |
| `src/app/layout.tsx` | `DomainSyncProvider` |
| `src/app/lib/app-data-events.ts` | BroadcastChannel + compat |
| Superfícies React (Minha Conta, Admin*, Agenda) | Sync subscriptions; polling domínio removido |
| `src/app/agendamento/page.tsx` | Removido `window.location.reload()` |
| Test Engine registry / CLI / package.json | Suite `sync01a` + `sync:audit` |

---

## Subscribers implementados

| Surface | Página / hook |
|---------|----------------|
| `minha-conta` | `minha-conta/page.tsx`, unread appointment/plan |
| `dashboard` | `admin/page.tsx` |
| `servicos-gerais` | `admin/servicos-aceitos/page.tsx` |
| `servicos-selecionados` | `admin/servicos-solicitados/page.tsx` |
| `pagamentos` | `admin/pagamentos/page.tsx` |
| `cupons` / `planos` | `admin/planos/page.tsx`, Minha Conta |
| `agenda` | `agendamento/page.tsx` (+ companion public) |
| `admin-agendamentos` | `admin/agendamentos/page.tsx` |
| `estatisticas` | `admin/estatisticas/page.tsx` |

---

## Eventos utilizados

State Machine: AppointmentAccepted/Rejected/Cancelled/Rebooked/Started/Completed, ServiceAccepted/Started/Delivered/Completed/Cancelled/Rejected, PaymentReceived/Confirmed/Refunded, CouponGenerated/Consumed/Expired/Cancelled.

Lifecycle: AppointmentReserved, PlanCancelled, PlanRenewed, SyncSignal.

---

## Polling

### Removido (domínio)

- Minha Conta 30s  
- Serviços Gerais / Selecionados 30s  
- Estatísticas 45s  
- Admin Planos 60s  
- Unread Appointment/Plan 60s  

### Mantido (necessário / fora de escopo)

- Chat / FAQ / unread chat  
- `pagamentos/sucesso` retry financeiro 3s  
- `useIntelligentRefresh` agenda ~5min (**fallback**)  

### Fallback Sync Engine

- SSE heartbeat 15s + outbox tail 4s (cross-instance Vercel)  
- Client recovery 15s quando desconectado + visibilitychange  

---

## Bugs / correções nesta sprint

1. **Disponibilidade vs conflito:** `disponibilidade` agora considera qualquer status ≠ `cancelado` (alinha write-path; evita slot “livre” com 409).  
2. **Carrinho/reservas:** lifecycle `AppointmentReserved` + companion `scope=public` para agenda multi-sessão.  
3. **Admin botões:** lock `updatingId` + status otimista imediato em aceitar/recusar/começar.  
4. **Agenda:** eliminado `window.location.reload()` pós cupom.

---

## Test Engine SYNC-01A

| ID | Resultado |
|----|-----------|
| SYNC-001 … SYNC-007 | **PASS** (7/7) |
| TE-02A regressão | **PASS** (21/21) |

Observação: Observer determinístico — sem sleeps artificiais.

---

## SIM-01/02/03

Compatibilidade via `configureSyncSimulation({ clock, sourceTag })` — **sem implementação de simulação**.

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Latência cross-instance serverless | Outbox tail 4s no SSE |
| Eventos de lifecycle ainda fora do grafo SM completo (create payment approved) | Publish lifecycle explícito; Payment SM para pending→confirmado |
| Plan fora de `WorkflowEntity` | Lifecycle `PlanCancelled` / `PlanRenewed` |
| SSE longa em Vercel | Heartbeat + reconnect + poll JSON recovery |

---

## Cobertura

| Dimensão | Cobertura |
|----------|-----------|
| Superfícies Batch SYNC-01A | 9/9 exigidas |
| Eventos roteados | 24 |
| Cenários SYNC | 7/7 PASS |
| Audit sync errors | 0 |

---

## Validação

| Check | Resultado |
|-------|-----------|
| TypeScript | PASS |
| Prisma validate + generate | PASS |
| Migration SynchronizationEvent | Applied |
| Build | PASS |
| Domain Audit | PASS |
| Workflow Audit | PASS |
| Workflow Smoke | PASS |
| Synchronization Audit | PASS |
| `te:suite:sync01a` | PASS 7/7 |
| `te:suite:te02a` | PASS 21/21 |

---

## Pendências

Nenhuma para SYNC-01A. **Não iniciar SIM-01.**

---

## Comandos

```bash
npm run sync:audit
npm run te:suite:sync01a
npx prisma migrate deploy
```
