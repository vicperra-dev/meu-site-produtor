# GO-02A — Financial Smoke Environment Readiness

**Data:** 2026-07-18  
**Architecture Freeze:** ATIVO  
**Pagamento/refund/webhook real:** NÃO EXECUTADOS  
**Resultado:** STOP

## Migrations

| Item | Status | Evidência |
|---|---|---|
| Schema Prisma | CONFIGURADO | `prisma validate` PASS |
| Migration GO-01.1 | CONFIGURADO | Arquivo versionado |
| `Payment.provider` | CONFIGURADO | Schema + migration |
| `Payment.providerPaymentId` | CONFIGURADO | Schema + unique/index migration |
| `Coupon.serviceId` | CONFIGURADO | Schema + FK/index migration |
| Local migrate status | PENDENTE | GO-01.1 pendente no DB `localhost/thouse_rec` |
| Preview migrate status | PENDENTE | Sem evidência do ambiente nesta sessão |
| Production migrate status | PENDENTE | Sem evidência do ambiente nesta sessão |
| Rollback | CONFIGURADO | Backup preferencial + SQL restrito documentados |

`prisma migrate deploy` não foi executado. Ordem oficial: Local (verificação) → Preview (backup/restore/deploy/status) → Production (mesma sequência).

## Asaas

| Item | Status | Evidência |
|---|---|---|
| Credencial sandbox | CONFIGURADO | Chave local com prefixo sandbox/homologação, valor omitido |
| Credencial production | PENDENTE | Não verificável localmente |
| Ambiente explícito | PENDENTE | `GO02_ASAAS_ENV` ausente |
| Access token API | CONFIGURADO | `ASAAS_API_KEY` presente |
| Token webhook | PENDENTE | `ASAAS_WEBHOOK_ACCESS_TOKEN` ausente |
| URL pública | PENDENTE | `NEXT_PUBLIC_SITE_URL=http://localhost:3000` |
| Checkout | CONFIGURADO | Rotas certificadas presentes |
| Refund | CONFIGURADO | Adaptador certificado presente |
| Webhook/auth | CONFIGURADO em código | Configuração operacional pendente |
| Retry/idempotência | CONFIGURADO em código | Validação real pertence ao GO-02 |
| Timeouts/TLS | PENDENTE | `ASAAS_SKIP_TLS_VERIFY=true` local |
| Assinaturas | CONFIGURADO em código | Execução fora do GO-02A |
| Logs | CONFIGURADO em código | Evidência runtime pertence ao GO-02 |

## Webhook

| Item | Status |
|---|---|
| URL no painel Asaas | PENDENTE |
| Token igual app/painel | PENDENTE |
| Endpoint HTTPS público | PENDENTE |
| Resposta HTTP verificada | PENDENTE |
| Autenticação verificada | PENDENTE |
| Logs verificados | PENDENTE |

Nenhuma chamada webhook foi feita.

## Backup

| Item | Status |
|---|---|
| Backup existente | PENDENTE — nenhuma evidência local |
| Data/ID/hash | PENDENTE |
| Integridade | PENDENTE |
| Restore em cópia | PENDENTE |
| Tempo estimado (RTO) | PENDENTE — deve ser medido |
| `GO02_CONFIRM_BACKUP=1` | PENDENTE |

## Variáveis

| Variável | Status | Observação |
|---|---|---|
| `DATABASE_URL` | OK | PostgreSQL local `localhost/thouse_rec` |
| `NEXT_PUBLIC_SITE_URL` | PENDENTE | HTTP localhost, não público |
| `ASAAS_API_KEY` | OK | Sandbox/homologação local |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | AUSENTE | Obrigatória |
| `GO02_ASAAS_ENV` | AUSENTE | Deve ser sandbox ou production |
| `GO02_CONFIRM_BACKUP` | AUSENTE | Só após restore |
| `GO02_CONFIRM_WEBHOOK` | AUSENTE | Só após validação painel/HTTP |
| `GO02_CONFIRM_MIGRATE` | AUSENTE | Só após migrate status sem pendências |
| `GO02_CONFIRM_CHECKLIST` | AUSENTE | Só após assinatura |

## Bloqueadores exatos

1. Git não está limpo (há alteração preexistente em `launch01-reset-result.json` e artefatos GO-02A antes do commit).
2. Migration GO-01.1 pendente no banco local; Preview/Production não verificados.
3. `GO02_ASAAS_ENV` ausente.
4. `ASAAS_WEBHOOK_ACCESS_TOKEN` ausente.
5. `NEXT_PUBLIC_SITE_URL` não é HTTPS pública.
6. Webhook do painel/HTTP/auth/logs não confirmados.
7. `ASAAS_SKIP_TLS_VERIFY=true`.
8. Backup e restore não comprovados.
9. GO-02 Ready Checklist não assinado.

## Conclusão

STOP. Não iniciar GO-02 até o validator responder `READY`.
