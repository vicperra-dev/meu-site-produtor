# EX-01 — Execução Real da Fase F1 (Sandbox)

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Veredito

# F1 Sandbox — REPROVADA

Execução **interrompida na etapa 3** (Verificar ASAAS Sandbox), conforme protocolo **PARAR** ao detectar configuração incompatível com sandbox.

---

## Resumo executivo

| # | Etapa | Status |
|---|--------|--------|
| 1 | Verificar ambiente (.env) | PASS parcial |
| 2 | Verificar DATABASE_URL | PASS |
| 3 | Verificar ASAAS Sandbox | **FAIL** |
| 4 | Prisma Generate | PASS |
| 5 | `npm run build` | PASS |
| 6 | Subir aplicação | Não executado (bloqueado) |
| 7 | Smoke test | Não executado (bloqueado) |
| 8 | Evidências | Parcial (env/DB/build apenas) |

---

## Falha bloqueante (etapa 3)

| Campo | Valor |
|-------|--------|
| **Etapa** | 3 — Verificar ASAAS Sandbox |
| **Erro** | `ASAAS_API_KEY` é token de **produção** (`$aact_prod_*`). `sandboxOk=false`. `ASAAS_WEBHOOK_ACCESS_TOKEN` ausente. |
| **Causa provável** | Chave Asaas de produção em `.env`/`.env.local`. O `AsaasProvider` em `payment-providers.ts` usa `www.asaas.com` quando o prefixo é `$aact_prod_`, independente de `NODE_ENV`. |
| **Menor correção** | Em `.env.local`: (1) `ASAAS_API_KEY` = token sandbox do painel Asaas; (2) `ASAAS_WEBHOOK_ACCESS_TOKEN` = token do webhook sandbox; (3) `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. |
| **Impacto** | Qualquer checkout chamaria API **produção** (cobrança real). Smoke test e homologação F1 não podem prosseguir com segurança. Passos 6–8 cancelados. |

---

## Evidências por etapa

### 1 — Ambiente (.env)

- Arquivos `.env` e `.env.local` presentes.
- `DATABASE_URL`: OK (provider local, 70 chars).
- `ASAAS_API_KEY`: definida, tipo **PRODUCTION** (`$aact_prod_...`).
- `NEXT_PUBLIC_SITE_URL`: `https://crazy-pans-own.loca.lt` (túnel; não `localhost:3000`).
- `ASAAS_WEBHOOK_ACCESS_TOKEN`: **ausente**.
- Script: `scripts/ex01-check-env.js`

### 2 — DATABASE_URL

```
DATABASE_CONNECT: OK [{"ok":1}]
USER_COUNT: 2
```

- Script: `scripts/ex01-db-ping.js`
- Prisma Client conectou com sucesso ao banco local.

### 3 — ASAAS Sandbox

```json
{
  "environment": "PRODUCTION",
  "apiUrl": "https://www.asaas.com/api/v3",
  "sandboxOk": false
}
```

- Script: `scripts/ex01-asaas-verify.js` (exit code 2)
- Ping TLS não conclusivo no ambiente Node local; classificação por prefixo do token alinha com o código da aplicação.

### 4 — Prisma Generate

```
✔ Generated Prisma Client (v5.19.0) in 447ms
```

### 5 — npm run build

```
▲ Next.js 16.1.6 (Turbopack)
✓ Compiled successfully in 2.8min
Running TypeScript ... OK
exit_code: 0
elapsed: ~302s
```

Rotas relevantes presentes no build: `/registro`, `/login`, `/minha-conta`, `/carrinho`, `/pagamentos`, `/api/asaas/checkout-carrinho`, `/api/webhooks/asaas`.

### 6–7 — App + Smoke test

**Não executados** — bloqueio por etapa 3 (evitar chamadas Asaas produção).

Fluxo planejado (não realizado):

```
Registro → Login → Minha Conta → Agendamento → Carrinho → Checkout (até antes do pagamento)
```

---

## Restrições

| Restrição | Cumprida |
|-----------|----------|
| Não executar produção | Sim — checkout/smoke não rodados |
| Não alterar lógica financeira | Sim — nenhuma alteração de código de pagamento |
| Corrigir só bloqueadores F1 | N/A — correção é de configuração (.env), não aplicada nesta execução |

---

## Próxima execução EX-01

1. Configurar `.env.local` com Asaas **sandbox** + webhook token + `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
2. Reexecutar a partir do passo 3
3. `npm run dev` → smoke test manual ou via script até checkout (sem pagar)
4. Atualizar este relatório com veredito **APROVADA** se todos os passos passarem

---

## Artefatos auxiliares

- `scripts/ex01-check-env.js`
- `scripts/ex01-db-ping.js`
- `scripts/ex01-asaas-verify.js`
