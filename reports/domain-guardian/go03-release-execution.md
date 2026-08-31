# GO-03 — Release Execution

**Gerado em:** 2026-07-15T21:52:21.141Z · **Versão:** 1.0.0

## Veredito

| Campo | Valor |
|-------|-------|
| Status | **APROVADO — runbook pronto** |
| Runbook pronto | **SIM** |
| Gates consistência | ALL PASS |

GO-02, RC-04 e LAUNCH-01 consistentes. Documentação v1.0.0 e arquitetura geradas. TypeScript OK. Execução operacional (merge/push/deploy) aguarda aprovação humana passo a passo.

---

## Fase 1 — Release Notes

Documento: [`docs/releases/v1.0.0.md`](../../docs/releases/v1.0.0.md)

---

## Fase 2 — Architecture Snapshot

Documento: [`docs/architecture/v1.0-overview.md`](../../docs/architecture/v1.0-overview.md)

---

## Fase 3 — Release Execution Plan

### 1. Ativar Maintenance Mode

**Responsável:** DevOps

1. Acessar Vercel → Project → Settings → Environment Variables → Production
1. Definir GO_LIVE_MAINTENANCE_MODE=1
1. Opcional: SiteSettings.maintenanceMode=false (GO_LIVE tem precedência para rotas bloqueadas)
1. Salvar e aguardar redeploy automático OU disparar redeploy manual
1. Validar: visitante em /registro redireciona para /manutencao?mode=golive
1. Validar: admin logado acessa /admin normalmente

**Rollback deste passo:** GO_LIVE_MAINTENANCE_MODE=0 + redeploy

### 2. Merge

**Responsável:** Release Manager

1. git fetch origin
1. git checkout main
1. git pull origin main
1. git merge backup-pre-formatacao --no-ff -m "release: merge v1.0.0 candidate"
1. Resolver conflitos se houver (nunca aceitar perda de migrations)
1. git log -1 --oneline (confirmar merge commit)

**Rollback deste passo:** git revert -m 1 <merge-commit-sha>

### 3. Push

**Responsável:** Release Manager

1. Confirmar aprovação humana explícita antes do push
1. git push origin main
1. Verificar no GitHub: branch main atualizada

**Rollback deste passo:** git revert + push (não force-push em main)

### 4. Deploy

**Responsável:** DevOps

1. Aguardar Vercel Production build (branch main)
1. URL: https://www.thouse-rec.com.br
1. Verificar build logs: sem erro, prisma generate OK
1. Confirmar deployment Ready

**Rollback deste passo:** Vercel → Promote deployment anterior

### 5. Prisma migrate deploy

**Responsável:** DBA

1. Conectar DATABASE_URL de Production (Neon)
1. npx prisma migrate deploy
1. Confirmar 33 migrations aplicadas
1. npx prisma migrate status → Database schema is up to date
1. Se HS-01 falhar (CPF duplicado): resolver dados antes de continuar

**Rollback deste passo:** Neon PITR restore para timestamp pré-deploy

### 6. Launch Reset

**Responsável:** DBA + Release Manager

1. Backup Neon confirmado (PITR < 1h)
1. LAUNCH01_CONFIRM_PRODUCTION=1
1. LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION"
1. npm run launch01:reset -- --execute --confirm-production
1. Verificar launch01-reset-result.json: preservedAdmin=true
1. Confirmar 1 usuário (Victor ADMIN) no banco

**Rollback deste passo:** Neon PITR — nunca usar reset como rollback

### 7. Smoke Test

**Responsável:** QA Lead

1. npm run workflow:smoke (local apontando prod read-only OU probes HTTP)
1. GET https://www.thouse-rec.com.br → 200
1. GET /login, /registro, /agendamento, /minha-conta, /admin → 200
1. POST /api/webhooks/asaas sem token → 401 (Token inválido)

**Rollback deste passo:** Ativar maintenance + investigar

### 8. Pagamento real

**Responsável:** QA Lead

1. Admin desativa GO_LIVE temporariamente OU usa conta admin
1. Fluxo: serviço avulso mínimo (valor simbólico se possível)
1. Pagar no Asaas produção
1. Aguardar webhook (até 60s)
1. Confirmar Payment + Appointment em Minha Conta
1. Registrar asaasId e appointmentId no checklist

**Rollback deste passo:** Reembolso manual Asaas se cobrança indevida

### 9. Reembolso real

**Responsável:** QA Lead + Admin

1. Admin cancela agendamento de teste
1. Cliente escolhe reembolso financeiro em Minha Conta
1. Confirmar refund no Asaas + status local
1. Alternativa: cupom de reembolso (registrar qual fluxo testado)

**Rollback deste passo:** N/A — documentar IDs para auditoria

### 10. Plano real

**Responsável:** QA Lead

1. Comprar plano Bronze (mensal) com pagamento real
1. Webhook cria UserPlan ativo
1. Verificar em Minha Conta + painel admin

**Rollback deste passo:** Cancelar plano admin + reembolso se necessário

### 11. Desativar Maintenance Mode

**Responsável:** DevOps

1. Vercel: GO_LIVE_MAINTENANCE_MODE=0
1. Redeploy Production
1. Validar: /registro e /agendamento acessíveis

**Rollback deste passo:** GO_LIVE_MAINTENANCE_MODE=1

### 12. Abrir sistema

**Responsável:** Release Manager

1. Comunicar equipe: go-live ativo
1. Monitorar Vercel logs primeiros 15 min
1. Verificar primeiro acesso público sem erro 5xx

**Rollback deste passo:** Passo 11 imediato

### 13. Monitorar 24h

**Responsável:** DevOps + QA

1. Revisar webhooks falhos no painel Asaas
1. Tickets 'paguei e não apareceu'
1. Uptime Vercel > 99%
1. Zero erros críticos em logs

**Rollback deste passo:** Ver Rollback Card

### 14. Monitorar 48h

**Responsável:** Release Manager

1. Retrospectiva GO-03
1. Arquivar relatórios domain-guardian
1. Decidir início v1.1 (ver Post-Launch Plan)

**Rollback deste passo:** N/A

---

## Fase 4 — Production Validation Checklist

| ☐ | ID | Item | PASS | FAIL | Observações |
|---|-----|------|------|------|-------------|
| ☐ | PC-01 | GO_LIVE_MAINTENANCE_MODE=1 antes do merge/deploy | | | |
| ☐ | PC-02 | Backup Neon recente (< 1h) | | | |
| ☐ | PC-03 | Merge backup-pre-formatacao → main sem conflitos | | | |
| ☐ | PC-04 | Push origin/main concluído | | | |
| ☐ | PC-05 | Vercel Production build SUCCESS | | | |
| ☐ | PC-06 | prisma migrate deploy — 33 migrations | | | |
| ☐ | PC-07 | Launch reset — ADMIN Victor preservado | | | |
| ☐ | PC-08 | Smoke routes HTTP 200 | | | |
| ☐ | PC-09 | Webhook Asaas token válido | | | |
| ☐ | PC-10 | Pagamento real → Payment + Appointment | | | |
| ☐ | PC-11 | Reembolso real testado | | | |
| ☐ | PC-12 | Plano real testado | | | |
| ☐ | PC-13 | GO_LIVE_MAINTENANCE_MODE=0 pós-validação | | | |
| ☐ | PC-14 | NEXT_PUBLIC_SITE_URL=https://www.thouse-rec.com.br | | | |
| ☐ | PC-15 | ASAAS_API_KEY produção configurada | | | |
| ☐ | PC-16 | ASAAS_WEBHOOK_ACCESS_TOKEN configurado | | | |
| ☐ | PC-17 | SESSION_SECRET configurado | | | |
| ☐ | PC-18 | GMAIL_USER + GMAIL_APP_PASSWORD (email) | | | |
| ☐ | PC-19 | Primeiro cliente real sem suporte manual | | | |
| ☐ | PC-20 | 24h sem incidente crítico | | | |

---

## Fase 5 — Rollback Card

### cancelDeploy

- Vercel Dashboard → Deployments → ⋯ no deploy anterior estável → Promote to Production
- Alternativa: git revert do merge + push + aguardar redeploy

### restoreDatabase

- Neon Console → Branch → Restore → escolher timestamp anterior ao reset
- Nunca executar launch01:reset para 'desfazer' erro
- Após restore: verificar prisma migrate status

### revertVersion

- git checkout <sha-anterior> ou tag
- Vercel promote deployment correspondente
- Confirmar compatibilidade schema ↔ código

### stopPayments

- GO_LIVE_MAINTENANCE_MODE=1 imediato
- SiteSettings.maintenanceMode=true via /admin/manutencao
- Desativar webhook no painel Asaas (último recurso)

### activateMaintenance

- GO_LIVE_MAINTENANCE_MODE=1 em Vercel Production
- Redeploy
- Mensagem: preparativos finais para lançamento

---

## Fase 6 — Post-Launch Plan

### first24h

- Monitorar logs Vercel a cada 2h
- Revisar fila webhooks Asaas
- Responder tickets em < 2h
- Confirmar zero pagamentos órfãos

### firstWeek

- Daily check: agendamentos pendentes > 24h
- Revisar DomainTransitionHistory anomalias
- Coletar feedback UX (E2E-02 itens H1)
- Retrospectiva GO-03 documentada

### firstMonth

- Métricas: conversão registro→pagamento
- Taxa webhook success > 99%
- Planejar sprint v1.1 (E2E-02 H1)

### criteriaV11

- 7 dias sem ticket crítico de pagamento
- Webhook estável em produção
- ≥ 5 agendamentos reais concluídos
- Aprovação Release Manager

### criteriaPortfolio

- v1.0 estável ≥ 30 dias
- v1.1 H1 entregue
- Capacidade de equipe separada do operacional

### criteriaStudioOS

- v1.0 + v1.1 estáveis
- Domínio congelamento levantado por ADR
- Aprovação explícita stakeholders
- Não iniciar antes do fim do hardening E2E-02

---

## Fase 7 — Gates (consistência)

- [PASS] **go02-report-exists**: APROVADO — candidata v1.0
- [PASS] **go02-readiness-sim**: Todos os gates técnicos (TypeScript, build, Prisma, auditorias) passaram. A branch consolida 15 commits de hardening, ce
- [PASS] **go02-gates-all-pass**: ALL PASS
- [PASS] **rc04-report-exists**: APROVADO COM RESSALVAS
- [PASS] **rc04-no-section-fail**: sectionsFail=0
- [PASS] **rc04-gates-pass**: gates 16/16
- [PASS] **launch01-report-exists**: APROVADO COM RESSALVAS
- [PASS] **launch01-no-phase-fail**: OK
- [PASS] **doc-v1.0.0.md**: docs/releases/v1.0.0.md
- [PASS] **doc-v1.0-overview.md**: docs/architecture/v1.0-overview.md
- [PASS] **typescript-consistency**

---

**Nenhum merge, push ou deploy executado.** Aguardar aprovação humana.
