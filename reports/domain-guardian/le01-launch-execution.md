# LE-01 — Execução Controlada da Homologação

**Modo:** READ ONLY · **Base:** HL-01 · **Escopo:** MVP agendamento avulso · **Commit:** `3f20ad0`

---

## Visão geral

Sequência linear única: **PRE → F1 Sandbox → F2 Preview → F3 Produção → GO Final → 1º cliente**

| Métrica | Valor |
|---------|-------|
| Passos totais | 41 (até abertura cliente) |
| Tempo efetivo | 16–24 h (2–4 dias calendário) |
| MVP aprovado quando | 32 evidências arquivadas + **GO Proprietário** |

---

## Fluxo

```
LE-PRE-001 (baseline)
    ↓
F1: LE-F1-001 … LE-F1-H14 → LE-F1-GATE
    ↓
F2: LE-F2-001 … LE-F2-H01-H14 → LE-F2-GATE
    ↓
F3: LE-F3-001 … LE-F3-H13-H14 → LE-F3-GATE
    ↓
LE-F3-018 Go/No-Go Proprietário  ← ÚLTIMA DECISÃO HUMANA
    ↓
LE-POST-001 Abertura 1º cliente
```

---

## F1 — Sandbox (passos 1–18)

| # | ID | Nome | Tempo | Executa |
|---|-----|------|-------|---------|
| 1 | LE-PRE-001 | Congelar baseline 3f20ad0 | 15 min | Engenheiro |
| 2 | LE-F1-001 | Ambiente local + .env | 30 min | Engenheiro |
| 3 | LE-F1-002 | migrate deploy dev | 15 min | Engenheiro |
| 4 | LE-F1-003 | Túnel webhook ou doc replay | 20 min | Engenheiro |
| 5–17 | LE-F1-H01…H14 | Jornada HL (registro → re-login) | ~90 min | Tester + Eng. |
| 18 | LE-F1-GATE | Aprovação Sandbox | 15 min | Engenheiro |

**Sucesso F1:** H01–H11, H13–H14 PASS; Payment + Appointment + Service no banco dev.

**Falha F1:** Qualquer H obrigatório FAIL → repetir passo; não avançar F2.

**Rollback F1:** Reset banco dev; revogar túnel; delete pagamento simbólico se aplicável.

---

## F2 — Preview (passos 19–23)

| # | ID | Nome | Tempo | Executa |
|---|-----|------|-------|---------|
| 19 | LE-F2-001 | Deploy Vercel Preview | 30 min | Engenheiro |
| 20 | LE-F2-002 | Envs Preview + migrate staging | 30 min | Engenheiro |
| 21 | LE-F2-003 | Webhook sandbox → Preview | 20 min | Engenheiro |
| 22 | LE-F2-H01-H14 | Jornada 14/14 HTTPS (+ mobile) | 60–90 min | Tester + Eng. |
| 23 | LE-F2-GATE | Aprovação Preview | 20 min | Engenheiro |

**Sucesso F2:** 14/14 PASS; webhook entregue pelo Asaas (não só replay manual).

**Falha F2:** 5xx; webhook não entregue → corrigir; repetir F2.

**Rollback F2:** Não promover; atualizar webhook; redeploy preview anterior.

---

## F3 — Produção (passos 24–40)

| # | ID | Nome | Tempo | Executa |
|---|-----|------|-------|---------|
| 24 | LE-F3-001 | Snapshot Neon | 15 min | DevOps |
| 25 | LE-F3-002 | Envs prod + migrate | 45 min | DevOps |
| 26 | LE-F3-003 | Webhook + domínio Asaas prod | 30 min | Engenheiro |
| 27 | LE-F3-004 | Deploy Production | 20 min | Engenheiro |
| 28 | LE-F3-005 | Smoke técnico | 15 min | Engenheiro |
| 29 | LE-F3-H01-H06 | Até checkout prod | 45 min | Proprietário + Eng. |
| 30 | LE-F3-H07 | **Pagamento REAL** | 15 min | **Proprietário** |
| 31 | LE-F3-H08 | Webhook prod (logs) | 10 min | Engenheiro |
| 32 | LE-F3-H09-H10 | Appointment + Service prod | 15 min | Engenheiro |
| 33 | LE-F3-H11 | Minha Conta pós-compra | 5 min | Proprietário |
| 34 | LE-F3-H12 | Admin aceitar agendamento | 10 min | Proprietário |
| 35 | LE-F3-H13-H14 | Logout + re-login | 10 min | Proprietário |
| 36 | LE-F3-006 | Testar replay documentado | 15 min | Engenheiro |
| 37 | LE-F3-007 | Arquivar evidências F3 | 30 min | Engenheiro |
| 38 | LE-F3-008 | Plantão 24h | 15 min | Eng. + Proprietário |
| 39 | LE-F3-GATE | Aprovação técnica F3 | 20 min | Engenheiro |
| 40 | **LE-F3-018** | **Go/No-Go Proprietário** | 30 min | **Proprietário** |

**Sucesso F3:** 14/14 em prod; pagamento real reconciliado; evidências completas.

**Falha F3:** Órfão financeiro; webhook ignorado → **No-Go**; OPS P05/P08.

**Rollback F3:** Reembolso Asaas (não delete Payment); rollback Vercel; restore Neon (extremo).

---

## Última decisão humana antes do 1º cliente

### **LE-F3-018 — Go/No-Go formal do Proprietário THouse**

Após:
- LE-F3-GATE (engenheiro certifica 14/14 em produção)
- Pacote de evidências F1+F2+F3 completo
- Plantão e canal de suporte definidos
- Texto "lançamento controlado" preparado

O **Proprietário** assina a **Aprovação Final** autorizando explicitamente a divulgação ao primeiro cliente pagante externo.

Nenhum deploy, pagamento ou smoke substitui esta assinatura. **LE-POST-001** só executa após GO.

---

## Tabela única de evidências (MVP aprovado)

| ID | Evidência | Fase | Obrig. |
|----|-----------|------|--------|
| EV-001 | git log HEAD = 3f20ad0 | PRE | ✓ |
| EV-002 | npm run build / CI PASS | PRE | ✓ |
| EV-003 | migrate deploy log (dev/staging/prod) | F1,F2,F3 | ✓ |
| EV-004 | Neon snapshot timestamp pré-prod | F3 | ✓ |
| EV-005 | Print webhook Asaas (sandbox + prod) | F1,F2,F3 | ✓ |
| EV-006 | Log `[Asaas Webhook] PAYMENT_RECEIVED` | F1,F2,F3 | ✓ |
| EV-007 | Log `[CarrinhoEffects:webhook]` OK | F1,F2,F3 | ✓ |
| EV-008 | Painel Asaas RECEIVED + asaasId | F1,F2,F3 | ✓ |
| EV-009 | Print registro logado | F1,F2,F3 | ✓ |
| EV-010 | Print /agendamento + /carrinho | F1,F2,F3 | ✓ |
| EV-011 | Print checkout Asaas | F1,F2,F3 | ✓ |
| EV-012 | Print /minha-conta pós-pagamento | F1,F2,F3 | ✓ |
| EV-013 | Print /admin/agendamentos + pagamentos | F2,F3 | ✓ |
| EV-014 | Print /admin/servicos | F1,F2,F3 | ✓ |
| EV-015 | Print admin agendamento ACEITO | F3 | ✓ |
| EV-016 | Print mobile /minha-conta | F2 | ✓ |
| EV-017 | Banco: Payment approved | F1,F2,F3 | ✓ |
| EV-018 | Banco: Appointment pendente | F1,F2,F3 | ✓ |
| EV-019 | Banco: Service vinculado | F1,F2,F3 | ✓ |
| EV-020 | Vercel Preview Ready | F2 | ✓ |
| EV-021 | Vercel Production Ready | F3 | ✓ |
| EV-022 | Vercel envs (mascarados) | F2,F3 | ✓ |
| EV-023 | Logs sem 5xx crítico | F2,F3 | ✓ |
| EV-024 | Logout + re-login OK | F1,F2,F3 | ✓ |
| EV-025 | Doc curl replay testado | F3 | ✓ |
| EV-026 | LE-F1-GATE assinado | F1 | ✓ |
| EV-027 | LE-F2-GATE assinado | F2 | ✓ |
| EV-028 | LE-F3-GATE assinado Engenheiro | F3 | ✓ |
| EV-029 | **Aprovação Final GO Proprietário** | FINAL | ✓ |
| EV-030 | Plantão 24h documentado | F3 | ✓ |
| EV-031 | asaasId/paymentId/appointmentId F3 | F3 | ✓ |
| EV-032 | Índice pasta evidências F1+F2+F3 | FINAL | ✓ |

**MVP aprovado = EV-001 a EV-032 arquivados + LE-F3-018 GO**

---

## Detalhe por passo (template)

Cada passo em `le01-launch-execution.json` contém:

- Nome, Objetivo, Tempo, Quem executa
- Ferramentas
- Pré-requisitos
- Critério de sucesso / falha
- Plano de rollback
- Evidência obrigatória

---

## Avisos OPS (durante execução)

1. Replay webhook: sempre header `asaas-access-token`
2. Não usar `processar-direto` para carrinho MVP (legado)
3. Webhook HTTP 200 ≠ sucesso — validar banco

---

## Confiança pós-execução completa

**82%** para abrir ao 1º cliente pagante (HL-01). Atalhos (pular F2, só replay manual) reduzem para ~62–74%.

---

*Relatório gerado em modo READ ONLY — nenhum código alterado.*
