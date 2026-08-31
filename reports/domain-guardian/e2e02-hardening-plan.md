# E2E-02 — Plano de Hardening da Jornada do Cliente

**Modo:** READ ONLY · **Base:** [E2E-01](e2e01-customer-journey.md) · **Branch:** `pr03-clean` @ `3f20ad0`

## Objetivo

Transformar todos os **🟡** da E2E-01 em **🟢**.

---

## Probabilidade após H1

| Escopo | Antes (E2E-01) | Após H1 |
|--------|----------------|---------|
| **Jornada core (1–10)** | ~52% | **~78%** |
| **Jornada completa (1–15)** | ~38% | **~58%** |

H1 ataca as três maiores causas de suporte: **webhook**, **pós-pagamento sem feedback** e **navegação pós-registro**. Admin, entrega, cupom avançado e reembolso permanecem amarelos até H2.

---

## Análise por etapa amarela

### Minha Conta (etapa 4 — navegação)

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Pós-registro vai para `/conta` (perfil), não `/minha-conta` (operacional). |
| **2. Tipo** | **UX** |
| **3. Menor correção** | Redirect pós-registro → `/minha-conta` (+ banner boas-vindas opcional). |
| **4. Tempo** | 1–2 h |
| **5. Risco** | Baixo |
| **6. Bloqueia produção?** | **NÃO** |

---

### Minha Conta (etapa 10 — pós-pagamento)

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Agendamento só aparece após webhook; atraso = conta vazia após pagar. |
| **2. Tipo** | **Código**, **Infraestrutura**, **UX** |
| **3. Menor correção** | Página sucesso: polling 60s + mensagem "Processando…" → redirect `/minha-conta` ao confirmar. |
| **4. Tempo** | 4–6 h |
| **5. Risco** | Médio |
| **6. Bloqueia produção?** | **SIM** |

---

### Checkout

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Formulário longo; CPF obrigatório; erros Asaas genéricos. |
| **2. Tipo** | **UX**, **Configuração**, **Código** |
| **3. Menor correção** | **H1:** checklist env + copy de erros. **H2:** pré-preencher perfil no carrinho. |
| **4. Tempo** | H1: 2 h · H2: 4 h |
| **5. Risco** | Baixo |
| **6. Bloqueia produção?** | **NÃO** (config Asaas sim, mas UX não) |

---

### Webhook

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Invisível ao cliente; falha silenciosa; depende de URL/token/domínio. |
| **2. Tipo** | **Infraestrutura**, **Configuração**, **Operação** (+ Código em H2) |
| **3. Menor correção** | **H1:** registrar webhook prod, token, `NEXT_PUBLIC_SITE_URL`, smoke sandbox. **H2:** logs + alertas em falha de efeitos. |
| **4. Tempo** | H1: 2–4 h · H2: 1–2 dias |
| **5. Risco** | **Alto** (H1) / Médio (H2) |
| **6. Bloqueia produção?** | **SIM** |

---

### Admin

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Cliente em "pendente" sem prazo; aceite manual; sem notificação clara. |
| **2. Tipo** | **UX**, **Operação**, **Código** |
| **3. Menor correção** | Badge SLA em Minha Conta + email admin em novo agendamento pago. |
| **4. Tempo** | 6–8 h |
| **5. Risco** | Baixo |
| **6. Bloqueia produção?** | **NÃO** |

---

### Entrega

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Serviço é presencial; sistema não marca "entregue" de forma clara ao cliente. |
| **2. Tipo** | **UX**, **Operação** |
| **3. Menor correção** | Email ao cliente quando admin confirma + status visível em Minha Conta (H3: histórico). |
| **4. Tempo** | H2: 4 h · H3: 1 dia |
| **5. Risco** | Baixo |
| **6. Bloqueia produção?** | **NÃO** |

---

### Cupom

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Regras confusas (plano/reembolso/100%/TESTE_); ownership incompleto (PR-04). |
| **2. Tipo** | **Código**, **UX** |
| **3. Menor correção** | **H2:** mensagens de validação claras. **H3:** PR-04 ownership. |
| **4. Tempo** | H2: 4 h · H3: 3–5 dias |
| **5. Risco** | Médio |
| **6. Bloqueia produção?** | **NÃO** |

---

### Reembolso

| # | Resposta |
|---|----------|
| **1. Por que amarelo?** | Fluxo reativo pós-cancelamento admin; edge cases pedem suporte. |
| **2. Tipo** | **Código**, **UX**, **Operação** |
| **3. Menor correção** | Card proativo em Minha Conta quando opção pendente; H3: guia in-app. |
| **4. Tempo** | H2: 6 h · H3: 2 dias |
| **5. Risco** | Médio |
| **6. Bloqueia produção?** | **NÃO** |

---

## Sprints

### Sprint H1 — Obrigatório antes do deploy (2–3 dias)

| Item | Ação | Bloqueia? |
|------|------|-----------|
| Webhook prod | URL + token + domínio Asaas + smoke sandbox | **SIM** |
| Sucesso pós-pagamento | Polling + mensagem + redirect Minha Conta | **SIM** |
| Redirect registro | `/minha-conta` em vez de `/conta` | Não |
| Checkout | Checklist env + erros amigáveis | Não |
| Smoke E2E | Registro → pagamento sandbox → agendamento visível | **SIM** |
| GL-01 B2 | Commit fluxo planos (se no escopo) | Condicional |

**Etapas → 🟢 após H1:** 4, 8, 9, 10 (core)

---

### Sprint H2 — Importante após deploy (1–2 semanas)

| Item | Ação |
|------|------|
| Webhook resiliência | Logs estruturados + alertas; reduzir fallback metadata |
| Checkout UX | Pré-preencher CPF/endereço do perfil |
| Admin | SLA visível + email admin |
| Entrega | Email confirmação pós-aceite |
| Cupom | Copy validação clara |
| Reembolso | Card proativo cancelamento |

**Etapas → 🟢 após H2:** 11, 12, 13, 14

**Probabilidade estimada pós-H2:** core ~88% · completa ~78%

---

### Sprint H3 — Evoluções (2–4 semanas)

| Item | Ação |
|------|------|
| PR-04 | Cupons e ownership (remover shims legado) |
| Entrega | Status "concluído" + histórico |
| Reembolso | Resolvedor simplificado + guia in-app |
| Admin | Fila / notificações tempo real |
| Opcional | Carrinho server-side |

**Probabilidade estimada pós-H3:** core ~92% · completa ~85%

---

## Roadmap visual

```
E2E-01 baseline     core 52%  │  full 38%
        ↓ H1 (pré-deploy)
        core 78%  │  full 58%
        ↓ H2 (pós-deploy)
        core 88%  │  full 78%
        ↓ H3 (evoluções)
        core 92%  │  full 85%
```

---

## Matriz: tipo de problema por etapa

| Etapa | Código | Infra | UX | Config | Segurança | Operação |
|-------|--------|-------|-----|--------|-----------|----------|
| Minha Conta | ● | ● | ●● | | | |
| Checkout | ● | | ●● | ● | | |
| Webhook | ● | ●● | | ●● | | ● |
| Admin | ● | | ●● | | | ● |
| Entrega | | | ●● | | | ● |
| Cupom | ●● | | ● | | | |
| Reembolso | ●● | | ● | | | ● |

---

## Veredito

Após **H1**, um cliente real tem **~78%** de chance de concluir a jornada **core** (registro → pagamento → agendamento em Minha Conta) sem suporte, contra **~52%** hoje.

A jornada **completa** (15 etapas) sobe para **~58%** após H1 e **~78%** após H2 — admin, entrega e fluxos de exceção exigem comunicação proativa que só entra no H2.

Nenhum código foi alterado. Plano encerrado.
