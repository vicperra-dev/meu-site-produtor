# GL-02 — Checklist Operacional de Go Live

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Escopo:** MVP agendamento avulso via Asaas

---

## Veredito

Checklist operacional definitiva para colocar o THouse Rec em produção no **MVP comercial** (agendamento avulso). O código está deployável; os gates críticos são **banco, Asaas e smoke E2E**. Monitoramento permanece a maior lacuna operacional.

---

## 1. Banco de Dados

| Item | Status | Evidência |
|------|--------|-----------|
| **DATABASE_URL** | 🟡 | `prisma/schema.prisma` — valor só no host |
| **Prisma Generate** | 🟢 | `build` + `postinstall` em `package.json` |
| **Prisma Migrate Deploy** | 🟡 | 30 migrations; passo manual: `npx prisma migrate deploy` |
| **Backup obrigatório** | 🔴 | Sem automação; snapshot Neon/PITR manual |
| **Rollback possível** | 🟡 | Redeploy Vercel + restore Neon; sem runbook no repo |

**Área:** 🟡

---

## 2. Asaas

| Item | Status | Evidência |
|------|--------|-----------|
| **Sandbox** | 🟢 | `IS_TEST = NODE_ENV !== 'production'` |
| **Produção** | 🟡 | Chave `$aact_prod_*` + `NODE_ENV=production` |
| **ASAAS_API_KEY** | 🟡 | `env.ts`, `checkout-carrinho` — erro claro se ausente |
| **ASAAS_WEBHOOK_ACCESS_TOKEN** | 🟡 | Header `asaas-access-token` no webhook |
| **Webhook URL** | 🟡 | `https://{dominio}/api/webhooks/asaas` |
| **Domínio cadastrado** | 🟡 | Painel Asaas — obrigatório para checkout |
| **Eventos RECEIVED / CONFIRMED / REFUNDED** | 🟢 | `webhooks/asaas/route.ts` — PAYMENT_RECEIVED processa; PAYMENT_REFUNDED sincroniza |

**Área:** 🟡

---

## 3. Variáveis de Ambiente

### Obrigatórias (MVP compra avulsa)

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL / Prisma |
| `ASAAS_API_KEY` | Checkout e API Asaas |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Segurança do webhook |
| `NEXT_PUBLIC_SITE_URL` | Callbacks checkout e emails |

### Obrigatórias (operação)

| Variável | Uso |
|----------|-----|
| `CRON_SECRET` | Crons limpar-chats e renovar-planos |

### Recomendadas

| Variável | Uso |
|----------|-----|
| `SUPPORT_EMAIL` | SMTP remetente |
| `SUPPORT_EMAIL_PASSWORD` | Senha SMTP |
| `SUPPORT_DEST_EMAIL` | Destino notificações (default: thouse.rec.tremv@gmail.com) |
| `PAYMENT_PROCESS_SECRET` | Automação `processar-direto` |

### Opcionais

| Variável | Uso |
|----------|-----|
| `DELIVERY_AUDIO_URL_PROBE` | Probe URL entrega no admin |
| `OPENAI_API_KEY` | Chat IA (fora do MVP compra) |

### Descontinuadas (MVP Asaas)

| Variável | Motivo |
|----------|--------|
| `MERCADOPAGO_ACCESS_TOKEN` | Fluxo legado |
| `MP_INTEGRATOR_ID` | Mercado Pago legado |
| `INFINITYPAY_API_KEY` | Provedor alternativo |
| `NEXTAUTH_SECRET` | Sessão custom; não usada no código |

### Não utilizadas / perigosas

| Variável | Motivo |
|----------|--------|
| `ASAAS_SKIP_TLS_VERIFY` | Dev only; ignorado em production |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Risco se vazar para prod |

### Automáticas (host)

`NODE_ENV`, `VERCEL`

---

## 4. Deploy

| Item | Status |
|------|--------|
| `npm run build` | 🟢 Passou (GL-01) |
| `prisma generate` | 🟢 No build/postinstall |
| `next build` | 🟢 Next 16.1.6 |
| Variáveis | 🟡 Checklist parcial |
| Domínio | 🟡 Vercel + Asaas |
| HTTPS | 🟢 Vercel + cookie `secure` |

**Área:** 🟡

---

## 5. Monitoramento

| Capacidade | Existe? | Status |
|------------|---------|--------|
| **Logs** | Sim (console + Vercel) | 🟡 |
| **Alertas** | Não | 🔴 |
| **Auditoria** | Parcial (LoginLog) | 🔴 |
| **Recovery** | Parcial (rotas admin) | 🔴 |
| **Runbook** | Não versionado | 🔴 |

### O que falta exatamente

1. APM/erros (Sentry, Datadog, etc.)
2. Alerta em falha de efeitos de webhook (rota sempre retorna 200)
3. Logs estruturados com `paymentId` / correlationId
4. Health check dedicado
5. Runbook versionado: pagamento órfão, rollback, restore Neon
6. Dashboard operacional (taxa falha webhook/checkout)
7. Vercel Log Drain ou alertas por email/Slack
8. Procedimento documentado: `processar-direto` vs `reprocessar-pagamento-teste`

**Área:** 🔴

---

## 6. Segurança

| Item | Status |
|------|--------|
| Cookies | 🟢 httpOnly, secure, sameSite lax |
| Headers | 🟢 X-Frame-Options + CSP |
| Session | 🟢 Prisma Session 7d |
| Admin | 🟡 requireAdmin + bypass email |
| Cross-user | 🟢 Filtros userId |
| LGPD | 🟡 Termos + aceite checkout; sem API exclusão automática |
| Rate limit | 🔴 Ausente |
| Uploads | 🟢 MVP usa URL externa; sem upload em API de compra |
| Segredos expostos | 🟡 Logs de body webhook e registro |

**Área:** 🟡

---

## 7. Operação — Capacidades do Admin

| Capacidade | Resposta |
|------------|----------|
| Receber pagamento | **SIM** — webhook automático; visualização em `/admin/pagamentos` |
| Visualizar pedido | **SIM** |
| Visualizar agendamento | **SIM** — `/admin/agendamentos` |
| Alterar status | **SIM** — aceitar/recusar/concluir via PATCH |
| Enviar entrega | **PARCIAL** — `deliveryAudioUrl` (URL externa); sem upload |
| Liberar cupom | **PARCIAL** — automático no webhook; `associar-usuario` via API |
| Reprocessar | **PARCIAL** — simbólicos na UI; reais via `processar-direto` (admin) |
| Excluir pagamento simbólico | **SIM** — `canAdminDeletePayment` + DELETE |

---

## 8. Checklist Go Live (ordem cronológica)

### Pré-deploy

- [ ] **1.** Confirmar commit `3f20ad0` (GL-01 B1 auto-login)
- [ ] **2.** Backup / snapshot Neon (ou PITR ativo)
- [ ] **3.** `npm run build` verde

### Banco e env

- [ ] **4.** `DATABASE_URL` no Vercel Production
- [ ] **5.** `npx prisma migrate deploy`
- [ ] **6.** `NEXT_PUBLIC_SITE_URL` = `https://dominio-final`
- [ ] **7.** `SUPPORT_EMAIL` + `SUPPORT_EMAIL_PASSWORD` (recomendado)
- [ ] **8.** `CRON_SECRET` + agendar crons (recomendado)

### Preview + sandbox

- [ ] **9.** Deploy Preview com envs
- [ ] **10.** `ASAAS_API_KEY` sandbox no Preview
- [ ] **11.** Webhook sandbox → `https://{preview}/api/webhooks/asaas` + token
- [ ] **12.** Smoke Preview: registro → agendamento → carrinho → pagamento
- [ ] **13.** Confirmar banco: Payment + Appointment + metadata

### Produção Asaas

- [ ] **14.** `ASAAS_API_KEY` produção (`$aact_prod_*`)
- [ ] **15.** `ASAAS_WEBHOOK_ACCESS_TOKEN` = token painel
- [ ] **16.** Webhook produção registrado
- [ ] **17.** Domínio aprovado no painel Asaas

### Deploy e validação

- [ ] **18.** Deploy Production
- [ ] **19.** Primeiro pagamento sandbox em prod — validar logs webhook
- [ ] **20.** Primeiro pagamento real — confirmar Minha Conta

### Operação contínua

- [ ] **21.** Runbook pagamento órfão documentado
- [ ] **22.** Monitorar logs 24h
- [ ] **23.** Monitorar 7 dias
- [ ] **24.** Liberar primeiro cliente real (com suporte informado)

---

## Probabilidade de sucesso sem intervenção humana

> **Pergunta:** Se a checklist for seguida exatamente, qual a chance do primeiro cliente **comprar um serviço** sem intervenção humana?

| Métrica | Valor |
|---------|-------|
| **Probabilidade estimada** | **70%** |
| Faixa | 66% – 74% |

**Definição:** registro → agendamento → carrinho → checkout Asaas → pagamento confirmado → agendamento visível em Minha Conta — sem suporte, sem admin acionando reprocessamento manual.

**Por que não é 100%:**

- Polling pós-pagamento não confirma `Appointment` criado (UX “paguei e não apareceu”)
- Formulário longo + CPF obrigatório → abandono
- Webhook pode falhar após smoke (sem alerta automático)
- Falhas silenciosas de email não bloqueiam compra mas confundem usuário

**Comparativo:**

| Cenário | Prob. |
|---------|-------|
| Sem checklist (E2E-01) | ~52% |
| Checklist seguida exatamente | **~70%** |
| Checklist + melhorias H1 UX (polling, redirect) | ~78% |

> **Nota:** Aceite do agendamento pelo admin (`status: pendente` → `aceito`) é **pós-compra** e não entra na definição de “comprar”; a compra em si não exige admin.

---

## Resumo por área

| Área | Status |
|------|--------|
| Banco de Dados | 🟡 |
| Asaas | 🟡 |
| Variáveis de Ambiente | 🟡 |
| Deploy | 🟡 |
| Monitoramento | 🔴 |
| Segurança | 🟡 |
| Operação Admin | 🟢 |

---

*Relatório gerado em modo READ ONLY — nenhum código, commit ou banco alterado.*
