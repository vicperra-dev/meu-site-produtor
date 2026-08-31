# Registro de Decisões Arquiteturais (ADR) — THouse

**Gerado em:** 2026-07-05T21:07:26.866Z
**Agente:** Architecture Decision V1.0.0
**Total de ADRs:** 15

---

## Índice

### Financeiro
- [ADR-002: Webhook Idempotency — Payment.create por asaasId único](#adr-002) — _Aceito_
- [ADR-003: PaymentMetadata — cache pré-checkout Asaas](#adr-003) — _Aceito_
- [ADR-007: Coupon Account Ownership](#adr-007) — _Aceito_
- [ADR-008: Refund Engine — outbound e inbound](#adr-008) — _Aceito_
- [ADR-009: Asaas Integration — provedor de pagamento](#adr-009) — _Aceito_
- [ADR-010: Simulation Refactor — pagamentos simbólicos A1/A2](#adr-010) — _Aceito_
- [ADR-013: Payment Admin Archive — arquivamento de pagamentos (planejado)](#adr-013) — _Proposto_

### Agendamento
- [ADR-004: Appointment Archive — adminArchivedAt soft-archive](#adr-004) — _Aceito_
- [ADR-005: Appointment Hidden — userHiddenAt (Minha Conta)](#adr-005) — _Aceito_

### Administração
- [ADR-006: UserPlan Admin Inactive + User Hidden](#adr-006) — _Aceito_

### Guardian
- [ADR-001: Domain Guardian — verificação automática de invariantes](#adr-001) — _Aceito_
- [ADR-015: Decision Engine — gate BLOCKED em mudanças CRITICAL](#adr-015) — _Aceito_

### Arquitetura
- [ADR-014: Vínculos lógicos sem FK — Payment → Appointment](#adr-014) — _Aceito_

### Documentação
- [ADR-011: Domain Map — documentação estruturada de entidades](#adr-011) — _Aceito_

### IA
- [ADR-012: Architecture Agent Pipeline — agentes read-only](#adr-012) — _Aceito_

---

## Matriz de decisões

```
Decision → Entidades → Arquivos → Guardian → Fluxos → Risco → Prioridade
```

| ADR | Entidades | Guardian | Risco | Prioridade |
|-----|-----------|----------|-------|------------|
| ADR-001 | Payment, Appointment, Coupon, UserPlan | F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2 | Crítico | Crítica |
| ADR-002 | Payment, PaymentMetadata | F1, F4 | Crítico | Crítica |
| ADR-003 | PaymentMetadata, Payment, User | — | Alto | Alta |
| ADR-004 | Appointment | A5, A8, A9 | Médio | Alta |
| ADR-005 | Appointment, User | A8 | Baixo | Média |
| ADR-006 | UserPlan, Coupon | C1 | Médio | Alta |
| ADR-007 | Coupon, User, Payment, Appointment | X1, X2, C1 | Alto | Crítica |
| ADR-008 | Payment, Appointment, Coupon, UserPlan | F4, C1 | Crítico | Crítica |
| ADR-009 | Payment, PaymentMetadata | F1 | Crítico | Crítica |
| ADR-010 | Payment, Coupon | S4 | Médio | Média |
| ADR-011 | Payment, Appointment, Coupon, UserPlan, User, Service | — | Baixo | Alta |
| ADR-012 | — | — | Baixo | Média |
| ADR-013 | Payment | F1, F4 | Alto | Alta |
| ADR-014 | Payment, Appointment | F4 | Alto | Alta |
| ADR-015 | Payment, Appointment, Coupon | — | Médio | Alta |

---

## Grafo de conhecimento

```
Decision
↓
Arquivos
↓
Entidades
↓
Fluxos
↓
Checks Guardian
↓
Riscos
```

---

## Financeiro

<a id="adr-002"></a>
### ADR-002 — Webhook Idempotency — Payment.create por asaasId único

**Status:** Aceito · **Prioridade:** Crítica · **Risco:** Crítico · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Asaas reenvia webhooks PAYMENT_RECEIVED em retries; sem idempotência há risco de duplicata.

#### Problema
Dois Payments com mesmo asaasId causam reconciliação incorreta e efeitos duplicados.

#### Objetivo
Garantir um único Payment por cobrança Asaas confirmada.

#### Decisão tomada
Verificar existência de Payment por asaasId antes de criar; reconcile em caso de retry (F1, F3).

#### Alternativas consideradas
- Lock distribuído (Redis)
- Deduplicação apenas no Asaas
- Constraint UNIQUE no banco

#### Alternativas descartadas
- Redis — infra extra não disponível no projeto
- Só Asaas — retries ainda chegam ao webhook

#### Motivos da escolha
Verificação em application layer + invariante F1 no Guardian; UNIQUE parcial possível futuramente.

#### Consequências positivas
- Sem cobrança duplicada no sistema
- Retries seguros
- Reconcile cobre artefatos

#### Consequências negativas
- Lógica de reconcile complexa
- Race condition teórica em alta concorrência

#### Riscos aceitos
- Race rara entre dois webhooks simultâneos — mitigada por transação

#### O que quebra se removermos
Pagamentos duplicados, agendamentos e cupons em dobro, perda de confiança financeira.

**Nunca remover porque:** Invariante F1 é fundacional — todo fluxo de pagamento depende disso.

#### Impactos
- **Financeiro:** Crítico — base de toda contabilidade do sistema.
- **Administrador:** Reprocessamento admin deve respeitar mesma idempotência.
- **Usuário:** Cliente não vê cobrança ou agendamento duplicado.

#### Arquivos envolvidos
- `src/app/api/webhooks/asaas/route.ts`
- `src/app/lib/process-payment-webhook.ts`
- `src/app/lib/asaas-agendamento-reconcile.ts`

**Entidades:** Payment, PaymentMetadata
**Fluxos:** Webhook Asaas; PAYMENT_RECEIVED
**Invariantes:** F1, F2, F3, F4
**Guardian:** F1, F4
**Dependências:** ADR-003, ADR-009

#### Critérios futuros
- **Remoção:** Proibido remover sem substituir por mecanismo equivalente.
- **Evolução:** Adicionar UNIQUE constraint em asaasId quando migration permitir.

#### Testes recomendados
- Executar checks F1, F4 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-003"></a>
### ADR-003 — PaymentMetadata — cache pré-checkout Asaas

**Status:** Aceito · **Prioridade:** Alta · **Risco:** Alto · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Asaas limita externalReference (~100 chars); payload de checkout é maior.

#### Problema
Webhook não teria contexto completo (tipo, serviços, cupons) só com userId.

#### Objetivo
Persistir payload de checkout antes do POST Asaas; resolver no webhook por asaasId.

#### Decisão tomada
PaymentMetadata.create antes do checkout; TTL ~24h; webhook resolve e descarta após Payment.create.

#### Alternativas consideradas
- Codificar tudo em externalReference
- Session server-side sem persistência
- JSON em Payment.description

#### Alternativas descartadas
- externalReference — limite de tamanho Asaas
- Session — perde estado em serverless/restart

#### Motivos da escolha
Metadata transitório com asaasId como chave de junção — padrão documentado em M1–M4.

#### Consequências positivas
- Checkout flexível
- Webhook com contexto completo
- Suporte a carrinho multi-item

#### Consequências negativas
- Registros órfãos se webhook nunca chegar
- Sem FK formal com User

#### Riscos aceitos
- Metadata expirado antes do pagamento — usuário refaz checkout

#### O que quebra se removermos
Webhook não sabe tipo de compra; F4 e efeitos pós-pagamento falham.

**Nunca remover porque:** Ponte obrigatória entre checkout UI e confirmação Asaas.

#### Impactos
- **Financeiro:** Alto — sem metadata, webhook não cria agendamento/plano corretamente.
- **Administrador:** Reprocessamento teste usa metadata ou janela temporal.
- **Usuário:** Checkout funciona; falha silenciosa se metadata expirar.

#### Arquivos envolvidos
- `src/app/api/asaas/checkout-agendamento/route.ts`
- `src/app/lib/symbolic-payment-resolve.ts`
- `src/app/api/webhooks/asaas/route.ts`

**Entidades:** PaymentMetadata, Payment, User
**Fluxos:** Checkout agendamento; Checkout plano; PaymentMetadata → Payment
**Invariantes:** M1, M2, M3, M4
**Guardian:** —
**Dependências:** ADR-009

#### Critérios futuros
- **Remoção:** Só remover se Asaas permitir payload completo em externalReference.
- **Evolução:** Garbage collection de metadata órfão; backfill em falhas.

#### Testes recomendados
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-007"></a>
### ADR-007 — Coupon Account Ownership

**Status:** Aceito · **Prioridade:** Crítica · **Risco:** Alto · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Cupons podiam ficar vinculados ao usuário errado após remarcação ou simulação.

#### Problema
Usuário A usa cupom de usuário B; violação X1.

#### Objetivo
Garantir ownership consistente Payment → User → Coupon (X1, X2).

#### Decisão tomada
coupon-account-ownership.ts + assignedUserId + validações em rotas de resgate.

#### Alternativas consideradas
- FK estrita Coupon→User
- Confiar apenas em paymentId

#### Alternativas descartadas
- Só paymentId — remarcação quebra cadeia

#### Motivos da escolha
Ownership explícito cobre remarcação e simulação.

#### Consequências positivas
- Cupom na conta certa
- Guardian X1/X2

#### Consequências negativas
- Lógica de repair manual para legado S4

#### Riscos aceitos
- Cupons TESTE_* legados até migração S4

#### O que quebra se removermos
Cupons cruzados entre contas; fraude ou insatisfação.

**Nunca remover porque:** Invariante X1 é crítica para integridade comercial.

#### Impactos
- **Financeiro:** Alto — cupom errado = desconto indevido.
- **Administrador:** Correção de cupons antigos no admin.
- **Usuário:** Cupons aparecem na conta correta.

#### Arquivos envolvidos
- `src/app/lib/coupon-account-ownership.ts`
- `src/app/lib/coupon-visibility.ts`
- `scripts/repair-coupon-ownership.mjs`

**Entidades:** Coupon, User, Payment, Appointment
**Fluxos:** Remarcação (cupom); Resgate; Minha Conta
**Invariantes:** X1, X2, X4, C4
**Guardian:** X1, X2, C1
**Dependências:** ADR-002

#### Critérios futuros
- **Remoção:** Nunca sem modelo alternativo de ownership.
- **Evolução:** Finalizar S4 — eliminar cupons TESTE legados.

#### Testes recomendados
- Executar checks X1, X2, C1 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-008"></a>
### ADR-008 — Refund Engine — outbound e inbound

**Status:** Aceito · **Prioridade:** Crítica · **Risco:** Crítico · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Cancelamentos exigem devolução em dinheiro ou cupom de remarcação.

#### Problema
Estado inconsistente entre Asaas, Payment, Appointment e Coupon pós-reembolso.

#### Objetivo
Orquestrar refundAsaasPayment + syncInboundAsaasRefund + escolher-reembolso.

#### Decisão tomada
Trilha em Appointment/Coupon/UserPlan; webhook PAYMENT_REFUNDED sincroniza status; usuário confirma.

#### Alternativas consideradas
- Reembolso só manual no Asaas
- Cupom sem trilha de refund

#### Alternativas descartadas
- Manual — não escala
- Sem trilha — disputas impossíveis

#### Motivos da escolha
Financeiro e operacional precisam mesma fonte de verdade.

#### Consequências positivas
- Reembolso rastreável
- Cupom de remarcação coordenado
- Inbound sync

#### Consequências negativas
- Muitos estados intermediários
- Testes complexos

#### Riscos aceitos
- Divergência temporária Asaas vs banco até webhook REFUNDED

#### O que quebra se removermos
Reembolsos manuais, estados incoerentes, risco legal/consumidor.

**Nunca remover porque:** Obrigatório para operação comercial com cancelamento.

#### Impactos
- **Financeiro:** Crítico — devolução de receita.
- **Administrador:** Visibilidade de reembolsos pendentes.
- **Usuário:** Escolha reembolso ou cupom na Minha Conta.

#### Arquivos envolvidos
- `src/app/lib/appointment-refund-payment.ts`
- `src/app/lib/coupon-refund.ts`
- `src/app/lib/plan-refund.ts`
- `src/app/api/agendamentos/escolher-reembolso/route.ts`

**Entidades:** Payment, Appointment, Coupon, UserPlan
**Fluxos:** Reembolso; PAYMENT_REFUNDED; Remarcação
**Invariantes:** F6, F8, A2, C4
**Guardian:** F4, C1
**Dependências:** ADR-002, ADR-009

#### Critérios futuros
- **Remoção:** Proibido em produção com pagamentos reais.
- **Evolução:** Automatizar disputas refundUserDisputedAt.

#### Testes recomendados
- Executar checks F4, C1 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-009"></a>
### ADR-009 — Asaas Integration — provedor de pagamento

**Status:** Aceito · **Prioridade:** Crítica · **Risco:** Crítico · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
THouse precisa cobrar agendamentos e planos online no Brasil.

#### Problema
Sem gateway, checkout não completa pagamento real.

#### Objetivo
Asaas como provedor único com checkout, webhook e refund API.

#### Decisão tomada
asaas-fetch.ts, checkout routes, webhook route, refundAsaasPayment.

#### Alternativas consideradas
- Stripe
- Mercado Pago
- Pagamento manual

#### Alternativas descartadas
- Stripe — foco BR e PIX
- Manual — não escala

#### Motivos da escolha
Asaas já integrado; PIX/boleto/cartão; webhooks maduros.

#### Consequências positivas
- PIX e cartão
- Webhook nativo
- Sandbox para testes

#### Consequências negativas
- Vendor lock-in
- Limite externalReference

#### Riscos aceitos
- Indisponibilidade Asaas — sem fallback automático

#### O que quebra se removermos
Nenhum pagamento online funciona.

**Nunca remover porque:** Provedor de pagamento é infraestrutura core.

#### Impactos
- **Financeiro:** Fundacional — toda receita online.
- **Administrador:** Reprocessar pagamento teste via admin.
- **Usuário:** Checkout com PIX/cartão.

#### Arquivos envolvidos
- `src/app/lib/asaas-fetch.ts`
- `src/app/lib/payment-providers.ts`
- `src/app/api/webhooks/asaas/route.ts`

**Entidades:** Payment, PaymentMetadata
**Fluxos:** Checkout; Webhook Asaas
**Invariantes:** F2, F3
**Guardian:** F1
**Dependências:** —

#### Critérios futuros
- **Remoção:** Migração completa para outro provedor com paridade de webhook.
- **Evolução:** Abstração em payment-providers.ts para segundo provedor.

#### Testes recomendados
- Executar checks F1 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-010"></a>
### ADR-010 — Simulation Refactor — pagamentos simbólicos A1/A2

**Status:** Aceito · **Prioridade:** Média · **Risco:** Médio · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff
**Substitui:** Cupons TESTE_* ad-hoc

#### Contexto
Admin precisa testar fluxos sem cobrança real; legado TESTE_* no banco.

#### Problema
Cupons TESTE_AGEND_/TESTE_PAY_ sem ownership; confusão com produção.

#### Objetivo
symbolicAgendamento/symbolicPlano + canUseSymbolicSimulation; migrar legado S4.

#### Decisão tomada
Flags A1/A2 em Payment; helpers simulation-*; reset admin controlado.

#### Alternativas consideradas
- Ambiente separado
- Desabilitar simulação

#### Alternativas descartadas
- Ambiente separado — custo operacional
- Desabilitar — admin perde testes

#### Motivos da escolha
Simulação in-band com classificação explícita e Guardian S4.

#### Consequências positivas
- Testes admin seguros
- Distinção produção vs teste

#### Consequências negativas
- Legado S4 até limpeza
- Complexidade em checkout

#### Riscos aceitos
- Cupom TESTE legado — info S4 no Guardian

#### O que quebra se removermos
Admin não testa fluxos end-to-end sem cobrança.

**Nunca remover porque:** Operação admin depende de testes simbólicos.

#### Impactos
- **Financeiro:** Médio — evita confundir teste com receita real.
- **Administrador:** Reprocessar pagamento teste; reset simulação.
- **Usuário:** Nenhum em produção.

#### Arquivos envolvidos
- `src/app/lib/symbolic-payment.ts`
- `src/app/lib/simulation-coupon.ts`
- `src/app/lib/simulation-reset.ts`

**Entidades:** Payment, Coupon
**Fluxos:** Simulação admin; Checkout teste
**Invariantes:** A1, A2, S4
**Guardian:** S4
**Dependências:** ADR-009

#### Critérios futuros
- **Remoção:** Após eliminar todos cupons TESTE e ter staging dedicado.
- **Evolução:** Completar migração S4; remover @legacy helpers.

#### Testes recomendados
- Executar checks S4 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-013"></a>
### ADR-013 — Payment Admin Archive — arquivamento de pagamentos (planejado)

**Status:** Proposto · **Prioridade:** Alta · **Risco:** Alto · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff
**Substitui:** canAdminDeletePayment como única saída

#### Contexto
Payment não tem adminArchivedAt; delete admin é restrito.

#### Problema
Admin não pode organizar pagamentos encerrados sem risco financeiro.

#### Objetivo
Soft-archive em Payment preservando Minha Conta e histórico.

#### Decisão tomada
Proposta: adminArchivedAt + adminArchivedReason; espelhar ADR-004.

#### Alternativas consideradas
- DELETE admin
- userHidden em Payment

#### Alternativas descartadas
- DELETE — canAdminDeletePayment restrito
- userHidden — semântica usuário

#### Motivos da escolha
Auditoria payment-lifecycle recomenda soft-archive vs purge.

#### Consequências positivas
- Painel pagamentos organizado
- Histórico preservado

#### Consequências negativas
- Toca F1–F8
- Queries admin mais complexas

#### Riscos aceitos
- Implementação em área crítica — BLOCKED até testes

#### O que quebra se removermos
N/A — proposta.

**Nunca remover porque:** N/A até aceito e implementado.

#### Impactos
- **Financeiro:** Alto — não pode ocultar pagamento do usuário indevidamente.
- **Administrador:** Arquivar/restaurar no painel pagamentos.
- **Usuário:** Nenhum na Minha Conta.

#### Arquivos envolvidos
- `src/app/lib/admin-delete-payment.ts`
- `src/app/api/admin/pagamentos/route.ts`
- `prisma/schema.prisma`

**Entidades:** Payment
**Fluxos:** Minha Conta (pagamentos); Admin pagamentos
**Invariantes:** F1, F4, F6, F8
**Guardian:** F1, F4
**Dependências:** ADR-004, ADR-002

#### Critérios futuros
- **Remoção:** N/A — ainda não implementado.
- **Evolução:** Implementar conforme design-plan + implementation-plan.

#### Testes recomendados
- Executar checks F1, F4 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

## Agendamento

<a id="adr-004"></a>
### ADR-004 — Appointment Archive — adminArchivedAt soft-archive

**Status:** Aceito · **Prioridade:** Alta · **Risco:** Médio · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff
**Substitui:** DELETE físico de agendamentos

#### Contexto
Admin precisava limpar fila operacional sem apagar histórico financeiro.

#### Problema
DELETE retornava 422; purge físico apagaria Payment links (F4, X4).

#### Objetivo
Arquivar agendamentos com justificativa; excluir de operações; preservar Payment.

#### Decisão tomada
Campos adminArchivedAt + adminArchivedReason; filtro em queries operacionais; PATCH archive/restore.

#### Alternativas consideradas
- DELETE físico com cascade
- Apenas userHiddenAt
- Status especial 'arquivado'

#### Alternativas descartadas
- DELETE — viola histórico financeiro
- userHiddenAt — só oculta para usuário, não para admin ops
- Status arquivado — mistura ciclo de vida com limpeza admin

#### Motivos da escolha
Espelha UserPlan.adminInactiveAt; ortogonal a userHiddenAt (A7, A9).

#### Consequências positivas
- Painel admin organizado
- Histórico e Payment preservados
- Restauração possível

#### Consequências negativas
- Mais filtros em queries
- Risco de arquivar ativo por engano

#### Riscos aceitos
- Admin arquiva pendente sem cancelar — slot ocupado até restaurar

#### O que quebra se removermos
Admin volta a ter só DELETE 422 ou purge arriscado; perda de organização.

**Nunca remover porque:** Único mecanismo seguro de limpeza admin sem apagar pagamentos.

#### Impactos
- **Financeiro:** Baixo direto — Payment.appointmentId preservado.
- **Administrador:** Arquivar/Restaurar no painel; filtro arquivados.
- **Usuário:** Nenhum — Minha Conta inalterada.

#### Arquivos envolvidos
- `src/app/lib/appointment-admin-archive.ts`
- `prisma/migrations/20260617120000_appointment_admin_archive/`

**Entidades:** Appointment
**Fluxos:** Aceite/recusa admin; Disponibilidade; Checkout
**Invariantes:** A5, A8, A9, F4, X4
**Guardian:** A5, A8, A9
**Dependências:** ADR-005

#### Critérios futuros
- **Remoção:** Se purge físico for reintroduzido com guards financeiros equivalentes.
- **Evolução:** Estender padrão a Payment (ADR-013).

#### Testes recomendados
- Executar checks A5, A8, A9 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-005"></a>
### ADR-005 — Appointment Hidden — userHiddenAt (Minha Conta)

**Status:** Aceito · **Prioridade:** Média · **Risco:** Baixo · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Usuário quer ocultar agendamentos encerrados da Minha Conta sem apagar dados.

#### Problema
Exclusão física quebraria vínculos financeiros e histórico admin.

#### Objetivo
Ocultação apenas na visão do usuário (A7).

#### Decisão tomada
Campo userHiddenAt em Appointment; filtro em meus-dados; admin mantém visível.

#### Alternativas consideradas
- Delete físico
- Status cancelado como ocultação
- Soft-delete global

#### Alternativas descartadas
- Delete — F4
- Status — semântica diferente

#### Motivos da escolha
Invariante A7 — eixo usuário separado do eixo admin (ADR-004).

#### Consequências positivas
- UX Minha Conta limpa
- Dados preservados
- Admin não afetado

#### Consequências negativas
- Dois eixos de visibilidade para entender

#### Riscos aceitos
- Confusão entre userHidden e adminArchived — documentação crítica

#### O que quebra se removermos
Usuários não podem limpar visualmente Minha Conta.

**Nunca remover porque:** Garante LGPD/UX sem delete físico.

#### Impactos
- **Financeiro:** Nenhum — não altera Payment.
- **Administrador:** Admin vê todos inclusive ocultos pelo usuário.
- **Usuário:** Botão ocultar em Minha Conta.

#### Arquivos envolvidos
- `src/app/lib/appointment-hidden.ts`
- `src/app/api/meus-dados/route.ts`

**Entidades:** Appointment, User
**Fluxos:** Minha Conta (leitura); Ocultação usuário
**Invariantes:** A7
**Guardian:** A8
**Dependências:** —

#### Critérios futuros
- **Remoção:** Se UX unificar ocultação usuário e admin em um só campo.
- **Evolução:** Documentar diferença vs adminArchivedAt em treinamento admin.

#### Testes recomendados
- Executar checks A8 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

## Administração

<a id="adr-006"></a>
### ADR-006 — UserPlan Admin Inactive + User Hidden

**Status:** Aceito · **Prioridade:** Alta · **Risco:** Médio · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Planos cancelados ou inativos poluíam operação admin e Minha Conta.

#### Problema
Sem distinção entre inativação admin e ocultação usuário.

#### Objetivo
adminInactiveAt bloqueia cupons (P4); userHiddenAt oculta na Minha Conta.

#### Decisão tomada
Dois campos em UserPlan espelhando padrão Appointment.

#### Alternativas consideradas
- Delete plano
- Apenas status cancelled

#### Alternativas descartadas
- Delete — perde histórico de pagamento

#### Motivos da escolha
P4 e P5 exigem inativação admin sem apagar registro.

#### Consequências positivas
- Cupons bloqueados corretamente
- Minha Conta limpa

#### Consequências negativas
- Mesma complexidade de dois eixos

#### Riscos aceitos
- Admin inativa plano ativo por engano

#### O que quebra se removermos
Cupons de plano inativo podem reaparecer indevidamente.

**Nunca remover porque:** P4 depende de adminInactiveAt.

#### Impactos
- **Financeiro:** Médio — afeta cupons vinculados a plano.
- **Administrador:** Inativar plano no admin.
- **Usuário:** Plano oculto ou cupons bloqueados na Minha Conta.

#### Arquivos envolvidos
- `src/app/lib/user-plan-hidden.ts`
- `src/app/lib/active-user-plan.ts`

**Entidades:** UserPlan, Coupon
**Fluxos:** Minha Conta; Planos; Cupons de plano
**Invariantes:** P1, P4, P5
**Guardian:** C1
**Dependências:** ADR-005

#### Critérios futuros
- **Remoção:** Unificação de modelo de visibilidade em todas entidades.
- **Evolução:** Alinhar nomenclatura com Appointment archive.

#### Testes recomendados
- Executar checks C1 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

## Guardian

<a id="adr-001"></a>
### ADR-001 — Domain Guardian — verificação automática de invariantes

**Status:** Aceito · **Prioridade:** Crítica · **Risco:** Crítico · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Sistema THouse com regras financeiras críticas (pagamentos, cupons, agendamentos) sem verificação automatizada em produção.

#### Problema
Bugs em webhook ou ownership de cupons podem passar despercebidos até impactar clientes ou receita.

#### Objetivo
Detectar violações de invariantes no banco antes e depois de deploys.

#### Decisão tomada
Implementar Domain Guardian com checks F1–S4, runner, advisor, decision engine e memória histórica.

#### Alternativas consideradas
- Testes manuais apenas antes de deploy
- Monitoramento externo (Datadog/Sentry) sem regras de domínio
- Code review sem verificação de dados

#### Alternativas descartadas
- Testes manuais — não escalam e não cobrem estado do banco
- Monitoramento genérico — não conhece invariantes F1/F4/X1

#### Motivos da escolha
Regras de domínio são específicas do negócio; Guardian codifica invariantes documentados e roda localmente/CI.

#### Consequências positivas
- Detecção de pagamento duplicado (F1)
- Detecção de agendamento órfão pós-pagamento (F4)
- Histórico em memory.json para tendências

#### Consequências negativas
- Manutenção de checks quando schema evolui
- Falso senso de segurança se não rodar antes de deploy

#### Riscos aceitos
- Checks podem ficar desatualizados se docs não forem sincronizados

#### O que quebra se removermos
Deploys podem introduzir pagamentos duplicados, cupons órfãos ou agendamentos fantasmas sem detecção.

**Nunca remover porque:** É a rede de segurança do domínio financeiro-operacional.

#### Impactos
- **Financeiro:** Protege integridade financeira — gate antes de merge em áreas críticas.
- **Administrador:** Advisor.md orienta ações corretivas por check.
- **Usuário:** Indireto — evita bugs visíveis ao cliente.

#### Arquivos envolvidos
- `scripts/domain-guardian-runner.ts`
- `scripts/domain-guardian-audit.ts`
- `scripts/domain-decision-engine.ts`
- `reports/domain-guardian/latest.json`

**Entidades:** Payment, Appointment, Coupon, UserPlan
**Fluxos:** Verificação pré-deploy; Auditoria de banco
**Invariantes:** F1, F4, A5, A8, C1, X1, X2
**Guardian:** F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2
**Dependências:** ADR-011

#### Critérios futuros
- **Remoção:** Nunca remover sem substituto equivalente de verificação de invariantes.
- **Evolução:** Adicionar checks A9+ conforme novas entidades (ex.: arquivamento).

#### Testes recomendados
- Executar checks F1, F4, A5, A8, C1, C2, P2, S1, S4, X1, X2 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

<a id="adr-015"></a>
### ADR-015 — Decision Engine — gate BLOCKED em mudanças CRITICAL

**Status:** Aceito · **Prioridade:** Alta · **Risco:** Médio · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Diff grande em schema + payment + appointment simultaneamente.

#### Problema
Merge/deploy automático de mudanças CRITICAL sem revisão.

#### Objetivo
BLOCKED quando risco CRITICAL e invariantes críticos no diff.

#### Decisão tomada
domain-decision-engine.ts gera decision.md com APPROVED/REVIEW/BLOCKED.

#### Alternativas consideradas
- Só Guardian
- Aprovação manual sempre

#### Alternativas descartadas
- Só Guardian — não olha diff Git
- Sempre manual — lento

#### Motivos da escolha
Combina saúde do banco (Guardian) com escopo do diff (change-analyzer).

#### Consequências positivas
- Deploy seguro
- PRs menores incentivados

#### Consequências negativas
- BLOCKED frequente em branches grandes

#### Riscos aceitos
- Falsos positivos — revisão humana necessária

#### O que quebra se removermos
Deploy de 150+ arquivos CRITICAL sem barreira.

**Nunca remover porque:** Última linha de defesa antes de merge em main.

#### Impactos
- **Financeiro:** Indireto — evita deploy arriscado.
- **Administrador:** Nenhum.
- **Usuário:** Nenhum.

#### Arquivos envolvidos
- `scripts/domain-decision-engine.ts`
- `reports/domain-guardian/decision.md`

**Entidades:** Payment, Appointment, Coupon
**Fluxos:** Merge; Deploy
**Invariantes:** Críticos no diff
**Guardian:** —
**Dependências:** ADR-001

#### Critérios futuros
- **Remoção:** Se CI tiver gate equivalente com mesmas regras.
- **Evolução:** Integrar ao GitHub Actions; split-to-prs automático.

#### Testes recomendados
- Revisar arquivos listados após mudanças nesta decisão

---

## Arquitetura

<a id="adr-014"></a>
### ADR-014 — Vínculos lógicos sem FK — Payment → Appointment

**Status:** Aceito · **Prioridade:** Alta · **Risco:** Alto · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff

#### Contexto
Payment referencia Appointment por appointmentId/appointmentIds sem FK Prisma.

#### Problema
FK rígida dificulta carrinho multi-item, remarcação e arquivamento.

#### Objetivo
Flexibilidade com invariantes Guardian (F4, X4) compensando ausência de FK.

#### Decisão tomada
Campos lógicos + reconcile + Guardian F4 em vez de CASCADE no banco.

#### Alternativas consideradas
- FK estrita
- Tabela de junção PaymentAppointment

#### Alternativas descartadas
- FK — bloqueia cenários de remarcação
- Junção — refactor grande

#### Motivos da escolha
Legado pragmático; Guardian detecta órfãos.

#### Consequências positivas
- Remarcação flexível
- Carrinho N agendamentos

#### Consequências negativas
- Órfãos possíveis
- Integridade só por aplicação

#### Riscos aceitos
- Payment sem Appointment válido — F4 detecta

#### O que quebra se removermos
Remarcação e carrinho; exigiria redesign schema.

**Nunca remover porque:** Compensado por reconcile + F4 — remover sem substituir quebra integridade.

#### Impactos
- **Financeiro:** Alto se órfão — pagamento sem serviço.
- **Administrador:** Reconcile manual em incidentes.
- **Usuário:** Agendamento pode não aparecer se F4 violado.

#### Arquivos envolvidos
- `prisma/schema.prisma`
- `src/app/lib/asaas-agendamento-payment-effects.ts`

**Entidades:** Payment, Appointment
**Fluxos:** Payment → Appointment; Checkout carrinho
**Invariantes:** F4, X4
**Guardian:** F4
**Dependências:** ADR-001

#### Critérios futuros
- **Remoção:** Migration para FK/junção com migração de dados completa.
- **Evolução:** Avaliar tabela de junção em V2 schema.

#### Testes recomendados
- Executar checks F4 no Guardian
- Revisar arquivos listados após mudanças nesta decisão

---

## Documentação

<a id="adr-011"></a>
### ADR-011 — Domain Map — documentação estruturada de entidades

**Status:** Aceito · **Prioridade:** Alta · **Risco:** Baixo · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** documentação-auditoria

#### Contexto
Agentes e revisores precisavam entender entidades sem ler todo o código.

#### Problema
Conhecimento tribal; onboarding lento; Guardian sem spec.

#### Objetivo
Mapa de domínio com entidades, arquivos, invariantes e fluxos.

#### Decisão tomada
docs/ai/domain-map.md + domain-dependencies + domain-invariants + domain-risks.

#### Alternativas consideradas
- Wiki externa
- Comentários no código apenas

#### Alternativas descartadas
- Wiki — desatualiza
- Só código — agentes não leem tudo

#### Motivos da escolha
Markdown versionado no repo; consumido por todos os agentes.

#### Consequências positivas
- Base para Guardian
- Onboarding
- ADRs derivados

#### Consequências negativas
- Manutenção manual quando código muda

#### Riscos aceitos
- Drift doc vs código — mitigado por Architecture Agent

#### O que quebra se removermos
Agentes e Guardian perdem fonte de verdade semântica.

**Nunca remover porque:** Fundamento da memória arquitetural do projeto.

#### Impactos
- **Financeiro:** Indireto — reduz bugs por desconhecimento.
- **Administrador:** Nenhum direto.
- **Usuário:** Nenhum.

#### Arquivos envolvidos
- `docs/ai/domain-map.md`
- `docs/ai/domain-dependencies.md`
- `docs/ai/domain-invariants.md`
- `docs/ai/domain-risks.md`

**Entidades:** Payment, Appointment, Coupon, UserPlan, User, Service
**Fluxos:** Todas
**Invariantes:** Todos documentados
**Guardian:** —
**Dependências:** —

#### Critérios futuros
- **Remoção:** Se substituído por spec machine-readable única.
- **Evolução:** Sincronizar após cada feature; audits por entidade.

#### Testes recomendados
- Revisar arquivos listados após mudanças nesta decisão

---

## IA

<a id="adr-012"></a>
### ADR-012 — Architecture Agent Pipeline — agentes read-only

**Status:** Aceito · **Prioridade:** Média · **Risco:** Baixo · **Válida:** Sim
**Data:** 2026-07-05 · **Origem:** git-diff
**Substitui:** Documentação ad-hoc em chats

#### Contexto
Deploys arriscados sem planejamento nem relatório para proprietário.

#### Problema
Decisão de deploy baseada em intuição; proprietário não entende mudanças.

#### Objetivo
Pipeline: Architecture → Design → Implementation → Evolution → Human Report → ADR.

#### Decisão tomada
Scripts *-agent.ts geram JSON/MD em reports/ sem modificar runtime.

#### Alternativas consideradas
- Documentação manual
- CI apenas com testes

#### Alternativas descartadas
- Manual — não escala
- Só testes — não explicam porquê

#### Motivos da escolha
Agentes leem mesmas fontes; encadeamento reproduzível.

#### Consequências positivas
- Plano antes de codar
- Relatório humano
- Evolução pré-deploy
- Memória ADR

#### Consequências negativas
- Manutenção dos scripts
- Heurísticas V1

#### Riscos aceitos
- Agentes não substituem code review humano

#### O que quebra se removermos
Perde memória de planejamento e relatórios automáticos.

**Nunca remover porque:** Institucionaliza como o projeto pensa antes de mudar.

#### Impactos
- **Financeiro:** Indireto — reduz deploy com bugs financeiros.
- **Administrador:** Nenhum.
- **Usuário:** Nenhum.

#### Arquivos envolvidos
- `scripts/architecture-agent.ts`
- `scripts/design-planner-agent.ts`
- `scripts/implementation-planner-agent.ts`
- `scripts/evolution-agent.ts`
- `scripts/human-report-agent.ts`
- `scripts/architecture-decision-agent.ts`

**Entidades:** —
**Fluxos:** Planejamento; Deploy readiness
**Invariantes:** —
**Guardian:** —
**Dependências:** ADR-011, ADR-001

#### Critérios futuros
- **Remoção:** Se CI/CD absorver todas funções com paridade.
- **Evolução:** Integrar no workflow GitHub; V2 com LLM opcional.

#### Testes recomendados
- Revisar arquivos listados após mudanças nesta decisão

---

## Recomendações futuras

- Finalizar migração de simulação (S4): vincular ou eliminar cupons legados TESTE_AGEND_/TESTE_PAY_ antes de remover helpers @legacy.
- Alta frequência de BLOCKED: adotar PRs menores (split-to-prs) e rodar change-analyzer antes de abrir PR.
- Divergência banco saudável vs diff CRITICAL: separar gate de dados (Guardian) do gate de merge (Decision Engine).
- Adicionar arquivamento administrativo de pagamentos
- Implementar ADR-013 (Payment Archive) conforme design-plan
- Completar migração S4 — cupons TESTE legados
- Integrar architecture-decisions.json no pipeline CI pré-deploy

## Limitações V1

- ADRs inferidos de auditorias, domain-map e arquivos — não lê comentários no código-fonte.
- Detecção por padrões de caminho; decisões não documentadas podem faltar.
- Datas aproximadas quando não há commit explícito no histórico.
- ADR-013 permanece Proposto até implementação confirmada no código.
- Não substitui revisão humana de arquitetura.
- Grafo limitado a 5 arquivos por decisão para tamanho do JSON.

---
_Memória arquitetural gerada automaticamente — consulte antes de remover código._