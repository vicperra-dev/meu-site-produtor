# PRD-01 — Auditoria Final de Production Readiness

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

## Veredito executivo

| | |
|---|---|
| **Pronto para 1º cliente real?** | **Condicional — NÃO deployar sem checklist H1** |
| **Área mais fraca** | Operação (monitoramento, backup, alertas) |
| **Área mais forte** | Sessão / autenticação (GL-01 B1 commitado) |
| **Escopo recomendado do 1º cliente** | Agendamento avulso pago (carrinho → checkout-carrinho → webhook) |

O código núcleo PR-03 está **maduro o suficiente** para um primeiro cliente real no fluxo de agendamento avulso, **desde que** os gates operacionais (Asaas, migration, smoke E2E, backup) sejam concluídos antes do deploy. Planos exigem commit do GL-01 B2 ainda não versionado.

---

## Resumo por área

| # | Área | Status | Nota |
|---|------|--------|------|
| 1 | Infraestrutura | 🟡 | Prisma OK; backup e migrate deploy manuais |
| 2 | Asaas | 🟡 | Código sólido; config produção não verificável no repo |
| 3 | Sessão | 🟢 | Cookie seguro, TTL 7d, logout, auto-login pós-registro |
| 4 | Segurança | 🟡 | Auth/admin OK; logs com PII; admin bypass por email |
| 5 | Operação | 🔴 | Sem monitoramento, alertas ou backup automatizado |
| 6 | UX | 🟡 | Loading/empty OK; pós-pagamento e pós-registro com fricção |
| 7 | Deploy | 🟡 | Build passa; env parcialmente documentada |

---

## 1. Infraestrutura

| Item | Status | Evidência |
|------|--------|-----------|
| **DATABASE_URL** | 🟡 | `prisma/schema.prisma` — PostgreSQL; valor só no host |
| **Prisma** | 🟢 | `prisma generate` no build e postinstall |
| **Backup** | 🔴 | Nenhum script/integração; apenas menção em planos de agentes |
| **Migrations** | 🟡 | 30 migrations versionadas; `migrate deploy` não no pipeline de build |

**Ação obrigatória:** `npx prisma migrate deploy` no banco de produção + snapshot Neon antes do 1º cliente.

---

## 2. Asaas

| Item | Status | Evidência |
|------|--------|-----------|
| **API KEY** | 🟡 | `getAsaasApiKey()` em `env.ts`; erro claro se ausente |
| **Webhook** | 🟡 | `/api/webhooks/asaas` — canônico PR-03; sempre HTTP 200 |
| **Token** | 🟡 | `ASAAS_WEBHOOK_ACCESS_TOKEN` via header `asaas-access-token` |
| **Sandbox** | 🟢 | `IS_TEST = NODE_ENV !== 'production'`; URL por prefixo `$aact_prod_` |

**Ação obrigatória:** Registrar webhook em produção, token sincronizado, domínio aprovado no painel Asaas.

---

## 3. Sessão

| Item | Status | Evidência |
|------|--------|-----------|
| **Cookies** | 🟢 | `httpOnly`, `sameSite: lax`, `secure` em produção |
| **Expiração** | 🟢 | 7 dias; `getSessionUser` invalida expirados |
| **Logout** | 🟢 | `POST /api/logout` — deleta Session + cookie |
| **Auto-login registro** | 🟢 | Commit `3f20ad0` — `createUserSession` no registro |

---

## 4. Segurança

| Item | Status | Evidência |
|------|--------|-----------|
| **Permissões** | 🟢 | `requireAuth` / `requireAdmin` nas rotas sensíveis |
| **Cross-user** | 🟢 | Filtros `userId` em `meus-dados`, chat, appointments |
| **Admin** | 🟡 | Bypass hardcoded `thouse.rec.tremv@gmail.com` |
| **Headers** | 🟢 | `X-Frame-Options`, CSP em `next.config.ts` |
| **Dados sensíveis** | 🟡 | Webhook loga body; registro loga payload completo |

---

## 5. Operação

| Item | Status | Evidência |
|------|--------|-----------|
| **Logs** | 🟡 | `console.log` extensivo; sem estrutura |
| **Monitoramento** | 🔴 | Sem Sentry/Datadog/health check |
| **Alertas** | 🔴 | Falha de webhook invisível até ticket do cliente |
| **Rollback** | 🟡 | Vercel redeploy possível; sem runbook no repo |

---

## 6. UX

| Item | Status | Evidência |
|------|--------|-----------|
| **Loading** | 🟢 | AuthContext, admin, `pagamentos/sucesso` |
| **Erros** | 🟡 | Mix `alert()` + mensagens inline; checkout genérico |
| **Feedback** | 🟡 | Polling parcial pós-pagamento; registro → `/conta` não `/minha-conta` |
| **Empty states** | 🟢 | Chat, admin, minha-conta |

---

## 7. Deploy

| Item | Status | Evidência |
|------|--------|-----------|
| **Build** | 🟢 | `npm run build` passou (GL-01, RL-03) |
| **Env** | 🟡 | `PRE_LANCAMENTO_CHECKLIST.md` parcial; sem `.env.example` |
| **Variáveis obrigatórias** | 🟡 | Ver tabela abaixo |
| **Checklist** | 🟡 | Existe parcialmente; CI Domain Guardian ≠ smoke pagamento |

### Variáveis obrigatórias (produção)

| Variável | Obrigatória |
|----------|-------------|
| `DATABASE_URL` | ✅ |
| `ASAAS_API_KEY` (`$aact_prod_*`) | ✅ |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | ✅ |
| `NEXT_PUBLIC_SITE_URL` | ✅ |
| `CRON_SECRET` | ✅ |
| `SUPPORT_EMAIL` + `SUPPORT_EMAIL_PASSWORD` | Recomendado |
| `PAYMENT_PROCESS_SECRET` | Opcional |

---

## O que ainda impede o primeiro cliente?

### Problemas de código

| ID | Item | Severidade |
|----|------|------------|
| C1 | GL-01 B2 (planos) **não commitado** — bloqueia venda de planos | P0 se planos no escopo |
| C2 | Polling pós-pagamento não confirma `Appointment` criado | P1 |
| C3 | Redirect pós-registro para `/conta` em vez de `/minha-conta` | P2 |
| C4 | Legado financeiro ~40% (metadata fallback) — edge cases | P2 |
| C5 | Admin bypass por email hardcoded | P2 |

**Para agendamento avulso:** nenhum bloqueador P0 de código no HEAD `3f20ad0`.

### Problemas de configuração

| ID | Item | Severidade |
|----|------|------------|
| CFG1 | `ASAAS_API_KEY` produção no Vercel | P0 |
| CFG2 | Webhook registrado no Asaas | P0 |
| CFG3 | `NEXT_PUBLIC_SITE_URL` correto | P0 |
| CFG4 | `DATABASE_URL` + `prisma migrate deploy` | P0 |
| CFG5 | `CRON_SECRET` + agendador de crons | P1 |
| CFG6 | Email SMTP (`SUPPORT_EMAIL*`) | P1 |
| CFG7 | Domínio aprovado no painel Asaas | P0 |

### Problemas operacionais

| ID | Item | Severidade |
|----|------|------------|
| OP1 | Backup Neon antes do 1º cliente | P0 |
| OP2 | Smoke E2E pós-deploy | P0 |
| OP3 | Monitoramento e alertas | P1 |
| OP4 | Runbook pagamento órfão / rollback | P1 |
| OP5 | SLA admin pós-pagamento | P2 |

### Problemas de UX

| ID | Item | Severidade |
|----|------|------------|
| UX1 | Pós-registro não leva a Minha Conta | P2 |
| UX2 | "Paguei e não apareceu" sem polling proativo | P1 |
| UX3 | Formulário longo checkout (CPF/endereço) | P2 |
| UX4 | Uso de `alert()` em fluxos diversos | P3 |

---

## Checklist final de Go Live

### Obrigatórios (bloqueiam 1º cliente)

- [ ] **GL-01** — Deploy inclui `3f20ad0` (auto-login registro)
- [ ] **GL-03** — `DATABASE_URL` produção configurada
- [ ] **GL-04** — `npx prisma migrate deploy` executado
- [ ] **GL-05** — Backup/snapshot Neon antes do tráfego real
- [ ] **GL-06** — `ASAAS_API_KEY` produção (`$aact_prod_*`)
- [ ] **GL-07** — `ASAAS_WEBHOOK_ACCESS_TOKEN` = token painel Asaas
- [ ] **GL-08** — Webhook `https://{dominio}/api/webhooks/asaas`
- [ ] **GL-09** — Domínio aprovado no painel Asaas
- [ ] **GL-10** — `NEXT_PUBLIC_SITE_URL` = URL pública HTTPS
- [ ] **GL-11** — `npm run build` passa
- [ ] **GL-12** — `CRON_SECRET` + jobs agendados
- [ ] **GL-13** — Email SMTP configurado
- [ ] **GL-14** — Smoke E2E: registro → agendamento → pagamento → Appointment visível
- [ ] **GL-15** — Logs Vercel: webhook `PAYMENT_RECEIVED` sem erro
- [ ] **GL-16** — Runbook pagamento órfão documentado
- [ ] **GL-17** — Comunicação ao cliente: lançamento controlado + suporte

### Condicionais

- [ ] **GL-02** — Se planos no escopo: commitar GL-01 B2 (`carrinho` + `pagamentos`)

### Recomendados (H1/H2 — elevam probabilidade)

- [ ] **GL-18** — Polling pós-pagamento até Appointment existir
- [ ] **GL-19** — Redirect pós-registro → `/minha-conta`
- [ ] **GL-20** — Alerta em falha de efeitos de webhook

---

## Probabilidade de sucesso na 1ª semana

> **Definição de sucesso:** sem ticket crítico de "paguei e não apareceu" e sem perda financeira não recuperável.

| Cenário | Probabilidade | Condição |
|---------|---------------|----------|
| Baseline atual (E2E-01) | **~52%** | Produção com Asaas, sem hardening |
| Checklist obrigatório (GL-01–17), agendamento avulso | **~75%** (72–78%) | Suporte humano disponível |
| Checklist completo incl. recomendados (GL-18–20) | **~82%** (78–85%) | H1 UX + operação |
| Produto completo com planos | **~63%** (58–68%) | Exige GL-02 commitado |
| Produto completo + H2 | **~76%** (72–80%) | GL-02 + alertas + emails |

### Riscos residuais (mesmo com checklist completa)

1. Pagamento órfão se webhook falhar após smoke (sem alerta automático)
2. Conflito de horário entre seleção e confirmação
3. Cliente sem CPF bloqueado no checkout Asaas
4. Dependência de ação admin após pagamento
5. Metadata ambígua no webhook (legado ~40%)

---

## Conclusão

O sistema **não está pronto para receber o primeiro cliente real hoje** sem executar a checklist operacional. O código do fluxo principal (agendamento avulso) está em estado **aceitável** após GL-01 B1; os bloqueadores restantes são predominantemente **configuração e operação**, não bugs P0 no HEAD atual.

**Recomendação:** concluir GL-01 a GL-17, executar smoke E2E em produção, manter suporte humano de prontidão na primeira semana, e limitar o escopo do 1º cliente a **agendamento avulso** até commitar GL-01 B2 para planos.

---

*Relatório gerado em modo READ ONLY — nenhum código alterado.*
