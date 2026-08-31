# HS-03B — Workflow & State Machine Consolidation

**Modo:** Staff Software Engineer · Software Architect · Domain Architect · QA Lead · Product Owner · Domain Guardian · StudioOS Architecture  
**Gerado:** 2026-07-13  
**Commit:** `refactor(workflow): consolidate official state machine (HS-03B)`  
**Base:** HS-02A · HS-02B · HS-03A · TE-01A · TE-01B · TE-01C

---

## Objetivo

Infraestrutura permanente de Workflow: **toda** alteração de status de domínio passa por `transition()`.

```
origem → guards → persistência → Domain Event → histórico → efeitos
```

Sem Event Bus · sem CQRS · sem Event Sourcing · sem StudioOS UI.

---

## State Machine

**Entrada única:** `transition({ entity, id, from?, to, reason, actor, metadata })`

| Entidade | Grafo (canônico) |
|----------|------------------|
| Appointment | pendente → aceito/confirmado/recusado/cancelado → em_andamento → concluido; cancelado → aceito/remarcado |
| Service | pendente/aceito → em_andamento → entrega/concluido → cancelado |
| Payment | pendente → recebido/confirmado → reembolsado |
| Coupon | criado → utilizado/expirado/cancelado |

Persistência compatível (ex.: Payment `confirmado` ↔ `approved`; Service `entrega` ↔ `concluido` + URL).

---

## Arquivos criados

| Arquivo | Papel |
|---------|-------|
| `src/app/lib/domain/state-machine/types.ts` | Contratos Transition/Event |
| `src/app/lib/domain/state-machine/guards.ts` | Grafo + asserts |
| `src/app/lib/domain/state-machine/events.ts` | Domain Events (log) |
| `src/app/lib/domain/state-machine/history.ts` | `DomainTransitionHistory` |
| `src/app/lib/domain/state-machine/effects.ts` | Efeitos oficiais / cascata |
| `src/app/lib/domain/state-machine/transition.ts` | `transition()` |
| `src/app/lib/domain/state-machine/index.ts` | Barrel |
| `scripts/workflow-audit.ts` | Auditoria SM |
| `scripts/workflow-smoke.ts` | Smoke de guards |

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `workflow.ts` | Wrappers → `transition()` apenas |
| `domain/index.ts` | Exporta SM |
| `statuses.ts` | Status `remarcado` |
| `process-payment-webhook.ts` | pending→confirmado via SM |
| `domain-audit.ts` | Histórico + severity |
| `admin/agendamentos/route.ts` | Lista `remarcado` |
| `package.json` | `workflow:audit` / `workflow:smoke` |
| `prisma/schema.prisma` | Model `DomainTransitionHistory` (já existente no DB) |

## Arquivos removidos

Nenhum.

---

## Transições / Guards / Eventos

### Guards explícitos (erro obrigatório)
- CONCLUIDO → PENDENTE  
- RECUSADO → EM_ANDAMENTO  
- REEMBOLSADO → CONFIRMADO  
- UTILIZADO → CRIADO  

### Eventos padronizados
AppointmentAccepted · AppointmentRejected · AppointmentCancelled · AppointmentRebooked · AppointmentStarted · AppointmentCompleted · ServiceAccepted · ServiceStarted · ServiceDelivered · ServiceCompleted · ServiceCancelled · ServiceRejected · PaymentReceived · PaymentConfirmed · PaymentRefunded · CouponGenerated · CouponConsumed · CouponExpired · CouponCancelled

### Efeitos (exemplos)
| Evento | Efeito |
|--------|--------|
| AppointmentAccepted | ensure Services → Service aceito → marcar cupons de booking |
| AppointmentCancelled / Rejected | cancelar/recusar Services · liberar cupons |
| AppointmentStarted | Services → em_andamento |
| ServiceCompleted | Appointment concluído se todos terminais · reconcile |

---

## Histórico

Tabela `DomainTransitionHistory`: data, ator (`actorType`/`actorId`), from/to, motivo, metadata, eventName.

---

## Duplicações removidas

- Updates de status inline no Workflow HS-03A (substituídos por `transition`)
- Cascata Service espalhada nas rotas (efeitos no SM)

## Código morto

- Mutações diretas de status no `workflow.ts` (eliminadas)

---

## Validação

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | PASS |
| `npx prisma validate` / `db push` | PASS |
| `npm run build` | PASS |
| `npm run domain:audit` | PASS (1 warning simbólico pré-existente) |
| `npm run workflow:audit` | PASS |
| `npm run workflow:smoke` | PASS |

---

## Cobertura do Workflow

| Fluxo | Via SM |
|-------|--------|
| Aceite / Recusa / Início | ✅ |
| Cancel admin/user / Reverter | ✅ |
| Service start / complete / deliver | ✅ |
| Remarcação (`rebookAppointment`) | ✅ |
| Payment confirm (pending→approved) | ✅ webhook |
| Coupon consume | ✅ API |
| Criação inicial Payment approved (Asaas) | ⚠️ create path (não é transição) — residual documentado |

---

## Riscos residuais

1. Novos Payments criados já como `approved` no webhook (bootstrap; F1 idempotência preservada).  
2. Espelho Appointment.concluido após ServiceCompleted ainda usa updateMany em efeito (meta agregação).  
3. Payment simbólico TE sem Appointment: warning no domain-audit.  
4. Lookups legado / FAQ / Chat / Test Engine não migrados (fora de escopo).  

## Pendências (próximas)

- HS-03C Analytics Consolidation  
- HS-03D Plans Consolidation  
- HS-03E Official Simulation  
- TE-02 Business Suites  

*Fim HS-03B. Aguardando aprovação.*
