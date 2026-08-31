# Release Report — THouse

**Gerado em:** 2026-07-06T00:22:07.102Z
**Release Score:** 0/100
**Status:** 🛑 **NOT_READY**

## Resumo
Release NOT_READY — Score 0/100. Decision BLOCKED impede publicação. Guardian HEALTHY. Deploy não recomendado. 9 migrations pendentes. 173 arquivos no diff.

## Motivos da decisão
- Decision Engine BLOCKED — escopo CRITICAL com 154+ arquivos HIGH/CRITICAL
- CTO e Execution Manager indicam deployReady=false
- 9 migration(s) não aplicadas em staging
- 173 arquivo(s) pendentes — deploy incremental obrigatório
- Guardian HEALTHY — banco e invariantes OK no último run
- Code Health 34/100 (E) — dívida técnica alta
- Sprint 1 com 0% de progresso — nenhum commit planejado concluído

## Bloqueadores
- **[critical]** Decision Engine está BLOCKED
- **[high]** 9 migration(s) pendente(s) em staging
- **[high]** Decision Engine BLOCKED
- **[high]** 173 arquivo(s) pendentes — escopo CRITICAL

## Pendências obrigatórias
- [ ] Desbloquear Decision Engine via PRs incrementais (stabilization-plan)
- [ ] Aplicar 9 migration(s) em staging: npx prisma migrate deploy
- [ ] Criar ambiente staging (Vercel preview ou branch)
- [ ] Configurar DATABASE_URL de staging
- [ ] Merge PR-01 e PR-02 em staging
- [ ] npx prisma migrate deploy
- [ ] Executar Commit C-01
- [ ] Desbloquear decisão de deploy
- [ ] Resolver: Decision Engine está BLOCKED

## Pendências opcionais
- [ ] Executar refactor-report itens de baixo risco após estabilização
- [ ] Atualizar evolution-report pós-deploy

## Release Score — breakdown
Base: 100
- Decision BLOCKED: -40 (Motor de decisão bloqueia publicação)
- Guardian HEALTHY: +10 (0 erros, baseline estável)
- Deploy não pronto: -20 (CTO/Execution indicam deployReady=false)
- Migrations pendentes: -27 (9 migration(s))
- Escopo grande: -15 (173 arquivos pendentes)
- Code Health baixo: -8 (Score 34/100)
- CTO Deploy Score: -12 (Pilar deploy 15/100)
- Bloqueadores críticos: -5 (1 bloqueador(es))
**Final: 0/100**

## Perguntas obrigatórias
### O que falta para publicar?
- Decision APPROVED (atualmente BLOCKED)
- deployReady=true em execution-status e cto-report
- 9 migrations em staging validadas
- Concluir Sprint 1 (0% de 22 commits)
- Homologação completa com checklist assinado pelo proprietário
### O que precisa ser testado?
- Checkout agendamento sandbox Asaas
- Checkout plano sandbox
- Webhook PAYMENT_RECEIVED idempotente (duplicar evento)
- Reembolso escolher-reembolso
- POST /api/webhooks/asaas — payload PAYMENT_RECEIVED
- Idempotência: reenviar mesmo evento 2x
- Fila Asaas sem eventos perdidos
- Login admin
- Listar agendamentos (filtros, arquivamento)
- Listar pagamentos
- Login cliente
- Listar agendamentos visíveis
- Cupons do usuário inalterados
- npm run build
- Guardian + Decision pós-merge
### Quais migrations ainda faltam?
- prisma/migrations/20260504200000_add_foto_position/
- prisma/migrations/20260504213000_account_deletion_log/
- prisma/migrations/20260511231500_user_plan_admin_inactive/
- prisma/migrations/20260511234500_coupon_refund_tracking/
- prisma/migrations/20260512030000_appointment_refund_confirmation/
- prisma/migrations/20260512040000_user_plan_refund_tracking/
- prisma/migrations/20260604210000_user_plan_user_hidden/
- prisma/migrations/20260605120000_appointment_user_hidden/
- prisma/migrations/20260617120000_appointment_admin_archive/
### Quais riscos existem?
- Regressão financeira em produção (Payment + Appointment no mesmo diff)
- Schema drift entre staging e produção
- Webhook Asaas processado duas vezes (F1/F4)
- Agendamentos arquivados visíveis no checkout (A5/A8)
- 5 risco(s) abertos no evolution-report
### Quanto risco existe em publicar hoje?
CRÍTICO — publicar hoje é altamente arriscado (score de risco: 100/100)

## Checklist de deploy
- [ ] Criar ambiente staging (Vercel preview ou branch)
- [ ] Configurar DATABASE_URL de staging
- [ ] Merge PR-01 e PR-02 em staging
- [ ] npx prisma migrate deploy
- [ ] Merge PRs 03-08 sequencialmente
- [ ] Executar Guardian após cada merge
- [ ] Testes sandbox Asaas
- [ ] Validação proprietário no admin
- [ ] Todos PRs mergeados em main
- [ ] Guardian HEALTHY em produção pós-migration
- [ ] Backup banco Neon
- [ ] npx prisma migrate deploy (produção)
- [ ] Deploy Vercel
- [ ] Smoke pós-deploy
- [ ] Monitorar webhooks Asaas 24h
- [ ] Backup Neon antes de produção
- [ ] Deploy Vercel com variáveis validadas
- [ ] Smoke pós-deploy em produção

## Checklist de banco
- [ ] Backup completo Neon (produção)
- [ ] Aplicar: prisma/migrations/20260504200000_add_foto_position/
- [ ] Aplicar: prisma/migrations/20260504213000_account_deletion_log/
- [ ] Aplicar: prisma/migrations/20260511231500_user_plan_admin_inactive/
- [ ] Aplicar: prisma/migrations/20260511234500_coupon_refund_tracking/
- [ ] Aplicar: prisma/migrations/20260512030000_appointment_refund_confirmation/
- [ ] Aplicar: prisma/migrations/20260512040000_user_plan_refund_tracking/
- [ ] Aplicar: prisma/migrations/20260604210000_user_plan_user_hidden/
- [ ] Aplicar: prisma/migrations/20260605120000_appointment_user_hidden/
- [ ] Aplicar: prisma/migrations/20260617120000_appointment_admin_archive/
- [ ] npx prisma migrate deploy (staging primeiro)
- [ ] npx prisma migrate deploy (produção)
- [ ] npx prisma generate
- [ ] Verificar drift schema vs migrations
- [ ] Smoke pós-migration (checkout, admin, Minha Conta)

## Checklist Guardian
- [ ] node --experimental-strip-types scripts/domain-guardian-runner.ts
- [ ] node --experimental-strip-types scripts/domain-decision-engine.ts
- [ ] Check F1 sem erros
- [ ] Check F4 sem erros
- [ ] Check A5 sem erros
- [ ] Check A8 sem erros
- [ ] Check C1 sem erros
- [ ] Check C2 sem erros
- [ ] Check P2 sem erros
- [ ] Check X1 sem erros
- [ ] Check X2 sem erros
- [ ] Check S1 sem erros
- [ ] Check S2 sem erros
- [ ] Check S3 sem erros
- [ ] Check S4 sem erros
- [ ] Guardian HEALTHY (0 errors)
- [ ] Decision APPROVED ou REVIEW_REQUIRED justificado
- [ ] Reexecutar após cada merge de PR

## Checklist financeiro
- [ ] Checkout agendamento sandbox Asaas
- [ ] Checkout plano sandbox
- [ ] Webhook PAYMENT_RECEIVED idempotente (duplicar evento)
- [ ] Reembolso escolher-reembolso
- [ ] Verificar F1 (asaasId único) e F4 (sincronização)
- [ ] Admin pagamentos — listar sem divergência
- [ ] Zero cobrança duplicada em 24h

## Checklist webhook
- [ ] POST /api/webhooks/asaas — payload PAYMENT_RECEIVED
- [ ] Idempotência: reenviar mesmo evento 2x
- [ ] Fila Asaas sem eventos perdidos
- [ ] process-payment-webhook.ts sem exceção
- [ ] Logs Vercel sem 5xx em /api/webhooks/asaas
- [ ] Reconcile pós-deploy

## Checklist admin
- [ ] Login admin
- [ ] Listar agendamentos (filtros, arquivamento)
- [ ] Listar pagamentos
- [ ] Aceite/recusa agendamento
- [ ] Simulação admin (se no escopo)
- [ ] Stats sem divergência vs banco

## Checklist Minha Conta
- [ ] Login cliente
- [ ] Listar agendamentos visíveis
- [ ] Cupons do usuário inalterados
- [ ] Escolher reembolso (se aplicável)
- [ ] Exclusão de conta LGPD (smoke)
- [ ] Nenhum dado de outro usuário exposto

## Checklist rollback
- [ ] Revert deploy Vercel para commit anterior
- [ ] Não reverter migration sem SQL manual
- [ ] Verificar fila webhooks Asaas
- [ ] Comunicar proprietário
- [ ] Revert deploy Vercel para commit anterior
- [ ] git revert merge commit do PR problemático
- [ ] Não reverter migration sem SQL manual documentado
- [ ] Verificar fila webhooks Asaas pós-rollback
- [ ] Guardian pós-rollback exit 0 ou findings explicados
- [ ] Comunicar proprietário

## Plano de deploy
Fase 0 — Pré-requisitos: Decision desbloqueada por PR incremental
Fase 1 — Homologação (staging)
  1. Criar ambiente staging (Vercel preview ou branch)
  2. Configurar DATABASE_URL de staging
  3. Merge PR-01 e PR-02 em staging
  4. npx prisma migrate deploy
  5. Merge PRs 03-08 sequencialmente
  6. Executar Guardian após cada merge
  7. Testes sandbox Asaas
  8. Validação proprietário no admin
Caminho seguro: Docs/Guardian → Migrations staging → Pagamentos → Cupons → Agendamentos → Minha Conta → Admin → Simulação → Agentes
Caminho crítico:
  1. PR-01 Documentação + Guardian
  2. PR-02 Schema/migrations (staging)
  3. PR-03 Pagamentos/webhook
  4. PR-05 Agendamentos
  5. Guardian exit 0
  6. Homologação completa
  7. Deploy produção incremental
Fase 2 — Produção
  1. Todos PRs mergeados em main
  2. Guardian HEALTHY em produção pós-migration
  3. Backup banco Neon
  4. npx prisma migrate deploy (produção)
  5. Deploy Vercel
  6. Smoke pós-deploy
  7. Monitorar webhooks Asaas 24h

## Plano de rollback
Rollback de emergência (produção):
  • Revert deploy Vercel para commit anterior
  • Não reverter migration sem SQL manual
  • Verificar fila webhooks Asaas
  • Comunicar proprietário

Rollback por PR:
  PR-01 (impacto Baixo):
    - git revert -m 1 <merge-commit-PR-01>
    - Redeploy versão anterior na Vercel
    - git revert merge commit
    - Reexecutar Guardian
  PR-02 (impacto Alto — área financeira ou schema):
    - git revert -m 1 <merge-commit-PR-02>
    - Redeploy versão anterior na Vercel
    - git revert merge commit
    - Reexecutar Guardian
    - Não reverter migration em produção sem janela
  PR-03 (impacto Alto — área financeira ou schema):
    - git revert -m 1 <merge-commit-PR-03>
    - Redeploy versão anterior na Vercel
    - git revert merge commit
    - Reexecutar Guardian
  PR-04 (impacto Médio):
    - git revert -m 1 <merge-commit-PR-04>
    - Redeploy versão anterior na Vercel
    - git revert merge commit
    - Reexecutar Guardian
  PR-05 (impacto Médio):
    - git revert -m 1 <merge-commit-PR-05>
    - Redeploy versão anterior na Vercel
    - git revert merge commit
    - Reexecutar Guardian

## Monitoramento — primeiras 24h
- Monitorar logs Vercel a cada 2h (primeiras 24h)
- Verificar webhooks Asaas — zero 5xx
- Checkout sandbox + produção (1 transação real mínima)
- Guardian manual 2h após deploy
- Admin: contagem agendamentos/pagamentos vs baseline
- Alerta proprietário se F1/F4 falhar
- Guardian diário por 7 dias
- Logs webhook /api/webhooks/asaas
- Admin stats sem divergência

## Monitoramento — primeira semana
- Guardian diário por 7 dias
- Revisar memory.json — tendência de checks
- Auditar fila webhooks Asaas (eventos pendentes)
- Code Health Agent reexecutar ao fim da semana
- Validação proprietário em admin e Minha Conta
- Documentar incidentes em evolution-report
- Guardian diário por 7 dias
- Logs webhook /api/webhooks/asaas
- Admin stats sem divergência
- Zero erros F1/F4

## Limitações V1
- Análise baseada em relatórios existentes — não executa Guardian nem testes em runtime
- Decision status inferido de decision.md e execution-status (pode estar desatualizado)
- Release Score é heurístico — não substitui revisão humana do proprietário
- Não detecta variáveis de ambiente ausentes na Vercel
- Migrations listadas dos relatórios — não verifica _prisma_migrations no banco
- READY_WITH_WARNINGS não autoriza deploy em produção sem checklist completo
- Não integra CI/CD nem status real do Vercel/Neon

---
_Release Manager Agent V1 — somente análise. Nenhum código foi alterado._