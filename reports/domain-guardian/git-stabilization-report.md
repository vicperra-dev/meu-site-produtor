# Git Stabilization Report — Sprint 1

**Gerado em:** 2026-07-06T00:30:56.140Z
**Branch:** main @ `fd9ff6d`
**Pendentes:** 261 (77 modificados + 184 untracked)

## Motivo real do BLOCKED
O Decision Engine analisa o working tree inteiro (260 arquivos) como um único diff CRITICAL — não por PR. Enquanto código de negócio, schema e migrations coexistirem uncommitted com scripts Guardian, o motor permanece BLOCKED.

- Risco CRITICAL no Change Analyzer (154 arquivos no snapshot decision.md; 260 no git atual)
- 59 arquivos HIGH/CRITICAL no escopo monolítico
- prisma/schema.prisma alterado com Payment + Appointment simultaneamente
- 38 invariantes afetados no diff completo (A1, C1, F1-F8, X1, etc.)
- Guardian HEALTHY no banco — bloqueio é de escopo de entrega, não de integridade atual

**Estratégia:** Isolar commits: stash do código de negócio, commitar apenas escopo do PR atual, rodar domain-decision-engine.ts, repetir. Nunca commitar tudo de uma vez.

## Migrations
| Métrica | Valor |
|---------|-------|
| Commitadas no git (HEAD) | 20 |
| No disco, fora do git | 9 |
| Aplicadas no banco local | 8 |
| Pendentes no banco local | 1 |
| Migration pendente | `20260617120000_appointment_admin_archive` |

## Primeiro commit — execute agora

### C-01: `chore(guardian): add domain guardian checks and reports`

**Arquivos (10):**
- `scripts/domain-change-analyzer.ts`
- `scripts/domain-decision-engine.ts`
- `scripts/domain-guardian-advisor.ts`
- `scripts/domain-guardian-audit.ts`
- `scripts/domain-guardian-diff.ts`
- `scripts/domain-guardian-runner.ts`
- `scripts/domain-issue-generator.ts`
- `scripts/domain-memory-engine.ts`
- `scripts/domain-pr-reviewer.ts`
- `scripts/domain-review-engine.ts`

**Ficam de fora:** todos os outros 250 arquivos.

```bash
git checkout -b sprint1/pr-01-guardian
git add scripts/domain-change-analyzer.ts \
  scripts/domain-decision-engine.ts \
  scripts/domain-guardian-advisor.ts \
  scripts/domain-guardian-audit.ts \
  scripts/domain-guardian-diff.ts \
  scripts/domain-guardian-runner.ts \
  scripts/domain-issue-generator.ts \
  scripts/domain-memory-engine.ts \
  scripts/domain-pr-reviewer.ts \
  scripts/domain-review-engine.ts
git commit -m "chore(guardian): add domain guardian checks and reports"
node --experimental-strip-types scripts/domain-guardian-runner.ts
node --experimental-strip-types scripts/domain-decision-engine.ts
```

> **Importante:** os 77 arquivos de negócio modified continuam no working tree e manterão BLOCKED até serem isolados via stash ou commits sequenciais por PR.

---
## PR-01 — Documentação e Guardian (baseline)
**Objetivo:** Estabelecer baseline de docs e verificação automática sem alterar runtime de negócio.
**Risco:** Baixo
**Dependências:** nenhuma
**Arquivos pendentes:** 93
**Abrir agora?** SIM · **Merge agora?** NÃO · **Deploy após?** false

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Decision engine não BLOCKED para escopo do PR

### C-01: Guardian core scripts
`chore(guardian): add domain guardian checks and reports` · Risco: Baixo
Arquivos (10):
- scripts/domain-change-analyzer.ts
- scripts/domain-decision-engine.ts
- scripts/domain-guardian-advisor.ts
- scripts/domain-guardian-audit.ts
- scripts/domain-guardian-diff.ts
- scripts/domain-guardian-runner.ts
- scripts/domain-issue-generator.ts
- scripts/domain-memory-engine.ts
- scripts/domain-pr-reviewer.ts
- scripts/domain-review-engine.ts

### C-01b: Documentação de domínio
`docs(domain): add domain map, invariants and ADR index` · Risco: Baixo
Arquivos (8):
- docs/adr/README.md
- docs/ai/appointment-archive-audit.md
- docs/ai/domain-dependencies.md
- docs/ai/domain-invariants.md
- docs/ai/domain-map.md
- docs/ai/domain-risks.md
- docs/ai/github-pipeline.md
- docs/ai/payment-lifecycle-audit.md

### C-01c: CI Guardian workflow
`ci(guardian): add domain-guardian github workflow` · Risco: Baixo
Arquivos (1):
- .github/workflows/domain-guardian.yml

### C-01d: Relatórios Guardian baseline
`chore(guardian): add baseline guardian reports and memory` · Risco: Baixo
Arquivos (46):
- reports/domain-guardian/2026-06-23-01-07.json
- reports/domain-guardian/2026-06-23-02-41.json
- reports/domain-guardian/2026-06-23-03-09.json
- reports/domain-guardian/2026-06-23-03-20.json
- reports/domain-guardian/action-plan.md
- reports/domain-guardian/advisor.md
- reports/domain-guardian/architecture-agent.md
- reports/domain-guardian/architecture-decisions.json
- reports/domain-guardian/architecture-decisions.md
- reports/domain-guardian/change-analysis.md
- reports/domain-guardian/code-health.json
- reports/domain-guardian/code-health.md
- reports/domain-guardian/cto-report.json
- reports/domain-guardian/cto-report.md
- reports/domain-guardian/decision.md
- reports/domain-guardian/design-plan.json
- reports/domain-guardian/design-plan.md
- reports/domain-guardian/engineering-backlog.json
- reports/domain-guardian/engineering-backlog.md
- reports/domain-guardian/evolution-report.json
- reports/domain-guardian/evolution-report.md
- reports/domain-guardian/execution-plan-EB-001.json
- reports/domain-guardian/execution-plan-EB-001.md
- reports/domain-guardian/execution-plan-EB-024.json
- reports/domain-guardian/execution-plan-EB-024.md
- reports/domain-guardian/execution-status.json
- reports/domain-guardian/execution-status.md
- reports/domain-guardian/implementation-plan.json
- reports/domain-guardian/implementation-plan.md
- reports/domain-guardian/issues.md
- reports/domain-guardian/latest.json
- reports/domain-guardian/memory.json
- reports/domain-guardian/memory.md
- reports/domain-guardian/pr-review.md
- reports/domain-guardian/project-context.json
- reports/domain-guardian/project-knowledge-graph.json
- reports/domain-guardian/project-knowledge-graph.md
- reports/domain-guardian/project-summary.md
- reports/domain-guardian/refactor-report.json
- reports/domain-guardian/refactor-report.md
- reports/domain-guardian/release-report.json
- reports/domain-guardian/release-report.md
- reports/domain-guardian/review-checklist.md
- reports/domain-guardian/stabilization-plan.json
- reports/domain-guardian/stabilization-plan.md
- reports/domain-guardian/summary.md

### C-01e: Engineering Dashboard
`feat(admin): add engineering dashboard at /admin/engenharia` · Risco: Baixo
Arquivos (25):
- reports/domain-guardian/engineering-backlog.json
- reports/domain-guardian/engineering-backlog.md
- scripts/engineering-assistant.ts
- src/app/admin/engenharia/page.tsx
- src/app/api/admin/engenharia/reports/route.ts
- src/app/lib/engineering-reports.ts
- src/components/admin/engineering/ADRCard.tsx
- src/components/admin/engineering/CtoCard.tsx
- src/components/admin/engineering/DebtCard.tsx
- src/components/admin/engineering/DecisionCard.tsx
- src/components/admin/engineering/DeployCard.tsx
- src/components/admin/engineering/EngineeringDashboard.tsx
- src/components/admin/engineering/EngineeringOverviewCard.tsx
- src/components/admin/engineering/EvolutionCard.tsx
- src/components/admin/engineering/ExecutionCard.tsx
- src/components/admin/engineering/GuardianStatusCard.tsx
- src/components/admin/engineering/HealthCard.tsx
- src/components/admin/engineering/HumanReportCard.tsx
- src/components/admin/engineering/KnowledgeGraphCard.tsx
- src/components/admin/engineering/RefactorCard.tsx
- src/components/admin/engineering/RoadmapCard.tsx
- src/components/admin/engineering/TimelineCard.tsx
- src/components/admin/engineering/index.ts
- src/components/admin/engineering/shared.tsx
- src/components/admin/engineering/types.ts

### C-01f: Agentes de planejamento Sprint 1
`chore(agents): add sprint1 planning agents (read-only)` · Risco: Baixo
Arquivos (5):
- scripts/code-health-agent.ts
- scripts/execution-manager-agent.ts
- scripts/implementation-executor-agent.ts
- scripts/refactor-agent.ts
- scripts/release-manager-agent.ts

---
## PR-02 — Schema e migrations
**Objetivo:** Aplicar estrutura de banco: arquivamento, hidden, refund tracking.
**Risco:** Crítico
**Dependências:** PR-01
**Arquivos pendentes:** 3
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** staging-only

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Testes sandbox Asaas
- [ ] Decision engine não BLOCKED para escopo do PR

### C-02: Schema e migrations
`feat(db): add schema migrations for archive and hidden fields` · Risco: Crítico
Arquivos (13):
- prisma/schema.prisma
- prisma/backfill_coupon_origin.sql
- prisma/ensure_account_deletion_log.sql
- prisma/migrations/20260504200000_add_foto_position/migration.sql
- prisma/migrations/20260504213000_account_deletion_log/migration.sql
- prisma/migrations/20260511231500_user_plan_admin_inactive/migration.sql
- prisma/migrations/20260511234500_coupon_refund_tracking/migration.sql
- prisma/migrations/20260512030000_appointment_refund_confirmation/migration.sql
- prisma/migrations/20260512040000_user_plan_refund_tracking/migration.sql
- prisma/migrations/20260604210000_user_plan_user_hidden/migration.sql
- prisma/migrations/20260605120000_appointment_user_hidden/migration.sql
- prisma/migrations/20260617120000_appointment_admin_archive/migration.sql
- prisma/reset_operational_data.sql

---
## PR-03 — Pagamentos e webhook
**Objetivo:** Hardening idempotência, checkout e efeitos pós-pagamento.
**Risco:** Crítico
**Dependências:** PR-02
**Arquivos pendentes:** 25
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** no

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Testes sandbox Asaas
- [ ] Decision engine não BLOCKED para escopo do PR

### C-03: Financeiro (parte 1)
`fix(payment): harden webhook idempotency and payment effects` · Risco: Crítico
Arquivos (15):
- src/app/lib/agendamento-payment-coupons.ts
- src/app/lib/asaas-agendamento-reconcile.ts
- src/app/lib/payment-providers.ts
- src/app/lib/process-payment-webhook.ts
- src/app/lib/validate-coupon-checkout.ts
- src/app/lib/admin-delete-payment.ts
- src/app/lib/agendamento-payment-rules.ts
- src/app/lib/appointment-refund-payment.ts
- src/app/lib/asaas-agendamento-payment-effects.ts
- src/app/lib/asaas-fetch.ts
- src/app/lib/asaas-plano-payment-effects.ts
- src/app/lib/payment-refund-status.ts
- src/app/lib/plan-payment-simulation.ts
- src/app/lib/symbolic-payment-resolve.ts
- src/app/lib/symbolic-payment.ts

### C-04: Financeiro (parte 2)
`fix(payment): harden webhook idempotency and payment effects (part 2)` · Risco: Crítico
Arquivos (7):
- src/app/api/admin/pagamentos/route.ts
- src/app/api/admin/reprocessar-pagamento-teste/route.ts
- src/app/api/asaas/checkout-agendamento/route.ts
- src/app/api/asaas/checkout-carrinho/route.ts
- src/app/api/asaas/checkout/route.ts
- src/app/api/test-payment/route.ts
- src/app/api/webhooks/asaas/route.ts

### C-05: Financeiro (parte 3)
`fix(payment): harden webhook idempotency and payment effects (part 3)` · Risco: Crítico
Arquivos (3):
- src/app/admin/pagamentos/page.tsx
- src/app/api/admin/pagamentos/route.ts
- src/app/api/admin/reprocessar-pagamento-teste/route.ts

### C-06: Financeiro (parte 4)
`fix(payment): harden webhook idempotency and payment effects (part 4)` · Risco: Crítico
Arquivos (1):
- scripts/inspect-payments.mjs

### PR-03-EXT: Rotas/páginas fora do plano original
`feat: add orphan routes for PR-03` · Risco: Médio
Arquivos (1):
- src/app/api/admin/reprocessar-pagamento-plano-teste/route.ts

---
## PR-04 — Cupons e ownership
**Objetivo:** Ownership, reembolso cupom, validação checkout.
**Risco:** Alto
**Dependências:** PR-03
**Arquivos pendentes:** 27
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** no

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Decision engine não BLOCKED para escopo do PR

### C-07: Coupon (parte 1)
`fix(coupon): preserve ownership and refund sync` · Risco: Alto
Arquivos (17):
- src/app/lib/coupon-booking-rules.ts
- src/app/lib/coupon-release.ts
- src/app/lib/coupon-stale-appointment.ts
- src/app/lib/plan-coupons.ts
- src/app/lib/admin-delete-coupon.ts
- src/app/lib/appointment-plan-coupon.ts
- src/app/lib/coupon-account-ownership.ts
- src/app/lib/coupon-admin-sections.ts
- src/app/lib/coupon-origin.ts
- src/app/lib/coupon-refund.ts
- src/app/lib/coupon-scheduling-rules.ts
- src/app/lib/coupon-sections.ts
- src/app/lib/coupon-visibility.ts
- src/app/lib/refund-coupon.ts
- src/app/lib/simulation-coupon-codes.ts
- src/app/lib/simulation-coupon-user-link.ts
- src/app/lib/simulation-coupon.ts

### C-08: Coupon (parte 2)
`fix(coupon): preserve ownership and refund sync (part 2)` · Risco: Alto
Arquivos (2):
- src/app/api/agendamentos/com-cupom/route.ts
- src/app/api/coupons/validate/route.ts

### C-09: Coupon (parte 3)
`fix(coupon): preserve ownership and refund sync (part 3)` · Risco: Alto
Arquivos (2):
- scripts/inspect-simulation-coupons.mjs
- scripts/repair-coupon-ownership.mjs

### PR-04-EXT: Rotas/páginas fora do plano original
`feat: add orphan routes for PR-04` · Risco: Médio
Arquivos (6):
- src/app/api/admin/cupons/excluir-lote/route.ts
- src/app/api/cupons/confirmar-reembolso/route.ts
- src/app/api/cupons/excluir-usado/route.ts
- src/app/api/cupons/solicitar-reembolso/route.ts
- src/app/api/coupons/resgate/route.ts
- src/app/agendamento/cupom/page.tsx

---
## PR-05 — Agendamentos e arquivamento
**Objetivo:** Arquivamento admin, queries operacionais, disponibilidade.
**Risco:** Alto
**Dependências:** PR-02, PR-03
**Arquivos pendentes:** 17
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** no

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Decision engine não BLOCKED para escopo do PR

### C-10: Appointment
`feat(appointment): implement admin archive and operational filters` · Risco: Alto
Arquivos (13):
- src/app/admin/agendamentos/page.tsx
- src/app/agendamento/page.tsx
- src/app/api/admin/agendamentos/cancelar/route.ts
- src/app/api/admin/agendamentos/reverter-cancelamento/route.ts
- src/app/api/admin/agendamentos/route.ts
- src/app/api/agendamentos/cancelar/route.ts
- src/app/api/agendamentos/disponibilidade/route.ts
- src/app/api/agendamentos/escolher-reembolso/route.ts
- src/app/api/agendamentos/route.ts
- src/app/lib/appointment-admin-archive.ts
- src/app/lib/appointment-hidden.ts
- src/app/lib/appointment-refund-value.ts
- src/app/lib/purge-cancelled-appointment.ts

### PR-05-EXT: Rotas/páginas fora do plano original
`feat: add orphan routes for PR-05` · Risco: Médio
Arquivos (4):
- src/app/api/admin/agendamentos/archive/route.ts
- src/app/api/admin/agendamentos/restore/route.ts
- src/app/api/agendamentos/confirmar-reembolso/route.ts
- src/app/api/agendamentos/excluir/route.ts

---
## PR-06 — Minha Conta e autenticação
**Objetivo:** UX cliente, login, meus-dados, ocultação usuário.
**Risco:** Médio
**Dependências:** PR-04, PR-05
**Arquivos pendentes:** 19
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** no

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Decision engine não BLOCKED para escopo do PR

### C-11: MinhaConta (parte 1)
`fix(account): stabilize account and meus-dados aggregation` · Risco: Médio
Arquivos (1):
- src/app/lib/auth.ts

### C-12: MinhaConta (parte 2)
`fix(account): stabilize account and meus-dados aggregation (part 2)` · Risco: Médio
Arquivos (6):
- src/app/api/conta/route.ts
- src/app/api/conta/update/route.ts
- src/app/api/esqueci-senha/route.ts
- src/app/api/login/route.ts
- src/app/api/meus-dados/route.ts
- src/app/api/meus-dados/vincular-cupons-teste/route.ts

### C-13: MinhaConta (parte 3)
`fix(account): stabilize account and meus-dados aggregation (part 3)` · Risco: Médio
Arquivos (6):
- src/app/conta/page.tsx
- src/app/context/AuthContext.tsx
- src/app/esqueci-senha/page.tsx
- src/app/login/page.tsx
- src/app/minha-conta/page.tsx
- src/app/registro/page.tsx

### C-14: MinhaConta (parte 4)
`fix(account): stabilize account and meus-dados aggregation (part 4)` · Risco: Médio
Arquivos (1):
- src/app/middleware.ts

### PR-06-EXT: Rotas/páginas fora do plano original
`feat: add orphan routes for PR-06` · Risco: Médio
Arquivos (5):
- src/app/api/conta/alterar-senha/route.ts
- src/app/api/conta/excluir/route.ts
- src/app/api/conta/foto/route.ts
- src/app/api/planos/confirmar-reembolso/route.ts
- src/app/conta/alterar-senha/page.tsx

---
## PR-07 — Painel administrativo
**Objetivo:** UI admin, stats, ações arquivar/restaurar.
**Risco:** Médio
**Dependências:** PR-05
**Arquivos pendentes:** 11
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** no

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Decision engine não BLOCKED para escopo do PR

### C-15: Admin
`feat(admin): admin panel archive restore and stats` · Risco: Médio
Arquivos (10):
- src/app/api/admin/stats/detalhadas/route.ts
- src/app/api/admin/stats/route.ts
- src/app/admin/estatisticas/page.tsx
- src/app/admin/layout.tsx
- src/app/admin/page.tsx
- src/app/admin/planos/page.tsx
- src/app/admin/servicos-aceitos/page.tsx
- src/app/admin/servicos-solicitados/page.tsx
- src/app/admin/usuarios/page.tsx
- src/app/lib/adminAccess.ts

### PR-07-EXT: Rotas/páginas fora do plano original
`feat: add orphan routes for PR-07` · Risco: Médio
Arquivos (1):
- src/app/api/admin/servicos/entrega/route.ts

---
## PR-08 — Simulação admin
**Objetivo:** Pagamentos teste, cupons simbólicos, reset.
**Risco:** Médio
**Dependências:** PR-03
**Arquivos pendentes:** 3
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** no

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Decision engine não BLOCKED para escopo do PR

### C-16: Simulation
`refactor(simulation): isolate symbolic payments and legacy cleanup` · Risco: Médio
Arquivos (2):
- scripts/test-simulation-flags.mjs
- src/app/lib/simulation-reset.ts

### PR-08-EXT: Rotas/páginas fora do plano original
`feat: add orphan routes for PR-08` · Risco: Médio
Arquivos (1):
- src/app/api/admin/cupons/resetar-simulacao/route.ts

---
## PR-09 — Agentes IA e infraestrutura
**Objetivo:** Pipeline de agentes, scripts utilitários, build e CI.
**Risco:** Baixo
**Dependências:** PR-01
**Arquivos pendentes:** 53
**Abrir agora?** NÃO · **Merge agora?** NÃO · **Deploy após?** no

**Critérios de merge:**
- [ ] Guardian exit 0
- [ ] npm run build
- [ ] Revisão humana aprovada
- [ ] Decision engine não BLOCKED para escopo do PR

### C-17: Arquitetura
`chore(agents): add read-only planning agents pipeline` · Risco: Baixo
Arquivos (9):
- scripts/architecture-agent.ts
- scripts/architecture-decision-agent.ts
- scripts/cto-agent.ts
- scripts/design-planner-agent.ts
- scripts/evolution-agent.ts
- scripts/human-report-agent.ts
- scripts/implementation-planner-agent.ts
- scripts/project-knowledge-graph-agent.ts
- scripts/stabilization-planner.ts

### C-18: Scripts
`chore(scripts): add utility scripts for inspection` · Risco: Baixo
Arquivos (3):
- scripts/check-db.mjs
- scripts/domain-architecture-planner.ts
- scripts/reset-operational-data.mjs

### C-19: Infraestrutura (parte 1)
`chore(infra): update build config and shared components` · Risco: Baixo
Arquivos (13):
- src/app/lib/delivery-url-validation.ts
- src/app/lib/sendEmail.ts
- src/app/lib/service-catalog.ts
- src/app/lib/validations.ts
- src/app/lib/active-user-plan.ts
- src/app/lib/avatarDisplayUrl.ts
- src/app/lib/deleteUserAccount.ts
- src/app/lib/delivery-audio-upload.ts
- src/app/lib/plan-refund.ts
- src/app/lib/prisma-errors.ts
- src/app/lib/support-contact.ts
- src/app/lib/user-feedback.ts
- src/app/lib/user-plan-hidden.ts

### C-20: Infraestrutura (parte 2)
`chore(infra): update build config and shared components (part 2)` · Risco: Baixo
Arquivos (13):
- src/app/api/admin/cupons/liberar/route.ts
- src/app/api/admin/cupons/route.ts
- src/app/api/admin/planos/excluir-cancelados/route.ts
- src/app/api/admin/planos/route.ts
- src/app/api/admin/servicos/route.ts
- src/app/api/admin/usuarios/route.ts
- src/app/api/cupons/renunciar/route.ts
- src/app/api/me/route.ts
- src/app/api/planos/cancelar/route.ts
- src/app/api/planos/excluir/route.ts
- src/app/api/planos/solicitar-reembolso/route.ts
- src/app/api/trocar-senha/route.ts
- src/app/api/verificar-codigo/route.ts

### C-21: Infraestrutura (parte 3)
`chore(infra): update build config and shared components (part 3)` · Risco: Baixo
Arquivos (19):
- src/app/admin/layout.tsx
- src/app/carrinho/page.tsx
- src/app/components/Header.tsx
- src/app/layout.tsx
- src/app/components/ConditionalBodyLayout.tsx
- src/app/components/UserFeedbackDialog.tsx
- src/app/admin/estatisticas/page.tsx
- src/app/admin/page.tsx
- src/app/admin/planos/page.tsx
- src/app/admin/servicos-aceitos/page.tsx
- src/app/admin/servicos-solicitados/page.tsx
- src/app/admin/usuarios/page.tsx
- src/app/api/admin/cupons/liberar/route.ts
- src/app/api/admin/cupons/route.ts
- src/app/api/admin/planos/excluir-cancelados/route.ts
- src/app/api/admin/planos/route.ts
- src/app/api/admin/servicos/route.ts
- src/app/api/admin/usuarios/route.ts
- src/app/planos/page.tsx

### C-22: Infraestrutura (parte 4)
`chore(infra): update build config and shared components (part 4)` · Risco: Baixo
Arquivos (2):
- src/app/globals.css
- src/app/hooks/useUnreadChatCount.ts

---
## Sequência exata de commits
1. C-01 (10 scripts Guardian)
2. C-01b (8 docs)
3. C-01c (1 CI workflow)
4. C-01d (46 reports)
5. C-01e (23 dashboard)
6. C-01f (5 agentes) → merge PR-01
7. C-02 (13 prisma) → merge PR-02 + migrate staging
8. C-03 → C-06 → merge PR-03
9. C-07 → C-09 + PR-04-EXT → merge PR-04
10. C-10 + PR-05-EXT → merge PR-05
11. C-11 → C-14 + PR-06-EXT → merge PR-06
12. C-15 + PR-07-EXT → merge PR-07
13. C-16 + PR-08-EXT → merge PR-08
14. C-17 → C-22 + uploads + human reports → merge PR-09

## Fora do plano original
- gitignore
- public/uploads/avatars/.gitkeep
- public/uploads/deliveries/.gitkeep
- reports/human/project-report.json
- reports/human/project-report.md
- scripts/generate-git-stabilization-report.mjs