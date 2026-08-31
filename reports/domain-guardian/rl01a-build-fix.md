# RL-01a — Correção dos Últimos Erros de Build

**Modo:** IMPLEMENTAÇÃO CONTROLADA  
**Gerado:** 2026-07-10  
**Branch:** `pr03-clean`  
**Escopo:** `src/app/lib/service-catalog.ts`

---

## Respostas

### 1. Essas funções existiam no branch sprint?

**Parcialmente.**

- **Não** no HEAD commitado `sprint1/pr-01-guardian @ cf4b2e7` — `service-catalog.ts` tinha só `normalizeServiceTypeId`.
- **Sim** no WIP do stash (`stash@{0}`) — versão completa com as duas funções e helpers.

### 2. Foram perdidas durante a extração?

**SIM.**

O RL-01 aplicou cherry-picks + fix(build), mas `service-catalog.ts` não entrou no bundle. Os módulos PR-03 (`agendamento-payment-coupons.ts`, `agendamento-payment-rules.ts`) importam funções que só existiam no WIP.

### 3. São apenas exports ou há lógica faltando?

**Há lógica faltando.**

Não eram re-exports. Faltavam:

- `PACKAGE_LABEL_ALIASES`
- `COMPOSITE_COUPON_SPLIT`
- `resolveAgendamentoItemCatalogId` (helper)
- `isMultiCouponAgendamentoPackageId`
- `expandAgendamentoItemToCouponTypes`

### 4. A lógica original foi preservada?

**SIM.**

Restaurada verbatim do WIP em `stash@{0}`. Sem alteração de regra de negócio.

---

## Correção aplicada

Arquivo: `src/app/lib/service-catalog.ts`

Funções alvo restauradas + constantes/helpers de suporte (necessários para compilar).

**Não alterados:** Prisma, banco, APIs, webhooks, checkouts.

---

## 5. Build após correção

```
npm run build → exit 1
```

| Fase | Resultado |
|------|-----------|
| Compilação Turbopack | **OK** |
| TypeScript | **FALHOU** |

### Erros originais (RL-01)

**Resolvidos** — `expandAgendamentoItemToCouponTypes` e `isMultiCouponAgendamentoPackageId` agora exportados.

### Novo erro (parada imediata — sem correção automática)

```
.next/dev/types/validator.ts:215
Cannot find module '../../../src/app/agendamento/cupom/page.js'
```

---

## Build

**NOVO ERRO**

---

Execução parada conforme instruído.
