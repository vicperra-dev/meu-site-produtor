# THouse Rec — Operations

**Versão:** 1.0.0 · **Atualizado:** 2026-07-18

Índice operacional para release, auditoria e go-live. Nenhum comando aqui executa merge, push ou deploy automaticamente.

---

## GO-01 — Release Readiness (atual)

| Documento | Uso |
|-----------|-----|
| [Release Checklist](operations/go01-release-checklist.md) | Checklist oficial pré Go Live |
| [GO-02 Ready Checklist](operations/go02-ready-checklist.md) | Gate único para iniciar o smoke financeiro |
| [GO-02A Environment Readiness](operations/go02a-environment-readiness.md) | Preparação de env, migration, backup e webhook |
| [Operational Runbooks](operations/go01-operational-runbooks.md) | Deploy, rollback, backup, storage, gateway |
| [Asaas Audit + GO-02 financeiro](operations/go01-asaas-release-audit.md) | Infra Asaas + checklist smoke financeiro |
| [Migrations GO-01.1](architecture/go01-migrations.md) | Ordem, rollback, validação |
| [Architecture Freeze](architecture/architecture-freeze.md) | Congelamento oficial |
| [Homologation Engine](architecture/homologation-engine.md) | H1 + catálogo |

```bash
npm run homologation:scenarios
```

---

## Runbooks oficiais

| Documento | Uso |
|-----------|-----|
| [GO-03 Release Execution](../reports/domain-guardian/go03-release-execution.md) | 14 passos de go-live |
| [GO-04 Final Validation](../reports/domain-guardian/go04-final-validation.md) | Certificação pré-merge |
| [GO-02 Assembly](../reports/domain-guardian/go02-release-assembly.md) | Manifesto da candidata |
| [GO-01 Orchestration](../reports/domain-guardian/go01-release-orchestration.md) | Inventário e rollback |
| [Release Notes v1.0.0](releases/v1.0.0.md) | Notas da versão |
| [Architecture v1.0](architecture/v1.0-overview.md) | Snapshot arquitetural |
| [System Health](SYSTEM_HEALTH.md) | Diagnóstico e comandos |
| [Project Memory](PROJECT_MEMORY.md) | Memória técnica |

---

## Certificação (local)

```bash
npm run go04:certify              # validação completa GO-04A
npm run go04:certify -- --commit  # commit se gates PASS
npm run go02:assemble             # assembly da release
npm run go03:execute              # runbook + consistência
```

---

## Auditorias

```bash
npm run workflow:smoke
npm run domain:audit
npm run workflow:audit
npm run sync:audit
npm run sim:audit
npm run exec:audit
npm run graph:audit
npm run discovery:audit
npm run regression:audit
```

---

## Simulação e Test Engine

```bash
npm run sim:batch
npm run sim:batch:sim02
npm run te:suite:te02a
npm run te:suite:rc01
npm run te:suite:rc02
npm run te:suite:rc03
npm run te:suite:ph01
npm run te:suite:sync01a
```

---

## Certificações RC

```bash
npm run rc:certify
npm run rc02:certify
npm run rc03:certify
npm run rc04:certify
npm run launch01:certify
```

---

## Launch Reset

```bash
# Dry-run (seguro)
npm run launch01:reset

# Local
npm run launch01:reset -- --execute --confirm-local

# Production (NUNCA sem aprovação humana)
# LAUNCH01_CONFIRM_PRODUCTION=1 LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION"
# npm run launch01:reset -- --execute --confirm-production
```

---

## Build e migrations

```bash
npx prisma validate
npx prisma migrate deploy    # produção — apenas após aprovação
npm run build                # ou gate GO-02 com --use-system-ca no Windows
```

---

## Manutenção Go Live

Variável Vercel Production: `GO_LIVE_MAINTENANCE_MODE=1`

- Login: permitido
- Cadastro / compra / agendamento: bloqueados (não-admin)
- Admin: operação normal

Desativar: `GO_LIVE_MAINTENANCE_MODE=0` + redeploy.

---

## Contatos de escalação

| Papel | Responsabilidade |
|-------|------------------|
| Release Manager | Merge, push, go-live |
| DevOps | Vercel, env, manutenção |
| DBA | Neon, migrations, reset |
| QA Lead | Smoke, pagamento real |
| Domain Guardian | Auditorias e certificações |
