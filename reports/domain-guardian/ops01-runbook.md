# OPS-01 — Runbook Operacional do Go Live

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Escopo:** MVP agendamento avulso via Asaas

---

## Avisos críticos (ler antes de operar)

| # | Aviso |
|---|--------|
| **NOTE-1** | `processar-manual` e `buscar-por-valor` chamam `/api/webhooks/asaas` **sem** header `asaas-access-token`. Em produção com token configurado, o webhook retorna **200 mas ignora** o evento. |
| **NOTE-2** | `processar-direto` usa `process-payment-webhook.ts` (legado), **não** o pipeline PR-03 do webhook canônico. Evitar para carrinho MVP. |
| **NOTE-3** | Webhook **sempre HTTP 200** — verificar banco após qualquer replay, não confiar só no status HTTP. |

**Replay canônico recomendado:**

```bash
curl -X POST "https://{DOMINIO}/api/webhooks/asaas" \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: {ASAAS_WEBHOOK_ACCESS_TOKEN}" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{...payload do Asaas...}}'
```

---

## Runbook completo — 17 procedimentos

### P01 — Deploy

| Campo | Valor |
|-------|-------|
| **Objetivo** | Publicar MVP agendamento avulso em produção |
| **Tempo** | 30–60 min |
| **Responsável** | Engenheiro / DevOps |
| **Automatizar?** | PARCIAL |

**Passos:**
1. Confirmar commit `3f20ad0` (GL-01 B1)
2. `npm run build` ou CI Domain Guardian verde
3. Envs Vercel: `DATABASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_ACCESS_TOKEN`, `NEXT_PUBLIC_SITE_URL`
4. `npx prisma migrate deploy` no banco produção
5. Push → Vercel build (`prisma generate` + `next build`)
6. Validar deploy e registrar commit hash

---

### P02 — Rollback

| Campo | Valor |
|-------|-------|
| **Objetivo** | Reverter deploy defeituoso |
| **Tempo** | 10–20 min (código); 1–4 h se restore banco |
| **Responsável** | Engenheiro |
| **Automatizar?** | PARCIAL |

**Passos:**
1. Identificar deployment estável no Vercel
2. Avaliar impacto de migrations recentes
3. Promote deployment anterior
4. Smoke: home, login, `/api/me`
5. Se dados corrompidos → P11 Restore
6. Pausar pagamentos se bug financeiro

---

### P03 — Pagamento não confirmado

| Campo | Valor |
|-------|-------|
| **Objetivo** | Diagnosticar checkout sem RECEIVED/CONFIRMED no Asaas |
| **Tempo** | 15–30 min |
| **Responsável** | Admin / Suporte |
| **Automatizar?** | PARCIAL |

**Passos:**
1. Obter email, valor, horário do cliente
2. Painel Asaas → status da cobrança
3. Se PENDING: orientar conclusão PIX/boleto/cartão
4. `GET /api/pagamentos/verificar?paymentId={id}`
5. Logs Vercel `[Asaas Checkout]` / `checkout-carrinho`
6. Se CONFIRMED no Asaas sem banco → P05 ou P08

---

### P04 — Webhook não recebido

| Campo | Valor |
|-------|-------|
| **Objetivo** | Recuperar evento PAYMENT_RECEIVED não processado |
| **Tempo** | 20–45 min |
| **Responsável** | Engenheiro / Admin |
| **Automatizar?** | PARCIAL |

**Passos:**
1. Asaas → Webhooks → entregas / falhas
2. Confirmar URL `https://{dominio}/api/webhooks/asaas`
3. Token painel = `ASAAS_WEBHOOK_ACCESS_TOKEN`
4. Logs Vercel: `[Asaas Webhook]` no horário
5. GET pagamento no Asaas API
6. Replay canônico (P08) com header `asaas-access-token`
7. Verificar Payment + Appointment no banco

---

### P05 — Pagamento recebido sem Appointment

| Campo | Valor |
|-------|-------|
| **Objetivo** | Corrigir Payment approved sem agendamento vinculado |
| **Tempo** | 30–60 min |
| **Responsável** | Engenheiro |
| **Automatizar?** | PARCIAL |

**Passos:**
1. `/admin/pagamentos` → localizar pagamento
2. Verificar `PaymentMetadata` (tipo carrinho, items)
3. Confirmar `appointmentId` / `appointmentIds` vazios
4. Logs: `[CarrinhoEffects:webhook] skippedReason`
5. Se metadata OK → replay webhook (P08)
6. Confirmar Appointment `pendente` criado
7. Metadata incompleto → investigar checkout, não replay cego

---

### P06 — Appointment criado sem Cupom

| Campo | Valor |
|-------|-------|
| **Objetivo** | Resolver agendamento sem cupom quando esperado |
| **Tempo** | 20–40 min |
| **Responsável** | Admin |
| **Automatizar?** | NÃO |

**Passos:**
1. `/admin/agendamentos` → cupomAssociado
2. **Nota MVP:** agendamento avulso pago **pode não gerar cupom** — cupom é típico de planos/remarcação
3. Se cupom esperado: `/api/admin/cupons` ou `associar-usuario`
4. Simbólico: `POST /api/admin/reprocessar-pagamento-teste`
5. Documentar se falso positivo

---

### P07 — Cliente pagou e não aparece em Minha Conta

| Campo | Valor |
|-------|-------|
| **Objetivo** | Restaurar visibilidade em `/minha-conta` |
| **Tempo** | 15–45 min |
| **Responsável** | Suporte / Admin |
| **Automatizar?** | PARCIAL |

**Passos:**
1. Confirmar email/conta correta do cliente
2. Verificar `userId` do Payment = cliente
3. Appointment com `adminArchivedAt: null`
4. Se Payment sem Appointment → P05
5. Pedir F5 / logout-login
6. Aguardar 2–3 min (webhook atrasado)
7. Informar: status `pendente` é normal pós-pagamento
8. Persistindo → P08 + comunicar com asaasId

---

### P08 — Reprocessamento

| Campo | Valor |
|-------|-------|
| **Objetivo** | Reexecutar efeitos pelo pipeline PR-03 |
| **Tempo** | 15–30 min |
| **Responsável** | Engenheiro |
| **Automatizar?** | PARCIAL |

| Opção | Rota | Uso MVP carrinho |
|-------|------|------------------|
| **A (recomendada)** | `curl` → `/api/webhooks/asaas` + token | ✅ Canônico |
| B | `POST /api/pagamentos/processar-manual` | ⚠️ Sem token interno |
| C | `POST /api/pagamentos/buscar-por-valor` | ⚠️ Sem token interno |
| D | `POST /api/pagamentos/processar-direto` | ❌ Legado |
| E | `/admin/pagamentos` → Reprocessar | Apenas simbólico |

**Passos opção A:**
1. GET `/v3/payments/{asaasId}` no Asaas
2. curl com `asaas-access-token` (ver topo)
3. Logs `[CarrinhoEffects:webhook]`
4. Confirmar idempotência antes de repetir

---

### P09 — Delete simbólico

| Campo | Valor |
|-------|-------|
| **Objetivo** | Remover pagamento de teste do banco |
| **Tempo** | 5–10 min |
| **Responsável** | Admin |
| **Automatizar?** | NÃO |

**Passos:**
1. `/admin/pagamentos` → pagamento teste/simbólico
2. Excluir → API `canAdminDeletePayment` valida
3. `DELETE /api/admin/pagamentos?id={id}` — 422 se pagamento real
4. **Nunca** deletar pagamento produção com `asaasId` — usar reembolso Asaas

---

### P10 — Backup

| Campo | Valor |
|-------|-------|
| **Objetivo** | Ponto de recuperação antes de deploy/1º cliente |
| **Tempo** | 10–15 min |
| **Responsável** | Engenheiro / DevOps |
| **Automatizar?** | SIM |

**Passos:**
1. Neon Console → snapshot manual ou confirmar PITR
2. Registrar timestamp
3. Obrigatório antes de `migrate deploy`
4. Não commitar dumps no git

---

### P11 — Restore

| Campo | Valor |
|-------|-------|
| **Objetivo** | Recuperar banco após incidente grave |
| **Tempo** | 1–4 h |
| **Responsável** | Engenheiro / DevOps |
| **Automatizar?** | PARCIAL |

**Passos:**
1. Modo manutenção ou pausar Vercel
2. Neon PITR ou restore snapshot
3. Atualizar `DATABASE_URL` se branch mudou
4. `prisma migrate status`
5. Smoke + reconciliar Asaas vs banco (período outage)
6. Documentar dados perdidos no intervalo

---

### P12 — Troca de chave Asaas

| Campo | Valor |
|-------|-------|
| **Objetivo** | Rotacionar API key ou webhook token |
| **Tempo** | 30–45 min |
| **Responsável** | Engenheiro |
| **Automatizar?** | NÃO |

**Passos:**
1. Gerar nova chave no painel Asaas
2. Baixo tráfego / janela curta
3. Atualizar Vercel → redeploy
4. Token webhook: **mesmo valor** no Vercel e painel Asaas
5. Teste checkout + evento webhook teste
6. Revogar chave antiga após 24h estável

---

### P13 — Logs

| Campo | Valor |
|-------|-------|
| **Objetivo** | Investigar incidentes |
| **Tempo** | 10–30 min/incidente |
| **Responsável** | Engenheiro |
| **Automatizar?** | SIM |

**Filtros Vercel:**
- `[Asaas Webhook]`
- `checkout-carrinho`
- `[CarrinhoEffects:webhook]`
- `[Processar Manual]`

Correlacionar: timestamp + `asaasId` + `userId`. Não expor PII em tickets.

---

### P14 — Monitoramento

| Campo | Valor |
|-------|-------|
| **Objetivo** | Detectar falhas proativamente |
| **Tempo** | 15 min/dia + 30 min/semana |
| **Responsável** | Engenheiro / Admin |
| **Automatizar?** | PARCIAL |

**Rotina:**
- Diário: 5xx em checkout-carrinho e webhooks
- Diário: Asaas webhooks falhos
- Diário: `/admin/pagamentos` — approved sem agendamento
- Semanal: `domain-guardian-runner.ts`
- Semanal: `release-manager-agent.ts`

---

### P15 — Primeiro pagamento em produção

| Campo | Valor |
|-------|-------|
| **Objetivo** | Validar cadeia real money antes do 1º cliente externo |
| **Tempo** | 45–90 min |
| **Responsável** | Proprietário + Engenheiro |
| **Automatizar?** | NÃO |

**Passos:**
1. GL-02 itens 1–17 concluídos
2. Conta teste controlada
3. Fluxo completo registro → agendamento → carrinho → checkout PROD
4. Asaas RECEIVED/CONFIRMED
5. Banco: Payment + Appointment + metadata carrinho
6. `/minha-conta` e `/admin/agendamentos` OK
7. Liberar cliente externo

---

### P16 — Primeiras 24 horas

| Campo | Valor |
|-------|-------|
| **Objetivo** | Estabilizar pós-go-live |
| **Tempo** | ~1 h trabalho efetivo em 24 h |
| **Responsável** | Engenheiro + Admin plantão |
| **Automatizar?** | PARCIAL |

| Marco | Ação |
|-------|------|
| H+0 | Deploy + P15 validado |
| H+1 | Logs webhook + checkout |
| H+4 | Zero pagamentos órfãos em admin |
| H+8 | Segundo check logs + Asaas |
| H+24 | Relatório: pagamentos, appointments, tickets |

Manter runbook P04/P07/P08 acessível. Não alterar envs salvo incidente.

---

### P17 — Primeira semana

| Campo | Valor |
|-------|-------|
| **Objetivo** | Confirmar estabilidade antes de escalar |
| **Tempo** | 3–5 h total |
| **Responsável** | Engenheiro + Proprietário |
| **Automatizar?** | PARCIAL |

- Dias 1–3: monitoramento diário (P14)
- Dia 3: documentar replay webhook em sandbox
- Dia 5: backup Neon semanal
- Dia 7: retrospectiva + atualizar runbook

---

## Checklist de emergência

- [ ] Modo manutenção se bug financeiro ativo
- [ ] Escopo: clientes/pagamentos afetados
- [ ] Pausar novos checkouts se necessário
- [ ] Coletar asaasId + email + timestamp
- [ ] Status no painel Asaas
- [ ] Logs `[Asaas Webhook]`
- [ ] Replay canônico **com** `asaas-access-token`
- [ ] Confirmar Appointment no banco antes de falar com cliente
- [ ] Corrupção banco → P11 | Bug código → P02
- [ ] Registrar incidente

---

## Checklist de rollback

- [ ] Bug reproduzível ou perda financeira confirmada
- [ ] Commit estável identificado no Vercel
- [ ] Migration recente avaliada
- [ ] Snapshot Neon se dados em risco
- [ ] Promote deployment anterior
- [ ] Envs inalterados
- [ ] Smoke pós-rollback
- [ ] Reprocessar órfãos (P08) se necessário
- [ ] Comunicar equipe

---

## Checklist de monitoramento

- [ ] Diário: 5xx `checkout-carrinho` + `webhooks/asaas`
- [ ] Diário: webhooks falhos no Asaas
- [ ] Diário: pagamentos approved sem agendamento
- [ ] Diário: tickets "paguei e não apareceu"
- [ ] Semanal: Domain Guardian (prod read-only)
- [ ] Semanal: backup Neon
- [ ] Mensal: validade `ASAAS_API_KEY`
- [ ] Mensal: teste replay webhook (sandbox)

---

## Automação futura pelo DevOS

**DevOS** = ecossistema de agentes THouse (Domain Guardian, Release Manager, Decision Engine) — `docs/ai/engineering-agents.md`

### **58%** do runbook poderá ser executado automaticamente (faixa 52–65%)

| Procedimento | % futuro |
|--------------|----------|
| P01 Deploy | 75% |
| P02 Rollback | 45% |
| P03 Pag. não confirmado | 55% |
| P04 Webhook não recebido | 60% |
| P05 Pag. sem Appointment | 70% |
| P06 Appt. sem Cupom | 40% |
| P07 Não aparece Minha Conta | 50% |
| P08 Reprocessamento | 65% |
| P09 Delete simbólico | 25% |
| P10 Backup | 85% |
| P11 Restore | 55% |
| P12 Troca chave Asaas | 20% |
| P13 Logs | 80% |
| P14 Monitoramento | 70% |
| P15 1º pagamento prod | 25% |
| P16 Primeiras 24h | 60% |
| P17 Primeira semana | 55% |

### Permanece manual (~42%)

- Comunicação com cliente
- Aprovação de rollback financeiro
- Go/no-go primeiro pagamento real
- Painel Asaas (chaves, domínio)
- Delete simbólico (confirmação segurança)
- Julgamento se cupom era esperado no avulso

### Roadmap DevOS sugerido

1. `replay-webhook-asaas.ts` com token + validação pós-banco
2. Guardian: Payment approved sem Appointment > 5 min
3. Neon backup pré-deploy automático
4. Alerta quando webhook retorna `error` no body com HTTP 200

---

*Relatório gerado em modo READ ONLY — nenhum código, commit ou banco alterado.*
