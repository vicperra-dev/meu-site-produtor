# GO-01.3 — Asaas Release Audit (infraestrutura)

**Escopo:** auditoria estática. **Não** executar pagamentos reais nesta sprint.  
**Próximo passo autorizado após GO-01:** GO-02 — Financial Smoke.

## Superfície auditada

| Área | Local | Status auditoria |
|------|-------|------------------|
| Credencial API | `ASAAS_API_KEY` via `getAsaasApiKey()` (`src/app/lib/env.ts`) | Presente no código; valor deve existir no secret store do ambiente |
| Sandbox vs prod | Token `$aact_prod_` → API `www.asaas.com`; caso contrário sandbox | Documentado em `asaas-subscriptions`, refund, get-payment |
| TLS skip | `ASAAS_SKIP_TLS_VERIFY` só com relaxamento dev | Nunca habilitar em produção |
| Checkout plano | `POST /api/asaas/checkout` | AsaasProvider + PaymentMetadata |
| Checkout agendamento | `POST /api/asaas/checkout-agendamento` | Idem |
| Checkout carrinho | `POST /api/asaas/checkout-carrinho` | Idem |
| Callback / initPoint | Retorno `initPoint` do provider | Cliente redireciona ao Asaas |
| Webhook | `POST /api/webhooks/asaas` | Token `ASAAS_WEBHOOK_ACCESS_TOKEN`; obrigatório em production |
| Auth webhook | Header / token comparado a `ASAAS_WEBHOOK_ACCESS_TOKEN` | 401 se divergente |
| Effects agendamento | `asaas-agendamento-payment-effects` | Fonte única webhook + admin reprocess |
| Effects plano | `asaas-plano-payment-effects` | Idem |
| Effects carrinho | `asaas-carrinho-payment-effects` | Idem |
| Reconcile / replay | `asaas-agendamento-reconcile` | Idempotência parcial |
| Refund outbound | `refundAsaasPayment` (`asaas-refund.ts`) | POST `/payments/{id}/refund` |
| Refund inbound sync | `syncInboundRefundConfirmation` / payment-refund-sync | Status local |
| List / get payment | `asaas-list-payments`, `asaas-get-payment` | Recuperação de id |
| Assinaturas | `asaas-subscriptions.ts` | Usado se planos recorrentes ativos |
| Provider abstraction | `AsaasProvider` + `PaymentProvider` | Pipeline alinhado a Simulation |
| Identity | `paymentByProviderIdWhere` + dual-write `asaasId` | F9 |

## Variáveis de ambiente (checklist operacional)

| Variável | Obrigatória prod | Notas |
|----------|------------------|-------|
| `ASAAS_API_KEY` | Sim | Produção: `$aact_prod_…` |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Sim (código exige em production) | Configurar no painel Asaas = mesmo valor |
| `DATABASE_URL` | Sim | Após migrate GO-01.1 |
| `NEXTAUTH_URL` / URL pública | Sim | Webhook deve apontar para HTTPS público |
| `ASAAS_SKIP_TLS_VERIFY` | Não | Deve estar ausente/false em prod |

## URLs a confirmar no painel Asaas (GO-02)

- [ ] Webhook URL = `https://<domínio-prod>/api/webhooks/asaas`
- [ ] Eventos: pagamento confirmado / estornado (conforme configuração atual do projeto)
- [ ] Access token do webhook = `ASAAS_WEBHOOK_ACCESS_TOKEN`
- [ ] Ambiente da chave (sandbox vs produção) bate com o domínio

## Retry / timeout / erros / logs

| Tema | Achado | Ação GO-02 |
|------|--------|------------|
| Retry webhook | Asaas reenvia; handlers devem ser idempotentes | Smoke: pagamento duplicado não duplica domínio |
| Timeout HEAD entrega | 8s em `delivery-url-validation` (legado URL) | N/A financeiro |
| Logs | `console.log` / `console.error` com prefixos `[Asaas …]` | Revisar logs no smoke sem vazar chave |
| Erro sem API key | 500/erro amigável “Configuração de pagamento ausente” | Confirmar mensagem em prod |
| Refund falha | Propaga erro da API Asaas | Checklist financeiro cobre FAILED |

## Assinaturas

Código de subscriptions existe. Validar no GO-02 se o produto Go Live usa planos **recorrentes** ou apenas cobrança avulsa de plano. Se não usar, marcar N/A no smoke e não testar create/cancel subscription.

## Riscos remanescentes (não bloqueiam GO-01; bloqueiam Go Live até GO-02)

1. Nenhum pagamento sandbox/real executado em GO-00/GO-01.  
2. Webhook URL + token devem ser conferidos no painel antes do smoke.  
3. Produção precisa da migration `provider` / `providerPaymentId` antes de confiar em Simulation identity em prod.

---

# Checklist financeiro para GO-02 (obrigatório — nada implícito)

Executar **somente** após Release Candidate Final (GO-01) aprovado por humano.

## Pré-condições

- [ ] Git limpo / tag RC conhecida  
- [ ] Backup produção restaurável validado  
- [ ] Migration GO-01.1 aplicada em produção  
- [ ] `ASAAS_API_KEY` produção ou sandbox **explícito** (registrar qual)  
- [ ] `ASAAS_WEBHOOK_ACCESS_TOKEN` configurado app + painel  
- [ ] Homologation Engine PASS (catálogo completo)  
- [ ] Auditorias domain/workflow/sync/regression PASS  

## Smoke (sandbox recomendado primeiro)

- [ ] Checkout agendamento (1 SKU sessao) → `initPoint` válido  
- [ ] Pagamento aprovado no Asaas → webhook recebido  
- [ ] Appointment/Service/Payment criados com `asaasId` + `provider`/`providerPaymentId`  
- [ ] Minha Conta reflete o item  
- [ ] Admin agendamentos/serviços reflete o item  
- [ ] Checkout plano Bronze (ou plano mínimo) → webhook → UserPlan + cupons  
- [ ] Checkout beat/cupom → cupom TEST na página exclusiva  
- [ ] Refund outbound (valor mínimo) → status local + Asaas  
- [ ] Webhook `PAYMENT_REFUNDED` (se aplicável) → sync inbound  
- [ ] Reenvio webhook (retry) → sem duplicar entidades  
- [ ] Falha controlada (token webhook errado) → 401, sem side-effect  
- [ ] Logs sem vazamento de `ASAAS_API_KEY`  

## Critério de PASS GO-02

Todos os itens do smoke marcados, com evidência (IDs de pagamento Asaas + IDs locais) anexada ao relatório `reports/domain-guardian/go02-financial-smoke.*`.

## Critério de FAIL

Qualquer divergência de domínio, webhook não entregue, ou dupla criação → **interromper Go Live**, não “contornar”.
