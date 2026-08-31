# GL-01 — Go Live Readiness

**Arquitetura:** congelada após EC-01  
**Veredito:** **APROVADA COM RESTRIÇÕES**  
**Confiança técnica:** **90%**

Todos os gates locais, auditorias e cenários oficiais passaram. A restrição é operacional: ainda é necessário confirmar no ambiente público a configuração do webhook Asaas e executar um pagamento sandbox ponta a ponta.

## Bugs encontrados e corrigidos

1. **GL01-FIN-01 (P0):** checkouts de agendamento e carrinho confiavam em preço/total enviados pelo browser.
   - Corrigido com catálogo financeiro autoritativo no servidor.
   - IDs e quantidades são validados; nome, preço, subtotal, desconto e total do cliente são ignorados.
   - Aplicado a Asaas, Mercado Pago e InfinityPay. Planos já usavam `PLAN_PRICES`.
   - Endpoint legado `/api/carrinho-checkout` foi desativado com HTTP 410.

2. **GL01-CPN-01 (P0):** validação de cupons não aplicava uniformemente owner, tipo canônico e serviço exato.
   - Cobertura server-side para SERVICE, PLAN, DISCOUNT, REBOOK, REFUND, BONUS e TEST.
   - Validados expiração, owner, uso, refund lock, Appointment, Payment aprovado, UserPlan, valor mínimo e serviço exato.
   - Cupons SERVICE/REBOOK não podem zerar múltiplos itens nem agendar serviço diferente.

3. **GL01-WH-01 (P0):** webhook podia escolher metadata por `userId`, recência ou email do customer.
   - Fallbacks removidos.
   - Identificação aceita somente `Payment.asaasId`, `PaymentMetadata.asaasId`, `PaymentMetadata.id` ou `Subscription.asaasSubscriptionId`.
   - Ambiguidade/mismatch gera `WEBHOOK_SECURITY_AUDIT` e nenhum efeito é executado.

4. **GL01-WH-02 (P0):** valor recebido no webhook não era confrontado com o cálculo do servidor.
   - `chargedAmount`, `amount` ou `total` persistido é comparado ao valor Asaas antes de criar Payment/Appointment/Service.

5. **GL01-UX-01 (P1):** página de sucesso fazia polling e processava plano pelo cliente.
   - Polling e POST de efeitos removidos.
   - A página aguarda exclusivamente `PaymentConfirmed` com `effectsReady=true` via Synchronization Engine/SSE e redireciona automaticamente.

6. **GL01-ADM-01 (P1):** shim de cupom de teste aceitava usuário comum e associação ambígua.
   - Gate localhost/ADMIN aplicado no servidor.
   - Associação com múltiplos candidatos é recusada.
   - Logs com prefixos de credenciais foram removidos.

7. **GL01-MULTI-01 (P1):** cupom aplicado no carrinho não era consumido nos efeitos.
   - Código duplicado no mesmo carrinho é recusado.
   - Claim do cupom exige `used=false`, owner correto e `appointmentId=null`; conflito remove o Appointment recém-criado e interrompe os efeitos.

8. **GL01-CLEAN-01 (P2):** cleanup oficial deixava eventos e históricos de teste.
   - Cleanup passou a remover Synchronization Events e Domain Transition History dos usuários de homologação.

9. **GL01-TS-01:** literal BigInt incompatível com ES2017 bloqueava `tsc`.
   - Corrigido sem alteração semântica.

## Bugs restantes

Nenhum bug de código conhecido permanece aberto no escopo GL-01.

## Cobertura

- Catálogo descoberto: **60 cenários**.
- PH-01 + GL-01: **9/9 PASS**.
- TE-02A: **21/21 PASS**.
- SYNC-01A: **7/7 PASS**.
- SIM-01: **10/10 PASS**.
- SIM-02: **10/10 PASS**.

Novas regressões oficiais:

- GL01-001 — preço e total calculados pelo catálogo do servidor.
- GL01-002 — owner e serviço exato do cupom.
- GL01-003 — identidade exata da operação no webhook.
- GL01-004 — rejeição de valor divergente no webhook.

## Gates

- TypeScript: **PASS**
- Prisma validate: **PASS**
- Build Next.js: **PASS**
- Domain Audit: **PASS**
- Workflow Audit: **PASS**
- Synchronization Audit: **PASS**
- Execution Audit: **PASS**
- Simulation Audit: **PASS** (1 warning não bloqueante de fixture)
- Knowledge Graph Audit: **PASS**
- Discovery Audit: **PASS**
- Regression Audit: **PASS**

## Limpeza

Escopo destrutivo limitado a `@homolog.test`, registros técnicos órfãos e pastas de upload `tmp/temp/homolog`.

- 6 usuários de homologação
- 3 Services
- 3 Appointments
- 4 Payments
- 5 PaymentMetadata
- 6 históricos de transição
- 867 Synchronization Events órfãos
- 22 PaymentMetadata expirados e não vinculados
- 0 uploads temporários
- 0 cupons de teste órfãos
- **Nenhum dado real removido**

## Riscos e bloqueadores

Não há bloqueador de código local. Permanecem duas restrições pré-tráfego:

1. Confirmar `ASAAS_WEBHOOK_ACCESS_TOKEN` e URL pública `/api/webhooks/asaas` no painel Asaas.
2. Executar smoke sandbox real: registro → checkout → webhook → `PaymentConfirmed/effectsReady` → Minha Conta.

Asaas é o único provider exposto por `/api/payment-provider`. Mercado Pago e InfinityPay não devem ser ativados sem operationId e evento final de sincronização equivalentes.

## Recomendações

- Monitorar `WEBHOOK_SECURITY_AUDIT` e ausência de `PaymentConfirmed` com `effectsReady=true`.
- Manter rotas manuais de recuperação restritas a ADMIN/secret.
- Executar `npm run golive:cleanup` após futuras baterias de homologação.
- Não iniciar nova sprint antes do smoke público e da aprovação operacional.

## Aprovação

**Produção: APROVADA COM RESTRIÇÕES.**

O código está aprovado pelos gates e testes disponíveis. A liberação pública depende somente da validação operacional externa do Asaas, que não pode ser comprovada pelo ambiente local.
