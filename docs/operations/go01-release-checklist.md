# GO-01.6 — Release Checklist oficial (pré Go Live)

Nenhum item pode depender de memória humana. Marcar ☐ → ☑ com data/responsável/evidência.

**Release Candidate:** GO-01 Architecture Freeze  
**Próxima etapa autorizada após PASS:** GO-02 — Financial Smoke (não iniciar automaticamente)

---

## A. Repositório

| # | Item | Evidência | ☐ |
|---|------|-----------|---|
| A1 | Git limpo (sem mudanças não commitadas relevantes) | `git status` | ☐ |
| A2 | Branch/tag RC identificada | hash + tag | ☐ |
| A3 | Diff vs main revisado (sem feature nova pós-freeze) | `git log` / PR | ☐ |
| A4 | Sem secrets commitados (`.env`, chaves) | revisão | ☐ |

## B. Backup e rollback

| # | Item | Evidência | ☐ |
|---|------|-----------|---|
| B1 | Backup do banco de produção realizado | ID snapshot / arquivo dump | ☐ |
| B2 | Backup restaurável validado (restore em cópia) | log restore + query smoke | ☐ |
| B3 | Plano de rollback documentado e entendido | [go01-migrations.md](../architecture/go01-migrations.md) + runbook | ☐ |
| B4 | Rollback de app (redeploy versão anterior) testado em preview | versão anterior sobe | ☐ |

## C. Migrations

| # | Item | Evidência | ☐ |
|---|------|-----------|---|
| C1 | Migration GO-01.1 presente no repo | `20260718120000_go01_payment_provider_coupon_service` | ☐ |
| C2 | Homologação: `prisma migrate deploy` | log | ☐ |
| C3 | Preview: `prisma migrate deploy` | log | ☐ |
| C4 | Produção: `prisma migrate deploy` (**nunca** `db push`) | log | ☐ |
| C5 | Validação SQL pós-migration (provider / providerPaymentId / Coupon.serviceId) | queries do runbook | ☐ |
| C6 | `prisma generate` no ambiente de build | CI/deploy log | ☐ |

## D. Qualidade / certificação

| # | Item | Evidência | ☐ |
|---|------|-----------|---|
| D1 | `npm run domain:audit` PASS | log | ☐ |
| D2 | `npm run workflow:audit` PASS | log | ☐ |
| D3 | `npm run workflow:smoke` PASS | log | ☐ |
| D4 | `npm run sync:audit` PASS | log | ☐ |
| D5 | `npm run regression:audit` PASS | log | ☐ |
| D6 | `npm run homologation:scenarios` PASS | log | ☐ |
| D7 | Homologation Engine E2E (cenários oficiais) PASS | painel / API | ☐ |

## E. Storage

| # | Item | Evidência | ☐ |
|---|------|-----------|---|
| E1 | `StorageProvider` em uso no upload de entrega | código + smoke upload | ☐ |
| E2 | `STORAGE_PROVIDER=local` (default) em todos os ambientes GO Live | env | ☐ |
| E3 | Cloud **não** habilitado até integração futura | env ≠ cloud | ☐ |
| E4 | Comportamento delivery path `/uploads/deliveries/*` inalterado | smoke admin | ☐ |

## F. Asaas / financeiro

| # | Item | Evidência | ☐ |
|---|------|-----------|---|
| F1 | Asaas auditado (GO-01.3) | [go01-asaas-release-audit.md](./go01-asaas-release-audit.md) | ☐ |
| F2 | Checklist financeiro GO-02 preenchível (pré-conds) | mesmo doc | ☐ |
| F3 | Smoke financeiro executado (GO-02) | relatório go02 | ☐ |
| F4 | Webhook URL + token conferidos no painel | screenshot/notas | ☐ |

## G. Deploy e Go Live

| # | Item | Evidência | ☐ |
|---|------|-----------|---|
| G1 | Deploy preview OK | URL | ☐ |
| G2 | Smoke preview (login admin, homologação, 1 página Minha Conta) | notas | ☐ |
| G3 | Deploy produção | URL + release id | ☐ |
| G4 | Smoke produção (não-financeiro) | checklist smoke ops | ☐ |
| G5 | GO-02 Financial Smoke PASS | relatório | ☐ |
| G6 | Go Live autorizado por humano | nome + data | ☐ |

---

## Gate de Architecture Freeze

Se qualquer alteração estrutural em Appointment / Services / Coupons / Workflow / Payments / State Machine / Homologation Engine for necessária: **parar Go Live**, abrir novo ciclo, recertificar.
