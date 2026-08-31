# PV-02a — Alinhamento do Ambiente Preview

**Modo:** EXECUÇÃO CONTROLADA · **Alvo:** `pr03-clean` @ `f882047` · **Data:** 2026-07-11

**Sem commits. Sem alteração de código.**

---

## Limitação desta execução

Vercel CLI **não autenticado** neste ambiente (`VERCEL_TOKEN` ausente). **`DATABASE_URL` do Preview** não está disponível localmente. Diagnóstico completo; **alterações de ambiente no Vercel requerem ação manual** no painel ou token de API.

---

## 1. Deployment Protection

| Pergunta | Resposta |
|----------|----------|
| **Ativa?** | **SIM** |

**Evidência:** URL oficial do Preview (`meu-site-produtor-13-176nozk2j-...vercel.app`) → **HTTP 302** → `vercel.com/sso-api`

**Desabilitada nesta execução?** Não (sem acesso Vercel)

**Menor correção:** Vercel → **Settings → Deployment Protection** → desabilitar para **Preview** (ou configurar bypass token)

---

## 2. Variáveis Preview vs Local

| Variável | Local homologado | Preview (esperado) | Status |
|----------|------------------|--------------------|--------|
| `DATABASE_URL` | `localhost:5432/thouse_rec` | PostgreSQL remoto (Neon/staging) | Não verificável — **migrate pendente no remoto** |
| `ASAAS_API_KEY` | Sandbox `$aact_hmlg_` | Sandbox | Provável OK (checkout sandbox funcionou) |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Ausente | Obrigatório F2 | Provável ausente |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://{preview}.vercel.app` | Provável desalinhado |
| Session/Cookies | `secure=false` (dev) | `secure=true` (prod) | Padrão OK — sem env SESSION_* |

---

## 3. Banco Preview — `prisma migrate deploy`

| Ambiente | Resultado |
|----------|-----------|
| **Local** | **29 migrations aplicadas** — schema up to date |
| **Preview** | **Não executado** — `DATABASE_URL` Preview indisponível aqui |

**Evidência do problema:** `/api/meus-dados` → **500** no deploy acessível (coluna `adminArchivedAt` ausente — migration `20260617120000_appointment_admin_archive`).

**Menor correção:**

```powershell
$env:DATABASE_URL="<url_do_banco_preview_neon>"
npx prisma migrate deploy
```

---

## 4. Cookies — `/api/registro` sem `session_id`

| Pergunta | Resposta |
|----------|----------|
| **Configuração ou Código?** | **Código** (versão deployada) |

**Evidência:**

- `/api/login` → retorna `Set-Cookie: session_id=...`
- `/api/registro` → **200 sem Set-Cookie** no mesmo deploy
- **`main` @ `fd9ff6d`** não chama `createUserSession` em `registro/route.ts`
- **`pr03-clean`** inclui o fix (QE-01b) — `await createUserSession(user.id)`
- Alias público `meu-site-produtor-13.vercel.app` comporta-se como **produção (main)**, não Preview RC

**Menor correção (ambiente):** Homologar no **Preview `pr03-clean`** após desabilitar Protection — **sem alterar lógica de auth** (fix já está na RC).

---

## 5. Build Preview

| Campo | Valor |
|-------|--------|
| Executado nesta sessão | Não |
| Necessário | **Sim** |
| Motivo | Deploy acessível publicamente não reflete `pr03-clean` @ `f882047` |

**Menor correção:** Confirmar deployment Preview `pr03-clean` Ready após alinhar envs (push RC-04 já feito).

---

## Resposta final

### Ambiente Preview alinhado?

**NÃO**

| Item | Menor correção |
|------|----------------|
| **Deployment Protection** | Desabilitar SSO no Preview (Vercel Settings) |
| **DATABASE_URL + migrations** | Apontar Preview para DB staging + `npx prisma migrate deploy` |
| **NEXT_PUBLIC_SITE_URL** | Definir URL HTTPS do Preview no Vercel |
| **ASAAS_WEBHOOK_ACCESS_TOKEN** | Configurar no Preview + webhook Asaas sandbox |
| **Deploy da RC** | Homologar em Preview `pr03-clean`, não alias de produção `main` |

---

## Checklist manual (Vercel)

1. Deployment Protection → Preview: **OFF** (temporário)
2. Environment Variables → **Preview**: `DATABASE_URL`, `ASAAS_API_KEY` (sandbox), `ASAAS_WEBHOOK_ACCESS_TOKEN`, `NEXT_PUBLIC_SITE_URL`
3. Terminal: `prisma migrate deploy` com `DATABASE_URL` do Preview
4. Deployments → Preview `pr03-clean` @ `f882047` **Ready**
5. Reexecutar **PV-02**

---

## Veredito

**REPROVADO** — alinhamento bloqueado por acesso Vercel/DB remoto; diagnóstico e correções mínimas documentadas.

**LCS:** 88
