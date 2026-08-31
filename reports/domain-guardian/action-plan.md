# Domain Action Plan

terça-feira, 23 de junho de 2026 às 03:20:24

## Status atual

| Sinal | Valor |
|-------|-------|
| Guardian | HEALTHY |
| Errors | 0 |
| Warnings | 0 |
| Info | 1 |
| Checks executados | 13 |
| Duração | 951 ms |
| Advisor | HEALTHY |
| Decision Engine | BLOCKED |
| Risco (diff) | CRITICAL |

**Contexto do Decision Engine:**

- Decisão de merge/deploy: **BLOCKED**
- Entidades no diff: Appointment, Coupon, Payment, PaymentMetadata, Service, User, UserPlan
- Invariantes críticos no diff: A1, A2, C1, C4, F1, F2, F3, F6, F8, M1, P3, P5, X1, X2, X4

## Checks ativos

- **S4** (INFO) — 1 info — _observação apenas_

---

## Sistema saudável

Nenhuma ação corretiva necessária.

Guardian: **HEALTHY** — 0 error(s), 0 warning(s), 1 info.

### Próxima auditoria recomendada

Semanal em produção; diária após deploy em áreas financeiras. Comando: `node --experimental-strip-types scripts/domain-guardian-runner.ts`.

### Observações informativas (sem ação obrigatória)

- **S4** — Resíduo legado TESTE_AGEND_* / TESTE_PAY_*
  - Legado no banco: 0 cupom(ns) TESTE_AGEND_*, 0 cupom(ns) TESTE_PAY_*

---

_Planner somente leitura — nenhuma correção automática foi executada._
_Fontes: latest.json, advisor.md, decision.md, domain-map.md, domain-dependencies.md, domain-invariants.md, domain-risks.md_
