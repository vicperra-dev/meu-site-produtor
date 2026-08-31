# GO-H11 — Beta Readiness e Auditoria Final

**Veredito: NÃO PRONTO PARA BETA**  
**Data:** 2026-07-27  
**Escopo:** auditoria somente leitura — nenhuma correção aplicada.  
**Deploy:** bloqueado.

Canvas interativo: `canvases/go-h11-beta-readiness.canvas.tsx`

---

## Critério de aprovação vs resultado

| Critério | Esperado | Resultado |
|---|---|---|
| Alta (integridade) | 0 | **3** |
| Média | 0 (ou só UX) | **0** |
| Info | só History | History 27 + Sync 75 |
| Fluxos E2E | todos OK | **não executados** |
| Sem regressão H10 | deployado | **não commitado / migrations Neon ausentes** |
| typecheck / build | PASS | PASS |
| Deploy | se Critical=0 | **bloqueado** |

---

## Gates automatizados

- `npm run typecheck` — PASS  
- `npm run build` — PASS  
- `npm run homologation:scenarios` — PASS (27/27)  
- `scripts/go-h10b-plan-definitions-smoke.ts` — PASS  
- `scripts/go-h10c-subscription-smoke.ts` — PASS  
- Integridade Neon (`.env.local`) — `ok: false` (Alta 3)  
- Probe migrations Neon — `lastBenefitCycleAt` ausente; colunas H10C Subscription ausentes  

Artefatos: `reports/domain-guardian/go-h11/`

---

## Crítico

### C1 — H10A/B/C não em produção
Código e migrations locais; Neon sem colunas H10B/C; branch `main` sem commit H10.

### C2 — Integridade Alta = 3
- `coupon_dangling_appointment` ×1 — `12e8943b-45fe-4c31-9f47-b2ea5d475740`
- `appointment_without_order_or_payment` ×2 — appointments `32`, `33`

### C3 — Fluxos E2E reais não comprovados
Auditoria por código/DB/build. Sem browser/Asaas ponta a ponta nesta sessão.

### C4 — Middleware efetivamente inativo
Arquivo em `src/app/middleware.ts` (Next.js só carrega `src/middleware.ts` ou raiz). Manutenção, go-live e bloqueio de dev pages no edge **não rodam** ([auditoria de segurança](f2b561a9-0888-49ac-9ad6-c414cd6e86c3)).

---

## Alto

| ID | Achado | Evidência |
|---|---|---|
| H1 | Dual cancel | `/api/planos/cancelar` (legacy) vs `/api/assinatura/cancel` (H10C; Minha Conta) |
| H2 | Preços chat/IA ≠ catalog | `knowledgeBase` / `quickAnswers` (captação 50, master 60, …) vs `CHECKOUT_CATALOG` (55/80/…) |
| H3 | Shopping sem compra | page “em breve” + `/api/shopping/promotions` só gate |
| H4 | MP / InfinityPay vivos | `/api/mercadopago/*`, `/api/infinitypay/*` |
| H5 | Admin UI client-only | `admin/layout.tsx`; middleware libera `/api` |
| H6 | URL de entrega no client | `meus-dados` retorna `deliveryAudioUrl`; Blob/`public/uploads` públicos ([segurança](f2b561a9-0888-49ac-9ad6-c414cd6e86c3)) |
| H7 | Chat cita Mercado Pago | `knowledgeBase` / `quickAnswers` vs fluxo Asaas ([UX/preços](414da5ae-9824-4f82-a3bf-9bcec28d8b79)) |
| H8 | GO-H2B instrumentation em entrega | `DeliveryModal` / `upload-entrega` não prontos para prod |

---

## Médio

- M1 SEO só no root layout  
- M2 `processar-direto` com `secretKey`  
- M3 `solicitar-reembolso` legado ainda chamado  
- M4 Info inclui Sync órfão (75) além de History  
- M5 Dirty `DeliveryModal` / `upload-entrega` fora do pacote H10  

---

## Baixo

- L1 `console.log` em dezenas de arquivos  
- L2 TODO webhook Mercado Pago  
- L3 rota `/admin/serviços` (acento) no build  

---

## Sugestões

- Middleware server-side `/admin/*`  
- 410/remover providers legados  
- Entregas via URL assinada / proxy  
- Deprecar `/api/planos/cancelar`  
- Medir performance das páginas críticas em prod  

---

## Segurança (resumo)

- Admin APIs: role ADMIN (ou `requireAdmin`) — OK na amostragem  
- `/api/debug/*`: `requireAdmin`  
- Upload entrega: `requireAdmin`  
- Homologação: ADMIN + symbolic  
- Riscos: H4, H5, H6, M2  

---

## Performance

Não medida nesta sessão (sem Lighthouse/APM). Pendente: Home, Dashboard, Calendário, Minha Conta, Checkout.

---

## Próximos passos (ordem sugerida)

1. Saneamento Integridade Alta (cupom + apt 32/33).  
2. Commit H10A–C + `prisma migrate` no Neon + deploy (sem noise H2).  
3. Alinhar `knowledgeBase` / `quickAnswers` ao `CHECKOUT_CATALOG`.  
4. Decidir destino de cancel legacy e providers MP/Infinity.  
5. Checklist E2E manual (PARTE 2) + smoke pós-deploy.  
6. Re-executar GO-H11; só então liberar Beta/deploy.

**Nenhuma correção foi feita neste GO.**
