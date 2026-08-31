# GO-01 — Go Live Orchestration

**Gerado em:** 2026-07-15T20:53:21.499Z · **Modo:** preparação operacional (nada executado em produção)

## Veredito

| Campo | Valor |
|-------|-------|
| Status | **APROVADO PARA DOCUMENTAÇÃO** |
| Confiança | 90% |
| Gates | PASS |

---

## Fase 1 — Release Inventory

| Item | Valor |
|------|-------|
| Branch atual | `backup-pre-formatacao` |
| HEAD | `a6670ffbbbf4c7448769a11af96f3174fd63af6e` |
| Branch produção | `main` @ `7057b13d5e7e7947a8eb3fa32ae116773cf6706a` |
| Commits à frente de main | 14 |
| Migrations no repo | 33 |
| URL produção | https://www.thouse-rec.com.br |
| Alias Vercel | https://meu-site-produtor-13.vercel.app |

### Commits pendentes (não em main)

- `a6670ff test(rc): certify security permissions and concurrency`
- `e32fdba test(rc): certify administration and operations workflow`
- `2171e83 test(rc): certify complete customer journey`
- `f355143 fix(golive): finalize production readiness and critical business validation`
- `8a613c5 feat(ph01): product hardening and business validation`
- `0e4e259 refactor(core): introduce unified execution core platform (EC-01)`
- `67dcc81 feat(sim): implement official domain simulation engine (SIM-01)`
- `36f3824 feat(sync): implement realtime domain synchronization engine (SYNC-01A)`
- `362d347 test(te02): implement business validation suite batch 1`
- `b8e1d8e refactor(workflow): consolidate official state machine (HS-03B)`
- `7e89aff refactor(domain): consolidate operational domain (HS-03A)`
- `7238fc7 feat(test-engine): implement core scenario runner (TE-01B)`
- `3089b49 refactor(service): consolidate Service as operational authority (HS-02B)`
- `53d9c97 backup: HS-01 antes da formatação do computador`

### Scripts oficiais

- `npm run rc:certify`
- `npm run rc02:certify`
- `npm run rc03:certify`
- `npm run rc04:certify`
- `npm run launch01:reset`
- `npm run launch01:certify`
- `npm run go01:orchestrate`
- `npm run golive:cleanup`
- `npm run workflow:smoke`
- `npm run domain:audit`
- `npm run workflow:audit`
- `npm run sync:audit`
- `npm run sim:audit`
- `npm run exec:audit`
- `npm run regression:audit`
- `npm run te:run`
- `npm run sim:run`

### Variáveis obrigatórias (presença local)

- `DATABASE_URL`: configurada
- `ASAAS_API_KEY`: configurada
- `ASAAS_WEBHOOK_ACCESS_TOKEN`: ausente
- `NEXT_PUBLIC_SITE_URL`: configurada
- `GMAIL_USER`: ausente
- `GMAIL_APP_PASSWORD`: ausente
- `SESSION_SECRET`: ausente
- `GO_LIVE_MAINTENANCE_MODE`: ausente

### Ambientes

| Ambiente | URL / destino | Notas |
|----------|---------------|-------|
| Local | http://localhost:3000 | DATABASE_URL local; webhook Asaas não alcança |
| Preview | https://meu-site-produtor-13.vercel.app | VERCEL_ENV=preview |
| Production | https://www.thouse-rec.com.br | Branch main; Neon production |

---

## Fase 2 — Release Plan

### PASSO 1 — Revisar inventário GO-01
- **Ação:** Ler reports/domain-guardian/go01-release-orchestration.md e confirmar branch/commits/migrations.
- **Responsável:** Release Manager
- **Automático:** não

### PASSO 2 — Gates locais
- **Ação:** npm run go01:orchestrate — typescript, prisma validate, workflow-smoke devem PASS.
- **Responsável:** QA Lead
- **Automático:** sim

### PASSO 3 — Certificações RC
- **Ação:** npm run rc04:certify && npm run launch01:certify — revisar relatórios; resolver ressalvas críticas.
- **Responsável:** Domain Guardian
- **Automático:** não

### PASSO 4 — Ativar modo manutenção Go Live
- **Ação:** Em Vercel Production: GO_LIVE_MAINTENANCE_MODE=1. Login admin OK; cadastro/compra/agendamento bloqueados.
- **Responsável:** DevOps
- **Automático:** não

### PASSO 5 — Merge para main
- **Ação:** git checkout main && git merge backup-pre-formatacao (ou PR aprovada). Não fazer push automático.
- **Responsável:** Release Manager
- **Automático:** não

### PASSO 6 — Push origin/main
- **Ação:** git push origin main — apenas após aprovação explícita do responsável.
- **Responsável:** Release Manager
- **Automático:** não

### PASSO 7 — Deploy Vercel
- **Ação:** Aguardar build Production em https://www.thouse-rec.com.br. Verificar logs sem erro.
- **Responsável:** DevOps
- **Automático:** não

### PASSO 8 — Migrations produção
- **Ação:** npx prisma migrate deploy no ambiente Production (Neon). Confirmar 33 migrations aplicadas.
- **Responsável:** DBA
- **Automático:** não

### PASSO 9 — Reset produção (homolog apenas)
- **Ação:** LAUNCH01_CONFIRM_PRODUCTION=1 LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION" npm run launch01:reset -- --execute --confirm-production
- **Responsável:** DBA + Release Manager
- **Automático:** não

### PASSO 10 — Smoke pós-deploy
- **Ação:** npm run workflow:smoke + rotas públicas 200 + webhook Asaas token válido.
- **Responsável:** QA Lead
- **Automático:** não

### PASSO 11 — Pagamento real sandbox/produção
- **Ação:** 1 transação real mínima; confirmar Payment+Appointment em Minha Conta.
- **Responsável:** QA Lead
- **Automático:** não

### PASSO 12 — Desativar manutenção Go Live
- **Ação:** GO_LIVE_MAINTENANCE_MODE=0 em Vercel + redeploy.
- **Responsável:** DevOps
- **Automático:** não

### PASSO 13 — Go Live público
- **Ação:** Anunciar disponibilidade; monitorar primeiras 24h.
- **Responsável:** Release Manager
- **Automático:** não

---

## Fase 3 — Production Reset Validation

### Nunca apagar

- FAQ
- SiteSettings
- BlockedTimeSlot
- User (admin Victor)

### Removido (homolog)

- Usuários não-admin
- Appointment
- Payment
- Service
- Coupon
- UserPlan
- Subscription
- PaymentMetadata
- SynchronizationEvent (homolog)
- DomainTransitionHistory (homolog)
- Session
- LoginLog
- ChatSession
- UserQuestion
- AccountDeletionLog
- PasswordResetCode
- Uploads tmp/homolog/deliveries
- Relatórios TE/SIM temporários

### Nunca tocar

- prisma/migrations/
- prisma/schema.prisma
- FAQ (catálogo)
- SiteSettings
- BlockedTimeSlot
- Código-fonte

### Checks

- [PASS] Migrations nunca removidas pelo reset: 33 migrations no repositório — reset não toca em arquivos
- [PASS] Schema Prisma preservado: reset.ts não importa nem altera schema
- [PASS] Preservado: FAQ: runLaunchReset não chama deleteMany nessas tabelas
- [PASS] Preservado: SiteSettings: runLaunchReset não chama deleteMany nessas tabelas
- [PASS] Preservado: BlockedTimeSlot: runLaunchReset não chama deleteMany nessas tabelas
- [PASS] Preservado: User (admin Victor): runLaunchReset não chama deleteMany nessas tabelas
- [PASS] ADMIN Victor nunca removido: findPreservedAdmin + abort se ausente

---

## Fase 4 — Safety Checks

| Guard | Status |
|-------|--------|
| Local exige `--confirm-local` | documentado |
| Preview exige `LAUNCH01_CONFIRM_PREVIEW=1` + `--confirm-preview` | documentado |
| Production exige phrase `RESET THOUSE PRODUCTION` | documentado |

---

## Fase 5 — Maintenance Mode

Variável: `GO_LIVE_MAINTENANCE_MODE=1`

Mensagem: "Estamos realizando os preparativos finais para o lançamento. Voltaremos em instantes."

| Público | Comportamento |
|---------|---------------|
| Login | permitido |
| Cadastro | bloqueado |
| Compra | bloqueada |
| Agendamento | bloqueado |
| Admin | operação normal |

Ativo agora (local): não

---

## Fase 6 — Checklists

### beforePush

- [ ] Todos gates GO-01 PASS
- [ ] git status limpo ou apenas artefatos intencionais
- [ ] Nenhum segredo em arquivos staged
- [ ] RC-04 e LAUNCH-01 relatórios revisados

### beforeMerge

- [ ] PR/code review aprovado
- [ ] Conflitos resolvidos com main
- [ ] Migrations incluídas no branch
- [ ] NEXT_PUBLIC_SITE_URL aponta produção no Vercel

### beforeDeploy

- [ ] GO_LIVE_MAINTENANCE_MODE=1 em Production
- [ ] Variáveis Asaas/webhook/SMTP configuradas
- [ ] Backup Neon recente confirmado

### beforeReset

- [ ] Ambiente identificado (local/preview/production)
- [ ] Confirmações explícitas conforme target
- [ ] Admin Victor preservado (PRESERVE_ADMIN_EMAILS)
- [ ] Backup banco antes de production reset

### beforeGoLive

- [ ] Smoke routes 200
- [ ] Webhook Asaas responde
- [ ] 1 pagamento teste OK
- [ ] Emails SMTP smoke (opcional ressalva)

### afterGoLive

- [ ] GO_LIVE_MAINTENANCE_MODE=0
- [ ] Monitorar logs Vercel 1h
- [ ] Verificar primeiro agendamento real

### first24h

- [ ] Revisar webhooks falhos no Asaas
- [ ] Tickets suporte 'paguei e não apareceu'
- [ ] Uptime > 99%

### first48h

- [ ] Revisar DomainTransitionHistory
- [ ] Confirmar nenhum dado homolog em produção

### firstWeek

- [ ] Retrospectiva GO-01
- [ ] Arquivar relatórios domain-guardian
- [ ] Planejar H2 hardening (E2E-02)

---

## Fase 7 — Rollback Plan (documentação)

> DOCUMENTAÇÃO APENAS — nenhum passo executado automaticamente pelo GO-01.

### Cancelar deploy
- Vercel Dashboard → Deployments → Promover deploy anterior estável
- Ou: git revert do merge commit + push + redeploy

### Restaurar banco
- Neon Dashboard → Restore from backup (timestamp pré-reset)
- Nunca usar launch01:reset para rollback
- prisma migrate deploy após restore se schema divergir

### Desativar manutenção
- Vercel: GO_LIVE_MAINTENANCE_MODE=0
- Ou SiteSettings.maintenanceMode=false via /admin/manutencao
- Redeploy ou aguardar propagação env

### Versão anterior
- git checkout main@{1} ou tag v1.0.0-rc
- vercel --prod com commit anterior
- Validar DATABASE_URL compatível com schema da versão

---

## Pendências

- 14 commits locais não publicados em origin/main
- Pagamento real em produção não validado (RC-04 ressalva)
- SMTP não smoke-testado em produção
- Reset produção nunca executado nesta sessão GO-01
- Push/merge/deploy aguardam aprovação explícita

Nenhuma ação de produção foi executada. Aguardar aprovação humana.
