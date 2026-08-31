# GO-H11B — Monitoramento inicial (48h)

**Início observação:** 2026-07-28 (pós-deploy `dpl_2KsEFHDL2f6FCQnEfRkbDBxG8o8Z`)  
**Fim previsto:** 2026-07-30  

## Escopo

Durante 48h: **não** implementar melhorias. Corrigir **apenas** falhas críticas.

## Sinais a monitorar

| Sinal | Onde olhar |
|-------|------------|
| Erros de servidor | Vercel → Logs / Functions |
| Falhas de pagamento | Asaas dashboard + `/api/webhooks/asaas` |
| Falhas de webhook | Vercel logs filtrando `webhooks/asaas` |
| Falhas de renovação | Cron `renovar-planos` + logs |
| Erros de upload | `upload-entrega` / Blob |
| Erros de entrega | `/api/entregas/*` |
| Autenticação | `/api/me`, `/api/login`, middleware |

## Registro de incidentes

| Quando (UTC) | Severidade | Sintoma | Ação | Status |
|--------------|------------|---------|------|--------|
| _(nenhum no momento do GO)_ | | | | |

## Backlog (melhorias não críticas)

Registrar fora deste GO — não implementar nas 48h:

- Migrar Blob store para `private` + `BLOB_DELIVERY_ACCESS=private`
- Next 16: migrar middleware → proxy convention
- Remover pacote npm `mercadopago` / adapters mortos pós-Beta
