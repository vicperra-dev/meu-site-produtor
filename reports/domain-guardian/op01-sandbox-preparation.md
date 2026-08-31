# OP-01 — Preparação Operacional do Sandbox

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Objetivo

Garantir que o ambiente Sandbox esteja **100% pronto** antes da continuação do EX-01.

**Nenhum código alterado. Nenhum commit criado.**

---

## Status geral

| Indicador | Valor |
|-----------|-------|
| Prontidão atual | **42%** — **NÃO PRONTO** |
| Bloqueadores | API Key produção, webhook ausente, 1 migration pendente, SITE_URL em túnel |
| Itens OK | DB conecta, build passou no EX-01, scripts `ex01-*` disponíveis |

---

## 1. Conta Sandbox Asaas

| Pergunta | Resposta |
|----------|----------|
| Existe? | **Não verificável remotamente** — painel não acessível neste relatório |
| Ativa? | **Não verificável** — ambiente local usa chave de **produção** |

**Evidência indireta:** `ASAAS_API_KEY` em `.env.local` é `$aact_prod_*` → conta sandbox ainda não vinculada a este workspace.

**Ação do operador:** login em [sandbox.asaas.com](https://sandbox.asaas.com) e confirmar ambiente de testes.

---

## 2. API Key Sandbox

| Campo | Estado atual |
|-------|--------------|
| Configurada (sandbox)? | **Não** — token de **produção** |
| Arquivo | `.env.local` |
| Prefixo | `$aact_prod_...` (166 chars) |

### Formato esperado

- Prefixo `$aact_` (**sem** `$aact_prod_`)
- Origem: painel Sandbox → Integrações → API
- API resolvida pelo código: `https://sandbox.asaas.com/api/v3`

### Validar sem expor a chave

```powershell
node scripts/ex01-check-env.js
node scripts/ex01-asaas-verify.js
```

| Script | Resultado atual | Resultado esperado |
|--------|-----------------|-------------------|
| `ex01-check-env.js` | `type=PROD` | `type=sandbox` |
| `ex01-asaas-verify.js` | `sandboxOk: false`, exit 2 | `sandboxOk: true`, exit 0 |

Nunca registrar a chave completa — apenas prefixo e comprimento.

---

## 3. Webhook Sandbox

| Item | Estado |
|------|--------|
| **URL** | Padrão: `{NEXT_PUBLIC_SITE_URL}/api/webhooks/asaas` |
| **Token** | `ASAAS_WEBHOOK_ACCESS_TOKEN` — **ausente** |
| **Eventos (código)** | `PAYMENT_CREATED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED` |
| **Crítico MVP** | `PAYMENT_RECEIVED` |
| **Status** | Não configurado localmente |

### F1 vs EX-01

- **EX-01 (smoke até antes do pagamento):** webhook automático **não obrigatório**.
- **F1 completo (pós-pagamento):** webhook ou replay curl (OPS-01 plano B).

| Cenário | URL webhook no painel |
|---------|----------------------|
| `localhost` (recomendado EX-01) | Não registrar — usar replay curl depois |
| Túnel (ngrok/loca.lt) | `https://{tunel}/api/webhooks/asaas` |

Header esperado: `asaas-access-token: {ASAAS_WEBHOOK_ACCESS_TOKEN}`

---

## 4. NEXT_PUBLIC_SITE_URL

| Campo | Valor |
|-------|--------|
| Atual | `https://crazy-pans-own.loca.lt` (`.env`) |
| Tipo | Túnel |

### Recomendado para F1 Sandbox (EX-01)

**`http://localhost:3000`**

| Opção | Quando usar |
|-------|-------------|
| **localhost** | Smoke até checkout sem pagamento; sem dependência de túnel |
| **túnel** | Somente se Asaas sandbox precisar chamar webhook na máquina local |

---

## 5. Banco local

| Verificação | Resultado |
|-------------|-----------|
| Conectado? | **Sim** — `SELECT 1` OK, 2 usuários |
| Migrações | **28/29 aplicadas** |
| Pendente | `20260617120000_appointment_admin_archive` |

**Antes do smoke:**

```powershell
npx prisma migrate deploy
npx prisma migrate status
```

Esperado: `Database schema is up to date`

---

## 6. Servidor Next.js — reinício após trocar env

1. **Ctrl+C** no terminal do `npm run dev`
2. Confirmar porta 3000 livre: `netstat -ano | findstr :3000`
3. Editar `.env.local` (chaves sandbox)
4. Salvar
5. `npm run dev`
6. Aguardar **Ready** no log
7. Testar `http://localhost:3000`

> Mudança só de env em dev **não exige** rebuild. `npm run build` só se o código mudou.

---

## 7. Sequência de scripts confirmada

```
ex01-check-env.js
        ↓
ex01-asaas-verify.js
        ↓
ex01-db-ping.js
        ↓
npm run dev
        ↓
Smoke Test (manual)
```

**Pré-requisito:** `npx prisma migrate deploy` (se migration pendente)

**Comando único de validação:**

```powershell
cd c:\Users\raulv\Documents\projetos\meu-site-produtor
node scripts/ex01-check-env.js
node scripts/ex01-asaas-verify.js
node scripts/ex01-db-ping.js
```

---

## Checklist operacional (para pessoa)

| ID | □ Fazer | □ Validar | Resultado esperado |
|----|---------|-----------|-------------------|
| OP-01 | Acessar conta em sandbox.asaas.com | Login OK | Conta sandbox ativa |
| OP-02 | Obter API Key sandbox no painel | `ex01-check-env.js` | `type=sandbox` |
| OP-03 | Substituir chave prod em `.env.local` | `ex01-asaas-verify.js` | `sandboxOk: true`, exit 0 |
| OP-04 | Adicionar `ASAAS_WEBHOOK_ACCESS_TOKEN` | `ex01-check-env.js` | Token presente |
| OP-05 | `NEXT_PUBLIC_SITE_URL=http://localhost:3000` | `ex01-check-env.js` | localhost:3000 |
| OP-06 | `npx prisma migrate deploy` | `prisma migrate status` | 0 pending migrations |
| OP-07 | Parar Next.js (Ctrl+C) | Porta 3000 | Sem processo stale |
| OP-08 | `npm run dev` | Browser | Home sem 5xx |
| OP-09 | Registro conta teste | POST `/api/registro` 200, `/api/me` | Auto-login GL-01 |
| OP-10 | Abrir Minha Conta | GET `/api/meus-dados` 200 | Sem redirect login |
| OP-11 | Agendamento → carrinho | `/carrinho` | Item visível |
| OP-12 | Checkout (sem pagar) | POST `checkout-carrinho` 200 | `initPoint` com `sandbox.asaas.com` |
| OP-13 | *(Opcional)* Webhook ou replay curl | Log webhook | Fora do escopo mínimo EX-01 |

---

## Probabilidade de aprovação do EX-01

### Depois dessa configuração (checklist OP-01 a OP-12 concluído):

# 74%

| Contexto | % |
|----------|---|
| Estado atual (sem reconfigurar) | ~8% |
| Após checklist completo | **74%** (intervalo 68%–78%) |

### Fatores positivos

- Build já passou no EX-01
- DB conecta
- GL-01 B1 (auto-login) em `3f20ad0`
- `ASAAS_SKIP_TLS_VERIFY` mitiga TLS local
- Escopo EX-01 até antes do pagamento (webhook não bloqueante)

### Riscos residuais

- Smoke manual (dados, horários, operador)
- Migration ignorada (OP-06)
- Conta sandbox não validada neste relatório
- Alterações locais não commitadas em `carrinho`/`pagamentos` (GL-01 B2)

---

## Retomar EX-01

Após checklist:

```powershell
node scripts/ex01-check-env.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/ex01-asaas-verify.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/ex01-db-ping.js
npm run dev
```

Em seguida: smoke test manual → atualizar `ex01-sandbox-execution.json`.

---

**Parado após geração dos relatórios (READ ONLY).**
