# EX-02 — Execução Completa do Fluxo Sandbox

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Veredito

# Fluxo Sandbox — REPROVADO

Execução **interrompida na etapa 2** (Verificar Sandbox).

---

## Falha bloqueante

| Campo | Valor |
|-------|--------|
| **Etapa** | 2 — Verificar Sandbox |
| **Erro** | `ex01-asaas-verify.js` exit **2** — `environment: PRODUCTION`, `sandboxOk: false`. Etapa 1: `ASAAS_API_KEY type=PROD`, `ASAAS_WEBHOOK_ACCESS_TOKEN: MISSING` |
| **Causa provável** | Credenciais sandbox não aplicadas em `.env.local` após SETUP-01. Chave de produção (`$aact_prod_*`) ainda ativa. EX-01 anterior **REPROVADA** pela mesma causa. |
| **Menor correção** | Seguir `setup01-asaas-guide.md`: API Key sandbox + Webhook token em `.env.local`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, reiniciar `npm run dev`, validar scripts até exit 0. |
| **Impacto** | Cobrança sandbox, pagamento teste e webhook não executados. Etapas 4–8 canceladas. Risco de produção se checkout fosse invocado. |

---

## Pré-requisitos

| Pré-requisito | Status |
|---------------|--------|
| EX-01 APROVADO | **Não** (EX-01 REPROVADA) |
| ASAAS_API_KEY = Sandbox | **Não** (`type=PROD`) |
| ASAAS_WEBHOOK_ACCESS_TOKEN | **Não** (ausente) |
| DATABASE_URL válido | **Sim** |
| npm run build = OK | **Sim** (EX-01) |
| npm run dev em execução | **Não** |

---

## Etapas executadas

| # | Etapa | Status | Tempo | Evidência |
|---|--------|--------|-------|-----------|
| 1 | Verificar ambiente | **FAIL** | ~5s | `ASAAS_API_KEY type=PROD`; `WEBHOOK MISSING`; DB OK |
| 2 | Verificar Sandbox | **FAIL** | ~9s | `sandboxOk: false`, exit 2, `PRODUCTION` |
| 3 | Verificar Banco | PASS | ~9s | `SELECT 1` OK, 2 usuários |
| 4 | Jornada completa | Não executada | — | Bloqueado etapa 2 |
| 5 | initPoint / paymentId / Metadata | Não executada | — | Bloqueado etapa 2 |
| 6 | Pagamento Sandbox | Não executada | — | Bloqueado etapa 2 |
| 7 | Webhook / replay | Não executada | — | Bloqueado etapa 2 |
| 8 | Validação Payment/Appointment/Service/… | Não executada | — | Bloqueado etapa 2 |

### Evidência etapa 1

```
DATABASE_URL: OK set len=70 provider=local
ASAAS_API_KEY: OK set len=166 type=PROD
NEXT_PUBLIC_SITE_URL: OK set len=30
ASAAS_WEBHOOK_ACCESS_TOKEN: MISSING
```

### Evidência etapa 2

```json
{
  "environment": "PRODUCTION",
  "apiUrl": "https://www.asaas.com/api/v3",
  "sandboxOk": false
}
```

Exit code: **2**

### Evidência etapa 3

```
DATABASE_CONNECT: OK [{"ok":1}]
USER_COUNT: 2
```

---

## Primeiro ponto onde o fluxo deixou de ser automático

**Configuração manual das credenciais Sandbox no `.env.local`**

Antes de qualquer jornada automatizada (registro → pagamento → webhook), o operador precisa:

1. Obter API Key e Webhook token no painel [sandbox.asaas.com](https://sandbox.asaas.com)
2. Editar `.env.local` (remover chave `$aact_prod_*`)
3. Reiniciar `npm run dev`

Sem isso, a etapa 2 falha e o EX-02 não pode prosseguir.

Referência: `reports/domain-guardian/setup01-asaas-guide.md`

---

## Configuração alterada nesta execução

**Nenhuma.** Credenciais sandbox válidas não estavam disponíveis nesta sessão; alterar `.env.local` sem chave do painel não resolveria a etapa 2.

---

## Próxima ação

1. Concluir SETUP-01 (checklist completo)
2. Validar:

```powershell
node scripts/ex01-check-env.js
node scripts/ex01-asaas-verify.js
node scripts/ex01-db-ping.js
```

3. `npm run dev`
4. **Reexecutar EX-02** do passo 1

---

**Parado após geração dos relatórios.**
