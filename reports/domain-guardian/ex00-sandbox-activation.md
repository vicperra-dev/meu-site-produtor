# EX-00 — Ativação do Sandbox Asaas

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Veredito

# EX-00 APROVADO

O projeto está **apto a reexecutar EX-01 e EX-02**.

---

## Alterações em `.env.local`

| Variável | Ação |
|----------|------|
| `ASAAS_API_KEY` | Substituída por token **sandbox** (`$aact_hmlg_...`) |
| `NEXT_PUBLIC_SITE_URL` | Definido `http://localhost:3000` |
| `ASAAS_SKIP_TLS_VERIFY` | Mantido `true` |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | **Permanece ausente** |

Nenhum código alterado. Nenhum commit criado.

---

## Resultado dos scripts

### `node scripts/ex01-check-env.js`

| Campo | Valor |
|-------|--------|
| **exit code** | **0** |
| DATABASE_URL | OK (local) |
| ASAAS_API_KEY | OK **type=sandbox** |
| NEXT_PUBLIC_SITE_URL | OK (`localhost:3000`) |
| webhook | **MISSING** |

### `node scripts/ex01-asaas-verify.js`

| Campo | Valor |
|-------|--------|
| **exit code** | **0** |
| **environment** | **SANDBOX** |
| **sandboxOk** | **true** |
| apiUrl | `https://sandbox.asaas.com/api/v3` |

### `node scripts/ex01-db-ping.js`

| Campo | Valor |
|-------|--------|
| **exit code** | **0** |
| **database** | **OK** (`SELECT 1`, 2 usuários) |

---

## Resumo

| Item | Status |
|------|--------|
| environment | **SANDBOX** |
| sandboxOk | **true** |
| database | **OK** |
| webhook | **AUSENTE** (informado; não bloqueou EX-00) |
| dev server | `npm run dev` — Ready em `http://localhost:3000` |

---

## Webhook

`ASAAS_WEBHOOK_ACCESS_TOKEN` **permanece ausente**.

- EX-01 (smoke até checkout): não bloqueante
- EX-02 (pagamento + webhook): configurar token do painel sandbox ou usar replay curl (SETUP-01)

---

## Próximos passos

1. **EX-01** — retomar da etapa 3 (scripts já passam)
2. **EX-02** — fluxo completo após EX-01 aprovado

---

**Parado após geração dos relatórios.**
