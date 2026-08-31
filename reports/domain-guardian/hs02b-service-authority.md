# HS-02B — Service Authority Refactor

**Modo:** Staff Software Engineer · Domain Architect · Refactor Specialist · Domain Guardian  
**Gerado:** 2026-07-13  
**Base:** HS-02A domain map  
**Commit:** `refactor(service): consolidate Service as operational authority (HS-02B)`

---

## Plano interno (aplicado)

1. Introduzir `service-authority.ts` como contrato de statuses e derivações.  
2. Remover criação duplicada do GET de serviços; repair só via `ensureServicesForAppointment`.  
3. `reconcile` vira espelho **Service → Appointment** (admin), sem dual-authority.  
4. Stats/gráficos **operacionais** leem **Service**; financeiros continuam em **Payment**.  
5. Reverter cancelamento realinha Services.  
6. Eliminar UI paralela `/admin/servicos`.  
7. Validar tsc / prisma / build / auditoria.

---

## Autoridade consolidada

| Domínio | Responsabilidade |
|---------|------------------|
| **Appointment** | Solicitação do cliente (data, hora, tipo pedido, status admin, vínculo pagamento) |
| **Service** | Trabalho da equipe (status operacional + entrega) |
| **Payment** | Financeiro |

Fluxo canônico pós-pagamento:

```
Payment → Appointment (solicitação)
       → Aceite admin
       → ensureServices (se necessário)
       → Service = autoridade operacional
       → em_andamento → concluido(+URL)
       → Minha Conta / Gerais / Dashboard (Service)
```

---

## O que mudou

### Criado
- `src/app/lib/service-authority.ts` — statuses, mapper único, parse metadata, derive Appointment←Service

### Refatorado
- `ensure-appointment-services.ts` — parse JSON de PaymentMetadata; mapper compartilhado; `repairOrphanAppointmentServices`
- `appointment-service-sync.ts` — só aplica `deriveAppointmentStatusFromServiceStatuses`
- `GET /api/admin/servicos` — leitura pura + `?repair=1` opcional + `Cache-Control: no-store`
- `reverter-cancelamento` — ensure + Services `cancelado|recusado` → `aceito`
- Stats detalhadas / gráficos — `emAndamento`, `aFazer` operacional; tipos via `Service.tipo`
- Serviços Gerais / Selecionados — events + poll + no-store; Selecionados usam `ACTIVE_OPERATIONAL_SERVICE_STATUSES`
- Estatísticas UI — card Em andamento

### Removido / morto eliminado
- Backfill inline (`prisma.service.create`) no GET  
- Página paralela `admin/servicos` → **redirect** para `servicos-aceitos`  
- Mapper duplicado local em `admin/servicos/route.ts`

---

## Fluxos preservados (não quebrar)

| Fluxo | Status |
|-------|--------|
| Webhook → payment effects → `createServicesForAppointmentIfMissing` | Intactos |
| Checkout / Payment | Intactos |
| com-cupom → Service na TX | Intactos |
| Minha Conta entregas (`concluido` + URL) | Intactos |
| Aceite admin → ensure + updateMany aceito | Mantido / reforçado |

---

## Validação

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | PASS |
| `npx prisma validate` | PASS |
| `npm run build` | PASS |
| `hs01-data-integrity-audit.js` | 0 issues |

---

## Riscos residuais

1. `?repair=1` no primeiro load admin ainda pode criar órfãos (mínimo necessário para A5).  
2. Factory de pagamento ainda não completa Services parciais (`0 < count < expected`).  
3. Tela Agendamentos continua administrativa da **solicitação** (esperado Fase 4).  

---

## Critérios de commit

- Build OK · TypeScript OK · Prisma OK  
- Pagamento/webhook preservados  
- Service = autoridade operacional  

*Fim HS-02B.*
