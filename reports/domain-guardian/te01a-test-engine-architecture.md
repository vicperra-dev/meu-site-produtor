# TE-01A — Arquitetura do Test Engine (READ ONLY)

**Modo:** Staff Software Engineer · Software Architect · QA Automation Engineer · Domain Guardian  
**Gerado:** 2026-07-13  
**Restrições:** nenhum código alterado · nenhum commit · nenhuma migration · nenhuma implementação

---

## Premissa (inviolável)

O Test Engine **nunca** possui fluxo paralelo.

```
Simulação ⊆ Pipeline oficial
```

Em especial: simular pagamento **deve** produzir os mesmos efeitos que o webhook Asaas (`processAgendamentoPaymentEffects` / `processCarrinhoPaymentEffects` / `processPlanoPaymentEffects`), via o mesmo orquestrador (`processPaymentWebhook` ou `POST /api/webhooks/asaas`).

Base documental: ADR-010 (simulação simbólica), HS-02A/HS-02B (Service authority), scripts `ex01-*` / `ex02-*`.

---

## Pipeline oficial mapeado (código atual)

```
Registro (/api/registro)
  → Session cookie
Login (/api/login) / Auto-login pós-registro
  → /minha-conta | /conta

Checkout oficial
  → /api/asaas/checkout-agendamento | checkout-carrinho | checkout plano
  → PaymentMetadata + Payment (pending) + Asaas charge
  → [opcional] symbolicAgendamento=true (admin/dev) cobrança R$5

Webhook Asaas
  → POST /api/webhooks/asaas  (token asaas-access-token)
  → persiste/atualiza Payment approved
  → resolve PaymentMetadata
  → process*PaymentEffects
       ├─ Appointment (se slot/itens)
       ├─ Service (createServicesForAppointmentIfMissing)
       └─ Coupons (quando aplicável)

Admin aceite Appointment
  → ensureServicesForAppointment
  → Service.status = aceito  (autoridade operacional HS-02B)

Operação
  → Service em_andamento
  → Service concluido + deliveryAudioUrl
  → Appointment espelho (reconcile)

Cliente
  → /api/meus-dados → Minha Conta (entregas, cupons, agendamentos)

Admin
  → Serviços Gerais / Selecionados / Dashboard / Stats (Service operacional; Payment financeiro)
```

**Caminho já “quase Test Engine” existente:**  
`reprocessar-pagamento-teste` → chama **diretamente** `processAgendamentoPaymentEffects` (mesmo effects do webhook).  
`ex02-financial-flow.js` → POST canônico em `/api/webhooks/asaas` com payload `PAYMENT_RECEIVED`.

---

## Diagrama textual — arquitetura proposta

```
┌─────────────────────────────────────────────────────────────┐
│                     TEST ENGINE (admin)                      │
│  UI Scenario Catalog · Runner Controls · Results Viewer      │
│  Gate: canUseSymbolicSimulation + env allowlist              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    SCENARIO RUNNER                           │
│  Carrega fixture → executa steps ordenados → asserts         │
│  Não contém regras de domínio                                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 OFFICIAL PIPELINE ADAPTER                    │
│  Único ponto de “injeção” permitido                          │
│                                                              │
│  Preferido:                                                  │
│    1) criar Payment + PaymentMetadata (flags simbólicas)     │
│    2) POST /api/webhooks/asaas  { event, payment }           │
│       OU processPaymentWebhook(body)                         │
│                                                              │
│  Secundário (já existe):                                     │
│    reprocessar → process*PaymentEffects                      │
│                                                              │
│  Proibido:                                                   │
│    criar Appointment/Service/Coupon “na mão” bypass effects  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA REAL (handlers oficiais)                │
│  webhook route · processPaymentWebhook · payment effects     │
│  admin PATCH · cancelar · delivery · meus-dados · stats      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    ASSERTION LAYER                           │
│  Prisma reads · API GETs · UI smoke HTTP                     │
│  Domain Guardian checks (F1/F4/A5/…)                         │
└─────────────────────────────────────────────────────────────┘
```

**Não** é obrigatório um Event Bus interno na v1.

---

## 1. Eventos que existem hoje

### Gateway Asaas (webhook)

| Evento | Onde | Efeito no código |
|--------|------|------------------|
| `PAYMENT_RECEIVED` | `webhooks/asaas`, `process-payment-webhook` | Cria/atualiza Payment + effects |
| Status `RECEIVED` / `CONFIRMED` | idem | Confirmação |
| `PAYMENT_REFUNDED` / status REFUNDED | webhook route | Sync refund Asaas |
| `PAYMENT_CREATED` / `OVERDUE` / `DELETED` | webhook (parcial/log) | Limitado / ignorar safe |
| Outros `PAYMENT_*` | route filtra prefixo | Ignorados controlados |

### Domínio (implícitos — não há bus tipado)

| “Evento” lógico | Trigger | Handler oficial |
|-----------------|---------|-----------------|
| UserRegistered | POST `/api/registro` | create User + session |
| UserLoggedIn | POST `/api/login` | session |
| CheckoutStarted | POST checkout Asaas | PaymentMetadata + charge |
| PaymentApproved | webhook / processPaymentWebhook | effects |
| AppointmentCreated | effects / com-cupom | prisma.appointment.create |
| ServicesEnsured | effects / ensure | prisma.service.create* |
| AppointmentAccepted | PATCH admin agendamentos | ensure + Service aceito |
| ServiceStarted | PATCH status em_andamento | Service + mirror Appointment |
| ServiceDelivered | PATCH servicos + URL | Service concluido |
| AppointmentCancelled | cancelar user/admin | status + coupons |
| PlanActivated | processPlanoPaymentEffects | UserPlan + cupons |
| CouponIssued/Used/Released | vários libs cupom | Coupon |

### UI (browser only — não domínio)

| Evento | Arquivo |
|--------|---------|
| `thouse:data-changed` | `app-data-events.ts` |
| `appointment-updated` / `plan-updated` / `faq-updated` | Minha Conta |
| `chat-updated` | chat |

---

## 2. Eventos que ainda deveriam existir (para o Test Engine)

Como **contratos de cenário** (não necessariamente um bus novo), tipados no Runner:

| Domain Contract Event | Asserção típica |
|-----------------------|-----------------|
| `Payment.Approved` | Payment.status=approved + asaasId |
| `Webhook.Processed` | effects non-skip / metadata resolved |
| `Webhook.DuplicateIgnored` | F1/F3 — sem Payment duplicado |
| `Appointment.RequestCreated` | Appointment + payment link |
| `Service.WorkCreated` | ≥1 Service (A5) |
| `Service.Accepted` / `InProgress` / `Completed` | status + delivery URL |
| `Coupon.Issued` / `Redeemed` / `Released` | ownership + used |
| `Refund.Requested` / `Refund.Settled` | flags refund* |
| `Account.Snapshot` | meus-dados consistente |
| `Ops.DashboardSnapshot` | stats Service + Payment |

---

## 3. Melhor ponto de injeção

| Ponto | Recomendação | Motivo |
|-------|--------------|--------|
| **Antes do webhook** (só checkout Asaas sandbox) | Opcional para smoke real | Ainda depende da Asaas |
| **No Payment + Metadata, depois webhook canônico** | **Preferido (TE-01)** | Equivalência máxima ao prod |
| Chamar effects direto | Aceitável só como atalho admin existente | Já existe; menos fiel à borda HTTP/token |
| Criar Appointment/Service direto | **PROIBIDO** | Segundo fluxo |
| “Event Bus” inventado que reimplementa effects | **PROIBIDO** | Viola premissa |

**Decisão TE-01A:**

> Injection Point oficial = **synthetic Asaas webhook payload** batendo em `processPaymentWebhook` **ou** `POST /api/webhooks/asaas` com token, **depois** de PaymentMetadata (e opcionalmente Payment pending) criados pelos **mesmos writers** do checkout (ou helper que replica a gravação de metadata do checkout, sem efeitos).

---

## 4. Event Bus interno — necessário?

| Opção | Veredito |
|-------|----------|
| Event Bus completo (pub/sub) | **Não na v1** — sobre-engenharia; domínio já orquestra via webhook → effects |
| Orquestrador existente (`processPaymentWebhook`) | **Suficiente** como “dispatcher” financeiro |
| Adapter do Scenario Runner | **Sim** — camada fina que só chama APIs/handlers oficiais |
| UI CustomEvents | Continuam só para refresh de tela; **não** são Domain Events |

**Conclusão:** eventos atuais + adapter são suficientes. Bus interno fica no roadmap (StudioOS / QA Center) se analytics de cenários exigir telemetria tipada.

---

## 5. O que pode ser simulado

| Parte | Simulável? | Como (oficial) |
|-------|------------|----------------|
| Registro / Login | Sim | POST APIs reais |
| Pagamento | Sim (simbólico) | checkout `symbolic*` **ou** metadata + webhook sintético |
| Webhook | Sim | POST webhook / `processPaymentWebhook` |
| Appointment / Service | Sim | **somente** via effects + admin PATCH oficiais |
| Admin aceite / andamento / entrega | Sim | PATCH admin oficiais (URL delivery fictícia http) |
| Cupom / Reembolso (lógica) | Sim | rotas oficiais |
| Dashboard / Analytics leitura | Sim | GET stats oficiais pós-efeitos |
| Asaas dinheiro real | Não na simulação local | sandbox ou synthetic webhook |

---

## 6. O que deve continuar real

| Parte | Motivo |
|-------|--------|
| Autenticação / sessão / `requireAdmin` | Segurança |
| Gate `canUseSymbolicSimulation` | Isolamento usuário comum |
| Prisma + schema / migrations | Verdade persistida |
| Validação Zod / CPF / birth-date | Mesmas regras |
| Webhook token check (prod) | Segurança Asaas |
| Validação URL de delivery | Mesmo gate de entrega |
| Guardian invariants (F/A/C) | Asserts de qualidade |
| Upload binário (se existir no futuro) | N/A hoje — delivery é URL; se houver upload, real ou stub de storage |

---

## 7. Arquitetura (camadas)

1. **Test Engine Facade** (admin-only UI + CLI `scripts/te-*`)  
2. **Scenario Runner** — steps declarativos  
3. **Official Pipeline Adapter** — checkout writers + webhook dispatcher  
4. **Domain (sistema real)** — sem forks  
5. **Assertion / Reporter** — JSON + Guardian  

Fluxo alvo:

```
Test Engine → Scenario Runner → Event Dispatcher (Adapter)
  → Domain handlers oficiais → Sistema real → Assertions
```

O “Event Dispatcher” **é** o adapter que emite o payload webhook / chama `processPaymentWebhook` — não um bus paralelo.

---

## 8. Cenários oficiais

| ID | Nome | Steps-chave | Asserts-chave |
|----|------|-------------|----------------|
| TE-S01 | Compra simples (agendamento) | registro→checkout simbólico→webhook→Appointment→Service | Payment approved; A5 |
| TE-S02 | Compra carrinho | checkout-carrinho→webhook carrinho | N appointments/services |
| TE-S03 | Compra cancelada (admin/user) | S01→cancelar | Service cancelado; cupom regras |
| TE-S04 | Pagamento recusado / não confirmado | webhook sem RECEIVED | sem Appointment indevido |
| TE-S05 | Webhook duplicado | 2× PAYMENT_RECEIVED mesmo asaasId | 1 Payment (F1/F3) |
| TE-S06 | Cupom plano / redeem | plano simbólico→cupom→com-cupom | Coupon used + Service |
| TE-S07 | Reembolso | cancel→escolher reembolso/cupom | flags refund |
| TE-S08 | Entrega completa | aceito→andamento→concluido+URL | Minha Conta entregas |
| TE-S09 | Cliente completo | S01+S08+meus-dados | snapshot conta |
| TE-S10 | Admin completo | S08+Gerais+Selecionados+stats | Service authority |
| TE-S11 | Fluxo completo E2E | S09+S10+dashboard | report PASS |
| TE-S12 | Metadata expirada / órfão | webhook sem meta | skipped controlado + repair? |
| TE-S13 | Aceite sem Service prévio | Payment effects falhos→aceite | ensure cria Service |

---

## 9. Permissões

| Ambiente | Test Engine UI | CLI scripts | Usuário comum |
|----------|----------------|-------------|---------------|
| **localhost / Development** | Admin **ou** role ADMIN | Sim (env local) | **Não** (recomenda-se fechar gap atual do gate local) |
| **Preview** | Somente ADMIN + flag `TEST_ENGINE_ENABLED=1` | CI secret | Não |
| **Production** | **Bloqueado** por default | Bloqueado | Não |
| **Production emergencial** | Somente ADMIN + `TEST_ENGINE_ENABLED=1` + audit log | Não | Não |

**Nota de risco atual:** `canUseSymbolicSimulation` libera **qualquer usuário** quando `NODE_ENV≠production` / localhost. TE-01B deve **restringir o Engine a ADMIN** mesmo em local (scripts usam session admin ou secret).

---

## 10. Segurança

Controles obrigatórios:

1. `requireAuth` + `role===ADMIN` (ou owner email já privilegiado) **sempre** para UI/API do Engine.  
2. Flag env `TEST_ENGINE_ENABLED` (Preview/Prod).  
3. Nunca expor rotas de simulação sem CSRF/session.  
4. Marcar artefatos com metadata `symbolic*` / prefixo cupom `TESTE_` (C7/X5).  
5. Proibir execução se `NEXT_PUBLIC_SITE_URL` for domínio prod **e** flag off.  
6. Audit log: quem rodou qual cenário, quando, paymentIds.  
7. Cleanup script (`cleanup-test-users`) pós-suite.

---

## 11. Performance / reuso

| Reusar | Não duplicar |
|--------|--------------|
| `processPaymentWebhook` | Effects reinventados |
| `process*PaymentEffects` | `prisma.appointment.create` solto |
| `ensureServicesForAppointment` | Backfill paralelo |
| Admin PATCH servicos/agendamentos | Status “fake” |
| `/api/meus-dados`, stats | Views paralelas |
| `ex01`/`ex02` patterns | Novo HTTP stack |

Runner deve ser **fino**: HTTP + imports dos libs oficiais apenas.

---

## 12. Pontos que ainda impedem equivalência 100%

| Gap | Impacto | Mitigação TE |
|-----|---------|--------------|
| Dual path: `webhooks/asaas/route` vs `process-payment-webhook` (lógica similar, não idêntica linha-a-linha) | Drift possível | TE sempre preferir **uma** entrada (ideal: só `processPaymentWebhook` também usado pela route) |
| Checkout simbólico ainda cria charge Asaas R$5 (sandbox/prod key) | Dependência externa / custo simbólico | Modo `WEBHOOK_ONLY`: gravar metadata como checkout e injetar webhook sem charge |
| `PaymentMetadata.expiresAt` ~24h | Webhook tardio falha | Fixture com expiresAt longo em simulação |
| Classificação legada `amount===5` | Falsos positivos/negativos | Exigir flags A1 metadata |
| createServices parcial (`0<count<expected`) | A5 incompleto | Cenário TE-S13 + assert explícito |
| Emails reais em effects | Spam / lentidão | Flag `sendEmails:false` já existe em options — TE deve usar |
| Delivery probe HTTP externo | Flaky | desligar `DELIVERY_AUDIO_URL_PROBE` em TE |
| Gap localhost `canUseSymbolicSimulation` | Usuário comum | Endurecer gate no TE-01B |

---

## 13. Roadmap futuro

```
TE-01A  Arquitetura (este doc) ───────────────── DONE (docs only)
TE-01B  Official Pipeline Adapter + gate segurança
TE-01C  Scenario Runner CLI (S01–S05)
TE-01D  Admin UI mínima (localhost/ADMIN)
TE-02   Coverage S06–S11 + cleanup
TE-03   CI Preview: smoke TE gate
        ↓
StudioOS
  └─ QA Center (catálogo + histórico runs)
      ├─ Simulações completas (S01–S13+)
      ├─ Regression suite (PR)
      ├─ Smoke release (RC)
      └─ Release Validation (prod read-only asserts / Preview writable)
```

Alinhamento produto:

- **StudioOS** consome o mesmo Adapter.  
- **QA Center** = UI + storage de resultados.  
- **Regression** = subset Guardian + TE scenarios.  
- **Smoke** = S01 + S08.  
- **Release Validation** = S11 em Preview antes do merge.

---

## Tabelas-síntese

### Eventos (resumo)

| Camada | Exemplos | Papel no TE |
|--------|----------|-------------|
| Asaas webhook | PAYMENT_RECEIVED, REFUNDED | Injeção preferida |
| Effects | Appointment/Service/Coupon | Sistema real |
| UI | thouse:data-changed | Fora do domínio |

### Cenários

Ver §8 (TE-S01 … TE-S13).

### Permissões

Ver §9.

### Riscos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Segundo fluxo de efeitos | CRÍTICO | Premissa + code review |
| Simulação em produção | ALTO | flag + ADMIN + audit |
| Gap localhost user comum | ALTO | Gate ADMIN obrigatório |
| Drift webhook/processPaymentWebhook | MÉDIO | Unificar entrada |
| Artefatos misturados com reais | MÉDIO | metadata symbolic + cleanup |
| Flaky external Asaas/email/probe | MÉDIO | WEBHOOK_ONLY + sendEmails:false |

### Roadmap implementação

| Sprint | Entrega |
|--------|---------|
| TE-01A | Arquitetura (docs) |
| TE-01B | Adapter + security harden |
| TE-01C | Runner CLI S01–S05 |
| TE-01D | UI admin opcional |
| TE-02 | Cenários estendidos |
| TE-03 | CI / Preview gate |
| StudioOS+ | QA Center |

---

## Recomendação executiva

1. **Não criar Event Bus agora.**  
2. **Injetar no limiar do webhook canônico** (`processPaymentWebhook`).  
3. **Reutilizar 100%** payment effects + admin PATCH + meus-dados.  
4. **Endurecer permissões** antes de qualquer UI.  
5. Próximo código só em **TE-01B** (após aprovação).

---

*Fim TE-01A. Artefato irmão: `te01a-test-engine-architecture.json`.*
