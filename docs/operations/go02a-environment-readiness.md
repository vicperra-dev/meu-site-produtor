# GO-02A — Financial Smoke Environment Readiness

GO-02A é exclusivamente operacional. Não executa pagamento, refund, webhook financeiro, deploy ou alteração de domínio.

## 1. Preparar o ambiente

1. Escolher explicitamente `sandbox` ou `production`.
2. Confirmar `DATABASE_URL` do ambiente alvo sem expor credenciais.
3. Configurar `NEXT_PUBLIC_SITE_URL` com URL HTTPS pública.
4. Configurar `ASAAS_API_KEY` do mesmo ambiente escolhido.
5. Criar `ASAAS_WEBHOOK_ACCESS_TOKEN` forte e igual no app e painel Asaas.
6. Remover `ASAAS_SKIP_TLS_VERIFY=true` do ambiente do smoke.
7. Manter `STORAGE_PROVIDER=local`.

## 2. Migrations

Ordem obrigatória:

1. Local: `npx prisma migrate status`.
2. Homologação/Preview: backup → restore test → `npx prisma migrate deploy` → `npx prisma migrate status`.
3. Production: repetir somente após Preview validado.
4. Nunca usar `prisma db push` em Preview/Production.

Migration GO-01.1:

`20260718120000_go01_payment_provider_coupon_service`

Ela cobre:

- `Payment.provider`
- `Payment.providerPaymentId` + índices
- `Coupon.serviceId` + índice/FK

Rollback oficial: restaurar o backup pré-migration. SQL reverso somente na condição restrita documentada em `docs/architecture/go01-migrations.md`.

## 3. Webhook (sem chamada financeira)

Painel Asaas:

1. URL: `<NEXT_PUBLIC_SITE_URL>/api/webhooks/asaas`.
2. Token: idêntico a `ASAAS_WEBHOOK_ACCESS_TOKEN`.
3. HTTPS válido e público.
4. Confirmar que o endpoint responde sem enviar evento de pagamento.
5. Confirmar autenticação: token inválido deve ser rejeitado.
6. Registrar evidência dos logs e resposta HTTP.
7. Somente então definir `GO02_CONFIRM_WEBHOOK=1`.

## 4. Backup e restore

1. Criar snapshot gerenciado ou `pg_dump` do banco alvo.
2. Registrar data/hora, tamanho, hash/ID e retenção.
3. Restaurar em instância isolada.
4. Executar `npx prisma migrate status` contra a cópia.
5. Validar contagens e amostras de `User`, `Payment`, `Appointment`, `Service` e `Coupon`.
6. Estimar RTO pela duração medida do restore; não inventar tempo.
7. Somente depois definir `GO02_CONFIRM_BACKUP=1`.

## 5. Auditoria de variáveis

| Variável | Critério |
|---|---|
| `DATABASE_URL` | Presente e aponta ao ambiente alvo |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS pública |
| `ASAAS_API_KEY` | Chave do ambiente declarado |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Presente e igual ao painel |
| `GO02_ASAAS_ENV` | `sandbox` ou `production` |
| `GO02_CONFIRM_BACKUP` | `1` só após restore validado |
| `GO02_CONFIRM_WEBHOOK` | `1` só após URL/token/HTTP validados |
| `GO02_CONFIRM_MIGRATE` | `1` só após `migrate status` sem pendências |
| `GO02_CONFIRM_CHECKLIST` | `1` só após assinatura humana |

## 6. Executar o validator

```powershell
npm run go02:presmoke
```

- `READY`: GO-02 pode ser autorizado por humano.
- `STOP`: resolver cada item listado e repetir apenas o validator.

## 7. Executar GO-02

Somente após `READY` e aprovação humana:

1. Exatamente um pagamento de valor mínimo.
2. Exatamente um cancelamento do Appointment criado.
3. Exatamente um refund financeiro.
4. Comparar Homologation vs Asaas.
5. Executar auditorias pós-smoke.

GO-02A não executa esses passos.

## 8. Rollback

1. Interromper o smoke se surgir divergência.
2. Não repetir pagamento/refund sem justificativa formal.
3. Para app: redeploy da RC anterior.
4. Para migration: restaurar backup pré-migration.
5. Para dados financeiros: reconciliar com Asaas antes de qualquer exclusão local.
