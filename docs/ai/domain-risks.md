# Riscos de domínio — THouse

Documentação permanente derivada da auditoria de integridade e da auditoria arquitetural do modelo de domínio.

**Uso:** agentes de IA, Domain Guardian, planejamento de migrations e monitoramento operacional.

---

## Relacionamentos sem FK (referência lógica)

| Relacionamento | Campos | Risco se quebrado |
|----------------|--------|-------------------|
| **Payment → Appointment** | `Payment.appointmentId`, `Payment.appointmentIds` (JSON) | Payment approved órfão; reembolso sem alvo; admin pagamentos com vínculo inválido |
| **Appointment → Coupon (remarcação)** | `Appointment.refundCouponId` | Cupom deletado com ponte quebrada; remarcação inacessível; ownership incorreto |
| **Coupon → Appointment** | `Coupon.appointmentId` | Cupom `used` apontando para apt inexistente; stale link após delete |
| **PaymentMetadata → Payment** | `PaymentMetadata.asaasId` ↔ `Payment.asaasId` | Webhook sem contexto; Payment criado sem Appointment/UserPlan; metadata órfão |
| **Coupon.usedBy → User** | `Coupon.usedBy` (string, sem FK) | Rastreabilidade de consumo fraca após mudanças de conta |
| **Payment → planId / serviceId** | campos opcionais sem FK | Heurísticas de plano/reembolso falham |

## Relacionamentos com FK (comportamento em delete)

| Relacionamento | onDelete | Risco |
|----------------|----------|-------|
| **User → *** | Cascade | Delete de conta apaga todo histórico financeiro (exceto `AccountDeletionLog`) |
| **Coupon → UserPlan** | Cascade | Delete de UserPlan apaga todos os cupons do plano |
| **Coupon → Payment** | SetNull | Delete Payment desvincula cupom sem apagar cupom |
| **Service → Appointment** | SetNull | Delete Appointment deixa Service com `appointmentId = null` |
| **Coupon → User (assigned)** | SetNull | Delete user limpa `assignedUserId` |

---

## Dependências lógicas críticas

### Fluxo pagamento agendamento

```
Checkout → PaymentMetadata.create
    → Asaas POST → PaymentMetadata.asaasId
        → Webhook PAYMENT_RECEIVED
            → Payment.create (asaasId)
            → PaymentMetadata resolve metadata
            → Appointment.create (s)
            → Payment.appointmentId / appointmentIds update
            → Service.create (payment-effects)
```

**Ponto frágil:** qualquer falha entre `Payment.create` e update de `appointmentId` deixa F4 violado.

### Fluxo pagamento plano

```
Checkout → PaymentMetadata → Webhook → Payment.create → UserPlan.create → Coupon[] (plan-coupons)
```

**Ponto frágil:** `Payment` e `UserPlan` ligados por heurística temporal, não por FK.

### Fluxo reembolso

```
Outbound: Appointment|Coupon|UserPlan → resolve Payment.asaasId → refundAsaasPayment
Inbound:  Webhook PAYMENT_REFUNDED → Payment por asaasId → sync refundAsaasStatus
```

**Ponto frágil:** estado de reembolso em três entidades; `Payment.status` permanece `approved`.

### Fluxo remarcação (cupom)

```
escolher-reembolso (cupom) → Coupon.create → Appointment.refundCouponId
    → resgate / com-cupom → Coupon.appointmentId (novo apt)
```

**Ponto frágil:** `refundCouponId` e `Coupon.appointmentId` sem FK; delete de cupom quebra ponte.

### Ocultação (não é delete)

| Camada | Campo | Escopo |
|--------|-------|--------|
| Usuário | `Appointment.userHiddenAt`, `UserPlan.userHiddenAt`, `Coupon.userRemovedAt` | Minha Conta |
| Resolução lógica | `appointmentResolvedForUser` | Remove da lista sem campo extra |
| Admin inativação | `UserPlan.adminInactiveAt` | Cancela plano + bloqueia cupons |
| Arquivamento admin | — | **Não implementado** (`adminArchivedAt` ausente) |

---

## Riscos conhecidos

### CRÍTICO

1. **Delete em cascata de `User`** — remove Payment, Appointment, UserPlan, Service; só `AccountDeletionLog` sobrevive anonimizado.
2. **Referências Payment ↔ Appointment sem FK** — purge físico (simulação, cascade) deixa payments apontando para IDs mortos.
3. **`refundCouponId` sem FK** — exclusão de cupom (simulação, edge cases) quebra remarcação.
4. **Duplicidade de Payment** — mitigada por idempotência webhook; falha na verificação duplicaria cobrança local.
5. **Reembolso no Asaas sem sync local** — mitigado por `PAYMENT_REFUNDED`; estados `pending` indefinidos se webhook falhar.

### ALTO

6. **UserPlan ↔ Payment sem FK** — reembolso de plano usa janela 48h + `createdAt`; ambiguidade com múltiplos planos.
7. **Carrinho multi-appointment** — um `asaasId`, vários appointments; reembolso parcial vs `REFUNDED` global no Asaas.
8. **Appointment sem Service** — entregas e sync de status incompletos até backfill admin.
9. **Conflito de horário** — `recusado` ainda conta em `findFirst` de conflito (slot bloqueado indevidamente).
10. **Admin UI com botões Excluir** — retornam 422; operador pode interpretar como bug.
11. **Cupom órfão** (`assignedUserId` null) — mitigável via `repair-coupon-ownership.mjs`.

### MÉDIO

12. **PaymentMetadata expirado** — sem job de limpeza automatizado; webhook pode perder metadata antiga.
13. **Service com `appointmentId = null`** — após delete de appointment; entrega pode ficar órfã.
14. **`purge-cancelled-appointment.ts`** — código morto; risco se reativado sem guards.
15. **Simulação vs produção** — `resetSimulationArtifacts` seguro se critérios R$5/`isSimulationCoupon` corretos.
16. **Valores heterogêneos de `refundAsaasStatus`** — `REFUNDED` vs `confirmed` vs `pending` entre entidades.

### BAIXO

17. **Estatísticas admin** — contagens incluem registros ocultos pelo usuário.
18. **Nomenclatura** — `userHiddenAt` vs `userRemovedAt` para o mesmo conceito de ocultação.

---

## Pontos que exigem monitoramento

### Tier 1 — diário (alerta imediato)

| # | Verificação |
|---|-------------|
| 1 | `Payment` approved + `asaasId` sem `User` válido |
| 2 | `asaasId` duplicado em mais de um `Payment` |
| 3 | `Payment` agendamento approved com `appointmentId`/`appointmentIds` apontando para IDs inexistentes |
| 4 | `Appointment.refundCouponId` sem `Coupon` correspondente |
| 5 | Cupom com `userPlanId` cujo `UserPlan.userId` ≠ dono inferido do uso |
| 6 | `refundProcessedAt` + `refundAsaasStatus = pending` há >7 dias com `Payment.asaasId` (cruzar com Asaas) |
| 7 | `PaymentMetadata.asaasId` sem `Payment` local após 1h |

### Tier 2 — diário (relatório)

| # | Verificação |
|---|-------------|
| 8 | Appointments ativos sem `Service` vinculado |
| 9 | `Coupon.used = true` sem rastreio resolvível |
| 10 | `UserPlan.status = active` sem cupons gerados (contagem abaixo do esperado) |
| 11 | `UserPlan` com reembolso e cupons de serviço ainda `used = false` não bloqueados |
| 12 | `Payment.type = plano` approved sem `UserPlan` na janela 48h |
| 13 | Sobreposição de horários em appointments não cancelados |
| 14 | Cupons com `assignedUserId` NULL e ownership inferível |

### Tier 3 — semanal

| # | Verificação |
|---|-------------|
| 15 | `PaymentMetadata` com `expiresAt < now()` |
| 16 | `Service.appointmentId IS NULL` com `deliveryAudioUrl` preenchido |
| 17 | Appointments cancelados/recusados sem resolução de reembolso há >30 dias |
| 18 | Pagamento simbólico R$5 com cupom não classificado como simulação |
| 19 | Divergência de status Appointment vs Services (reconcile não aplicado) |

### Tier 4 — métricas

| # | Verificação |
|---|-------------|
| 20 | Volume de `userHiddenAt` / `userRemovedAt` |
| 21 | `AccountDeletionLog` vs cadastros |
| 22 | Total de cupons órfãos (`isOrphanCoupon`) |

---

## Scripts e ferramentas existentes (não automatizados)

| Script / lib | Função |
|--------------|--------|
| `scripts/inspect-payments.mjs` | Inspeção manual de payments/metadata |
| `scripts/repair-coupon-ownership.mjs` | Repara `assignedUserId` |
| `scripts/inspect-simulation-coupons.mjs` | Cupons de simulação |
| `scripts/check-db.mjs` | Conectividade DB |
| `lib/coupon-stale-appointment.ts` | Normaliza vínculo cupom ↔ apt |
| `lib/asaas-agendamento-reconcile.ts` | Reconcilia payment ↔ appointments |

---

## Mapa visual — força das relações

```
User
├── Appointment[]          [FK CASCADE]
│   ├── Service[]          [FK SET NULL on apt delete]
│   └── refundCouponId ──► Coupon.id     [LÓGICO]
├── Payment[]              [FK CASCADE]
│   ├── appointmentId ───► Appointment   [LÓGICO]
│   ├── appointmentIds[] ► Appointment[] [JSON LÓGICO]
│   └── Coupon[]           [FK SET NULL on payment delete]
├── UserPlan[]             [FK CASCADE]
│   ├── Subscription       [FK CASCADE]
│   └── Coupon[]           [FK CASCADE on plan delete]
├── Service[]              [FK CASCADE]
└── PaymentMetadata[]      [userId string, SEM FK]
         asaasId ─────────► Payment.asaasId [LÓGICO]
```

---

## Mitigações já em produção (código atual)

- Idempotência webhook por `asaasId`
- `canAdminDeletePayment` / `canAdminDeleteCoupon`
- Admin DELETE agendamento/planos/excluir-cancelados/excluir-lote → **422**
- `syncInboundAsaasRefund` (`PAYMENT_REFUNDED`)
- `reconcileAppointmentWithServices`
- `normalizeStaleCouponAppointmentLink`
- Ocultação usuário sem delete físico

## Lacunas abertas

- Sem Domain Guardian automatizado
- Sem FK em vínculos financeiro-operacionais
- Sem `adminArchivedAt`
- Sem garbage collection de `PaymentMetadata`
- Sem invariante automático “appointment pago → service existe”
- `DELETE /api/admin/servicos` sem guard forte

---

*Última consolidação: auditoria de integridade do domínio THouse. Atualizar junto com mudanças de schema ou fluxos financeiros.*
