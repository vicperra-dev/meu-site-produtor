# GO-02 Ready Checklist

Preencher com data, responsável e evidência. O GO-02 só pode começar quando todos os itens estiverem confirmados e o validator responder `READY`.

| Item | Status | Evidência / responsável / data |
|---|---|---|
| Git limpo | ☐ | |
| Architecture Freeze ativo | ☑ | `docs/architecture/architecture-freeze.md` |
| Backup confirmado | ☐ | ID/data/hash do backup |
| Restore validado | ☐ | Instância isolada + queries de integridade |
| Webhook configurado | ☐ | URL e token no painel Asaas |
| Webhook acessível | ☐ | Resposta HTTP sem evento financeiro |
| Migration pronta | ☑ | `20260718120000_go01_payment_provider_coupon_service` |
| Migration aplicada no ambiente alvo | ☐ | `prisma migrate status` sem pendências |
| Storage operacional | ☑ | `STORAGE_PROVIDER=local` |
| Asaas Sandbox validado | ☐ | Chave sandbox + URL/token correspondentes |
| Asaas Production validado | ☐ | Chave production + URL/token correspondentes |
| Checklist assinado | ☐ | Nome, data e aprovação humana |

## Confirmações do validator

Somente após evidência real:

```powershell
$env:GO02_ASAAS_ENV="sandbox" # ou production
$env:GO02_CONFIRM_BACKUP="1"
$env:GO02_CONFIRM_WEBHOOK="1"
$env:GO02_CONFIRM_MIGRATE="1"
$env:GO02_CONFIRM_CHECKLIST="1"
npm run go02:presmoke
```

Não persistir tokens ou confirmações falsas em arquivos versionados.

## Assinatura

- Responsável:
- Data/hora:
- Ambiente:
- Commit RC:
- Evidências:
- Decisão: ☐ READY ☐ STOP
