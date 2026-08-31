# GO-01 — Fechamento das Pendências de Infraestrutura

**Modo:** EXECUÇÃO CONTROLADA · **Alvo:** `pr03-clean` @ `f882047` · **Data:** 2026-07-11

**Sem commits. Sem alteração de código.**

---

## Resultado por item

| # | Item | Status |
|---|------|--------|
| 1 | Deployment Protection | **PENDENTE** |
| 2 | Preview Deployment (`pr03-clean` @ `f882047`) | **OK** |
| 3 | Banco Preview (`DATABASE_URL` + `migrate deploy`) | **PENDENTE** |
| 4 | `NEXT_PUBLIC_SITE_URL` | **PENDENTE** |
| 5 | ASAAS (Sandbox + Webhook Token + Webhook URL) | **PENDENTE** |
| 6 | Teste mínimo (Registro → Auto-login → Minha Conta → `/api/meus-dados`) | **PENDENTE** |

---

## 1. Deployment Protection — PENDENTE

**Evidência:** URL oficial do Preview → **HTTP 302** → `vercel.com/sso-api`

```
https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app
```

**Ação:** Vercel → Settings → Deployment Protection → desabilitar para **Preview** (ou configurar bypass `VERCEL_AUTOMATION_BYPASS_SECRET`).

---

## 2. Preview Deployment — OK

| Campo | Valor |
|-------|--------|
| SHA | `f882047` |
| Deployment ID | `5400838403` |
| Environment | Preview – meu-site-produtor-1.3 |
| GitHub status | **success** — Deployment has completed |
| Data | 2026-07-11T04:45:46Z |

O Preview **está executando** `pr03-clean` @ `f882047`. O bloqueio é de **acesso** (SSO), não de deploy.

---

## 3. Banco Preview — PENDENTE

| Verificação | Resultado |
|-------------|-----------|
| `DATABASE_URL` confirmado | Não (valor apenas no Vercel/Neon) |
| `npx prisma migrate deploy` | Não executado nesta sessão |
| Evidência de problema | `/api/meus-dados` → **500** (`adminArchivedAt` ausente) |
| Local | 29 migrations — up to date |

**Ação:**

```powershell
$env:DATABASE_URL="<url_neon_preview>"
npx prisma migrate deploy
```

---

## 4. NEXT_PUBLIC_SITE_URL — PENDENTE

| Ambiente | Valor |
|----------|--------|
| Local | `http://localhost:3000` |
| Preview esperado | `https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app` |
| Confirmado no Preview | Não |

**Ação:** Vercel → Environment Variables → **Preview** → `NEXT_PUBLIC_SITE_URL` = URL HTTPS do deployment.

---

## 5. ASAAS — PENDENTE

| Subitem | Status |
|---------|--------|
| API Sandbox | **PENDENTE** — não verificável no Preview (SSO) |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | **PENDENTE** — não confirmado no Vercel Preview |
| Webhook URL | **PENDENTE** — registrar `https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app/api/webhooks/asaas` no Asaas sandbox |

---

## 6. Teste mínimo — PENDENTE

**URL oficial (Preview RC):** bloqueada por Deployment Protection — teste **não executável**.

**Alias público** (`meu-site-produtor-13.vercel.app`) — produção, **não** Preview RC:

| Etapa | Resultado |
|-------|-----------|
| Registro | PASS (200) |
| Auto-login | **FAIL** — sem `Set-Cookie` em `/api/registro` |
| Minha Conta (página) | PASS (200) |
| `/api/meus-dados` | **FAIL** (500) |

Script: `ex01-local-smoke.js` com `BASE_URL` no alias — parou na etapa 3.

---

## Pendências restantes

**5**

| Item pendente | Menor correção |
|---------------|----------------|
| Deployment Protection | Desabilitar SSO no Preview |
| Banco + migrations | `DATABASE_URL` Preview + `prisma migrate deploy` |
| `NEXT_PUBLIC_SITE_URL` | Atualizar no Vercel Preview |
| ASAAS | Token + webhook sandbox apontando para URL Preview |
| Teste mínimo | Executar na URL oficial após itens 1–4 |

---

## Veredito

**REPROVADO** — deploy RC confirmado; homologação final bloqueada por infraestrutura operacional.

**LCS:** 88
