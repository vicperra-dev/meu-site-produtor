# HL-01 — Homologação Final do MVP

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Escopo:** MVP agendamento avulso via Asaas

---

## Objetivo

Roteiro definitivo da homologação real antes do primeiro cliente pagante. Três fases sequenciais: **Sandbox → Preview → Produção**, cada uma com gate de aprovação.

**Caminho validado:** `Agendamento → Carrinho → checkout-carrinho → Asaas → webhooks/asaas → Appointment + Service → Minha Conta / Admin`

---

## Fase 1 — Sandbox

| Campo | Detalhe |
|-------|---------|
| **Ambiente** | Local (`npm run dev`) + Asaas sandbox + banco dev/staging |
| **Objetivo** | Validar lógica da aplicação sem dinheiro real |

### Pré-requisitos

- Commit `3f20ad0` (GL-01 B1)
- `DATABASE_URL` não-produção
- `ASAAS_API_KEY` sandbox
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- Túnel (ngrok) **ou** plano de replay webhook documentado

### Passos

1. Subir app local
2. Configurar `.env.local`
3. Opcional: túnel → webhook sandbox
4. Executar matriz 14 etapas (conta teste nova)
5. Agendamento → carrinho → checkout sandbox
6. Concluir pagamento teste Asaas
7. Validar webhook (automático ou replay curl com `asaas-access-token`)
8. Verificar banco: Payment, Appointment, Service
9. Validar UI cliente + admin
10. Logout + re-login

### Resultado esperado

Payment `approved`; ≥1 Appointment `pendente`; Service criado; visível em Minha Conta e Admin.

### Como validar

- UI `/minha-conta`
- `GET /api/meus-dados`
- `GET /api/pagamentos/verificar?paymentId=`
- Logs `[CarrinhoEffects:webhook]` sem `skippedReason` crítico

### Como desfazer

- Delete pagamento simbólico (admin) se aplicável
- Reset banco dev — **nunca em produção**
- Revogar túnel

### Critério de aprovação

**H01–H11 + H13 PASS**; zero P0; incidentes documentados.

---

## Fase 2 — Preview

| Campo | Detalhe |
|-------|---------|
| **Ambiente** | Vercel Preview + Asaas sandbox + banco staging + HTTPS |
| **Objetivo** | Validar deploy real e webhook público |

### Pré-requisitos

- Fase 1 aprovada
- Preview deploy verde
- `migrate deploy` staging
- Webhook sandbox → `https://{preview}.vercel.app/api/webhooks/asaas`
- Token webhook = `ASAAS_WEBHOOK_ACCESS_TOKEN` Preview

### Passos

1. Deploy Preview
2. Confirmar build Vercel
3. Atualizar webhook Asaas com URL preview
4. Evento teste no painel Asaas
5. Matriz 14 etapas em browser (mobile recomendado)
6. Pagamento sandbox via checkout hospedado
7. Aguardar webhook (≤3 min) — logs Vercel
8. Validar banco + UIs
9. Logout + login

### Resultado esperado

Mesmo que F1 em HTTPS; webhook entregue pelo Asaas (não só replay manual).

### Como validar

- Vercel Logs: `[Asaas Webhook]` + sem 5xx
- Matriz **14/14 PASS**
- `NEXT_PUBLIC_SITE_URL` preview nos redirects

### Como desfazer

- Atualizar/remover webhook sandbox
- Excluir pagamento teste (se simbólico)
- Não promover preview defeituoso

### Critério de aprovação

**14/14 PASS**; webhook Asaas entregue; mobile sem bloqueio crítico.

---

## Fase 3 — Produção

| Campo | Detalhe |
|-------|---------|
| **Ambiente** | Vercel Production + Asaas prod + banco produção |
| **Objetivo** | Homologação final com dinheiro real mínimo |

### Pré-requisitos

- Fase 2 aprovada
- Snapshot Neon (OPS P10)
- `migrate deploy` produção
- Envs: `$aact_prod_*`, webhook token, `NEXT_PUBLIC_SITE_URL` https
- Domínio aprovado Asaas
- Runbook OPS-01 + plantão

### Passos

1. Backup Neon pré-teste
2. Deploy Production `3f20ad0`
3. Smoke: `/`, `/login`, `/registro`
4. Conta homologação (email controlado)
5. Matriz 14 etapas — **pagamento real valor mínimo**
6. Confirmar RECEIVED/CONFIRMED no Asaas prod
7. Logs Vercel — sem token inválido
8. Validar banco prod
9. **Admin: aceitar agendamento** (fluxo operacional)
10. Logout + login + persistência
11. Arquivar asaasId, paymentId, appointmentId
12. Go/No-Go — Proprietário assina

### Resultado esperado

Cadeia real money validada; pronto para 1º cliente externo.

### Como validar

- Painel Asaas prod
- Matriz 14/14 em produção
- `/minha-conta` em < 5 min pós-pagamento

### Como desfazer

- **Não** deletar pagamento real (`asaasId`)
- Reembolso via Asaas se necessário
- Rollback Vercel (OPS P02) se bug código
- Restore Neon apenas extremo (OPS P11)

### Critério de aprovação

**14/14 PASS**; pagamento reconciliado; Go assinado; plantão 24h.

---

## Matriz de homologação — 14 etapas

| ID | Etapa | F1 | F2 | F3 | Humano? | StudioOS? |
|----|-------|----|----|-----|---------|-----------|
| H01 | Registro | ✓ | ✓ | ✓ | Sim | 85% |
| H02 | Login | ✓ | ✓ | ✓ | Sim | 90% |
| H03 | Minha Conta (pré) | ✓ | ✓ | ✓ | Sim | 90% |
| H04 | Agendamento | ✓ | ✓ | ✓ | Sim | 60% |
| H05 | Carrinho | ✓ | ✓ | ✓ | Sim | 55% |
| H06 | Checkout | ✓ | ✓ | ✓ | Sim | 80% |
| H07 | Pagamento Asaas | ✓ | ✓ | ✓ | **Sim** | 15% |
| H08 | Webhook | ✓ | ✓ | ✓ | Parcial | 75% |
| H09 | Appointment | ✓ | ✓ | ✓ | Não | 95% |
| H10 | Service | ✓ | ✓ | ✓ | Não | 95% |
| H11 | Minha Conta (pós) | ✓ | ✓ | ✓ | Sim | 70% |
| H12 | Admin | Rec | ✓ | ✓+aceitar | Sim | 50% |
| H13 | Logout | ✓ | ✓ | ✓ | Sim | 90% |
| H14 | Re-login | Rec | ✓ | ✓ | Sim | 90% |

---

## Intervenção humana

### Obrigatória

- Formulários: registro, agendamento, carrinho (CPF/CEP)
- Pagamento no checkout hospedado Asaas (sandbox e real)
- Verificação UX Minha Conta pós-compra (pode precisar F5)
- Admin aceitar agendamento (F3)
- Configuração webhook/domínio no painel Asaas
- **Go/No-Go** — Proprietário

### Automática (pós-webhook)

- Criação de Appointment e Service (`processCarrinhoPaymentEffects`)

### StudioOS — automação futura média: **72%**

Permanece manual: UI pagamento Asaas, Go/No-Go, painel Asaas, julgamento admin.

---

## Checklists

### Sandbox

- [ ] Commit `3f20ad0`
- [ ] Banco dev + migrate OK
- [ ] Chave sandbox
- [ ] App local + túnel/replay
- [ ] H01–H11 + H13 PASS
- [ ] Payment + Appointment + Service no banco

### Preview

- [ ] Sandbox aprovado
- [ ] Preview deploy verde
- [ ] Webhook sandbox → URL preview
- [ ] Evento teste nos logs
- [ ] **14/14 PASS**
- [ ] Teste mobile
- [ ] Zero 5xx crítico

### Produção

- [ ] Preview aprovado
- [ ] Snapshot Neon
- [ ] migrate prod + envs prod
- [ ] Webhook + domínio prod
- [ ] **14/14 PASS** pagamento real
- [ ] Admin aceita agendamento
- [ ] Documentação asaasId arquivada

### Aprovação final

- [ ] F1 — APROVADO (Engenheiro)
- [ ] F2 — APROVADO (Engenheiro)
- [ ] F3 — APROVADO (Engenheiro + Proprietário)
- [ ] 14/14 em F3
- [ ] Zero P0 aberto
- [ ] Replay webhook documentado
- [ ] Suporte + texto lançamento controlado
- [ ] **GO** primeiro cliente pagante

---

## Confiança pós-homologação

> Após concluir F1 + F2 + F3 + Aprovação Final, qual a confiança para abrir ao primeiro cliente pagante?

### **82%** (faixa 78–86%)

| Cenário | Confiança |
|---------|-----------|
| Sem homologação | ~52% |
| Apenas Sandbox | ~62% |
| Sandbox + Preview | ~74% |
| **Homologação completa (F3)** | **~82%** |

**Definição:** 1º cliente externo completa compra avulsa sem engenheiro em loop; admin aceitar agendamento é operação normal.

**Riscos residuais:** webhook pós-homologação; UX sem polling; CPF/dados cliente real; conflito de horário.

---

## Avisos OPS (homologação)

1. `processar-manual` / `buscar-por-valor` **não enviam** `asaas-access-token` — replay em prod falha silenciosamente.
2. `processar-direto` usa orquestrador **legado** — evitar para carrinho MVP.
3. Replay canônico: `curl` + header `asaas-access-token`.

---

*Relatório gerado em modo READ ONLY — nenhum código alterado.*
