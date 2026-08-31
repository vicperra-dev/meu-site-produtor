# GO-02 — Plano de Execução das Pendências de Infraestrutura

**Modo:** EXECUÇÃO · **Alvo Preview:** `pr03-clean` @ `f882047`  
**URL Preview:** `https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app`

Somente plano operacional. Sem revisão de código.

---

## 1. Deployment Protection

| Campo | Detalhe |
|-------|---------|
| **Onde clicar** | [vercel.com](https://vercel.com) → Team `rauls-projects-6bf8a8b0` → Project `meu-site-produtor-1.3` → **Settings** → **Deployment Protection** |
| **O que alterar** | **Preview:** desligar Vercel Authentication (SSO) temporariamente **OU** gerar **Protection Bypass for Automation** e salvar como `VERCEL_AUTOMATION_BYPASS_SECRET` |
| **Resultado esperado** | URL Preview abre com **HTTP 200** (sem redirect para `vercel.com/sso-api`) |
| **Tempo** | 3–5 min |
| **Risco** | Baixo (Preview). **Não** alterar Production por engano. |
| **Responsável** | Usuário, Vercel |
| **Automatizável** | PARCIAL — SIM com `VERCEL_TOKEN`; NÃO sem credenciais |
| **Critério de aprovação** | `curl -I {previewUrl}` → sem redirect SSO |

---

## 2. DATABASE_URL Preview

| Campo | Detalhe |
|-------|---------|
| **Como verificar** | Neon → projeto → branch staging/preview → **Connection string** · Vercel → **Environment Variables** → Preview → `DATABASE_URL` aponta para Neon (não `localhost`) |
| **Como aplicar migrations** | Terminal local com URL do Preview |
| **Comando** | Ver bloco abaixo |
| **Como validar** | `migrate status` = up to date · `/api/meus-dados` = **200** após login |
| **Tempo** | 5–10 min |
| **Risco** | Médio — confirmar branch Neon **antes** de executar |
| **Responsável** | Usuário, Neon, Cursor |
| **Automatizável** | **SIM** (Cursor executa se Usuário fornecer `DATABASE_URL`) |
| **Critério de aprovação** | 29 migrations aplicadas; `/api/meus-dados` sem erro 500 |

```powershell
cd C:\Users\raulv\Documents\projetos\meu-site-produtor
$env:DATABASE_URL="<connection_string_neon_preview>"
npx prisma migrate deploy
npx prisma migrate status
```

---

## 3. NEXT_PUBLIC_SITE_URL

| Campo | Detalhe |
|-------|---------|
| **Valor a usar** | `https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app` |
| **Onde configurar** | Vercel → **Environment Variables** → `NEXT_PUBLIC_SITE_URL` → Environment: **Preview** → **Save** |
| **Obrigatório** | **Redeploy Preview** após salvar (`NEXT_PUBLIC_*` é build-time) |
| **Como validar** | Checkout retorna `initPoint` sandbox válido; nenhuma URL `localhost:3000` nas respostas |
| **Tempo** | 5 min + redeploy (~2–4 min) |
| **Risco** | Baixo — esquecer redeploy mantém valor antigo |
| **Responsável** | Usuário, Vercel |
| **Automatizável** | PARCIAL — SIM com API Vercel |
| **Critério de aprovação** | Checkout Preview funcional com URLs HTTPS corretas |

---

## 4. ASAAS_WEBHOOK_ACCESS_TOKEN

| Campo | Detalhe |
|-------|---------|
| **Onde obter** | [sandbox.asaas.com](https://sandbox.asaas.com) → **Integrações** → **Webhooks** → campo **Token de autenticação** (você define a string) |
| **Onde configurar** | Vercel → **Environment Variables** → `ASAAS_WEBHOOK_ACCESS_TOKEN` → **Preview** → mesmo valor do painel Asaas → **Redeploy** |
| **Como validar** | POST sem header → **401** · POST com `asaas-access-token: {token}` → **200** |
| **Tempo** | 5–8 min |
| **Risco** | Baixo — token divergente bloqueia sincronização de pagamentos |
| **Responsável** | Usuário, Asaas, Vercel |
| **Automatizável** | **NÃO** |
| **Critério de aprovação** | Webhook aceita token correto; rejeita sem token |

---

## 5. Webhook Sandbox

| Campo | Detalhe |
|-------|---------|
| **Como configurar** | Asaas sandbox → **Webhooks** → **Adicionar** |
| **URL** | `https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app/api/webhooks/asaas` |
| **Token** | Igual `ASAAS_WEBHOOK_ACCESS_TOKEN` no Vercel |
| **Eventos** | `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` (se listado), `PAYMENT_REFUNDED` |
| **API Key Preview** | Confirmar `ASAAS_API_KEY` sandbox (`$aact_` **sem** `prod`) no Vercel Preview |
| **Como testar** | Pagamento sandbox no checkout **OU** enviar evento teste no painel Asaas |
| **Como confirmar recebimento** | Asaas webhook log **HTTP 200** · Vercel Logs `/api/webhooks/asaas` **200** · Payment/Appointment no banco · agendamento em Minha Conta |
| **Tempo** | 10–15 min |
| **Risco** | Médio — Protection ativa ou URL errada = falha silenciosa |
| **Responsável** | Usuário, Asaas, Vercel |
| **Automatizável** | PARCIAL — replay via Cursor possível; registro no painel = manual |
| **Critério de aprovação** | Webhook HTTP 200; pagamento sincronizado no banco Preview |

---

## 6. Smoke Test Preview

**Pré-requisitos:** itens 1–5 concluídos · Preview acessível sem SSO.

### Roteiro exato

| # | Etapa | Ação | Aprovação |
|---|-------|------|-----------|
| 1 | **Registro** | `POST /api/registro` (payload completo: nomeCompleto, cpf, email, senha, telefone, etc.) | HTTP 200 + `Set-Cookie: session_id` |
| 2 | **Auto-login** | `GET /api/me` com cookie da etapa 1 | `user.email` = email registrado |
| 3 | **Minha Conta** | `GET /api/meus-dados` + `GET /minha-conta` | API **200**; página **200** |
| 4 | **Carrinho** | `POST /api/conta/update` (CPF) → montar item sessão → `POST /api/asaas/checkout-carrinho` | Checkout **200**; `initPoint` contém `sandbox.asaas.com` |
| 5 | **Checkout** | Abrir `initPoint` no browser; pagar com cartão sandbox Asaas | Pagamento confirmado no painel Asaas |
| 6 | **Webhook** | Aguardar webhook automático (ver log Asaas) | Histórico webhook **HTTP 200** |
| 7 | **Minha Conta** | `GET /api/meus-dados` | Agendamento/pagamento visível |

### Comandos automatizados (etapas 1–4)

```powershell
cd C:\Users\raulv\Documents\projetos\meu-site-produtor
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'
$env:BASE_URL='https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app'
node scripts/ex01-local-smoke.js
```

Fluxo financeiro completo (após checkout manual ou com IDs conhecidos):

```powershell
$env:BASE_URL='https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app'
node scripts/ex02-financial-flow.js
```

| Campo | Detalhe |
|-------|---------|
| **Tempo** | 15–25 min |
| **Risco** | Baixo após infra OK |
| **Responsável** | Cursor, Usuário |
| **Automatizável** | PARCIAL — etapas 1–4 e 7 via script; pagamento browser manual |
| **Critério de aprovação** | `ex01-local-smoke.js` → `success: true`; webhook 200; agendamento em Minha Conta |

---

## Sequência completa até Deploy de Produção

| # | Tarefa | Responsável | Tempo |
|---|--------|-------------|-------|
| 1 | Desabilitar Deployment Protection (Preview) | Usuário, Vercel | 3–5 min |
| 2 | Confirmar `DATABASE_URL` Preview no Vercel (Neon) | Usuário, Neon, Vercel | 3 min |
| 3 | `npx prisma migrate deploy` banco Preview | Cursor, Usuário | 5–10 min |
| 4 | `NEXT_PUBLIC_SITE_URL` Preview + redeploy | Usuário, Vercel | 5–7 min |
| 5 | Confirmar `ASAAS_API_KEY` sandbox Preview | Usuário, Asaas, Vercel | 3 min |
| 6 | `ASAAS_WEBHOOK_ACCESS_TOKEN` no Vercel Preview | Usuário, Asaas, Vercel | 5–8 min |
| 7 | Registrar webhook sandbox → Preview URL | Usuário, Asaas | 5 min |
| 8 | Redeploy Preview (se env alterada) | Vercel, Usuário | 2–4 min |
| 9 | **Smoke Test Preview F2 completo** | Cursor, Usuário | 15–25 min |
| 10 | Merge PR `pr03-clean` → `main` | Usuário, GitHub | 5 min |
| 11 | Env **Production**: DB Neon prod, Asaas prod, `NEXT_PUBLIC_SITE_URL` domínio real | Usuário, Vercel, Neon, Asaas | 15–20 min |
| 12 | `prisma migrate deploy` banco Production | Cursor, Usuário | 5–10 min |
| 13 | Webhook Asaas **produção** → domínio real | Usuário, Asaas | 5 min |
| 14 | Deploy Production (auto pós-merge) | Vercel, GitHub | 3–5 min |
| 15 | Smoke mínimo Production | Usuário | 10 min |
| 16 | Reativar Deployment Protection Preview (opcional) | Usuário, Vercel | 2 min |

**Tempo estimado:** Preview 45–75 min · até Produção 90–130 min

---

## Veredito

**Plano operacional pronto** — relatório em `reports/domain-guardian/go02-infrastructure-execution-plan.json`
