# HS-03A — Domain Consolidation

**Modo:** Staff Software Engineer · Domain Architect · QA Lead · Product Owner · Domain Guardian · StudioOS Architecture  
**Gerado:** 2026-07-13  
**Commit:** `refactor(domain): consolidate operational domain (HS-03A)`  
**Base:** HS-01 · HS-02A · HS-02B · TE-01A · TE-01B · TE-01C

---

## Objetivo

Consolidar Appointment · Service · Payment · Coupon em **quatro domínios independentes** com:

- **Domain Service** único (status, pertencimento, capacidades)
- **Workflow** único (transições)
- **Enum canônico de cupons** (sem `includes` / `startsWith` / `endsWith` para tipagem)
- Rotas **sem** alterar status diretamente
- Auditoria `scripts/domain-audit.ts`

---

## Arquitetura consolidada

| Domínio | Responsabilidade |
|---------|------------------|
| **Appointment** | Solicitação: cliente, data/hora, pagamento associado, fila admin |
| **Service** | Trabalho: tipo, andamento, entrega, URL, conclusão |
| **Payment** | Financeiro: 1 Payment → N Appointments → N Services |
| **Coupon** | Benefício tipado: SERVICE / PLAN / DISCOUNT / REFUND / REBOOK / TEST / BONUS |

```
Payment → Appointment(s) → Service(s) → Entrega → Conclusão
                 ↑
           Domain Service + Workflow
```

---

## Arquivos criados

| Arquivo | Papel |
|---------|-------|
| `src/app/lib/domain/statuses.ts` | Status canônicos + derivações |
| `src/app/lib/domain/coupon-types.ts` | Enum canônico + persistência |
| `src/app/lib/domain/domain-service.ts` | Queries / capacidades |
| `src/app/lib/domain/workflow.ts` | Transições oficiais |
| `src/app/lib/domain/index.ts` | Barrel |
| `scripts/domain-audit.ts` | Auditoria de órfãos / status / workflow |

## Arquivos alterados (principais)

| Arquivo | Mudança |
|---------|---------|
| `service-authority.ts` | Compat → reexport domain |
| `coupon-origin.ts` | Via enum canônico |
| `checkout-coupon-gates.ts` | Sem comparação string solta de tipo |
| `coupon-selection.ts` | `isRefundCoupon` |
| `coupon-booking-rules.ts` | Set de domínio |
| `payment-simulation-coupon-gate.ts` | Tipo TEST (sem startsWith) |
| `agendamento-payment-coupons.ts` / `plan-coupons.ts` | Persistência canônica |
| `appointment-refund-payment.ts` | REFUND persistido |
| Admin agendamentos / cancelar / reverter / servicos | Delegam ao Workflow |
| Client cancelar / escolher-reembolso | Workflow + REFUND |
| `meus-dados` | `operationalStatus` derivado do domínio |
| `minha-conta` | Filtros por família canônica |
| `package.json` | `domain:audit` |
| `prisma/schema.prisma` | Comentário couponType |

## Arquivos removidos

Nenhum arquivo de produto removido (consolidação por extração).

---

## Fluxos consolidados

| Fluxo | Via |
|-------|-----|
| Aceite | `approveAppointment` |
| Recusa | `rejectAppointment` |
| Início | `startServiceWork` / `startService` |
| Cancel admin/user | `cancelAppointment` |
| Reverter cancel | `revertAppointmentCancellation` |
| Conclusão / entrega | `completeService` / `deliverService` |
| Espelho admin | `reconcileAppointmentWithServices` (inalterado HS-02B) |

## Duplicações removidas

- Lógica inline de status em rotas admin/cliente → Workflow
- Tipagem de cupom por literais espalhados → `resolveCanonicalCouponType`
- Detecção de simulação por `startsWith("TESTE_")` no gate/UI → tipo canônico TEST
- Selecionados: statuses ativos **apenas** `aceito` + `em_andamento` (HS-03A)

## Código morto

- Paths genéricos de PATCH que setavam status arbitrário no Appointment (bloqueados fora do workflow)

---

## Cupons — enum

| Canônico | Persistido | Uso |
|----------|------------|-----|
| SERVICE | `agendamento` | Cupom de serviço |
| PLAN | `plano` | Cupom de plano (serviço) |
| DISCOUNT | `desconto` | Percentual / valor |
| REFUND | `reembolso` | Remarcação / crédito |
| REBOOK | `remarcacao` | Reservado |
| TEST | `test` | Simulação |
| BONUS | `bonus` | Reservado |

---

## Admin / Minha Conta / Stats

- **Serviços Gerais:** todos os Services (API GET inalterada funcionalmente)
- **Selecionados:** `ACTIVE_OPERATIONAL_SERVICE_STATUSES` = `{aceito, em_andamento}`
- **Minha Conta:** `status` / `operationalStatus` derivados de Service via domínio
- **Stats:** já operacionais em Service / financeiras em Payment (HS-02B preservado)

---

## Validação

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | PASS |
| `npx prisma validate` | PASS |
| `npm run build` | PASS |
| `npm run domain:audit` | **PASS** (0 issues) |

---

## Cobertura atingida

| Área | Status |
|------|--------|
| Workflow de status Appointment/Service | Consolidado |
| Domain Service (pertencimento / can*) | Consolidado |
| Enum cupom | Consolidado (+ writers principais) |
| Admin mutation routes | Delegam workflow |
| Minha Conta status alinhado | Sim |
| Domain audit | Novo + PASS |
| TE-02 simulações novas | **Não** implementadas (preparado) |

## Riscos residuais

1. Cupons legados `TESTE_*` com `couponType` antigo podem não resolver como TEST até recriação/backfill.
2. Lookups `meus-dados` / vincular-cupons-teste ainda usam `startsWith` em **código** para descoberta de legado (não tipagem).
3. Payment effects (Asaas) ainda criam entities; status operacional pós-aceite passa pelo workflow.
4. Transição genérica Appointment.status fora de approve/reject/start/cancel foi bloqueada (blocked-only permanece).

## Pendências (próximas sprints)

- TE-02 Business Suites sobre o Workflow
- Backfill `couponType=test` em cupons simbólicos legados
- StudioOS QA Center / Release Gates (fora de escopo HS-03A)
- `refundPayment` / `rebookAppointment` como wrappers explícitos no Workflow (hoje cancel + cupom REFUND)

---

*Fim HS-03A. Aguardando aprovação para a próxima sprint.*
