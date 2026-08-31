# PROD-01 — Merge Controlado da Release Candidate

**Data:** 2026-07-11 · **RC:** `f882047` · **Merge commit:** `7057b13`

---

## FASE 1 — PRÉ-MERGE

**PRÉ-MERGE: APROVADO**

| Check | Resultado |
|-------|-----------|
| `origin/pr03-clean` sincronizada | ✅ `f882047` |
| `origin/main` atualizada | ✅ `fd9ff6d` (pré-merge) |
| GitHub Actions PASS | ✅ run #29140096152 success |
| Último commit RC | ✅ `f882047` |
| Commits pendentes obrigatórios | ✅ nenhum |

---

## FASE 2 — MERGE

**Executado com sucesso.**

| Campo | Valor |
|-------|--------|
| Método | `git merge origin/pr03-clean --no-ff` |
| Merge commit | `7057b13` |
| Push `origin/main` | ✅ |

---

## FASE 3 — DEPLOY

**Vercel iniciou Production Deployment? SIM**

| Campo | Valor |
|-------|--------|
| Projeto | `meu-site-produtor-1.3` |
| Deployment ID | `5407746993` |
| Commit | `7057b13` (inclui RC `f882047`) |
| Status | **success** |
| Alias | https://meu-site-produtor-13.vercel.app |

> Projeto legado `meu-site-produtor` teve deploy `7057b13` **canceled** (padrão histórico). O ativo é **1.3**.

---

## FASE 4 — PRODUCTION ENV

| Variável | Status |
|----------|--------|
| `DATABASE_URL` | NÃO VERIFICÁVEL |
| `ASAAS_API_KEY` (produção) | **OK** |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | NÃO VERIFICÁVEL |
| `NEXT_PUBLIC_SITE_URL` | **PENDENTE** (`localhost:3000` no deploy ativo) |

---

## FASE 5 — MIGRATIONS

**Não executado** no banco Production (URL Neon indisponível aqui).

**Ação necessária:**

```powershell
$env:DATABASE_URL="<url_neon_production>"
npx prisma migrate deploy
```

---

## FASE 6 — GO LIVE CHECK

**Sistema pronto para Smoke Test? NÃO**

Bloqueadores reais:

1. `NEXT_PUBLIC_SITE_URL` Production → corrigir para `https://meu-site-produtor-13.vercel.app` + redeploy
2. `prisma migrate deploy` no Neon Production
3. `ASAAS_WEBHOOK_ACCESS_TOKEN` Production + webhook www.asaas.com
4. Redeploy Production após env vars

---

## Próximos passos (ordem)

### 1. Vercel → Production env (~10 min)

| Variável | Valor |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://meu-site-produtor-13.vercel.app` |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | token do painel **www.asaas.com** |

Confirmar `DATABASE_URL` e `ASAAS_API_KEY` (`$aact_prod_`) já existem.

### 2. Migrations (~5 min)

```powershell
$env:DATABASE_URL="<neon_production>"
npx prisma migrate deploy
```

### 3. Asaas produção (~5 min)

- www.asaas.com → Webhooks  
- URL: `https://meu-site-produtor-13.vercel.app/api/webhooks/asaas`  
- Token = mesmo do Vercel Production  

### 4. Redeploy Production

Vercel → Deployments → Production → **Redeploy**

### 5. Smoke Production (~10 min)

Home → login → Minha Conta → checkout

---

## Veredito

| Fase | Resultado |
|------|-----------|
| Pré-merge | ✅ APROVADO |
| Merge | ✅ CONCLUÍDO |
| Deploy Production | ✅ SUCCESS (`7057b13`) |
| Go-live | ⛔ **3 env vars + migrate + smoke** |

**Merge da RC concluído. Production recebeu o código. Falta alinhar env Production para smoke.**
