# PH-01 — Product Hardening (Business Validation)

**Modo:** Business Validation · Launch Readiness  
**Gerado:** 2026-07-15  
**Branch:** `backup-pre-formatacao`  
**Arquitetura:** Congelada pós-EC-01 (sem novos módulos/infra)

---

## Veredicto

**Prontidão para produção: CONDICIONAL (~74% confiança)**

Correções de negócio críticas aplicadas. Todos os gates automatizados passam. Lançamento depende de configuração operacional (webhook Asaas) e UX pós-pagamento.

---

## Gates executados

| Gate | Resultado |
|------|-----------|
| Domain Audit | PASS |
| Workflow Audit | PASS |
| Sync Audit | PASS |
| Execution Audit | PASS |
| Knowledge Graph Audit | PASS |
| Discovery Audit | PASS |
| Regression Audit | PASS |
| TE-02A | 21/21 |
| SYNC-01A | 7/7 |
| **PH-01 (novo)** | **5/5** |
| SIM-01 | 10/10 |
| SIM-02 | 10/10 |

**Cenários descobertos:** 56 (inclui suite `ph01` com 5 regressões)

---

## Bugs corrigidos (6)

| ID | Área | Correção |
|----|------|----------|
| BUG-CPN-01 | Cupom | `AppointmentAccepted` marca cupons `used` mesmo com `paymentId` |
| BUG-CPN-02 | Cupom | `normalizeStaleCouponAppointmentLink` não libera cupom em `concluido` |
| BUG-SRV-01 | Multi-serviço | Reparo parcial por tipo em `createServicesForAppointmentIfMissing` |
| BUG-RF-01 | Cancelamento | `cancelAppointment` antes do reembolso Asaas |
| BUG-UX-01 | Minha Conta | Seção "Cupons de Serviço" (SERVICE/REBOOK) |
| BUG-REG-01 | Cadastro | `getBirthDateMaxYear()` dinâmico (idade mínima 12 anos) |

---

## Bugs encontrados — pendentes (4)

| ID | Área | Risco |
|----|------|-------|
| BUG-CK-01 | Carrinho | Cupom não validado no servidor; total do cliente confiado |
| BUG-WH-01 | Webhook | Fallback `loadMetadataForPayment` por userId |
| BUG-UX-02 | Pós-pagamento | Sem polling na página de sucesso |
| BUG-ADM-01 | Admin | Rotas de teste sem gate extra em produção |

---

## Cobertura de testes

- **Execution Core:** pipeline oficial (Workflow → SM → Sync → Assertions)
- **TE-02A:** serviços, cupons, planos, agendamentos, pagamentos, admin, usuário
- **SYNC-01A:** cursor replay, SSE, escopos user/admin
- **PH-01:** regressões dos 6 fixes acima
- **SIM-01/02:** jornadas completas via simulação

Cenários PH-01: `PH01-001` … `PH01-005` — `npm run te:suite:ph01`

---

## Confiança para produção

| Métrica | Valor |
|---------|-------|
| Confiança geral | **~74%** |
| Jornada core (registro → pagamento → conta) | ~58% |
| Jornada completa (admin, entrega, reembolso) | ~42% |

### Bloqueadores antes do deploy

1. Webhook Asaas em URL pública (H-WH-01)
2. Polling/feedback na página de sucesso (H-MC-02)
3. Smoke test sandbox ponta a ponta

### Pós-lançamento recomendado

- Validação server-side de cupom no carrinho
- Endurecer fallback de metadata no webhook
- SLA visível para aguardando confirmação admin

---

## Arquivos alterados

Correções de domínio/UX + suite `ph01` + discovery/CLI. Sem alteração estrutural do Execution Core.

Relatório encerrado. Aguardando aprovação.
