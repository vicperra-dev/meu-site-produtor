# Relatório — O que foi feito, o que falta, e como ir para Production

**Data:** 2026-07-11 · **RC:** `pr03-clean` @ `f882047`

---

## Por que só consigo criar Preview e não Production com `pr03-clean`?

**Isso é normal.** No Vercel funciona assim:

| Branch | O que o Vercel faz |
|--------|-------------------|
| `pr03-clean` (ou qualquer branch ≠ main) | **Preview** automaticamente |
| `main` (branch de Production) | **Production** automaticamente |

Você **não deploya** `pr03-clean` direto em Production. O fluxo correto é:

```
Homologar no Preview (pr03-clean)  →  Merge em main  →  Vercel deploya Production
```

Tentar "Create Deployment → Production" com branch `pr03-clean` não é o fluxo padrão — e não é necessário. O merge no GitHub é o que dispara Production.

---

## URL correta da homologação RC

Use **sempre** esta URL (deploy `f882047` com tudo funcionando):

```
https://meu-site-produtor-13-558l8y1zx-rauls-projects-6bf8a8b0.vercel.app
```

**Não use** deploys `main` (`2d6w5imkd`) para homologar a RC.

---

## O que foi concluído ✅

| Item | Status | Evidência |
|------|--------|-----------|
| Deployment Protection Preview | ✅ | Preview abre sem SSO |
| DATABASE_URL Neon | ✅ | Registro funciona |
| Migrations (29) | ✅ | `prisma migrate deploy` aplicado |
| Coluna `refundProcessedAt` | ✅ | Corrigido via SQL no Neon |
| `ASAAS_API_KEY` sandbox Preview | ✅ | `asaas: true` |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` Preview | ✅ | Token aceito pelo servidor |
| Webhook Asaas "Thouse-rec" | 🟡 | Ativado no painel |
| Domínio no Asaas sandbox | ✅ | Checkout sandbox passou |
| Smoke EX-01 (etapas 1–10) | ✅ | Registro → checkout sandbox OK |

---

## O que você alterou com sucesso ✅

1. Desabilitou proteção SSO no Preview  
2. Configurou `DATABASE_URL` apontando para Neon  
3. Rodou migrations no banco remoto  
4. Separou `ASAAS_API_KEY` sandbox (Preview) da chave `$aact_prod_` (Production)  
5. Configurou `ASAAS_WEBHOOK_ACCESS_TOKEN` no Vercel Preview  
6. Criou webhook **Thouse-rec** no Asaas sandbox (Ativado)  
7. Cadastrou domínio Vercel no Asaas  
8. Fez deploy da branch `pr03-clean`  

---

## Inconsistência a corrigir (5 min) ⚠️

Pelos seus prints, `NEXT_PUBLIC_SITE_URL` aponta para:

```
f4zevxgo3...vercel.app   ← URL antiga
```

O deploy que **passou no smoke** é:

```
558l8y1zx...vercel.app   ← URL correta
```

**Alinhe tudo para o mesmo host:**

| Onde | Valor |
|------|--------|
| Vercel → `NEXT_PUBLIC_SITE_URL` (Preview) | `https://meu-site-produtor-13-558l8y1zx-rauls-projects-6bf8a8b0.vercel.app` |
| Asaas → Webhook URL | `https://meu-site-produtor-13-558l8y1zx-rauls-projects-6bf8a8b0.vercel.app/api/webhooks/asaas` |
| Asaas → Minha Conta → domínio | `meu-site-produtor-13-558l8y1zx-rauls-projects-6bf8a8b0.vercel.app` |
| Asaas → Token webhook | **igual** ao `ASAAS_WEBHOOK_ACCESS_TOKEN` no Vercel |

→ Save → **Redeploy Preview `pr03-clean`**

---

## O que ainda falta fazer

| Prioridade | Item | Tempo |
|------------|------|-------|
| P0 | Alinhar URLs (acima) + redeploy | 5 min |
| P1 | Pagamento sandbox real + confirmar webhook HTTP 200 | 10 min |
| **P0** | **Merge `pr03-clean` → `main`** | 5 min |
| P0 | Env **Production** no Vercel | 20 min |
| P0 | `prisma migrate deploy` banco Production | 5 min |
| P1 | Smoke Production | 10 min |

---

## Passo a passo — como eu faria o Go Live

### Fase A — Fechar Preview (agora)

1. Corrigir `NEXT_PUBLIC_SITE_URL` → `558l8y1zx`  
2. Corrigir webhook Asaas → mesma URL  
3. Redeploy Preview `pr03-clean`  
4. Abrir Preview → registrar → checkout → pagar sandbox  
5. Asaas → Webhooks → confirmar **HTTP 200**  

### Fase B — Merge (GitHub)

6. Abrir PR: `pr03-clean` → `main`  
   - https://github.com/rvits/meu-site-produtor/compare/main...pr03-clean  
7. Revisar CI verde  
8. **Merge** (squash ou merge commit — sua preferência)  

### Fase C — Production (Vercel + Neon + Asaas)

Após merge, Vercel deploya `main` automaticamente em **Production**.

9. **Vercel → Environment Variables → Production:**

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | connection string Neon **production** |
| `ASAAS_API_KEY` | `$aact_prod_...` (já existe) |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | token do painel **www.asaas.com** |
| `NEXT_PUBLIC_SITE_URL` | `https://meu-site-produtor-13.vercel.app` ou domínio customizado |

10. Terminal:
```powershell
$env:DATABASE_URL="<url_neon_production>"
npx prisma migrate deploy
```

11. **Asaas produção** (www.asaas.com):
- Webhook → `https://{seu-dominio-producao}/api/webhooks/asaas`
- Token = mesmo do Vercel Production

12. **Redeploy Production** (se alterou env vars)

13. Smoke Production: Home → login → Minha Conta → checkout (valor baixo)

---

## Resumo em uma frase

**Preview está pronto.** Você não precisa "deployar pr03 em Production" manualmente — faça **merge em `main`** e configure as env vars de **Production** separadas das de Preview.

---

## Veredito

| Pergunta | Resposta |
|----------|----------|
| Preview RC homologado? | **Sim** (EX-01 PASS; alinhar URL webhook) |
| Pronto para merge? | **Sim** |
| Production deploy agora? | **Não** — só após merge + env Production |

**Release Candidate pronta para merge em main.**
