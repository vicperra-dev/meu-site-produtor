# Grafo de Conhecimento do Projeto — THouse

**Gerado em:** 2026-07-05T21:16:26.937Z
**Agente:** Project Knowledge Graph V1.0.0
**Grafo com 7 entidades, 152 arquivos, 38 APIs e 15 ADRs**

---

## Índice

- [Visão do grafo](#visão-do-grafo)
- [Entidades](#entidades)
- [APIs](#apis)
- [Fluxos](#fluxos)
- [Guardian](#guardian)
- [ADRs](#adrs)
- [Agentes](#agentes)
- [Matriz de impacto](#matriz-de-impacto)
- [Como consultar](#como-consultar)

---

## Visão do grafo

```
Entity
↓
Files
↓
APIs
↓
Flows
↓
Guardian
↓
ADRs
↓
Agents
↓
Reports
```

**Nós:** 155 · **Arestas:** 271

---

## Entidades

### Payment

Representa um pagamento registrado no sistema (Asaas ou simbólico). É a fonte de verdade financeira após confirmação (`status = approved`). Não armazena trilha de reembolso — esta vive em `Appointment`, `Coupon` e `UserPlan`.

**Risco:** Crítico

| Aspecto | Detalhe |
|---------|---------|
| Arquivos | 31 |
| APIs | 3 |
| Fluxos | 28 |
| Invariantes | F1, F2, F3, F4, F5, F6, F7, F8, X1, X3, X5, A5, A8, C1, X2, M1, M2, M3, M4, X4, C4, A2, A1, S4 |
| Guardian | F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2 |
| ADRs | ADR-001, ADR-002, ADR-003, ADR-007, ADR-008, ADR-009, ADR-010, ADR-011, ADR-013, ADR-014, ADR-015 |
| Dependências | User, Appointment, Coupon, PaymentMetadata, UserPlan |

**O que quebra se alterar:**
Checkout, webhook, reembolsos e toda receita online param de funcionar corretamente.

**Arquivos críticos:**
- `src/app/lib/process-payment-webhook.ts`
- `src/app/api/webhooks/asaas/route.ts`
- `src/app/lib/asaas-agendamento-payment-effects.ts`
- `src/app/lib/asaas-plano-payment-effects.ts`
- `src/app/lib/appointment-refund-payment.ts`
- `src/app/api/asaas/checkout-agendamento/route.ts`
- `src/app/lib/coupon-refund.ts`
- `src/app/lib/plan-refund.ts`

---

### PaymentMetadata

Cache transitório do payload completo de checkout **antes** da criação do pagamento no Asaas. Permite `externalReference` limitado a `userId` (limite Asaas ~100 chars). Expira em ~24h.

**Risco:** Crítico

| Aspecto | Detalhe |
|---------|---------|
| Arquivos | 9 |
| APIs | 3 |
| Fluxos | 9 |
| Invariantes | M1, M2, M3, M4, F1, F2, F3, F4 |
| Guardian | F1, F4 |
| ADRs | ADR-002, ADR-003, ADR-009 |
| Dependências | User, Payment |

**O que quebra se alterar:**
Webhook não resolve contexto de checkout; agendamentos/planos não são criados.

**Arquivos críticos:**
- `src/app/api/asaas/checkout-agendamento/route.ts`
- `src/app/lib/process-payment-webhook.ts`
- `src/app/api/webhooks/asaas/route.ts`

---

### Appointment

Representa um slot de agendamento do usuário (sessão, captação, etc.). Concentra estado operacional (`status`), escolha de reembolso/remarcação e visibilidade na Minha Conta.

**Risco:** Crítico

| Aspecto | Detalhe |
|---------|---------|
| Arquivos | 26 |
| APIs | 3 |
| Fluxos | 22 |
| Invariantes | A1, A8, F4, X1, X2, X3, F1, A5, C1, A9, X4, A7, C4, F6, F8, A2 |
| Guardian | F4, A5, A8, X1, X2, F1, C1, C2, P2, S1, S4, A9 |
| ADRs | ADR-001, ADR-004, ADR-005, ADR-007, ADR-008, ADR-011, ADR-014, ADR-015 |
| Dependências | User, Service, Payment, Coupon |

**O que quebra se alterar:**
Agenda, disponibilidade, reembolso e Minha Conta de agendamentos falham.

**Arquivos críticos:**
- `src/app/lib/asaas-agendamento-payment-effects.ts`
- `src/app/lib/appointment-refund-payment.ts`
- `src/app/lib/appointment-refund-value.ts`
- `src/app/api/agendamentos/escolher-reembolso/route.ts`
- `src/app/api/asaas/checkout-agendamento/route.ts`
- `src/app/lib/coupon-refund.ts`
- `src/app/lib/plan-refund.ts`
- `prisma/schema.prisma`

---

### Coupon

Representa benefício resgatável (plano, agendamento, reembolso/remarcação). Pode ser gerado por pagamento, plano ou fluxo de reembolso. Código único global (`code`).

**Risco:** Crítico

| Aspecto | Detalhe |
|---------|---------|
| Arquivos | 26 |
| APIs | 1 |
| Fluxos | 21 |
| Invariantes | C1, C7, X1, X2, X5, F1, F4, A5, A8, P1, P4, P5, X4, C4, F6, F8, A2, A1, S4 |
| Guardian | C1, C2, S2, S4, F1, F4, A5, A8, P2, S1, X1, X2 |
| ADRs | ADR-001, ADR-006, ADR-007, ADR-008, ADR-010, ADR-011, ADR-015 |
| Dependências | UserPlan, Payment, User, User, Appointment |

**O que quebra se alterar:**
Descontos, remarcação e planos com cupons ficam inconsistentes.

**Arquivos críticos:**
- `src/app/lib/coupon-refund.ts`
- `src/app/lib/appointment-refund-payment.ts`
- `src/app/lib/plan-refund.ts`
- `src/app/api/agendamentos/escolher-reembolso/route.ts`

---

### UserPlan

Representa assinatura de plano do usuário (teste, bronze, prata, ouro). Agrupa cupons de serviço e trilha de reembolso proporcional.

**Risco:** Crítico

| Aspecto | Detalhe |
|---------|---------|
| Arquivos | 17 |
| APIs | 1 |
| Fluxos | 14 |
| Invariantes | P1, P6, F5, C4, C5, X1, F1, F4, A5, A8, C1, X2, P4, P5, F6, F8, A2 |
| Guardian | P2, F1, F4, A5, A8, C1, C2, S1, S4, X1, X2 |
| ADRs | ADR-001, ADR-006, ADR-008, ADR-011 |
| Dependências | User, Subscription, Coupon, Payment |

**O que quebra se alterar:**
Assinaturas, cupons de plano e cobrança recorrente quebram.

**Arquivos críticos:**
- `src/app/lib/asaas-plano-payment-effects.ts`
- `src/app/lib/plan-refund.ts`
- `src/app/api/planos/solicitar-reembolso/route.ts`
- `src/app/lib/appointment-refund-payment.ts`
- `src/app/lib/coupon-refund.ts`
- `src/app/api/agendamentos/escolher-reembolso/route.ts`

---

### Service

Representa um item de trabalho/entrega vinculado ao usuário e opcionalmente a um agendamento (sessão, mix, captação, etc.). Estado de entrega (`deliveryAudioUrl`) após conclusão.

**Risco:** Médio

| Aspecto | Detalhe |
|---------|---------|
| Arquivos | 7 |
| APIs | 0 |
| Fluxos | 5 |
| Invariantes | A5, A6 |
| Guardian | A5 |
| ADRs | ADR-011 |
| Dependências | User, Appointment |

**O que quebra se alterar:**
Entrega de áudio e conclusão de serviços falham.

**Arquivos críticos:**
- `src/app/lib/asaas-agendamento-payment-effects.ts`

---

### User

Identidade da conta (artista/cliente). Âncora de ownership para todo o domínio financeiro e operacional. `role` distingue USER vs admin (`hasAdminAccess`).

**Risco:** Crítico

| Aspecto | Detalhe |
|---------|---------|
| Arquivos | 15 |
| APIs | 1 |
| Fluxos | 14 |
| Invariantes | A1, C4, X1, X4, M1, M2, M3, M4, A7, X2 |
| Guardian | X1, A8, X2, C1 |
| ADRs | ADR-003, ADR-005, ADR-007, ADR-011 |
| Dependências | AccountDeletionLog, Payment, Appointment, Coupon, UserPlan, Service, Subscription |

**O que quebra se alterar:**
Login, Minha Conta e ownership de todas as entidades falham.

**Arquivos críticos:**
- `src/app/api/asaas/checkout-agendamento/route.ts`
- `src/app/api/webhooks/asaas/route.ts`

---

## APIs

| Rota | Entidades | Risco |
|------|-----------|-------|
| `/api/admin/agendamentos/cancelar/route.ts` | Appointment | Médio |
| `/api/admin/agendamentos/reverter-cancelamento/route.ts` | Appointment | Médio |
| `/api/admin/agendamentos/route.ts` | Appointment | Médio |
| `/api/admin/cupons/liberar/route.ts` | — | Médio |
| `/api/admin/cupons/route.ts` | — | Médio |
| `/api/admin/pagamentos/route.ts` | Payment | Médio |
| `/api/admin/planos/excluir-cancelados/route.ts` | UserPlan | Médio |
| `/api/admin/planos/route.ts` | UserPlan | Médio |
| `/api/admin/reprocessar-pagamento-plano-teste/route.ts` | Payment, UserPlan, PaymentMetadata | Médio |
| `/api/admin/reprocessar-pagamento-teste/route.ts` | Payment, PaymentMetadata | Médio |
| `/api/admin/servicos/route.ts` | Service | Médio |
| `/api/admin/stats/detalhadas/route.ts` | — | Médio |
| `/api/admin/stats/route.ts` | — | Médio |
| `/api/admin/usuarios/route.ts` | User | Médio |
| `/api/agendamentos/cancelar/route.ts` | Appointment | Baixo |
| `/api/agendamentos/com-cupom/route.ts` | Appointment, Coupon | Baixo |
| `/api/agendamentos/disponibilidade/route.ts` | Appointment | Baixo |
| `/api/agendamentos/escolher-reembolso/route.ts` | Appointment, Payment, Coupon, UserPlan | Alto |
| `/api/agendamentos/route.ts` | Appointment | Baixo |
| `/api/asaas/checkout-agendamento/route.ts` | Payment, Appointment, PaymentMetadata, User | Alto |
| `/api/asaas/checkout-carrinho/route.ts` | Payment | Alto |
| `/api/asaas/checkout/route.ts` | Payment | Alto |
| `/api/conta/route.ts` | User | Baixo |
| `/api/conta/update/route.ts` | User | Baixo |
| `/api/coupons/validate/route.ts` | Coupon | Médio |
| `/api/cupons/renunciar/route.ts` | — | Baixo |
| `/api/esqueci-senha/route.ts` | — | Baixo |
| `/api/login/route.ts` | User | Baixo |
| `/api/me/route.ts` | — | Baixo |
| `/api/meus-dados/route.ts` | User, Coupon, Appointment | Baixo |
| `/api/meus-dados/vincular-cupons-teste/route.ts` | User | Baixo |
| `/api/planos/cancelar/route.ts` | UserPlan | Baixo |
| `/api/planos/excluir/route.ts` | UserPlan | Baixo |
| `/api/planos/solicitar-reembolso/route.ts` | UserPlan | Alto |
| `/api/test-payment/route.ts` | Payment | Baixo |
| `/api/trocar-senha/route.ts` | — | Baixo |
| `/api/verificar-codigo/route.ts` | — | Baixo |
| `/api/webhooks/asaas/route.ts` | Payment, PaymentMetadata, User | Crítico |

---

## Fluxos

### Checkout (agendamento e plano)
Entidades: Payment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Webhook Asaas
Entidades: Payment, PaymentMetadata · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Reembolso (outbound e inbound)
Entidades: Payment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Remarcação (resolução de pagamento origem)
Entidades: Payment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
Entidades: Payment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Minha Conta (listagem de pagamentos)
Entidades: Payment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Verificação pré-deploy
Entidades: Payment, Appointment, Coupon, UserPlan · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### Auditoria de banco
Entidades: Payment, Appointment, Coupon, UserPlan · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### PAYMENT_RECEIVED
Entidades: Payment, PaymentMetadata · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Checkout agendamento
Entidades: Payment, PaymentMetadata, User · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Checkout plano
Entidades: Payment, PaymentMetadata, UserPlan, User · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### PaymentMetadata → Payment
Entidades: Payment, PaymentMetadata, User · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Remarcação (cupom)
Entidades: Payment, Appointment, Coupon, User · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### Resgate
Entidades: Payment, Appointment, Coupon, User · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### Minha Conta
Entidades: Payment, Appointment, Coupon, UserPlan, User · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### Reembolso
Entidades: Payment, Appointment, Coupon, UserPlan · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### PAYMENT_REFUNDED
Entidades: Payment, Appointment, Coupon, UserPlan · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### Remarcação
Entidades: Payment, Appointment, Coupon, UserPlan · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### Checkout
Entidades: Payment, PaymentMetadata, Appointment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9

### Simulação admin
Entidades: Payment, Coupon · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, S2

### Checkout teste
Entidades: Payment, Coupon · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, S2

### Todas
Entidades: Payment, Appointment, Coupon, UserPlan, Service, User · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9, S2

### Minha Conta (pagamentos)
Entidades: Payment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Admin pagamentos
Entidades: Payment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2

### Payment → Appointment
Entidades: Payment, Appointment · Guardian: F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2, A9

---

## Guardian

| Check | Entidades | ADRs |
|-------|-----------|------|
| A5 | Payment, Appointment, Coupon, UserPlan, Service | ADR-001, ADR-004 |
| A8 | Payment, Appointment, Coupon, UserPlan, User | ADR-001, ADR-004, ADR-005 |
| A9 | Appointment | ADR-004 |
| C1 | Payment, Appointment, Coupon, UserPlan, User | ADR-001, ADR-006, ADR-007, ADR-008 |
| C2 | Payment, Appointment, Coupon, UserPlan | ADR-001 |
| F1 | Payment, PaymentMetadata, Appointment, Coupon, UserPlan | ADR-001, ADR-002, ADR-009, ADR-013 |
| F4 | Payment, PaymentMetadata, Appointment, Coupon, UserPlan | ADR-001, ADR-002, ADR-008, ADR-013, ADR-014 |
| P2 | Payment, Appointment, Coupon, UserPlan | ADR-001 |
| S1 | Payment, Appointment, Coupon, UserPlan | ADR-001 |
| S2 | Coupon | — |
| S4 | Payment, Appointment, Coupon, UserPlan | ADR-001, ADR-010 |
| X1 | Payment, Appointment, Coupon, UserPlan, User | ADR-001, ADR-007 |
| X2 | Payment, Appointment, Coupon, UserPlan, User | ADR-001, ADR-007 |

---

## ADRs

- **ADR-001** — Domain Guardian — verificação automática de invariantes _(Aceito)_ · Payment, Appointment, Coupon, UserPlan
- **ADR-002** — Webhook Idempotency — Payment.create por asaasId único _(Aceito)_ · Payment, PaymentMetadata
- **ADR-003** — PaymentMetadata — cache pré-checkout Asaas _(Aceito)_ · PaymentMetadata, Payment, User
- **ADR-004** — Appointment Archive — adminArchivedAt soft-archive _(Aceito)_ · Appointment
- **ADR-005** — Appointment Hidden — userHiddenAt (Minha Conta) _(Aceito)_ · Appointment, User
- **ADR-006** — UserPlan Admin Inactive + User Hidden _(Aceito)_ · UserPlan, Coupon
- **ADR-007** — Coupon Account Ownership _(Aceito)_ · Coupon, User, Payment, Appointment
- **ADR-008** — Refund Engine — outbound e inbound _(Aceito)_ · Payment, Appointment, Coupon, UserPlan
- **ADR-009** — Asaas Integration — provedor de pagamento _(Aceito)_ · Payment, PaymentMetadata
- **ADR-010** — Simulation Refactor — pagamentos simbólicos A1/A2 _(Aceito)_ · Payment, Coupon
- **ADR-011** — Domain Map — documentação estruturada de entidades _(Aceito)_ · Payment, Appointment, Coupon, UserPlan, User, Service
- **ADR-012** — Architecture Agent Pipeline — agentes read-only _(Aceito)_ · 
- **ADR-013** — Payment Admin Archive — arquivamento de pagamentos (planejado) _(Proposto)_ · Payment
- **ADR-014** — Vínculos lógicos sem FK — Payment → Appointment _(Aceito)_ · Payment, Appointment
- **ADR-015** — Decision Engine — gate BLOCKED em mudanças CRITICAL _(Aceito)_ · Payment, Appointment, Coupon

---

## Agentes

### Architecture Agent
Script: `scripts/architecture-agent.ts`
Lê: domain-map.md, latest.json, memory.json, decision.md
Gera: project-context.json, project-summary.md, architecture-agent.md

### Design Planner Agent
Script: `scripts/design-planner-agent.ts`
Lê: project-context.json, domain-map.md, design-request.md
Gera: design-plan.json, design-plan.md

### Implementation Planner Agent
Script: `scripts/implementation-planner-agent.ts`
Lê: design-plan.json, project-context.json
Gera: implementation-plan.json, implementation-plan.md

### Human Report Agent
Script: `scripts/human-report-agent.ts`
Lê: project-context.json, design-plan.md, decision.md, memory.json
Gera: reports/human/project-report.json, reports/human/project-report.md

### Evolution Agent
Script: `scripts/evolution-agent.ts`
Lê: project-context.json, architecture-decisions.json, design-plan.json
Gera: evolution-report.json, evolution-report.md

### Architecture Decision Agent
Script: `scripts/architecture-decision-agent.ts`
Lê: domain-map.md, design-plan.json, evolution-report.json
Gera: architecture-decisions.json, architecture-decisions.md

### Project Knowledge Graph Agent
Script: `scripts/project-knowledge-graph-agent.ts`
Lê: architecture-decisions.json, project-context.json, domain-map.md
Gera: project-knowledge-graph.json, project-knowledge-graph.md

### Domain Guardian Runner
Script: `scripts/domain-guardian-runner.ts`
Lê: domain-invariants.md
Gera: latest.json

---

## Matriz de impacto

| Entidade | APIs | Guardian | ADRs | Risco | O que quebra |
|----------|------|----------|------|-------|--------------|
| Payment | 3 | 11 | 11 | Crítico | Checkout, webhook, reembolsos e toda receita online param de… |
| PaymentMetadata | 3 | 2 | 3 | Crítico | Webhook não resolve contexto de checkout; agendamentos/plano… |
| Appointment | 3 | 12 | 8 | Crítico | Agenda, disponibilidade, reembolso e Minha Conta de agendame… |
| Coupon | 1 | 12 | 7 | Crítico | Descontos, remarcação e planos com cupons ficam inconsistent… |
| UserPlan | 1 | 11 | 4 | Crítico | Assinaturas, cupons de plano e cobrança recorrente quebram.… |
| Service | 0 | 1 | 1 | Médio | Entrega de áudio e conclusão de serviços falham.… |
| User | 1 | 4 | 4 | Crítico | Login, Minha Conta e ownership de todas as entidades falham.… |

---

## Como consultar

Use `searchIndex` no JSON para localizar nós por termo:

- `payment` → entidade Payment e arquivos relacionados
- `F1` → invariante e entidades protegidas
- `ADR-002` → decisão de idempotência webhook
- Nome de arquivo → dependências e entidades

## Limitações V1

- Mapeamento derivado de domain-map e ADRs — não analisa AST do código-fonte.
- APIs listam métodos genéricos; rotas reais podem expor subconjunto.
- Dependências entre entidades vêm do domain-map (relacionamentos declarados).
- Arquivos fora do domain-map só aparecem se estiverem no Git ou ADRs.
- searchIndex por token simples — sem fuzzy search nem embeddings.
- Grafo truncado em arquivos por entidade para limitar tamanho do JSON.

---
_Knowledge Graph — somente leitura. Regenerar após mudanças significativas._