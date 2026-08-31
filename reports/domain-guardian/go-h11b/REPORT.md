# GO-H11B — Relatório de Liberação Beta

**Data:** 2026-07-28  
**Responsável (execução assistida):** Cursor Agent + operador  
**Versão liberada (candidata):** `v1.0.0-beta.1`

---

## Decisão final

### **Beta TECNICAMENTE PUBLICADO — abertura oficial PENDENTE**

| Critério PARTE 9 | Status |
|------------------|--------|
| Deploy concluído | **PASS** |
| Migrations concluídas (Neon) | **PASS** (já aplicadas no GO-H11A; reconfirmadas) |
| Smoke test aprovado | **PASS** (16/16) |
| Todos os fluxos E2E aprovados | **PENDENTE (manual)** |
| Nenhuma falha crítica no smoke | **PASS** |
| Logs estáveis 48h | **EM OBSERVAÇÃO** (iniciado pós-deploy) |

**Justificativa:** o runbook operacional de publicação (freeze → commit → push → migrations validadas → deploy Vercel → smoke) foi concluído com sucesso. A **abertura oficial** do Beta (receber usuários de teste) permanece **bloqueada** até a conclusão dos 6 fluxos E2E reais (`E2E-CHECKLIST.md`) e estabilidade nas primeiras 48h (`MONITORING-48H.md`).

---

## Versão / commit / deploy

| Campo | Valor |
|-------|-------|
| Versão | `v1.0.0-beta.1` |
| Commit | `179faf2ba40d5f1e4a03960124d200af5bacdf8d` |
| Mensagem | `release(beta): consolidate GO-H10A–H11A for v1.0.0-beta.1` |
| Branch | `main` (pushed `origin/main`) |
| Ambiente | Produção — `https://www.thouse-rec.com.br` |
| Deployment ID | `dpl_2KsEFHDL2f6FCQnEfRkbDBxG8o8Z` |
| Deployment URL | `https://meu-site-produtor-13-ouf7u8lk9-rauls-projects-6bf8a8b0.vercel.app` |
| Inspector | `https://vercel.com/rauls-projects-6bf8a8b0/meu-site-produtor-1.3/2KsEFHDL2f6FCQnEfRkbDBxG8o8Z` |
| Horário deploy (aprox.) | 2026-07-28T21:45:15Z |
| Middleware | Detectado no build (`ƒ Proxy (Middleware)`) |

---

## PARTE 1 — Release freeze

Registrado em `RELEASE-FREEZE.md`. Escopo: apenas H10A–H11A. Artefatos GO-H1/H2 **excluídos** do commit.

---

## PARTE 2 — Commit

- 94 arquivos no commit de release  
- Excluídos: scripts/relatórios `go-h1*` / `go-h2*` (permanecem untracked locais)  
- Working tree da release limpa quanto ao escopo Beta

---

## PARTE 3 — Backup

| Item | Status |
|------|--------|
| Runbook rollback | `BACKUP-ROLLBACK.md` |
| `pg_dump` local | **indisponível** neste host (`pg_dump` não encontrado) |
| PITR Neon | **obrigatório no console Neon** — operador deve anotar `BACKUP_PITR_AT` se ainda não anotou antes das migrations H10 (migrations já estavam aplicadas desde H11A) |
| Schema probe pós-release | `lastBenefitCycleAt` + cols H10C = **OK** (`migration-probe.json` atualizado) |
| Hash commit | `179faf2…` |

> Mitigação: migrations H10B/C já estavam aplicadas e estáveis antes deste deploy de app; risco principal do H11B é rollback de **aplicação** (Vercel Instant Rollback), não de schema.

---

## PARTE 4 — Migrations

- Reprobe Neon: **h10c_ready: true**  
- Colunas: `lastBenefitCycleAt`, `cyclesRemaining`, `failureCount`, `gracePeriodEndsAt`, `lastFailureAt`, `rootPaymentId`  
- Nenhuma migration nova neste GO além das já deployadas no H11A

---

## PARTE 5 — Deploy

Concluído via `npx vercel --prod` (conta `vicperra-6789`), alias em `www.thouse-rec.com.br`.

---

## PARTE 6 — Smoke pós-deploy

Artefato: `smoke-prod.json`

| Grupo | Resultado |
|-------|-----------|
| Público (Home/Planos/FAQ/Shopping/Login/Cadastro/Termos) | PASS |
| site-status / payment-provider | PASS |
| Legados cancelar/MP/Infinity → 410 | PASS |
| Proxy entregas sem auth → 401 | PASS |
| Admin sem auth | 200 (página; gate server + client redirect — reforçar validação no E2E login) |

**Total:** 16/16 PASS (duas execuções: pré e pós alias)

---

## PARTE 7 — E2E reais

**Não executados automaticamente** (dependem de contas + Asaas + aceite admin).  
Checklist: `E2E-CHECKLIST.md` — todos os itens ☐ pendentes.

---

## PARTE 8 — Monitoramento 48h

Plano: `MONITORING-48H.md`. Incidentes no momento do GO: nenhum registrado.

---

## PARTE 10 — Rollback

Documentado e pronto: `BACKUP-ROLLBACK.md`  
Teste controlado sugerido: Instant Rollback no Vercel Preview/Production anterior (operador).

---

## Incidentes

Nenhum incidente crítico durante commit/push/deploy/smoke.

Observação infra: CLI Vercel exigiu `NODE_OPTIONS=--use-system-ca` neste host (TLS).

---

## Próximas ações do operador (para abrir o Beta oficialmente)

1. Anotar PITR Neon / confirmar backup  
2. Executar `E2E-CHECKLIST.md` com contas de teste  
3. Observar 48h (`MONITORING-48H.md`)  
4. Se tudo PASS → declarar **Beta oficialmente aberto** (addendum neste relatório)  
5. Se falha crítica → Instant Rollback Vercel + comunicar manutenção  
