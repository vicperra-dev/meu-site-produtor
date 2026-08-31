# PV-02 — Homologação Completa do Preview

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` @ `f882047` · **Data:** 2026-07-11

**Nenhuma alteração de código. Nenhum commit.**

---

## Preview Deployment

| Campo | Valor |
|-------|--------|
| SHA | `f882047` |
| URL oficial (GitHub/Vercel) | `https://meu-site-produtor-13-176nozk2j-rauls-projects-6bf8a8b0.vercel.app` |
| Ambiente | Preview - meu-site-produtor-1.3 |

---

## Resultado

### Preview aprovado?

**NÃO**

Homologação **interrompida na Etapa 1**.

| Campo | Valor |
|-------|--------|
| **Etapa** | **1 — Abrir URL Preview** |
| **Erro** | HTTP **302** → redirecionamento para **Vercel SSO** (`vercel.com/sso-api`) — **Deployment Protection** ativo na URL oficial do Preview |
| **Menor correção** | Vercel → **Settings → Deployment Protection**: desabilitar proteção para **Preview** ou configurar **bypass token** (`VERCEL_AUTOMATION_BYPASS_SECRET`) para homologação F2 |

---

## Evidências coletadas (URL alternativa acessível)

Teste complementar em `https://meu-site-produtor-13.vercel.app` (alias público, sem SSO):

| Etapa | Resultado |
|-------|-----------|
| Home | PASS (200) |
| Registro | PASS (200) |
| Login automático pós-registro | **FAIL** — cookie `session_id` ausente em `/api/registro` |
| Login manual | PASS (200) |
| Minha Conta (`/api/meus-dados`) | **FAIL** — **500** `{"error":"Erro ao buscar dados"}` |
| Agendamento → Checkout → Pagamento | Não executado (parada anterior) |
| Webhook automático | Não testado |

### Achados adicionais (pós-correção da Etapa 1)

| Etapa | Erro | Menor correção |
|-------|------|----------------|
| 3 | Auto-login pós-registro falha no deploy | Verificar `createUserSession` / `Set-Cookie` em `/api/registro` no Vercel |
| 4 | `/api/meus-dados` → 500 | `prisma migrate deploy` no banco do `DATABASE_URL` Preview (migration `adminArchivedAt` — mesmo fix de EX-01 local) |
| 7 | Webhook não validado | Registrar webhook Asaas sandbox → `{preview}/api/webhooks/asaas` + `ASAAS_WEBHOOK_ACCESS_TOKEN` no Vercel Preview |

---

## Veredito

**PV-02 REPROVADO**

Release **não** está pronta para merge até homologação F2 no Preview acessível.

**LCS:** 88 (inalterado — bloqueio operacional Preview, não regressão de código RC)
