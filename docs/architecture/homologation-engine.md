# Homologation Engine — regra permanente (OP-02H / OP-02B / GO-01)

## H1 — Cobertura obrigatória

Toda funcionalidade futura que altere **pagamentos**, **workflow**, **agendamento**, **planos**, **cupons** ou **reembolso** deve possuir cenário correspondente executável no Homologation Engine.

- Catálogo: `src/app/lib/homologation/scenarios.ts`
- Painel: `/admin/homologacao`
- API: `POST /api/admin/homologation/run` com `{ scenarioId }`
- Provider: `SimulationProvider` (mesmo domínio que Asaas — sem forks)
- Smoke de catálogo: `npm run homologation:scenarios`

**Proibido:** criar fluxos paralelos ou regras “só para simulação”.

## SKUs oficiais (GO-01.4 / GO-01.5)

Todo SKU em `CANONICAL_SERVICE_IDS` + pacotes oficiais de checkout devem ter cenário:

`sessao`, `captacao`, `beat`/`beat1`–`beat4`, `mix`, `master`, `mix_master`, `sonoplastia`, `producao_completa`, `beat_mix_master`, `sessao_beat`, `sessao_mix`, `beat_mix`, planos Bronze/Prata/Ouro, cupom desconto/remarcação, refunds APPROVED/FAILED/PENDING/TIMEOUT.

## Identidade multi-gateway (prep. v1.1)

- `Payment.provider` + `Payment.providerPaymentId` são canônicos.
- Simulation **não** grava em `Payment.asaasId`.
- Asaas dual-write `asaasId` + `providerPaymentId` até unificação v1.1.
- Lookups: `paymentByProviderIdWhere()` (`src/app/lib/payment-provider/identity.ts`).
- Migration: `docs/architecture/go01-migrations.md`

## Refund Simulation

Outcomes suportados: `APPROVED` | `PENDING` | `FAILED` | `TIMEOUT`.
Todos atualizam entidades locais + sync events + timeline do run.

## Storage (GO-01.2)

Entregas passam por `StorageProvider` (`src/app/lib/storage`). Default: `LocalStorageProvider`. Cloud stub não integrado.
