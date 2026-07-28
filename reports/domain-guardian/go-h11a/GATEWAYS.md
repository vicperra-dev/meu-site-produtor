# GO-H11A — Auditoria Gateways Legados (Mercado Pago / InfinityPay)

## Classificação

| Item | Classificação | Ação H11A |
|------|---------------|-----------|
| `/api/asaas/*` | **ainda utilizado** (PSP oficial) | mantido |
| `/api/webhooks/asaas` | **ainda utilizado** | mantido |
| `/api/mercadopago/checkout` | **legado** | **410 Gone** |
| `/api/mercadopago/checkout-agendamento` | **legado** | **410 Gone** |
| `/api/infinitypay/checkout` | **legado** | **410 Gone** |
| `/api/infinitypay/checkout-agendamento` | **legado** | **410 Gone** |
| `/api/pagamentos` (POST Preference MP) | **legado** | **410 Gone** |
| `/api/webhooks/mercadopago` | **legado** | **410 Gone** |
| `Payment.mercadopagoId` (coluna/schema) | **legado temporário** | mantido para lookup histórico; não criar novos |
| `InfinityPayProvider` / `MercadoPagoProvider` em `payment-providers.ts` | **código morto parcial** | classes permanecem no adapter (não removidas para evitar quebrar imports de testes); rotas HTTP não as usam mais |
| `mercadopago` npm package | **legado temporário** | permanece em `package.json` até limpeza pós-Beta (não usado nas rotas ativas) |
| Admin “ID legado (MP)” | interno | label ajustado; não é superfície pública |
| Chat/KB/FAQ | comunicação | já Asaas-only (GO-H10D); keywords MP respondem “não utilizamos” |

## Texto público

Nenhuma superfície comercial deve apresentar Mercado Pago ou InfinityPay como processador.
Referências restantes são: resposta educativa no chat (negação), campos internos admin, e coluna DB histórica.

## Carrinho

Checkout do carrinho força `asaas` (sem seletor de gateway).
