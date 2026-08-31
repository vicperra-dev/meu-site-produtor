# Domain Memory

**Última atualização:** 2026-06-23T07:54:44.220Z
**Execuções Guardian no histórico:** 4
**Snapshots de decisão:** 1

## Resumo histórico

| Métrica | Valor |
|--------|-------|
| Risco médio histórico | 4 (CRITICAL) |
| Guardian HEALTHY | 4 execução(ões) |
| Guardian WARNING | 0 execução(ões) |
| Guardian CRITICAL | 0 execução(ões) |
| APPROVED | 0 |
| REVIEW_REQUIRED | 0 |
| BLOCKED | 1 |

## Checks mais recorrentes

- **S4** — Resíduo legado TESTE_AGEND_/TESTE_PAY_: 3/4 execuções (75%) · 0E / 0W / 3I

## Entidades mais impactadas

- **Coupon**: 3 menção(ões)

## Arquivos mais sensíveis

- `prisma/schema.prisma` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/agendamentos/reverter-cancelamento/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/agendamentos/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/cupons/liberar/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/cupons/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/pagamentos/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/planos/excluir-cancelados/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/planos/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/reprocessar-pagamento-teste/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/servicos/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/stats/detalhadas/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/stats/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/admin/usuarios/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/agendamentos/cancelar/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/agendamentos/com-cupom/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/agendamentos/escolher-reembolso/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/asaas/checkout-agendamento/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/asaas/checkout-carrinho/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/asaas/checkout/route.ts` — 1 citação(ões), risco máx. **CRITICAL**
- `src/app/api/conta/route.ts` — 1 citação(ões), risco máx. **CRITICAL**

## Invariantes mais afetados

- **A1** — 2 menção(ões) · CRÍTICO
- **A2** — 2 menção(ões) · CRÍTICO
- **C1** — 2 menção(ões) · CRÍTICO
- **C4** — 2 menção(ões) · CRÍTICO
- **F1** — 2 menção(ões) · CRÍTICO
- **F2** — 2 menção(ões) · CRÍTICO
- **F3** — 2 menção(ões) · CRÍTICO
- **F6** — 2 menção(ões) · CRÍTICO
- **F8** — 2 menção(ões) · CRÍTICO
- **M1** — 2 menção(ões) · CRÍTICO
- **P3** — 2 menção(ões) · CRÍTICO
- **P5** — 2 menção(ões) · CRÍTICO
- **X1** — 2 menção(ões) · CRÍTICO
- **X2** — 2 menção(ões) · CRÍTICO
- **X4** — 2 menção(ões) · CRÍTICO
- **A3** — 1 menção(ões)
- **A4** — 1 menção(ões)
- **A5** — 1 menção(ões)
- **A6** — 1 menção(ões)
- **A7** — 1 menção(ões)

## Histórico de decisões

- 2026-06-23T07:15:48.150Z — **BLOCKED** (risco CRITICAL) · main@fd9ff6d · PR: DO_NOT_MERGE

## Histórico Guardian (execuções)

- 2026-06-23T04:07:31.175Z — HEALTHY (0E/0W/0I) · 2026-06-23-01-07.json
- 2026-06-23T05:41:58.069Z — HEALTHY (0E/0W/1I) · 2026-06-23-02-41.json · checks: S4
- 2026-06-23T06:09:53.476Z — HEALTHY (0E/0W/1I) · 2026-06-23-03-09.json · checks: S4
- 2026-06-23T06:20:24.360Z — HEALTHY (0E/0W/1I) · 2026-06-23-03-20.json · checks: S4

## Áreas mais instáveis

- Check **S4** (Resíduo legado TESTE_AGEND_/TESTE_PAY_): finding em 3/4 execuções (75%)
- Entidade **Coupon**: 3 menção(ões) em decisões/checks
- Decision Engine **BLOCKED** em 1/1 snapshot(s)
- Arquivo sensível: `prisma/schema.prisma` (1 citação(ões), risco CRITICAL)
- Arquivo sensível: `src/app/api/admin/agendamentos/reverter-cancelamento/route.ts` (1 citação(ões), risco CRITICAL)
- Arquivo sensível: `src/app/api/admin/agendamentos/route.ts` (1 citação(ões), risco CRITICAL)

## Recomendações arquiteturais

- Finalizar migração de simulação (S4): vincular ou eliminar cupons legados TESTE_AGEND_/TESTE_PAY_ antes de remover helpers @legacy.
- Alta frequência de BLOCKED: adotar PRs menores (split-to-prs) e rodar change-analyzer antes de abrir PR.
- Divergência banco saudável vs diff CRITICAL: separar gate de dados (Guardian) do gate de merge (Decision Engine).

---

_Memória somente leitura — nenhuma correção ou issue foi criada._
_Consumir `memory.json` para integração programática com Advisor, Decision Engine e Planner._
