# PROD-02 — Fechamento da Produção

**URL:** https://meu-site-produtor-13.vercel.app · **Commit:** `7057b13` · **Data:** 2026-07-11

---

## Bloqueadores

### 1. `NEXT_PUBLIC_SITE_URL` — **PENDENTE**

| Campo | Valor |
|-------|--------|
| Valor no deploy ativo | `http://localhost:3000` ❌ |
| Valor esperado | `https://meu-site-produtor-13.vercel.app` |
| Newline | não |
| Redeploy após corrigir | **obrigatório** |

**Ação:** Vercel → `meu-site-produtor-1.3` → Settings → Environment Variables → **Production** → corrigir → Save → Redeploy

---

### 2. `ASAAS_WEBHOOK_ACCESS_TOKEN` — **PENDENTE**

Evidência: `/api/webhooks/asaas` → `"Webhook não configurado"`

---

### 3. `DATABASE_URL` Production — **OK (funcional)**

- URL não exibida (regra de segurança)
- `migrate deploy` não reexecutado nesta sessão (URL indisponível localmente)
- Evidência: registro + `/api/meus-dados` → **200** (banco remoto operacional)

---

### 4. Asaas Produção (www.asaas.com) — **PENDENTE**

Não verificável daqui. Configurar:

- **URL:** `https://meu-site-produtor-13.vercel.app/api/webhooks/asaas`
- **Token:** igual ao Vercel Production

---

### 5. Redeploy Production — **PENDENTE (novo)**

Último deploy RC (sem env corrigida):

| Campo | Valor |
|-------|--------|
| Deployment ID | `5407746993` |
| Commit | `7057b13` |
| Status | success |

Novo redeploy necessário após itens 1 e 2.

---

### 6. Smoke Test Production — **PASS**

| Etapa | Resultado |
|-------|-----------|
| Home | 200 |
| Registro | 200 + cookie |
| Auto-login | ✅ |
| Minha Conta | 200 |
| `/api/meus-dados` | 200 |

Sem pagamento (conforme escopo).

---

## Production pronta para o pagamento real?

**NÃO**

Bloqueadores reais:

1. `NEXT_PUBLIC_SITE_URL` = `localhost:3000`
2. `ASAAS_WEBHOOK_ACCESS_TOKEN` ausente
3. Webhook www.asaas.com não confirmado
4. Redeploy Production após corrigir env vars

---

## O que fazer agora (~15 min)

1. Vercel → Production → `NEXT_PUBLIC_SITE_URL` = `https://meu-site-produtor-13.vercel.app`
2. Vercel → Production → `ASAAS_WEBHOOK_ACCESS_TOKEN` = token do www.asaas.com
3. www.asaas.com → Webhook com mesma URL e token
4. **Redeploy Production**
5. Validar: `/api/pagamentos/debug` → `siteUrl` HTTPS (sem localhost)
6. Validar: webhook sem token → `"Token inválido"` (não `"não configurado"`)

Opcional: `prisma migrate deploy` com `DATABASE_URL` Neon Production no terminal.

---

## Veredito

Código RC em Production ✅ · Smoke básico ✅ · **Pagamento real bloqueado por env vars.**
