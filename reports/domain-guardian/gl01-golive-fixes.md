# GL-01 — Consolidação dos Bloqueadores de Go Live

**Branch:** `pr03-clean` @ `3f20ad0` · **Base:** [QE-03](qe03-go-live-gate.md)

## Resultado

| Item | Status |
|------|--------|
| **Bloqueador 1** (auto-login registro) | **OK** — commitado `3f20ad0` |
| **Bloqueador 2** (fluxo planos) | **OK** — corrigido, **não commitado** |
| **Build** | **OK** — `tsc` exit 0, `npm run build` exit 0 |

---

## Bloqueador 1 — Login automático após registro

**Status: OK**

QE-01b estava completo no working tree. Commit exclusivo dos 3 arquivos:

| Arquivo | Mudança |
|---------|---------|
| `src/app/lib/auth.ts` | `createUserSession(userId)` — Session 7d + cookie `session_id` |
| `src/app/api/login/route.ts` | Delega a `createUserSession` |
| `src/app/api/registro/route.ts` | `await createUserSession(user.id)` após `user.create` |

**Commit:** `3f20ad0` — `fix(auth): auto-login apos registro via createUserSession (QE-01b / GL-01)`

**Fluxo corrigido:**
```
registro → POST /api/registro → createUserSession
        → AuthContext.refresh() → /api/me OK
        → /conta acessível sem passo extra de login
```

---

## Bloqueador 2 — Fluxo de planos

**Status: OK** (implementado, pendente commit)

### Auditoria — onde o `planId` era perdido

```
planos/page.tsx
  router.push("/pagamentos?tipo=plano&planId=bronze&modo=mensal")
        ↓
pagamentos/page.tsx  ← 🔴 PERDA AQUI
  router.replace("/carrinho")   // sem query string
        ↓
carrinho/page.tsx
  POST /api/asaas/checkout-carrinho   // 🔴 API errada para plano
```

| Etapa | `planId` presente? |
|-------|-------------------|
| `planos/page.tsx` | ✅ Sim (`URLSearchParams`) |
| `pagamentos/page.tsx` (antes) | ❌ Descartado no redirect |
| `carrinho/page.tsx` (antes) | ❌ Não lido; checkout de agendamento |

### Correção aplicada

**1. `pagamentos/page.tsx`** — preservar query ao redirecionar:
```ts
const qs = typeof window !== "undefined" ? window.location.search : "";
router.replace(qs ? `/carrinho${qs}` : "/carrinho");
```

**2. `carrinho/page.tsx`** — modo plano:
- Lê `tipo`, `planId`, `modo` via `useSearchParams`
- Exibe resumo do plano (`PLAN_PRICES`)
- `handleFinalizar` → `POST /api/asaas/checkout` com `{ planId, modo, tipo: "plano", paymentMethod }`
- Fluxo agendamento inalterado (`checkout-carrinho`)

**Fluxo corrigido:**
```
planos → /pagamentos?tipo=plano&planId&modo
      → /carrinho?tipo=plano&planId&modo
      → POST /api/asaas/checkout
      → Asaas → webhook → UserPlan
```

**Arquivos alterados (não commitados):**
- `src/app/pagamentos/page.tsx`
- `src/app/carrinho/page.tsx`

---

## Build

| Comando | Resultado |
|---------|-----------|
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0** (~195s) |

---

## Restrições respeitadas

- Arquitetura PR-03 mantida (mesmas APIs `asaas/checkout` e `checkout-carrinho`)
- Sem alteração em regras financeiras, Prisma ou banco
- Bloqueador 2 **não commitado** conforme solicitado

---

## Próximo passo sugerido

Commit separado do bloqueador 2 quando aprovado:
```
fix(plans): preserve planId through pagamentos redirect and checkout via asaas/checkout
```
