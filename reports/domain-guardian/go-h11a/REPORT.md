# GO-H11A — Production Readiness (relatório consolidado)

**Data:** 2026-07-28  
**Deploy neste GO:** **não realizado** (reservado ao GO-H11B)  
**Veredito:** **APTO para GO-H11B** (checklist operacional), com ressalvas operacionais abaixo.

---

## Critérios de aprovação

| Critério | Status |
|----------|--------|
| Produção ↔ Homologação (schema Neon) | **PASS** — migrations H10B/C aplicadas; colunas confirmadas |
| Integridade Alta = 0 | **PASS** (antes 3 → depois 0) |
| Integridade Média = 0 | **PASS** |
| Middleware validado | **PASS** — movido para `src/middleware.ts` (Next carrega) |
| APIs cancelar duplicadas | **PASS** — `/api/planos/cancelar` → **410** |
| Gateways legados auditados | **PASS** — ver `GATEWAYS.md`; rotas HTTP → **410** |
| Arquivos protegidos | **PASS** com ressalva Blob (abaixo) |
| Documentação sincronizada | **PASS** (reconfirmação H10D + rota legada fechada) |
| Regressão | **PASS** typecheck / H10B / H10C / homologation; build sujeito a rede de fonts |

---

## PARTE 1 — Schema Neon

Migrations aplicadas:

- `20260727010000_go_h10b_plan_benefit_cycle`
- `20260727020000_go_h10c_subscription_lifecycle`

Probe (`migration-probe.json`):

- `UserPlan.lastBenefitCycleAt` = true  
- `Subscription`: `cyclesRemaining`, `failureCount`, `gracePeriodEndsAt`, `lastFailureAt`, `rootPaymentId` = presentes

Artefato: `scripts/go-h11a-migrate-deploy.ts`

---

## PARTE 2 — Integridade

| | Antes | Depois |
|--|------:|-------:|
| Alta | 3 | **0** |
| Média | 0 | **0** |
| Info | 102 | 121 (History/Sync imutáveis — esperado) |

Sanitização:

1. Cupom `12e8943b-…` — `appointmentId` nullificado (apontava para apt 31 inexistente).
2. Appointments **32** e **33** — removidos (sem Payment/SO/Cupom).

**Causa raiz corrigida:**

- `DELETE /api/admin/agendamentos` apagava Appointment sem limpar `Coupon.appointmentId`.
- `unified-cleanup` órfãos idem.

Agora ambos nullificam cupons antes do delete.

Artefatos: `integrity-before.json`, `integrity-after.json`, `integrity-sanitize.json`, `integrity-investigate.json`

---

## PARTE 3 — Middleware

**Confirmação técnica (antes):** `src/app/middleware.ts` **não** é carregado pelo Next.js App Router. Apenas `src/middleware.ts` ou `/middleware.ts` na raiz.

**Causa:** convenção de path do framework (não bug de matcher).

**Correção:**

- Implementação ativa em `src/middleware.ts` (Edge-safe: fetch `/api/me` + `/api/site-status`, sem Prisma).
- Stub em `src/app/middleware.ts` documentando inatividade.
- Gate server-side em `src/app/admin/layout.tsx` (`getSessionUser` + `redirect`) + shell client `AdminShell.tsx`.

Build do Next **emite warning** de que a convenção “middleware” está deprecada em favor de “proxy” (Next 16) — prova de que o arquivo **é detectado**. Migração para `proxy` fica fora do escopo corretivo H11A.

---

## PARTE 4 — Segurança de arquivos

| Mudança | Detalhe |
|---------|---------|
| Proxy autenticado | `GET /api/entregas/[serviceId]` — owner ou ADMIN |
| `meus-dados` / admin list | expõem `/api/entregas/{id}`, nunca URL bruta |
| Storage local | `storage/deliveries/` (fora de `public/`) |
| Blob | upload default `public` (store atual); `BLOB_DELIVERY_ACCESS=private` quando houver store privado |

**Ressalva operacional (não bloqueia H11B de commit/deploy, mas deve constar no checklist):** blobs **já** gravados em store público continuam tecnicamente acessíveis se a URL absoluta vazar. Pós-deploy Beta: criar/usar Blob **private** + `BLOB_DELIVERY_ACCESS=private` / `NEXT_PUBLIC_BLOB_DELIVERY_ACCESS=private`.

---

## PARTE 5 — API cancelar

- Canônico: `POST /api/assinatura/cancel` (Minha Conta / H10C)
- Legado: `POST /api/planos/cancelar` → **410 Gone** + `successor`

---

## PARTE 6 — Gateways

Ver `GATEWAYS.md`. Rotas MP/Infinity/pagamentos Preference/webhook MP → **410**.  
Carrinho força Asaas. Coluna `mercadopagoId` e adapters TS = legado interno.

---

## PARTE 7 — Documentação

Reconfirmação: PLATFORM_POLICY atualizado (rotas 410); KB/FAQ/chat já Asaas (H10D); UI Home/Planos sem drift crítico detectado nesta rodada.

---

## PARTE 8 — Regressão

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | PASS |
| `npm run build` | **PASS** (retry; 1ª falha foi rede Google Fonts) |
| `npm run homologation:scenarios` | PASS (27/27) |
| smoke GO-H10B | PASS |
| smoke GO-H10C | PASS |
| auditoria GO-H10D | mantida PASS (D3); ressalva de rotas legadas **fechada** neste GO |

---

## Correções realizadas (lista)

1. Migrations H10B/C no Neon  
2. Sanitização integridade + root-cause em delete/cleanup  
3. Middleware em path correto + admin server gate  
4. Proxy de entregas + storage local privado + rewrite de URLs  
5. Deprecação cancelar legado (410)  
6. Deprecação checkouts/webhooks MP/Infinity (410) + auditoria  
7. Carrinho somente Asaas  
8. PLATFORM_POLICY / GATEWAYS docs  

---

## Bloqueios remanescentes (ops → GO-H11B)

1. **Commit** dos H10A–H10D + H11A (sem artefatos H2 de diagnóstico, se indesejados).  
2. **Deploy** Vercel produção.  
3. **Smoke pós-deploy** + E2E reais.  
4. Opcional: migrar Blob store para **private**.  
5. Confirmar `npm run build` com acesso a Google Fonts (ou self-host fonts) — **retry local PASS**.  
6. Warning Next 16 middleware→proxy (dívida de framework, não bloqueio Beta).

---

## Aptidão GO-H11B

**Sim — a plataforma está apta a entrar no checklist operacional GO-H11B** (commit → migrate já feito no Neon → deploy → smoke → E2E → liberação Beta).

Este GO **não** executou deploy nem E2E reais com usuários, conforme escopo.
