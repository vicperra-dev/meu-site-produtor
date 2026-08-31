# Project Summary — Architecture Agent V1

**Gerado em:** 2026-07-05T19:48:47.705Z
**Agente:** 1.0.0
**Branch:** main · **HEAD:** fd9ff6d

---

## Qual é o estado atual do projeto?

| Sinal | Valor |
|-------|-------|
| Guardian | HEALTHY (0 errors, 0 warnings) |
| Advisor | HEALTHY |
| Decision Engine | BLOCKED |
| Risco do diff | CRITICAL |
| Working tree | 169 arquivo(s) com mudanças |
| Conhecimento geral | **100%** |

⚠️ **Existe risco crítico identificado** (decision CRITICAL/BLOCKED ou Guardian errors).


---

## Quais entidades existem?

- **Payment** (domain-map.md)
- **PaymentMetadata** (domain-map.md)
- **Appointment** (domain-map.md)
- **Coupon** (domain-map.md)
- **UserPlan** (domain-map.md)
- **Service** (domain-map.md)
- **User** (domain-map.md)

---

## Quais fluxos existem?

- Checkout agendamento
- Checkout plano
- Reembolso
- Remarcação (cupom)
- Minha Conta (leitura)
- PaymentMetadata → Payment
- Payment → Appointment
- Payment → Coupon
- Payment → UserPlan
- Appointment → Service
- Appointment → Coupon (remarcação)
- Coupon → Appointment (consumo)
- UserPlan → Coupon
- User → Payment / Appointment / UserPlan / Service
- User → Coupon (assigned)

---

## Quais invariantes críticos?

- **F1**
- **F2**
- **F3**
- **F6**
- **F8**
- **M1**
- **A1**
- **A2**
- **C1**
- **C4**
- **P3**
- **P5**
- **X1**
- **X2**
- **X4**

**Total documentado:** 39 invariantes.

---

## Quais checks Guardian existem?

- **F1** — OK (scanned: 0, findings: 0)
- **F4** — OK (scanned: 0, findings: 0)
- **A5** — OK (scanned: 1, findings: 0)
- **A8** — OK (scanned: 1, findings: 0)
- **C1** — OK (scanned: 1, findings: 0)
- **C2** — OK (scanned: 0, findings: 0)
- **P2** — OK (scanned: 0, findings: 0)
- **X1** — OK (scanned: 0, findings: 0)
- **X2** — OK (scanned: 0, findings: 0)
- **S1** — OK (scanned: 0, findings: 0)
- **S2** — OK (scanned: 0, findings: 0)
- **S3** — OK (scanned: 0, findings: 0)
- **S4** — INFO (scanned: 0, findings: 1)

---

## Quais mudanças estão em andamento?

| Tipo | Quantidade |
|------|------------|
| Modificados | 77 |
| Novos | 0 |
| Removidos | 0 |
| Renomeados | 0 |
| Não rastreados | 92 |
| **Total** | **169** |

**Entidades no diff:** Appointment, Coupon, Payment, PaymentMetadata, Service, User, UserPlan, Aceite / recusa / conclusão admin, Aceite/recusa admin, Autenticação e autorização, Checkout, Checkout (agendamento e plano), Checkout agendamento, Checkout plano, Checkout → criação pós-pagamento, Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`), Conflito de horário (agenda), Criação pós-checkout agendamento, Documentação / tooling, Entrega de áudio, Exclusão de conta (LGPD), Geração pós-pagamento (agendamento/plano), … e mais 25 fluxo(s)

---

## Quais arquivos estão sendo modificados?

- `.gitignore`
- `package.json`
- `prisma/schema.prisma`
- `src/app/admin/agendamentos/page.tsx`
- `src/app/admin/estatisticas/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/pagamentos/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/planos/page.tsx`
- `src/app/admin/servicos-aceitos/page.tsx`
- `src/app/admin/servicos-solicitados/page.tsx`
- `src/app/admin/usuarios/page.tsx`
- `src/app/agendamento/page.tsx`
- `src/app/api/admin/agendamentos/cancelar/route.ts`
- `src/app/api/admin/agendamentos/reverter-cancelamento/route.ts`
- … e mais 62 arquivo(s) modificado(s)

---

## Existe risco crítico?

**SIM** — Decision: BLOCKED, Risco: CRITICAL

---

## Qual decisão atual?

**BLOCKED** (fonte: decision.md)



---

## Qual próximo passo recomendado?

Revisar change-analysis e reduzir escopo do diff; reexecutar Decision Engine.

---

## Índice de conhecimento

```
Arquitetura........... 100%
Financeiro............ 100%
Appointment........... 99%
Coupons............... 100%
Webhook............... 100%
Guardian.............. 100%
Payment............... 100%
Simulation............ 100%
Overall Knowledge..... 100%
```

---

_Agent read-only — nenhuma alteração de código ou regra de negócio._
