# HS-02A — Domain Mapping: Service (READ ONLY)

**Modo:** Staff Software Engineer · Domain Architect · Domain Guardian  
**Gerado:** 2026-07-13  
**Escopo:** ciclo de vida do model `Service` (pagamento → entrega)  
**Restrições:** nenhum código alterado · nenhum commit · nenhuma migration · nenhum bugfix

Fontes: `prisma/schema.prisma`, `src/app/**`, `scripts/**`, `docs/ai/domain-*.md`.

---

## Diagrama textual do ciclo de vida

```
Payment (approved / PAYMENT_RECEIVED)
  ├─ tipo=agendamento  → processAgendamentoPaymentEffects
  │                        → Appointment? → createServicesForAppointmentIfMissing (status=pendente)
  ├─ tipo=carrinho     → processCarrinhoPaymentEffects
  │                        → N× Appointment → createServicesForAppointmentIfMissing
  └─ tipo=plano        → cupons de plano (NÃO cria Service)

Agendamento com cupom (com-cupom)
  → Appointment + Service*(pendente) na mesma transaction

Admin ACEITA Appointment
  → ensureServicesForAppointment (cria se faltava)
  → Service* status=aceito + acceptedAt
  → reconcileAppointmentWithServices

Admin INICIA (em_andamento)
  → Appointment + Service(aceito|pendente) → em_andamento

Admin CONCLUI Service (URL wav/mp3)
  → Service.status=concluido + deliveryAudio*
  → se nenhum Service aberto no Appointment → Appointment.concluido
  → reconcile

Cancelamento / Recusa
  → Service* → cancelado | recusado

GET /api/admin/servicos (side-effect)
  → backfill: Appointment sem Service → cria 1 Service
  → listagem
       ├─ Serviços Gerais (/admin/servicos-aceitos): TODOS
       └─ Serviços Selecionados (/admin/servicos-solicitados): ativos + appointmentId

Minha Conta
  ← /api/meus-dados ← Service(concluido + deliveryAudioUrl) como entregas[]
```

---

## Schema (fonte do código)

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | String uuid | PK |
| `userId` | String | FK User Cascade |
| `appointmentId` | Int? | FK Appointment SetNull |
| `tipo` | String | Catálogo via `normalizeServiceTypeId` |
| `description` | String? | |
| `status` | String | default `pendente` |
| `acceptedAt` | DateTime? | |
| `deliveryAudioUrl` | String? | URL pública (não há upload de arquivo no server) |
| `deliveryAudioFormat` | String? | `wav` \| `mp3` |
| `createdAt` / `updatedAt` | DateTime | |

Comentário no schema: `pendente | aceito | em_andamento | recusado | cancelado | concluido`.

**Não existem** no código: `PENDING`, `ACCEPTED`, `DELIVERED`, `COMPLETED`, `REFUNDED`, `entregue`.  
Entrega = `concluido` + `deliveryAudioUrl`.

---

## 1. Quem cria Service?

### Factory canônica

| Função | Arquivo | Comportamento |
|--------|---------|---------------|
| `createServicesForAppointmentIfMissing` | `src/app/lib/asaas-agendamento-payment-effects.ts` | Idempotente: só cria se `count(appointmentId)==0`; multiplica linhas por `servicos`/`beats` × quantidade; status `pendente`. Se `0 < count < expected` → **não completa** (warn). |
| `ensureServicesForAppointment` | `src/app/lib/ensure-appointment-services.ts` | Se já há Service, return. Senão tenta metadata do Payment vinculado → factory acima. Fallback: **1** Service a partir de cupom/`apt.tipo`. |

### `prisma.service.create` / `tx.service.create` (caminhos diretos)

| Arquivo | Contexto |
|---------|----------|
| `asaas-agendamento-payment-effects.ts` | dentro da factory |
| `ensure-appointment-services.ts` | fallback unitário |
| `api/admin/servicos/route.ts` **GET** | backfill de appointments órfãos |
| `api/agendamentos/com-cupom/route.ts` | na transaction do booking com cupom |

### Criação indireta (cadeias)

| Origem | Cadeia |
|--------|--------|
| Webhook Asaas `PAYMENT_RECEIVED` tipo agendamento | `webhooks/asaas` → `processAgendamentoPaymentEffects` → factory |
| Webhook tipo carrinho | → `processCarrinhoPaymentEffects` → factory por Appointment |
| `process-payment-webhook.ts` | → `processAgendamentoPaymentEffects` |
| Admin reprocessar pagamento teste | → `processAgendamentoPaymentEffects` |
| `asaas-agendamento-reconcile.ts` | → factory (2 call sites) |
| Admin PATCH aceite | → `ensureServicesForAppointment` |

### Não criam Service

- Checkout Asaas (Payment + PaymentMetadata)
- Webhook de **plano** (cupons)
- `PAYMENT_REFUNDED`
- Criação de Appointment isolada sem efeitos

---

## 2. Quem altera Service?

| Campo / aspecto | Quem altera | Arquivo(s) |
|-----------------|------------|------------|
| **status → aceito** | Admin aceite agendamento | `api/admin/agendamentos/route.ts` `updateMany` + `acceptedAt` |
| **status → recusado** | Admin recusa | mesmo arquivo |
| **status → em_andamento** | Admin “iniciar” | mesmo arquivo; também PATCH servicos |
| **status → concluido** | Admin Serviços | `api/admin/servicos/route.ts` PATCH (+ URL) |
| **status → cancelado** | Usuário / Admin cancelar | `api/agendamentos/cancelar`, `api/admin/agendamentos/cancelar` |
| **deliveryAudioUrl/Format** | Admin PATCH | `api/admin/servicos/route.ts` |
| **acceptedAt** | Com `aceito` | agendamentos + servicos |
| **userId (owner)** | Nunca após create | — |
| **appointmentId** | Nunca reatribuído; SetNull se Appointment apagado | schema |
| **DELETE** | Admin | `api/admin/servicos` DELETE |
| **Appointment sync** | Lê Services, **escreve Appointment** | `appointment-service-sync.ts` |

**Lacuna:** `api/admin/agendamentos/reverter-cancelamento` restaura Appointment para `aceito` **sem** atualizar Services.

---

## 3. Quem consome Service?

| Consumidor | Como |
|------------|------|
| **Serviços Gerais** | UI `admin/servicos-aceitos` → `GET /api/admin/servicos` (lista completa; filtro client) |
| **Serviços Selecionados** | UI `admin/servicos-solicitados` → mesma API; filtro `appointmentId != null` + ativos |
| **Minha Conta** | `meus-dados` busca Services `concluido` + URL → `entregas[]` |
| **Dashboard / Stats** | `admin/stats`, `stats/detalhadas`, `stats/graficos?secao=servicos` |
| **Entrega** | escrita admin PATCH; leitura Minha Conta |
| **Admin Agendamentos** | propaga status; link para Selecionados |
| **Scripts** | `hs01-data-integrity-audit.js`, `ex02-financial-flow.js`, migrate v2 |

UI paralela: `admin/servicos/page.tsx` **não** está no `admin/layout` nem nos cards do `admin/page` (nav oficial aponta para `servicos-aceitos`).

---

## 4. Status possíveis

| Status real | Quem define / cria | Quem lê |
|-------------|-------------------|---------|
| `pendente` | Factory, com-cupom, backfill, ensure | Selecionados (ACTIVE), Gerais, stats |
| `aceito` | Aceite admin, ensure/backfill se apt aceito/confirmado, PATCH | ACTIVE, stats.aceitos / aFazer |
| `em_andamento` | Start admin, PATCH | ACTIVE, Gerais; **omitido** nas `statusKeys` dos gráficos |
| `concluido` | PATCH + delivery; backfill | Minha Conta entregas; **fora** da lista Selecionados |
| `recusado` | Reject admin | Gerais, gráficos |
| `cancelado` | Cancel user/admin | Gerais, stats |

`Appointment.confirmado` **não** é status de Service — mapeado como `aceito` nos mappers.

---

## 5. Appointment → Service: um fluxo ou vários?

**Vários fluxos** (não um pipeline único):

| ID | Fluxo |
|----|--------|
| F1 | Webhook pagamento agendamento |
| F2 | Webhook carrinho (N appointments) |
| F3 | Booking com cupom (mesmo TX) |
| F4 | Aceite admin + `ensure` |
| F5 | Side-effect backfill no GET admin/servicos |
| F6 | Reconcile pós-pagamento |

| Pergunta | Resposta no código |
|----------|-------------------|
| Duplicação? | Risco médio; factory evita se `count>=expected`; parcial não auto-completa |
| Fallback? | Sim — ensure/backfill com 1 linha genérica |
| Sync parcial? | Sim — reconcile só ajusta Appointment; revert cancel não toca Service |

---

## 6. Webhook

- **Não** cria `Service` diretamente.
- Em `PAYMENT_RECEIVED`, após salvar Payment:
  - `carrinho` → `processCarrinhoPaymentEffects` → Services
  - `agendamento` → `processAgendamentoPaymentEffects` → pode criar Appointment **e** Services
- Condições para Service no agendamento: não `couponsOnly`; existe `agendamentoFinalId`; metadata com itens (`expected > 0`).
- Plano: **não** cria Service.

---

## 7. Aceite do Admin

| Pergunta | Resposta |
|----------|----------|
| Cria Service? | **Sim**, via `ensureServicesForAppointment` antes do `updateMany` |
| Atualiza? | **Sim** → todos com aquele `appointmentId` para `aceito` |
| Sincroniza? | **Sim** → `reconcileAppointmentWithServices` |
| Pode duplicar? | `updateMany` não; ensure não se `count>0`; race possível com GET backfill |

---

## 8. Serviços Gerais

- **Consulta:** `GET /api/admin/servicos` → `findMany` + includes.
- **Filtros UI:** busca + status.
- **Side-effect:** backfill de criação no GET.
- **Cache:** fetch client no mount; sem SWR/React Query; página gerais sem `cache: "no-store"` explícito.
- **Código paralelo:** `/admin/servicos` page fora da nav.

---

## 9. Serviços Selecionados

- **Alimentação:** mesma GET.
- **Decisão:** `appointmentId != null` e status ∈ `{pendente, aceito, em_andamento}`.
- **Ações:** Aceitar / Começar / Concluir (modal URL).
- **Sync UI:** `subscribeAppDataChanged`, poll 30s, `notifyAppDataChanged` pós-PATCH.
- Sumir após `concluido` é **filtro intencional**; histórico fica em Gerais.

---

## 10. Dashboard / estatísticas

| Fonte | Uso |
|-------|-----|
| **Service** | counts por status; gráficos seção `servicos` |
| **Appointment** | volumes/agenda; gráficos de **tipos** usam `Appointment.tipo` |
| **Payment** | receita — independente de Service |

**Inconsistências observadas:**

- `Appointment.tipo` ≠ `Service.tipo` em pacotes multi-item
- `aFazer = aceitos` apenas (ignora `pendente` / `em_andamento`)
- gráficos de serviços omitem `em_andamento` nas chaves
- detalhadas não nomeiam contagem de `em_andamento` / `recusado`

---

## 11. Delivery

| Quem | Faz o quê |
|------|-----------|
| Admin | Informa URL + formato → PATCH → `concluido` |
| Server | Valida URL (`validateDeliveryAudioUrl`); **não** recebe upload de arquivo binário |
| Usuário | Lê link em Minha Conta |
| Sistema | Se nenhum Service aberto no Appointment → `Appointment.concluido` |

---

## 12. Fonte da verdade (hoje)

| Domínio | Autoridade de fato |
|---------|-------------------|
| Slot / fila admin / cancelamento | **Appointment.status** |
| Item de trabalho + entrega | **Service.status** + delivery |
| Dinheiro | **Payment** |
| Invariante A5 | aceite/confirmado “deveria” ter ≥1 Service |

**Hoje há duas autoridades de status** (Appointment e Service), ligadas por sync **parcial**.

---

## 13. Duplicações

1. Quatro caminhos de criação (effects, ensure, GET backfill, com-cupom)  
2. Dois mappers Appointment→Service status (admin/servicos vs ensure)  
3. Propagação de status em agendamentos **e** PATCH servicos  
4. Três UIs de listagem de Service  
5. Agendamento effects + carrinho effects ambos chamam a mesma factory  

---

## 14. Código morto / paralelo

| Item | Classificação |
|------|----------------|
| `admin/servicos/page.tsx` | Fora da navegação oficial → paralelo / efetivamente não descoberto |
| Status EN (`PENDING`…) | Não usados |
| Reverter cancelamento sem Service | Lacuna, não morto |

---

## 15. Arquitetura ideal (sem alterar código)

**Proposta:** `Service` = única fonte da verdade para **trabalho e entrega**.  
`Appointment` = container de agenda/slot; seu `status` **derivado** dos Services (reconcile como única direção de sync).

Regras sugeridas para HS-02B:

1. Uma factory única de criação (sem side-effect no GET).  
2. Aceite admin = pipeline único: ensure → propagate → reconcile.  
3. Stats de trabalho por `Service.tipo`; Appointment só para capacidade.  
4. Delivery continua sendo `concluido` + URL (sem status `entregue` paralelo).  
5. Reverter cancelamento deve realinhar Services.

---

## Tabela-síntese

| Dimensão | Conteúdo |
|----------|----------|
| **Origem** | Webhook effects · com-cupom · ensure no aceite · GET backfill · reconcile |
| **Destino** | Model `Service` (+ `appointmentId` opcional) |
| **Consumidores** | Serviços Gerais · Selecionados · Minha Conta · Stats/Gráficos · Scripts |
| **Responsáveis** | Criação: payment/com-cupom/ensure/backfill · Status: admin agendamentos+servicos · Entrega: PATCH servicos · Sync: `appointment-service-sync` |
| **Dependências** | Appointment · Payment/Metadata · Coupon · User · `service-catalog` |
| **Riscos** | A5 (aceito sem Service) · parcial sem auto-complete · GET mutável · dual authority · revert cancel · stats mistas |
| **Duplicações** | Ver §13 |
| **Código morto** | `admin/servicos/page.tsx` fora da nav |
| **Fonte da verdade** | Hoje: dual Appointment/Service · Ideal: Service para trabalho; Appointment derivado |

---

## Invariante documentado (já existente)

**A5** (`docs/ai/domain-invariants.md`): agendamento aceito/confirmado com cobrança real deve ter ≥1 `Service` com `appointmentId`. Backfill admin existe; **não é garantido** em todos os fluxos.

---

## Hints para HS-02B

- Unificar factories de criação  
- Remover ou externalizar backfill do GET  
- Decidir autoridade única de status  
- Alinhar estatísticas a `Service.tipo`  
- Sync em `reverter-cancelamento`  
- Remover ou redirecionar `/admin/servicos`

---

*Fim HS-02A. Artefato irmão: `hs02a-service-domain-map.json`.*
