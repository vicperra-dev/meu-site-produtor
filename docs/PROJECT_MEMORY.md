# THouse Rec — Project Memory

**Memória técnica v1.0** · Congelada para release · StudioOS adiado

Este documento registra decisões arquiteturais e fluxos para continuidade entre sprints e agentes.

---

## Principais decisões arquiteturais

| Decisão | Motivo |
|---------|--------|
| Next.js App Router + Prisma + Neon | Stack única, deploy Vercel, PostgreSQL gerenciado |
| Asaas como PSP único em produção | PIX/cartão/boleto + webhook + reembolso |
| Cookie `session_id` 7 dias | Simplicidade; sem JWT exposto no client |
| Carrinho no browser | Escopo v1; sem servidor de carrinho |
| Domínio em código TypeScript (não DDD microservices) | Time pequeno, monólito modular |

---

## Por que Execution Core (EC-01) existe

Unificar **Test Engine** e **Simulation Engine** sob um runner (`execution/runner.ts`), discovery de cenários, permissões e relatórios. Evita duplicação de bootstrap, auth CLI e pipeline de efeitos. Bloqueado em Production por segurança.

---

## Por que State Machine (HS-03B) foi adotada

Status de `Appointment` e `Service` tinham transições espalhadas em rotas. A SM centraliza transições válidas, registra `DomainTransitionHistory` e alimenta o Synchronization Engine. Prepara terreno para StudioOS sem implementá-lo na v1.

---

## Por que Synchronization Engine (SYNC-01A) existe

Após mudança de domínio, superfícies (Minha Conta, agenda, admin) precisam atualizar sem reload. Outbox `SynchronizationEvent` + cursor + SSE permite replay ordenado e auditoria.

---

## Por que Simulation Engine (SIM-01/02) existe

Validar jornadas completas (pagamento → webhook → entrega) sem browser E2E frágil. SIM-01 usa pipeline legado; SIM-02 usa EC-01. Usuários `@homolog.test` apenas.

---

## Domínio operacional

```
User → Appointment → Service (entrega)
     → Payment → PaymentMetadata (checkout)
     → Coupon (plano|agendamento|reembolso|…)
     → UserPlan (assinatura)
```

**Autoridade:** Service é fonte operacional de entrega (HS-02B). Payment é fonte financeira pós-webhook.

---

## Fluxo de pagamento

Checkout → PaymentMetadata → Asaas → Webhook → Payment approved → efeitos (Appointment, Coupon, UserPlan).

Arquivos: `process-payment-webhook.ts`, `asaas-*-payment-effects.ts`, `webhooks/asaas/route.ts`.

---

## Fluxo de agendamento

Seleção → disponibilidade → carrinho/checkout → Appointment `pendente` → admin aceita → Service vinculados → `concluido`.

Cupom 100% pode pular Asaas via `agendamentos/com-cupom`.

---

## Fluxo administrativo

`/admin` — aceitar/recusar, vincular serviços, cancelar, reembolso pendente. Email opcional pós-aceite (v1.1).

---

## Fluxo de cupons

Tipos canônicos em `domain/coupon-types`. Validação em checkout e agendamento. Cupons de plano/reembolso têm regras de ownership (PR-04 adiado).

---

## Fluxo de planos

Checkout Asaas plano → webhook → UserPlan ativo. Cancelamento e reembolso com tracking em `UserPlan`.

---

## Limitações conhecidas

- Webhook assíncrono — UX "paguei e não apareceu" (E2E-WH-01)
- Carrinho só no browser
- RC03-RACE-01 TOCTOU em slots
- Reset apaga TODOS `SynchronizationEvent` (não só expirados)
- Admin perde sessão no Launch Reset (re-login necessário)
- CPF `@unique` — migration HS-01 sensível a duplicatas

---

## Decisões adiadas para v1.1

- Polling pós-pagamento na página sucesso (E2E-02 H1)
- Redirect pós-registro → `/minha-conta`
- Webhook alertas estruturados
- Cupom PR-04 ownership
- Lock otimista em slots

---

## Congelado até StudioOS

- Novas entidades de catálogo dinâmico
- Multi-tenant / white-label
- Refatoração ampla de domínio
- Execution/Simulation em Production

StudioOS só após v1.0 + v1.1 estáveis e ADR explícito.

---

## Documentação relacionada

- [domain-map.md](ai/domain-map.md)
- [domain-invariants.md](ai/domain-invariants.md)
- [v1.0-overview.md](architecture/v1.0-overview.md)
- [releases/v1.0.0.md](releases/v1.0.0.md)
