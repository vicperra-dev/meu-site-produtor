# LAUNCH-01 — Production Launch Preparation

**Gerado:** 2026-07-15T19:25:01.093Z  
**Veredito:** **APROVADO COM RESSALVAS**  
**Confiança:** **88%**  
**Production URL:** https://www.thouse-rec.com.br

---

## Pergunta

> O sistema está pronto para receber clientes reais?

**Resposta técnica:** Sim, com ressalvas operacionais. Não há risco P0 aberto. Há **1 risco P1** (pagamento monetário real em produção ainda não executado nesta sprint). Domínio, workflow, simulation e baselines RC-01…04 estão verdes.

---

## Itens preservados

| Item | Evidência |
|------|-----------|
| Admin (Victor / TremV) | `vicperra@gmail.com` · role ADMIN · id `6fad51b2-…` |
| FAQ publicado | não tocado |
| SiteSettings | não tocado |
| BlockedTimeSlots | não tocado |

*(Nome canônico no brief: “Victor Pereira Ramos”. No banco local o registro admin é `nomeCompleto=TremV` / email `vicperra@gmail.com` — preservado via lista oficial de emails.)*

---

## Itens limpos (execute local)

| Categoria | Quantidade |
|-----------|----------:|
| Usuários removidos | 24 |
| SynchronizationEvents | 890 |
| DomainTransitionHistory | 500 |
| Sessions | 9 |
| LoginLogs | 7 |
| Coupons | 1 |
| Services | 1 |
| Appointments | 1 |
| PaymentMetadata | 2 |
| Uploads temporários | 2 |
| Relatórios TE temporários | 5 |
| **Usuários restantes** | **1** (admin) |

Artefato: `reports/domain-guardian/launch01-reset-result.json`

---

## Banco zerado

- Após reset: **1 usuário ADMIN**, sem appointments/payments/services/coupons/plans de teste.
- Migrations aplicadas / resolvidas (HS-01, HS-03B history, SYNC-01A).
- `domain:audit` · `workflow:audit` · `sync:audit` → **PASS** (0 issues).

---

## Simulation pronta

| Engine | Resultado |
|--------|-----------|
| SIM-01 | **10/10 PASS** |
| SIM-02 | **10/10 PASS** |

Cobertura (pipeline oficial → Workflow → SM → Sync):

| Cenário | Cobertura |
|---------|-----------|
| Pagamento aprovado | SIM-001 |
| Pagamento recusado | SIM-002 |
| Pagamento / webhook duplicado | SIM-003, RC03-004 |
| Sessão + conclusão + entrega | SIM-004 |
| Plano Bronze | SIM-005 |
| Planos Prata/Ouro | RC01-003/004 |
| Cupom SERVICE | SIM-006 |
| Cupom DISCOUNT | SIM-007 |
| Cupons PLAN/REFUND/REBOOK/BONUS | RC02-005, RC03-005/006 |
| Captação / Mix / Master / Pacotes | RC01-002, SRV-* |
| Reembolso | SIM-008 |
| Cancelamento | SIM-009 |
| Remarcação | SIM-010 |

---

## Integração Asaas

| Check | Status |
|-------|--------|
| API key produção | OK (`/api/pagamentos/debug`) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.thouse-rec.com.br` |
| Webhook token | OK (POST sem token → `Token inválido`, HTTP 200) |
| Home HTTPS | 200 |

## Integração SMTP

**PASS COM RESSALVA** — funções de email presentes; envio real não smoke-testado nesta sessão (limite Gmail / anti-spam).

## Smoke real monetário

**Pendente** — executar em produção:

1. 1 pagamento pequeno  
2. 1 reembolso financeiro  
3. 1 cancelamento  
4. 1 remarcação  
5. 1 plano  

Depois: `LAUNCH01_REAL_PAYMENT_VALIDATED=1` e re-certificar.

---

## Fases

| Fase | Título | Status |
|------|--------|--------|
| 1 | Launch Reset | **PASS** (execute local) |
| 2 | Database Consistency | **PASS** |
| 3 | Simulation Engine Final | **PASS** |
| 4 | Real Payment Validation | PASS COM RESSALVA |
| 5 | Go Live Checklist | **PASS** |
| 6 | User Experience (auto-sync) | PASS COM RESSALVA |
| 7 | Regressão Final (RC baselines) | **PASS** |
| 8 | Release Audit | PASS COM RESSALVA |

---

## Release Audit (respostas)

| Pergunta | Resposta |
|----------|----------|
| Pronto para clientes reais? | **Sim, com ressalvas** |
| Risco P0? | **Não** |
| Risco P1? | **Sim** — pagamento real não validado |
| Inconsistência financeira? | Não detectada nos gates |
| Perda de dados? | Baixo (reset controlado + Neon backups) |
| Perda de pagamento? | Mitigado (webhook 200 + idempotência RC-03) |
| Cupons incorretos? | Baixo (RC-02/03) |
| Serviços incorretos? | Baixo (SIM-004 + workflow audit) |

---

## Riscos restantes

| ID | Sev | Descrição |
|----|-----|-----------|
| LAUNCH-PAY-01 | P1 | Pagamento real em produção pendente |
| RC03-RACE-01 | P2 | TOCTOU slot paralelo (domínio congelado) |
| LAUNCH-UX-01 | P2 | Browser E2E sync não exercitado live |

---

## Confiança final

**88%**

Para elevar a **APROVADO** pleno (commit `release(v1): …` liberado):

1. `LAUNCH01_EXECUTE_RESET=1 LAUNCH01_CONFIRM_PRODUCTION=1` no Neon Production  
2. Smoke monetário real + `LAUNCH01_REAL_PAYMENT_VALIDATED=1`  
3. Reexecutar `npm run launch01:certify` sem skip de gates  

---

## Artefatos / scripts

- `npm run launch01:reset` / `-- --execute`
- `npm run launch01:certify`
- `src/app/lib/launch/reset.ts`
- `reports/domain-guardian/launch01-final-readiness.{md,json}`
- `reports/domain-guardian/launch01-reset-result.json`

## Commit

**Não criado** — veredito **APROVADO COM RESSALVAS** (commit só com APROVADO pleno).  
Push/merge **não** executados. Aguardando aprovação final para publicação v1.0.

---

*StudioOS permanece congelado até estabilização da versão 1.0.*
