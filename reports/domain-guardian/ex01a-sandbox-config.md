# EX-01a — Configuração do Ambiente Sandbox

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Objetivo

Preparar o ambiente local para reexecutar o **EX-01** com segurança, sem chamadas Asaas de produção.

**Nenhum código alterado. Nenhum commit criado.**

---

## 1. Arquivos de ambiente

| Arquivo | Existe | Conteúdo relevante |
|---------|--------|-------------------|
| `.env` | Sim | `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, e-mails de suporte |
| `.env.local` | Sim | `ASAAS_API_KEY` (produção), `ASAAS_SKIP_TLS_VERIFY`, e-mails (duplicados) |
| `.env.example` | **Não** | Ausente no repositório |

**Precedência Next.js:** `.env.local` sobrescreve `.env` para chaves duplicadas.

---

## 2. Variáveis Asaas — classificação

| Variável | Classificação | Onde está | Observação |
|----------|---------------|-----------|------------|
| `ASAAS_API_KEY` | **Produção** | `.env.local` | Prefixo `$aact_prod_*` → API `www.asaas.com` |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | **Ausente** | — | Necessário para webhook seguro |
| `ASAAS_SKIP_TLS_VERIFY` | Local (dev) | `.env.local` = `true` | Não vem do Asaas; só `NODE_ENV !== production` |

**Resumo:** 0 sandbox · 1 produção · 1 ausente · 0 duplicada (Asaas)

### Duplicações não-Asaas

| Variável | Arquivos | Efeito |
|----------|----------|--------|
| `SUPPORT_EMAIL` | `.env` + `.env.local` | Duplicada (mesmo valor) |
| `SUPPORT_EMAIL_PASSWORD` | `.env` + `.env.local` | Duplicada (mesmo valor) |
| `SUPPORT_DEST_EMAIL` | `.env` + `.env.local` | **Conflito** — valores diferentes; `.env.local` prevalece |

---

## 3. Verificação das quatro variáveis core

### `ASAAS_API_KEY`

| Campo | Valor |
|-------|--------|
| Status | Definida |
| Ambiente | **Produção** (`$aact_prod_...`, 166 chars) |
| Arquivo | `.env.local` |
| F1 pronto? | **Não** — exige token sandbox |

### `ASAAS_WEBHOOK_ACCESS_TOKEN`

| Campo | Valor |
|-------|--------|
| Status | **Ausente** |
| F1 pronto? | **Não** (recomendado; opcional com replay curl) |

### `NEXT_PUBLIC_SITE_URL`

| Campo | Valor |
|-------|--------|
| Status | Definida |
| Valor atual | `https://crazy-pans-own.loca.lt` (`.env`) |
| Recomendado F1 | `http://localhost:3000` |
| F1 pronto? | Parcial — túnel só se webhook externo for necessário |

### `DATABASE_URL`

| Campo | Valor |
|-------|--------|
| Status | Definida |
| Provider | PostgreSQL local (`localhost:5432/thouse_rec`) |
| F1 pronto? | **Sim** (validado no EX-01) |

---

## 4. Origem dos valores

### Do painel Sandbox Asaas (`sandbox.asaas.com`)

| O quê | Onde no painel |
|-------|----------------|
| `ASAAS_API_KEY` | Integrações → API / Chave de API (token `$aact_*` **sem** `prod`) |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Integrações → Webhooks → Token de autenticação (`asaas-access-token`) |
| URL do webhook (config no painel) | Integrações → Webhooks → `https://{tunel}/api/webhooks/asaas` **ou** omitir e usar replay curl |

### Permanecem locais (não vêm do Asaas)

| Variável | Valor recomendado F1 |
|----------|---------------------|
| `DATABASE_URL` | Postgres local (já configurado) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `ASAAS_SKIP_TLS_VERIFY` | `true` (opcional, só dev) |
| `SUPPORT_EMAIL*` | SMTP local — irrelevante para Asaas |

---

## 5. Checklist de configuração

- [ ] Criar/acessar conta Sandbox em [sandbox.asaas.com](https://sandbox.asaas.com)
- [ ] Obter API Key Sandbox (`$aact_` sem prefixo `prod`)
- [ ] Obter Webhook Token Sandbox
- [ ] Decidir F1: túnel público **ou** replay curl (LE-F1-003 plano B)
- [ ] Se túnel: registrar Webhook URL `https://{tunel}/api/webhooks/asaas` no painel
- [ ] Remover/substituir `ASAAS_API_KEY` de **produção** em `.env.local`
- [ ] Adicionar `ASAAS_WEBHOOK_ACCESS_TOKEN` em `.env.local`
- [ ] Definir `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [x] Manter `DATABASE_URL` local (já OK)
- [ ] Reiniciar Next.js após editar `.env.local`
- [ ] Validar: `node scripts/ex01-check-env.js`
- [ ] Validar: `node scripts/ex01-asaas-verify.js` (exit 0)
- [x] Validar banco: `node scripts/ex01-db-ping.js` (já OK no EX-01)

### Template sugerido `.env.local` (substituir placeholders manualmente)

```env
# Asaas Sandbox
ASAAS_API_KEY=$aact_SUA_CHAVE_SANDBOX
ASAAS_WEBHOOK_ACCESS_TOKEN=seu_token_webhook_sandbox

# Local F1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ASAAS_SKIP_TLS_VERIFY=true
```

> `DATABASE_URL` pode permanecer em `.env`. **Não commitar** estes arquivos.

---

## 6. Comando para retomar EX-01 (etapa 3)

Após concluir o checklist e **reiniciar** o Next.js:

```powershell
cd c:\Users\raulv\Documents\projetos\meu-site-produtor; node scripts/ex01-check-env.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node scripts/ex01-asaas-verify.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node scripts/ex01-db-ping.js
```

**Resultado esperado:**

- `ASAAS_API_KEY: OK ... type=sandbox`
- `ASAAS_WEBHOOK_ACCESS_TOKEN: OK`
- `ex01-asaas-verify.js` → `sandboxOk: true`, exit code **0**

Se as três validações passarem, continuar EX-01:

1. `npm run dev`
2. Smoke test: Registro → Login → Minha Conta → Agendamento → Carrinho → Checkout (até antes do pagamento)
3. Atualizar `ex01-sandbox-execution.json` com veredito final

---

## Avisos de segurança

1. A `ASAAS_API_KEY` atual é de **produção** — não rodar checkout até substituir.
2. `.env*` está no `.gitignore` — nunca commitar.
3. `ASAAS_SKIP_TLS_VERIFY=true` apenas em desenvolvimento local.

---

## Bloqueador EX-01 (recap)

| Etapa | Erro | Resolução |
|-------|------|-----------|
| 3 — ASAAS Sandbox | Chave produção + webhook ausente | Checklist acima em `.env.local` |
