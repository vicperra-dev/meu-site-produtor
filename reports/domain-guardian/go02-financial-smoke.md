# GO-02 — Financial Smoke Certification

**Executado em:** 2026-07-18  
**Veredito:** **STOP — PRE-SMOKE FAIL**  
**Financial Smoke:** **NÃO EXECUTADO**  
**Architecture Freeze:** **MANTIDO**  
**Prontidão:** **93%** (inalterada — bloqueio operacional, não de produto)

Regra aplicada: nenhum pagamento real/sandbox foi criado. Nenhum código de domínio alterado.

---

## FASE 1 — Checklist pré-smoke

Artefato: `reports/domain-guardian/go02-presmoke-checklist.json`  
Script: `scripts/go02-presmoke-checklist.ts`

| Gate | Resultado | Detalhe |
|------|-----------|---------|
| Architecture Freeze doc | PASS | `docs/architecture/architecture-freeze.md` |
| RC GO-01 | PASS | HEAD `3eb06d5` |
| Migration file pronta | PASS | `20260718120000_go01_payment_provider_coupon_service` |
| DATABASE_URL presente | PASS | **localhost** `thouse_rec` (não é DB de produção) |
| ASAAS_API_KEY presente | PASS | prefix `$aact_hmlg_…` → **sandbox/homolog**, não produção |
| ASAAS_WEBHOOK_ACCESS_TOKEN | **FAIL** | **MISSING** no ambiente local |
| URL pública (webhook) | FAIL (soft) | NEXTAUTH_URL / NEXT_PUBLIC_APP_URL ausente |
| ASAAS_SKIP_TLS_VERIFY | FAIL (soft) | `true` (só aceitável em dev) |
| Storage local | PASS | `local` |
| Backup restaurável validado | **FAIL** | sem confirmação humana `GO02_CONFIRM_BACKUP=1` |
| Migrate deploy no alvo | **FAIL** | sem confirmação `GO02_CONFIRM_MIGRATE=1` |
| Webhook painel acessível | **FAIL** | sem confirmação `GO02_CONFIRM_WEBHOOK=1` |
| Release Checklist completo | **FAIL** | sem confirmação `GO02_CONFIRM_CHECKLIST=1` |
| Ambiente Asaas explícito | **FAIL** | `GO02_ASAAS_ENV` não definido |
| Git limpo | FAIL (soft) | `launch01-reset-result.json` + script pré-smoke |

### Hard fails (obrigam PARAR)

1. `webhook_token_present`  
2. `backup_restorable_validated`  
3. `migration_deployed_target`  
4. `webhook_reachable_configured`  
5. `release_checklist_complete`  
6. `asaas_env_explicit`

**Ação tomada:** PARAR. Fases 2–5 não iniciadas.

---

## FASES 2–5 — Pagamento / Refund / Webhook

**Não executadas** (gate pré-smoke).

| Item | Status |
|------|--------|
| 1 pagamento real | NÃO EXECUTADO |
| Cancelamento | NÃO EXECUTADO |
| Reembolso financeiro | NÃO EXECUTADO |
| Comparação Homologation vs Asaas | NÃO EXECUTADA |

---

## FASE 6 — Auditorias

Não reexecutadas nesta sessão após STOP (nenhum estado financeiro alterado).  
Última certificação GO-01: domain / workflow / smoke / sync / regression / homologation = PASS.

Para retomar GO-02 após gates: reexecutar a suíte completa pós-smoke.

---

## FASE 7 — Certificação Homologation vs Produção

**Não certificável nesta sessão.**

Diferenças Homologation ↔ Asaas Production: **não medidas** (smoke financeiro bloqueado).

---

## Como desbloquear (operador humano)

1. Completar Release Checklist (`docs/operations/go01-release-checklist.md`) seções A–F.  
2. Validar backup restaurável; exportar `GO02_CONFIRM_BACKUP=1`.  
3. `npx prisma migrate deploy` no DB alvo (homolog → preview → prod); `GO02_CONFIRM_MIGRATE=1`.  
4. Configurar `ASAAS_WEBHOOK_ACCESS_TOKEN` no app **e** no painel Asaas.  
5. Publicar URL HTTPS acessível; webhook = `https://<host>/api/webhooks/asaas`.  
6. Confirmar painel: `GO02_CONFIRM_WEBHOOK=1`.  
7. Definir explicitamente `GO02_ASAAS_ENV=sandbox` (recomendado) ou `production`.  
8. Preferir sandbox (`$aact_hmlg_`) antes de produção.  
9. Rodar: `npx tsx --tsconfig tsconfig.json scripts/go02-presmoke-checklist.ts` → verdict **READY**.  
10. Só então executar exatamente 1 pagamento + 1 cancel + 1 refund.

---

## Respostas objetivas (entrega)

1. Pagamento aprovado? **Não — não executado (STOP pré-smoke)**  
2. Webhook recebido? **Não — não executado**  
3. Appointment criado? **Não — não executado**  
4. Service criado? **Não — não executado**  
5. Coupons corretos? **N/A — não executado**  
6. Workflow correto? **N/A — não executado**  
7. Minha Conta correta? **N/A — não executado**  
8. Dashboard correto? **N/A — não executado**  
9. Admin correto? **N/A — não executado**  
10. Refund aprovado? **Não — não executado**  
11. Webhook refund recebido? **Não — não executado**  
12. Workflow refund correto? **N/A — não executado**  
13. Domain PASS? **Não reexecutado nesta sessão** (GO-01 PASS; sem mudança de domínio)  
14. Workflow PASS? **Não reexecutado nesta sessão** (GO-01 PASS)  
15. Regression PASS? **Não reexecutado nesta sessão** (GO-01 PASS)  
16. Diferenças Homologation vs Produção: **Não medidas — smoke bloqueado**  
17. Arquivos alterados: relatório + checklist script + JSON pré-smoke (sem domínio)  
18. Foi necessário alterar código de produto? **Não**  
19. Commit: relatório/checklist apenas (se aprovado no fluxo de commit desta sprint)  
20. Prontidão: **93%**  
21. Pode seguir para GO-03? **Não** — Financial Smoke não PASS

---

## Declaração

- Financial Smoke: **FAIL / STOP (pré-smoke)**  
- Architecture Freeze: **MANTIDO**  
- Release Candidate: **mantido** (GO-01), **não** promovido a GO-03  
- Próximo passo: desbloquear gates humanos → reexecutar GO-02 do zero
