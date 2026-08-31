# THouse Rec — System Health

**Versão:** 1.0.0 · **Gerado:** GO-04A

Referência rápida para diagnóstico operacional. Valores de secrets nunca aparecem neste documento.

---

## Arquitetura geral

Next.js 16 (App Router) → API Routes → Prisma → PostgreSQL (Neon). Pagamentos via Asaas. Hosting Vercel. Emails via Gmail SMTP.

Ver diagrama completo em [architecture/v1.0-overview.md](architecture/v1.0-overview.md).

---

## Serviços externos

| Serviço | Função | Health check |
|---------|--------|--------------|
| **Asaas** | Cobrança, webhook, reembolso | `GET /api/webhooks/asaas` sem token → 401 |
| **Neon** | PostgreSQL | `npx prisma migrate status` |
| **Vercel** | Deploy, env, SSL | Dashboard → último deploy Ready |
| **Gmail SMTP** | Emails transacionais | `npm run launch01:certify` (ressalva SMTP) |

---

## Variáveis obrigatórias (Production)

| Variável | Obrigatória |
|----------|-------------|
| `DATABASE_URL` | Sim |
| `ASAAS_API_KEY` | Sim |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Sim |
| `NEXT_PUBLIC_SITE_URL` | Sim (https://www.thouse-rec.com.br) |
| `SESSION_SECRET` | Sim |
| `GMAIL_USER` | Sim |
| `GMAIL_APP_PASSWORD` | Sim |
| `GO_LIVE_MAINTENANCE_MODE` | Operação (0 ou 1) |

---

## Comandos úteis

```bash
npm run dev
npm run build
npm run workflow:smoke
npm run go04:certify
```

---

## Comandos de auditoria

```bash
npm run domain:audit
npm run workflow:audit
npm run sync:audit
npm run sim:audit
npm run exec:audit
npm run graph:audit
npm run discovery:audit
npm run regression:audit
```

---

## Comandos de simulação

```bash
npm run sim:list
npm run sim:run -- --id SIM-001
npm run sim:batch
npm run sim:batch:sim02
npm run sim:cleanup
```

---

## Comandos de certificação

```bash
npm run rc:certify
npm run rc02:certify
npm run rc03:certify
npm run rc04:certify
npm run launch01:certify
```

---

## Comandos de release

```bash
npm run go01:orchestrate
npm run go02:assemble
npm run go03:execute
npm run go04:certify
```

---

## Comandos de reset

```bash
npm run launch01:reset                    # dry-run
npm run launch01:reset -- --execute --confirm-local
npm run golive:cleanup                    # homolog @homolog.test apenas
```

---

## Diagnóstico: pagamentos

1. Verificar `ASAAS_API_KEY` em Vercel Production
2. Checkout retorna link Asaas? → logs `/api/asaas/checkout-*`
3. `PaymentMetadata` criado antes do redirect?
4. Após pagar: webhook `PAYMENT_RECEIVED` no painel Asaas
5. Banco: `Payment.status = approved`, `Appointment` vinculado

**Sintoma "paguei e não apareceu":** webhook não processou → ver webhook + logs Vercel.

---

## Diagnóstico: webhook

1. URL: `https://www.thouse-rec.com.br/api/webhooks/asaas`
2. Header: `asaas-access-token` = `ASAAS_WEBHOOK_ACCESS_TOKEN`
3. Probe sem token → deve retornar 401 (esperado)
4. Logs Asaas → entregas falhadas

---

## Diagnóstico: SMTP

1. `GMAIL_USER` + `GMAIL_APP_PASSWORD` em Vercel
2. Testar rota `/testar-email` (admin) se habilitada
3. Logs de `send*Email` em checkout/webhook

---

## Diagnóstico: sincronização

```bash
npm run sync:audit
```

- Tabela `SynchronizationEvent` com cursor monotônico
- SSE em `DomainSyncProvider` (browser)
- Verificar `userId` + `scope` nos eventos

---

## Diagnóstico: workflow / state machine

```bash
npm run workflow:audit
```

- Transições via `src/app/lib/workflow/`
- Histórico em `DomainTransitionHistory`
- Status canônicos de Appointment e Service

---

## Diagnóstico: simulation

```bash
npm run sim:audit
npm run sim:batch
```

- Somente `@homolog.test` e ambiente não-production
- 10 cenários SIM-01 + SIM-02

---

## Diagnóstico: execution

```bash
npm run exec:audit
npm run te:run -- --list
```

- Bloqueado em Production (EC-01)
- Requer ADMIN ou CLI secret

---

## Diagnóstico: build

```bash
npx tsc --noEmit -p tsconfig.json
npx prisma validate
node --use-system-ca ./node_modules/next/dist/bin/next build
```

Windows: TLS Google Fonts pode exigir `--use-system-ca`.

---

## Diagnóstico: deploy

1. Vercel → Deployments → Production
2. Build command: `prisma generate && next build`
3. Env vars completas
4. `prisma migrate deploy` pós-deploy (Neon)

---

## Diagnóstico: migrations

```bash
npx prisma migrate status
npx prisma migrate deploy   # produção
```

33 migrations esperadas. HS-01 falha se CPF duplicado.
