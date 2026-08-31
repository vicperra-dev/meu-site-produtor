# Changelog

Todas as mudanças notáveis do THouse Rec são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e o versionamento segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.0] — 2026-07-15

**Codename:** THouse Rec First Public Release  
**Branch:** `backup-pre-formatacao`  
**Commit:** `ef338ef`  
**Estado:** READY FOR RELEASE

### Principais funcionalidades

- **Cliente:** registro, login, agendamento, carrinho, checkout Asaas, Minha Conta, planos
- **Admin:** painel `/admin`, aceite/recusa de agendamentos, entrega, cupons, reembolsos
- **Pagamentos:** Asaas (PIX, cartão, boleto), webhooks, `PaymentMetadata`, reembolso
- **Planos:** Bronze/Prata/Ouro com checkout e renovação
- **Cupons:** tipos canônicos (`plano`, `agendamento`, `reembolso`, `desconto`, `remarcacao`, `test`, `bonus`)
- **Test Engine (TE-01B/02A):** runner de cenários de validação de negócio
- **Simulation (SIM-01/02):** 10 cenários cada, batch automatizado via EC-01
- **Synchronization (SYNC-01A):** outbox `SynchronizationEvent` + SSE para superfícies
- **Execution Core (EC-01):** runner unificado TE + SIM, discovery, relatórios
- **Go Live:** modo manutenção (`GO_LIVE_MAINTENANCE_MODE`), Launch Reset com triple-confirm

### Principais correções

- **GL-01** — Auto-login após registro (sessão criada no cadastro)
- **HS-01** — `Service.appointmentId` FK + CPF `@unique` em `User`
- **HS-02B** — `Service` como autoridade operacional de entrega
- **HS-03A/B** — Domínio operacional consolidado + State Machine com `DomainTransitionHistory`
- **RC-03** — Permissões e concorrência; fix webpack em `rc03-batch`
- **Build Windows** — TLS via `node --use-system-ca` em gates de release

### Arquitetura consolidada

- Next.js 16 (App Router) + React 19 + Prisma 5 + PostgreSQL (Neon) + Vercel
- Domínio: `User → Appointment → Service → Payment → Coupon → UserPlan`
- Workflow State Machine (HS-03B) com histórico persistido
- Synchronization Engine (SYNC-01A) com cursor monotônico
- Execution Core (EC-01) unificando TE e SIM
- **StudioOS:** congelado — fora do escopo v1.0

### Integrações

| Sistema | Uso |
|---------|-----|
| **Asaas** | Cobrança, webhook `/api/webhooks/asaas`, reembolso |
| **Neon** | PostgreSQL gerenciado |
| **Vercel** | Hosting, SSL, variáveis de ambiente |
| **Gmail SMTP** | Emails transacionais |

### Fluxos certificados

| ID | Escopo | Status |
|----|--------|--------|
| SIM-001…010 | Simulation Engine (pagamento, sessão, plano, cupom, reembolso…) | PASS |
| SIM-02 | Pipeline EC-01 migrado | PASS |
| TE-02A | Business validation suite | PASS |
| PH-01 | Product hardening | PASS |
| SYNC-01A | Realtime domain sync | PASS |
| RC-01 | Jornada do cliente | CERTIFICADA |
| RC-02 | Administração e operações | CERTIFICADA |
| RC-03 | Segurança e concorrência | CERTIFICADA |
| RC-04 | Produção (APROVADO COM RESSALVAS) | PASS |

### Release Candidate

- **GO-02:** assembly da candidata — readiness SIM
- **GO-04A:** validação final — ALL PASS, confiança 91%
- **18 commits** à frente de `main`
- **33 migrations** Prisma
- Admin preservado no Launch Reset: `vicperra@gmail.com`

### Go Live

- Runbook: [go03-release-execution.md](reports/domain-guardian/go03-release-execution.md)
- Manutenção pré-abertura: `GO_LIVE_MAINTENANCE_MODE=1`
- Launch Reset: dry-run validado; execução real aguarda aprovação humana
- **Não executado nesta sprint:** merge, push, deploy, reset em produção, tag Git

### Known Issues

| ID | Descrição | Severidade |
|----|-----------|------------|
| E2E-WH-01 | Webhook Asaas atrasado/falho → "paguei e não apareceu" | Alta |
| E2E-MC-01 | Pós-registro redireciona para `/conta` em vez de `/minha-conta` | Média |
| RC03-RACE-01 | TOCTOU em slot de agendamento (paralelo) | P2 |
| RC-04 | Pagamento real em produção não smoke-testado | Alta (pré-go-live) |
| SMTP | Email não smoke-testado em produção | Média |

### Roadmap v1.1

1. **E2E-02 H1** — Polling pós-pagamento, redirect `/minha-conta`
2. **Webhook resiliência** — Logging estruturado, alertas
3. **UX operacional** — SLA visível, card reembolso proativo
4. **Cupom PR-04** — Ownership e remoção de shims legados
5. **RC03-RACE-01** — Lock otimista em slots

**Critérios para v1.1:** 7 dias sem ticket crítico de pagamento + webhook OK + ≥5 agendamentos reais concluídos.

---

[1.0.0]: https://github.com/thouse-rec/meu-site-produtor/releases/tag/v1.0.0
