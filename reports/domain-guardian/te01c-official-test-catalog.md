# TE-01C — Catálogo Oficial de Testes (THouse Rec)

**Modo:** Staff Software Engineer · QA Lead · Test Architect · Domain Guardian · Product Owner  
**Gerado:** 2026-07-13  
**Restrições:** nenhum código alterado · nenhum commit · nenhuma implementação  
**Artefato máquina:** `te01c-official-test-catalog.json` (132 testes)

Este catálogo é a **fonte permanente de IDs** para:

- Test Engine (TE-01B+)
- StudioOS QA Center
- Release Gates
- Domain Guardian mapeamento

**Premissa:** todo teste reutiliza o pipeline oficial (sem fluxo paralelo). Ver TE-01A.

---

## Legenda

| Campo | Valores |
|-------|---------|
| **Prioridade** | P0 crítico / P1 importante / P2 desejável |
| **Categoria** | Smoke · Regression · Business · Stress · Security · Migration · Release Gate |
| **Cobertura** | `atual` (já exercitado no TE) · `parcial` · `futura` |
| **Auto** | SIM · PARCIAL · NÃO |

---

## Cobertura global

| Métrica | Valor |
|---------|------:|
| **Total de testes** | **132** |
| P0 | 65 |
| P1 | 56 |
| P2 | 11 |
| Cobertura **atual** (TE-01B smoke) | 3 |
| Cobertura **parcial** | 29 |
| Cobertura **futura** | 100 |
| Auto SIM | 54 |
| Auto PARCIAL | 71 |
| Auto NÃO | 7 |

---

## Tabela por domínio

| Domínio | Testes | P0 | P1 | P2 | Atual | Parcial | Futura |
|---------|-------:|---:|---:|---:|------:|--------:|-------:|
| AUTH | 16 | 9 | 6 | 1 | 0 | 4 | 12 |
| PAYMENT | 16 | 10 | 5 | 1 | 2 | 4 | 10 |
| APPOINTMENT | 13 | 8 | 4 | 1 | 1 | 0 | 12 |
| SERVICE | 20 | 6 | 14 | 0 | 0 | 5 | 15 |
| COUPONS | 15 | 8 | 5 | 2 | 0 | 2 | 13 |
| PLANS | 11 | 8 | 2 | 1 | 0 | 1 | 10 |
| DELIVERY | 8 | 5 | 3 | 0 | 0 | 1 | 7 |
| ADMIN | 11 | 5 | 6 | 0 | 0 | 6 | 5 |
| ANALYTICS | 9 | 2 | 6 | 1 | 0 | 6 | 3 |
| FAQ | 2 | 0 | 1 | 1 | 0 | 0 | 2 |
| CHAT | 2 | 0 | 1 | 1 | 0 | 0 | 2 |
| CROSS (novos) | 9 | 4 | 3 | 2 | 0 | 0 | 9 |

---

## Schema obrigatório (cada teste)

No JSON, cada entrada contém:

- `id` · `name` · `domain` · `objective` · `priority` · `categories`
- `prerequisites` · `pipeline` · `eventsFired` · `expectedAsserts`
- `dataCreated` · `dataRemoved` · `cleanupRequired` · `canRunAutomatically`
- `linkedInvariants` · `teScenarioHints` · `coverage`

---

## 1. AUTH (AUTH-001 … AUTH-016)

| ID | Nome | Pri | Cat | Auto | Cobertura |
|----|------|-----|-----|------|-----------|
| AUTH-001 | Registro válido | P0 | Smoke/RG/Biz | SIM | parcial |
| AUTH-002 | Login válido | P0 | Smoke/RG | SIM | parcial |
| AUTH-003 | Logout | P1 | Regression | SIM | futura |
| AUTH-004 | Auto-login pós-registro | P0 | Smoke/Biz | SIM | parcial |
| AUTH-005 | CPF duplicado | P0 | Reg/Biz/Sec | SIM | futura |
| AUTH-006 | Data nascimento ano inválido | P0 | Reg/Biz | SIM | futura |
| AUTH-007 | Data inexistente 31/02 | P1 | Regression | SIM | futura |
| AUTH-008 | Data futura | P1 | Regression | SIM | futura |
| AUTH-009 | Sexo obrigatório | P0 | Reg/Biz | SIM | futura |
| AUTH-010 | Gênero obrigatório | P0 | Reg/Biz | SIM | futura |
| AUTH-011 | Prefiro não informar | P1 | Business | SIM | futura |
| AUTH-012 | Update conta CPF único | P1 | Regression | PARCIAL | futura |
| AUTH-013 | Minha Conta autenticada | P0 | Smoke/RG | SIM | parcial |
| AUTH-014 | Minha Conta sem auth | P1 | Security | SIM | futura |
| AUTH-015 | Email duplicado | P0 | Regression | SIM | futura |
| AUTH-016 | Senha mínima | P2 | Regression | SIM | futura |

**Pipeline típico:** `POST /api/registro` · `POST /api/login` · `GET /api/meus-dados`  
**Cleanup:** users `*@homolog.test` via `cleanup-test-users`

### Exemplo completo — AUTH-005

| Campo | Valor |
|-------|-------|
| Objetivo | Impedir segundo User com mesmo CPF (HS-01) |
| Pré-requisitos | CPF já cadastrado |
| Pipeline | `POST /api/registro` |
| Eventos | nenhum (falha) |
| Asserts | HTTP 400 · mensagem *"O CPF informado já está cadastrado."* |
| Dados criados | nenhum no fail path |
| Cleanup | N/A |
| Auto | SIM |

---

## 2. PAYMENT (PAY-001 … PAY-016)

| ID | Nome | Pri | Auto | Cobertura |
|----|------|-----|------|-----------|
| PAY-001 | Checkout cria PaymentMetadata | P0 | PARCIAL | parcial |
| PAY-002 | Pagamento aprovado webhook | P0 | SIM | **atual** (TE-S01) |
| PAY-003 | Pagamento não confirmado | P0 | SIM | futura |
| PAY-004 | asaasId duplicado F1 | P0 | SIM | futura |
| PAY-005 | Webhook duplicado F3 | P0 | SIM | futura |
| PAY-006 | Webhook body inválido | P1 | SIM | futura |
| PAY-007 | Webhook sem token (prod) | P0 | SIM | parcial |
| PAY-008 | Token incorreto | P0 | SIM | futura |
| PAY-009 | Replay canônico | P1 | SIM | parcial |
| PAY-010 | Pagamento simbólico | P0 | SIM | **atual** |
| PAY-011 | Pagamento real Asaas | P1 | PARCIAL | parcial |
| PAY-012 | Checkout carrinho | P0 | PARCIAL | futura |
| PAY-013 | Checkout plano | P0 | PARCIAL | futura |
| PAY-014 | PAYMENT_REFUNDED F7 | P1 | PARCIAL | futura |
| PAY-015 | Webhook fora de ordem | P1 | PARCIAL | futura |
| PAY-016 | Race twin checkout | P2 | PARCIAL | futura |

**Pipeline canônico:** `writeAgendamentoPaymentMetadata` → `processPaymentWebhook`  
**Invariantes:** F1–F8

---

## 3. APPOINTMENT (APT-001 … APT-013)

| ID | Nome | Pri | Cobertura |
|----|------|-----|-----------|
| APT-001 | Solicitação pós-pagamento | P0 | **atual** |
| APT-002 | Aceite admin | P0 | futura |
| APT-003 | Recusa | P0 | futura |
| APT-004 | Cancelamento user | P0 | futura |
| APT-005 | Cancel após aceite | P0 | futura |
| APT-006 | Em andamento | P0 | futura |
| APT-007 | Concluído derivado | P0 | futura |
| APT-008 | Reagendamento cupom | P1 | futura |
| APT-009 | Múltiplos appointments | P1 | futura |
| APT-010 | Conflito slot A8 | P0 | futura |
| APT-011 | userHiddenAt A7 | P2 | futura |
| APT-012 | Admin archive A9 | P1 | futura |
| APT-013 | Reverter cancelamento | P1 | futura |

Appointment = **solicitação**; execução em SERVICE (HS-02B).

---

## 4. SERVICE (SRV-001 … SRV-020)

### Tipos de catálogo

| ID | Tipo |
|----|------|
| SRV-001…012 | sessão, captação, mix, master, mix_master, beat1–4, beat_mix_master, produção_completa, sonoplastia |

### Ciclo / autoridade

| ID | Nome | Pri |
|----|------|-----|
| SRV-013 | Mais de um Service por pagamento | P0 |
| SRV-014 | Carrinho multi-serviço | P0 |
| SRV-015 | Service órfão | P1 |
| SRV-016 | Appointment sem Service → ensure (A5) | P0 |
| SRV-017 | Selecionados só ativos | P0 |
| SRV-018 | Gerais todos | P0 |
| SRV-019 | aceito → em_andamento → concluido | P0 |
| SRV-020 | Service authority pós HS-02B | P1 |

---

## 5. COUPONS (CPN-001 … CPN-015)

Cobre: serviço, remarcação, reembolso, desconto, expirado, usado, inválido, plano, duplicado, sem owner, C5, uso parcial (futuro), deep-link, multi-cupom, simulção C7.

---

## 6. PLANS (PLN-001 … PLN-011)

Bronze / Prata / Ouro · geracão de cupons (P2) · redeem · cancel · refund · renovação · combo plano+serviço (futuro) · simbólico · bloqueio pós-refund.

---

## 7. DELIVERY (DEL-001 … DEL-008)

URL válida/inválida · conclusão Service · conclusão automática Appointment · parcial · múltipla · some de Selecionados.

---

## 8. ADMIN (ADM-001 … ADM-010, ADM-021)

Agendamentos · pagamentos · Gerais · Selecionados · dashboard · estatísticas · usuários · cupons · requireAdmin · repair · reprocessar teste.

---

## 9. ANALYTICS (ANA-001 … ANA-009)

Receita · clientes · serviços · planos · pagamentos · tipos Service · pós-cancel · pós-reembolso · conversões (futuro).

---

## 10. FAQ / CHAT

| ID | Nome |
|----|------|
| FAQ-001 | Fluxo completo pergunta→resposta |
| FAQ-002 | mark-read |
| CHAT-001 | Fluxo completo sessão |
| CHAT-002 | humanRequested |

---

## 11. CROSS / novos cenários (XSC-001 … XSC-009)

| ID | Cenário |
|----|---------|
| XSC-001 | Compra com múltiplos serviços |
| XSC-002 | Plano + serviço (mesmo pagamento) — futuro |
| XSC-003 | Plano gerando múltiplos cupons |
| XSC-004 | Agendar múltiplos cupons do plano |
| XSC-005 | Cancelamento de plano |
| XSC-006 | Reembolso parcial — futuro |
| XSC-007 | Reembolso integral |
| XSC-008 | Webhook fora de ordem |
| XSC-009 | Race condition de slot |

(Demais variantes CPN-012/013, DEL-006/007, ANA-007/008 já cobrem “cupom parcial”, deep-link, entrega parcial/múltipla, stats pós-eventos.)

---

## Roadmap de suítes

| Sprint | Foco | IDs (aprox.) |
|--------|------|--------------|
| **TE-02** Business Suites | Jornadas negócio P0/P1 | ~95 (tag Business) |
| **TE-03** Regression Suites | Idempotência, validações | ~60 |
| **TE-04** Release Gates | Smoke + RG | ~29 |
| **TE-05** Stress | Race / out-of-order | ~4 |
| **TE-06** Migration | Auditoria órfãos | ~2 |
| **TE-07** Security | Token, authz, CPF | ~10 |

### Ordem sugerida de implementação no Runner

1. **TE-02a:** AUTH-005…011, PAY-003…008, APT-002…007, SRV-016…019, DEL-001…005  
2. **TE-02b:** PLN-*, CPN-*, XSC-001/003/007  
3. **TE-03:** PAY-005, PAY-015, APT-010, CPN-005/006/009  
4. **TE-04:** pacote Smoke = AUTH-001/002/004/013 + PAY-002/010 + APT-001 + DEL-001 + ADM-003/004/006  
5. **TE-05…07:** stress / migration / security

Mapeamento TE-S* (TE-01A/B):

| Scenario | IDs principais |
|----------|----------------|
| TE-S01 | PAY-002, PAY-010, APT-001, AUTH-001/004 |
| TE-S02 | PAY-012, SRV-013/014, XSC-001 |
| TE-S05 | PAY-004, PAY-005 |
| TE-S06 | PLN-004, CPN-008, XSC-003 |
| TE-S07 | CPN-003, PLN-007, XSC-007 |
| TE-S08 | APT-002/006/007, SRV-019, DEL-* |
| TE-S10 | ADM-003/004/006, SRV-017/018 |
| TE-S13 | SRV-016 |

---

## Política de IDs

- IDs são **imortais** — nunca reutilizar número para outro significado.  
- Novos testes: próximo número livre no namespace (`AUTH-017`, …).  
- Namespace `XSC` = cross-cutting / novos produtos.  
- Alterar asserts de um ID exige bump de versão da suíte + nota no JSON (`supersedes` futuro).

---

## Relação com cobertura atual

| Já verde no TE-01B | IDs |
|--------------------|-----|
| TE-S01 smoke | PAY-002, PAY-010, APT-001 (+ asserts Service implícitos) |

Gap: **~98% do catálogo ainda futura/parcial** — esperado nesta fase documental.

---

## Entrega

- `reports/domain-guardian/te01c-official-test-catalog.md` (este)
- `reports/domain-guardian/te01c-official-test-catalog.json` (132 testes completos)

*Fim TE-01C. Sem código · sem commit.*
