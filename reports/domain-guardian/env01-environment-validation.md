# ENV-01 — Validação Final do Ambiente Local

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

**Nenhum arquivo alterado. Nenhum commit.**

---

## 1. Arquivo `.env.local`

**Existe?** **SIM**

---

## 2. Variáveis presentes

| Variável | Status |
|----------|--------|
| □ `DATABASE_URL` | **PRESENTE** (via `.env`; ausente em `.env.local`) |
| □ `ASAAS_API_KEY` | **PRESENTE** (`.env.local`) |
| □ `NEXT_PUBLIC_SITE_URL` | **PRESENTE** (`.env.local` + `.env`) |
| □ `ASAAS_WEBHOOK_ACCESS_TOKEN` | **AUSENTE** |

---

## 3. `ASAAS_API_KEY`

**tipo:** **SANDBOX**

(prefixo `$aact_hmlg_`; verificado por `ex01-check-env.js` e `ex01-asaas-verify.js`)

---

## 4. `DATABASE_URL`

**LOCAL**

(PostgreSQL `localhost:5432/thouse_rec` — definido em `.env`)

---

## 5. `NEXT_PUBLIC_SITE_URL`

**LOCALHOST**

(`http://localhost:3000` em `.env.local` — prevalece sobre túnel legado em `.env`)

---

## 6. `ASAAS_API_KEY` também no `.env`?

**NÃO**

`.env` **não** contém `ASAAS_API_KEY`. Em `npm run dev`, apenas `.env.local` fornece a chave. O `env.ts` lê `.env.local` primeiro e depois `.env`; como a chave só existe em `.env.local`, **não há sobrescrita conflitante**. `.env.local` tem precedência sobre `.env` no Next.js.

---

## 7. Existe `.env.production.local`?

**NÃO**

---

## 8. Risco de usar chave errada em desenvolvimento

**BAIXO**

A chave sandbox está isolada em `.env.local` (`$aact_hmlg_`). `.env` não contém `ASAAS_API_KEY`. `NEXT_PUBLIC_SITE_URL` efetivo é localhost. Risco residual: URL de túnel legada ainda listada em `.env` (inativa em dev) e `ASAAS_WEBHOOK_ACCESS_TOKEN` ausente (segurança de webhook, não troca de ambiente Asaas).

---

## 9. Consistência para EX-01

# APROVADO

| Critério EX-01 | OK |
|----------------|-----|
| `DATABASE_URL` local | Sim |
| `ASAAS_API_KEY` sandbox | Sim |
| `NEXT_PUBLIC_SITE_URL` localhost | Sim |
| Webhook | Ausente — **não bloqueia** smoke até checkout |

---

## 10. Tabela final

| Arquivo | Finalidade | Banco | Sandbox | Produção |
|---------|------------|-------|---------|----------|
| **`.env`** | Defaults do projeto (gitignored) | Sim — `DATABASE_URL` local | Não | Não |
| **`.env.local`** | Overrides dev local (maior precedência) | Herda de `.env` | Sim — `ASAAS_API_KEY`, `SITE_URL` localhost | Não |
| **`.env.production.local`** | Overrides locais em `next build/start` prod | N/A (não existe) | N/A | N/A |
| **Variáveis Vercel** | Deploy Preview / Production | Staging ou prod | Preview (F2) | Production — `$aact_prod_*`, HTTPS |

### Quem deve conter o quê

| Credencial | Onde |
|------------|------|
| **Banco local** | `.env` → `DATABASE_URL` |
| **Banco staging/prod** | Vercel (Preview / Production) |
| **Asaas Sandbox** | `.env.local` em dev; Vercel Preview em F2 |
| **Asaas Produção** | **Somente** Vercel Production — nunca em `.env.local` durante sandbox |

---

## Evidência (scripts read-only)

```
ex01-check-env:    exit 0 — type=sandbox, SITE_URL OK, WEBHOOK MISSING
ex01-asaas-verify: exit 0 — environment=SANDBOX, sandboxOk=true
```

---

**Parado após geração dos relatórios.**

Artefatos:

- `reports/domain-guardian/env01-environment-validation.json`
- `reports/domain-guardian/env01-environment-validation.md`
