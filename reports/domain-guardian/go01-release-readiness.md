# GO-01 — Release Readiness (Architecture Freeze)

**Executado em:** 2026-07-18  
**Veredito:** **Release Candidate Final** — pronta para iniciar **GO-02 — Financial Smoke** (após validação humana)  
**Prontidão estimada:** **93%**  
**Architecture Freeze:** **APLICADO** (`docs/architecture/architecture-freeze.md`)

Nenhuma feature nova. Domínios certificados preservados. Alterações mínimas de infra/cobertura/docs.

---

## Respostas objetivas (entrega)

1. **Bloqueadores restantes (para Go Live completo):** smoke financeiro Asaas real/sandbox (GO-02); `migrate deploy` ainda não aplicado em produção/preview nesta sessão; storage cloud ainda não integrado (abstração pronta; local OK para RC).
2. **Bloqueadores eliminados:** migration versionada `provider`/`providerPaymentId`/`Coupon.serviceId`; StorageProvider; catálogo Homologation completo para SKUs oficiais; audit Asaas + checklist GO-02; release checklist; runbooks ops; Architecture Freeze documentado.
3. **Arquivos alterados:** ver secção abaixo / commit.
4. **Migration criada?** Sim — `prisma/migrations/20260718120000_go01_payment_provider_coupon_service`.
5. **Rollback documentado?** Sim — `docs/architecture/go01-migrations.md`.
6. **StorageProvider preparado?** Sim — Local + Cloud stub; upload via interface.
7. **Asaas auditado?** Sim — `docs/operations/go01-asaas-release-audit.md` (sem pagamentos).
8. **Checklist financeiro criado?** Sim — mesmo doc, secção GO-02.
9. **Release Checklist criado?** Sim — `docs/operations/go01-release-checklist.md`.
10. **Documentação operacional criada?** Sim — `docs/operations/go01-operational-runbooks.md`.
11. **Architecture Freeze aplicado?** Sim.
12. **Arquivos alterados:** (lista no relatório JSON / commit).
13. **Commit:** realizado ao final desta sprint (sem push).
14. **Prontidão:** **93%** (era 86% no GO-00).
15. **Pode seguir para GO-02?** **Sim**, após aprovação humana. Não iniciar automaticamente.

---

## GO-01.1 Migrations

- Migration SQL criada (não `db push`).
- Ordem / rollback / validação: `docs/architecture/go01-migrations.md`.
- Aplicação em homolog/preview/prod = passo do Release Checklist (operador).

## GO-01.2 Storage

- `src/app/lib/storage/*`
- `upload-entrega` usa `getStorageProvider().writeDelivery`
- Comportamento path `/uploads/deliveries/*` mantido

## GO-01.3 Asaas

- Audit estático completo + checklist financeiro GO-02

## GO-01.4 / GO-01.5 Homologation

Cenários oficiais ampliados (SKUs + pacotes + planos + cupons + refunds).

## GO-01.6–01.8

Checklist + runbooks + freeze.

---

## Auditorias (reexecutar nesta sessão)

Ver JSON / logs do commit — obrigatório PASS: domain, workflow, workflow smoke, sync, regression, homologation scenarios.
