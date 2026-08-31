# Domain Review Checklist

**Branch:** main
**HEAD:** fd9ff6d
**Risco (Change Analyzer):** CRITICAL
**Escopo de revisão:** FULL
**Mensagem do commit:** hardening completo sistema: cupons, webhook, idempotencia, sync e validações finais

## Instruções

Escopo **FULL** (risco HIGH/CRITICAL): executar obrigatórios + recomendados + estendidos.
Obrigatório: `node --experimental-strip-types scripts/domain-guardian-runner.ts` antes do merge.
Revisar `advisor.md` para playbook de incidentes.

---

## Resumo

* Entidades impactadas: 7
* Arquivos HIGH/CRITICAL: 59
* Invariantes no diff: 38
* Checks Guardian relacionados: A5, A8, C1, C2, F1, F4, P2, S1, S2, S3, S4, X1, X2

### Arquivos de maior risco

- prisma/schema.prisma
- src/app/api/admin/agendamentos/reverter-cancelamento/route.ts
- src/app/api/admin/agendamentos/route.ts
- src/app/api/admin/cupons/liberar/route.ts
- src/app/api/admin/cupons/route.ts
- src/app/api/admin/pagamentos/route.ts
- src/app/api/admin/planos/excluir-cancelados/route.ts
- src/app/api/admin/planos/route.ts
- src/app/api/admin/reprocessar-pagamento-teste/route.ts
- src/app/api/admin/servicos/route.ts
- src/app/api/admin/stats/detalhadas/route.ts
- src/app/api/admin/stats/route.ts
- src/app/api/admin/usuarios/route.ts
- src/app/api/agendamentos/cancelar/route.ts
- src/app/api/agendamentos/com-cupom/route.ts
- src/app/api/agendamentos/escolher-reembolso/route.ts
- src/app/api/asaas/checkout-agendamento/route.ts
- src/app/api/asaas/checkout-carrinho/route.ts
- src/app/api/asaas/checkout/route.ts
- src/app/api/conta/route.ts

- … e mais 39 arquivo(s)

---

## Checklist por entidade

### Payment

**Fluxos afetados:**

- Checkout (agendamento e plano)
- Webhook Asaas
- Reembolso (outbound e inbound)
- Remarcação (resolução de pagamento origem)
- Simulação admin (`symbolicAgendamento`, `symbolicPlano`)
- Minha Conta (listagem de pagamentos)

**Testes obrigatórios:**

- Webhook PAYMENT_RECEIVED cria Payment approved com asaasId único (F1/F3)
- Pagamento agendamento aprovado vincula appointmentId ou appointmentIds (F4)
- Pagamento plano aprovado materializa UserPlan na janela esperada (F5)
- Classificação simbólico vs real por metadata (symbolicAgendamento/symbolicPlano)
- Idempotência: segundo webhook para mesmo asaasId não duplica Payment

**Testes recomendados:**

- Webhook PAYMENT_REFUNDED sincroniza refundAsaasStatus nas entidades corretas (F7)
- Reembolso outbound resolve Payment.asaasId correto (F6)
- Admin delete bloqueado para Payment approved real (F8)
- Reprocessamento admin (agendamento/plano teste)
- Listagem em Minha Conta e Admin Pagamentos

**Testes estendidos (FULL):**

- Carrinho multi-appointment: appointmentIds ⊆ appointments criados (X3)
- Reconcile pós-webhook (`asaas-agendamento-reconcile`)
- Pagamento simbólico sem fallback amount=5 (S1/S3 zerados)
- Domain Guardian: F1, F4, S1, S3

**Invariantes que devem continuar válidos:**

- F1
- F2
- F3
- F4
- F5
- F6
- F7
- F8
- X1
- X3
- X5

**Checks Guardian:**

- F1
- F4
- S1
- S3

**Possíveis regressões:**

- Webhook Asaas
- Minha Conta — pagamentos
- Admin Pagamentos
- Checkout agendamento/plano
- Reembolso outbound/inbound
- Webhook cria Payment sem saber itens do checkout; agendamento/plano não materializa.
- Sintoma: "Paguei e não vejo agendamento"
- Sintoma: "Plano sem cupons"
- Sintoma: "Reembolso não atualizou"
- Sintoma: "Cupom teste não aparece"

---

### PaymentMetadata

**Fluxos afetados:**

- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens, data/hora, flags simbólicas)
- Reprocessamento admin
- Classificação simbólica (A1: `symbolicAgendamento`, `symbolicPlano`, `isTestPayment`)

**Testes obrigatórios:**

- Checkout cria PaymentMetadata antes do POST Asaas (M1)
- asaasId preenchido após sucesso do checkout (M2)
- Webhook resolve metadata válida (expiresAt não expirado — M3)
- Flags simbólicas presentes quando checkout de teste

**Testes recomendados:**

- Metadata expirada: webhook falha de forma controlada
- Reprocessamento admin grava metadata coerente
- externalReference limitado a userId

**Testes estendidos (FULL):**

- Backfill metadata em payments históricos (migração A1)
- Domain Guardian: S1, S3

**Invariantes que devem continuar válidos:**

- M1
- M2
- M3
- M4

**Checks Guardian:**

- S1
- S3

**Possíveis regressões:**

- Checkout agendamento
- Checkout plano
- Webhook (resolução de itens)
- Reprocessamento admin
- Webhook cria Payment sem saber itens do checkout; agendamento/plano não materializa.
- Sintoma: "Paguei e não vejo agendamento"

---

### Appointment

**Fluxos afetados:**

- Checkout → criação pós-pagamento
- Aceite/recusa admin
- Reembolso direto ou cupom de remarcação
- Ocultação Minha Conta (`userHiddenAt`)
- Conflito de horário (agenda)

**Testes obrigatórios:**

- Criação pós-pagamento com userId correto (A1)
- Agendamento visível em Minha Conta após pagamento
- Cancelamento com opção reembolso ou cupom (A3)
- Conflito de horário bloqueado no checkout (A8)
- Reembolso direto exige Payment approved vinculado (A2)

**Testes recomendados:**

- Ocultar agendamento (`userHiddenAt`) não altera status financeiro (A7)
- Sync status com Service (`reconcileAppointmentWithServices`)
- Aceite/recusa admin
- Remarcação via cupom de reembolso

**Testes estendidos (FULL):**

- Carrinho com múltiplos appointments
- Restaurar visibilidade reembolso pendente
- Domain Guardian: F4, A5, A8, X2

**Invariantes que devem continuar válidos:**

- A1
- A2
- A3
- A4
- A5
- A6
- A7
- A8
- F4
- X1
- X2
- X3

**Checks Guardian:**

- A5
- A8
- F4
- X1
- X2

**Possíveis regressões:**

- Minha Conta — agendamentos
- Admin Agendamentos
- Agenda / checkout
- Reembolso e remarcação
- Agendamento confirmado sem serviços; status `concluido` inconsistente.
- Sintoma: "Paguei e não vejo agendamento"
- Sintoma: "Cupom de remarcação sumiu"
- Sintoma: "Dois clientes no mesmo horário"

---

### Coupon

**Fluxos afetados:**

- Geração pós-pagamento (agendamento/plano)
- Resgate no checkout (`com-cupom`)
- Remarcação via cupom de reembolso
- Reembolso de cupom avulso
- Simulação (`TESTE_*`, `isSimulationCoupon`)
- Minha Conta (visibilidade, seções)

**Testes obrigatórios:**

- Criar cupom (geração pós-pagamento / plano)
- Resgatar cupom no checkout ou agendamento com cupom
- Reembolso direto de cupom avulso
- Remarcação via cupom de reembolso (refundCouponId)
- Cupom ocultado pelo usuário (`userRemovedAt`) some de Minha Conta

**Testes recomendados:**

- Código único global (C1) — sem colisão
- Cupom usado com rastreabilidade usedBy/appointmentId (C2)
- Cupom de plano bloqueado quando plano cancelado/reembolso (C5)
- Vinculação simulação (`vincular-cupons-teste`, assignedUserId)
- Liberação admin só para cupons de simulação

**Testes estendidos (FULL):**

- Cupons TESTE_* sem vínculo (S2)
- Legado TESTE_AGEND_/TESTE_PAY_ (S4)
- Stale link repair (`coupon-stale-appointment`)
- Domain Guardian: C1, C2, S2, S4

**Invariantes que devem continuar válidos:**

- C1
- C2
- C3
- C4
- C5
- C6
- C7
- X1
- X2
- X5

**Checks Guardian:**

- C1
- C2
- S2
- S4

**Possíveis regressões:**

- Minha Conta — cupons
- Reembolso
- Admin Cupons
- Checkout com cupom
- Simulação / TESTE_*
- Cupom `used` apontando para agendamento inexistente; stale link.
- Sintoma: "Plano sem cupons"
- Sintoma: "Cupom de remarcação sumiu"
- Sintoma: "Cupom teste não aparece"

---

### UserPlan

**Fluxos afetados:**

- Checkout plano
- Webhook plano
- Reembolso proporcional de plano
- Inativação admin (`adminInactiveAt`)
- Ocultação Minha Conta (`userHiddenAt`)

**Testes obrigatórios:**

- Criação de plano pós-pagamento approved
- Geração inicial de cupons conforme catálogo do plano (P2)
- Plano ativo visível em Minha Conta
- Solicitar reembolso bloqueia cupons não usados (P3)

**Testes recomendados:**

- Inativação admin (`adminInactiveAt`) bloqueia cupons (P4)
- Ocultar plano (`userHiddenAt`) na Minha Conta
- Cancelamento de assinatura Asaas coerente (P6)
- Delete físico bloqueado com histórico (P5)

**Testes estendidos (FULL):**

- Reembolso proporcional por cupons não usados
- Plano teste / simbólico
- Domain Guardian: P2

**Invariantes que devem continuar válidos:**

- C4
- C5
- F5
- P1
- P2
- P3
- P4
- P5
- P6
- X1

**Checks Guardian:**

- P2

**Possíveis regressões:**

- Minha Conta — planos
- Admin Planos
- Checkout plano
- Reembolso de plano
- Delete de plano remove cupons; cupons de plano cancelado ainda resgatáveis.
- Sintoma: "Plano sem cupons"

---

### Service

**Fluxos afetados:**

- Criação pós-checkout agendamento
- Aceite / recusa / conclusão admin
- Entrega de áudio
- Reconciliação status agendamento ↔ serviços

**Testes obrigatórios:**

- Criação de Service por item pós-checkout agendamento
- Vínculo Service.appointmentId correto
- Agendamento ativo com ≥1 Service quando cobrança real (A5)

**Testes recomendados:**

- Sync status Appointment ↔ Service
- Conclusão com entrega de áudio
- Aceite/recusa de serviço no admin

**Testes estendidos (FULL):**

- Backfill admin de serviços faltantes
- Domain Guardian: A5

**Invariantes que devem continuar válidos:**

- A5
- A6

**Checks Guardian:**

- A5

**Possíveis regressões:**

- Admin Serviços
- Minha Conta — agendamentos vinculados
- Entrega de áudio

---

### User

**Fluxos afetados:**

- Autenticação e autorização
- Minha Conta (agregação de todas as entidades)
- Ownership de cupons e agendamentos
- Exclusão de conta (LGPD)
- Simulação admin (`canUseSymbolicSimulation`)

**Testes obrigatórios:**

- Login e sessão autenticada
- Ownership: Payment/Appointment/Coupon do mesmo userId no fluxo (X1)
- Minha Conta agrega entidades do usuário logado

**Testes recomendados:**

- Associação manual de cupom (`assignedUserId`) pelo admin
- Exclusão de conta (cascade — verificar impacto em histórico)
- Bloqueio de usuário (`blocked`)
- Simulação admin (`canUseSymbolicSimulation`)

**Testes estendidos (FULL):**

- Cross-entity ownership divergente (Guardian X1)
- LGPD / AccountDeletionLog

**Invariantes que devem continuar válidos:**

- A1
- C4
- X1
- X4

**Checks Guardian:**

- X1

**Possíveis regressões:**

- Autenticação
- Minha Conta
- Ownership cross-entity
- Admin Usuários
- Delete de plano remove cupons; cupons de plano cancelado ainda resgatáveis.
- Sintoma: "Plano sem cupons"
- Sintoma: "Cupom teste não aparece"

---

## Matriz de sintomas (triagem rápida)

- **Paguei e não vejo agendamento** → Payment, PaymentMetadata, Appointment (Checkout agendamento, Webhook)
- **Plano sem cupons** → Payment, UserPlan, Coupon (Checkout plano, Webhook)
- **Cupom de remarcação sumiu** → Appointment, Coupon (Remarcação)
- **Cupom teste não aparece** → Coupon, Payment, User (Simulação, Minha Conta)
- **Reembolso não atualizou** → Payment, Appointment, Coupon, UserPlan (Reembolso)
- **Dois clientes no mesmo horário** → Appointment (Checkout, Conflito de horário)

## Pós-revisão

- [ ] Testes obrigatórios executados para cada entidade impactada
- [ ] Testes recomendados revisados (executar ou justificar skip)
- [ ] Domain Guardian runner executado (latest.json sem ERROR)
- [ ] advisor.md revisado para checks ativos
- [ ] Testes estendidos / cenários de borda validados
- [ ] Nenhuma regressão em Minha Conta para fluxo principal
- [ ] PR aprovado com checklist anexado

_Checklist gerado automaticamente — validar manualmente antes de merge/release._
_Fontes: change-analysis.md, domain-map.md, domain-dependencies.md_
