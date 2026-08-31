# E2E-01 — Jornada Completa do Cliente

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Foco:** comportamento do usuário real (não análise de código)

## Cenário avaliado

Cliente **novo** que compra **serviço avulso** (agendamento pago via carrinho → Asaas).  
Pós-**GL-01**: auto-login após registro está ativo no commit atual.

---

## Probabilidade de concluir sem falar com suporte

| Escopo | Probabilidade | Cenário |
|--------|---------------|---------|
| **Jornada core (etapas 1–10)** | **~52%** | Produção com Asaas + webhook OK |
| **Jornada completa (1–15)** | **~38%** | Inclui admin, entrega, cupom, reembolso |
| **Ambiente local (dev)** | **~28%** | Webhook Asaas não alcança localhost |

### Justificativa

O sistema **permite** percorrer registro → agendamento → pagamento de ponta a ponta, e o bloqueador de sessão pós-registro foi corrigido (GL-01). Porém a experiência ainda depende fortemente de fatores **invisíveis ao cliente**:

1. **Webhook Asaas** — o usuário paga e volta ao site; se o webhook não processar, ele vê Minha Conta vazia e interpreta como falha. É o motivo #1 de contato com suporte.
2. **Formulário de checkout** — CPF, endereço e termos são obrigatórios; erros do Asaas (domínio, sandbox) aparecem como alertas genéricos.
3. **Navegação pós-registro** — cai em **Conta** (perfil), não em **Minha Conta** (painel operacional); parte dos usuários não encontra agendamentos sem explorar o menu.
4. **Carrinho no browser** — trocar dispositivo ou limpar dados perde o carrinho.
5. **Etapas 11–14** — exigem admin (aceite, cancelamento) ou são fluxos de exceção (reembolso); não são self-service contínuo.

Por isso a estimativa fica na faixa **~50%** para o happy path principal em produção bem configurada, e **menor** para a jornada completa de 15 etapas.

---

## Tabela resumo

| # | Etapa | Status |
|---|-------|--------|
| 1 | Home | 🟢 |
| 2 | Registro | 🟢 |
| 3 | Login automático | 🟢 |
| 4 | Minha Conta | 🟡 |
| 5 | Escolher serviço | 🟢 |
| 6 | Escolher data | 🟢 |
| 7 | Carrinho | 🟢 |
| 8 | Checkout | 🟡 |
| 9 | Webhook | 🟡 |
| 10 | Minha Conta (pós-pagamento) | 🟡 |
| 11 | Admin | 🟡 |
| 12 | Entrega | 🟡 |
| 13 | Cupom | 🟡 |
| 14 | Reembolso | 🟡 |
| 15 | Logout | 🟢 |

**Contagem:** 6 🟢 · 9 🟡 · 0 🔴

---

## Detalhamento por etapa

### 1. Entrar na Home — 🟢

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim |
| Quem atualiza? | Ninguém (página pública) |
| Quem consome? | Visitante |
| Quem persiste? | Ninguém |
| Existe tela? | Sim |
| Existe feedback? | Sim (navegação, header) |
| Pode quebrar UX? | Não |

---

### 2. Registrar novo usuário — 🟢

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim |
| Quem atualiza? | Formulário → servidor |
| Quem consome? | Usuário na tela Registrar |
| Quem persiste? | Novo usuário no banco |
| Existe tela? | Sim |
| Existe feedback? | Sim (erros de validação, email duplicado) |
| Pode quebrar UX? | Sim — formulário longo |

---

### 3. Login automático — 🟢

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim (após GL-01) |
| Funciona? | Sim |
| Quem atualiza? | Servidor cria sessão; app atualiza estado logado |
| Quem consome? | Browser (cookie de sessão) |
| Quem persiste? | Sessão 7 dias |
| Existe tela? | Não (automático) |
| Existe feedback? | Não explícito |
| Pode quebrar UX? | Sim — usuário não percebe que já está logado |

---

### 4. Minha Conta — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim, se autenticado |
| Quem atualiza? | API de dados do usuário |
| Quem consome? | Página Minha Conta |
| Quem persiste? | Leitura de agendamentos, pagamentos, cupons |
| Existe tela? | Sim |
| Existe feedback? | Sim (listas, status) |
| Pode quebrar UX? | Sim — após registro vai para **Conta** (perfil), não **Minha Conta** |

---

### 5. Escolher um serviço — 🟢

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim |
| Quem atualiza? | Seleção na página Agendamento |
| Quem consome? | Usuário |
| Quem persiste? | Ainda não (só ao avançar) |
| Existe tela? | Sim |
| Existe feedback? | Sim (totais, seleção) |
| Pode quebrar UX? | Sim — muitas opções |

---

### 6. Escolher data — 🟢

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim |
| Quem atualiza? | Calendário consulta disponibilidade |
| Quem consome? | Usuário |
| Quem persiste? | Não até confirmar |
| Existe tela? | Sim |
| Existe feedback? | Sim (horários livres/ocupados) |
| Pode quebrar UX? | Sim — slot tomado por outro usuário |

---

### 7. Adicionar ao carrinho — 🟢

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim |
| Quem atualiza? | Armazenamento local do navegador |
| Quem consome? | Página Carrinho |
| Quem persiste? | Apenas no browser |
| Existe tela? | Sim (redirecionamento ao carrinho) |
| Existe feedback? | Sim |
| Pode quebrar UX? | Sim — carrinho perdido ao trocar aparelho |

---

### 8. Checkout — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim, se dados e Asaas OK |
| Quem atualiza? | Servidor gera cobrança Asaas |
| Quem consome? | Usuário no site Asaas |
| Quem persiste? | Metadados do pagamento + cobrança externa |
| Existe tela? | Sim (carrinho + redirect Asaas) |
| Existe feedback? | Sim (loading, alertas de erro) |
| Pode quebrar UX? | Sim — CPF obrigatório, erros Asaas pouco amigáveis |

---

### 9. Webhook — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim (infra) |
| Funciona? | Condicional — produção com URL pública |
| Quem atualiza? | Asaas notifica o site |
| Quem consome? | Sistema (invisível) |
| Quem persiste? | Pagamento aprovado, agendamento, cupons |
| Existe tela? | Não |
| Existe feedback? | Não para o cliente |
| Pode quebrar UX? | **Sim — crítico** se falhar após pagamento |

---

### 10. Minha Conta (pós-pagamento) — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Depende do webhook |
| Quem atualiza? | Webhook + consulta de dados |
| Quem consome? | Usuário |
| Quem persiste? | Agendamento vinculado ao usuário |
| Existe tela? | Sim |
| Existe feedback? | Sim (ou ausência — confunde) |
| Pode quebrar UX? | Sim — "paguei e não apareceu" |

---

### 11. Admin — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim (equipe interna) |
| Quem atualiza? | Admin aceita/recusa agendamento |
| Quem consome? | THouse (não o cliente) |
| Quem persiste? | Status do agendamento |
| Existe tela? | Sim (/admin) |
| Existe feedback? | Sim no painel admin |
| Pode quebrar UX? | Sim — cliente espera sem prazo visível |

---

### 12. Entrega — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim (operacional) |
| Funciona? | Parcial — registro no sistema, serviço físico no estúdio |
| Quem atualiza? | Admin + vínculo de serviços |
| Quem consome? | Cliente presencialmente |
| Quem persiste? | Serviços do agendamento |
| Existe tela? | Sim (status em Minha Conta) |
| Existe feedback? | Limitado |
| Pode quebrar UX? | Sim — expectativa de "entrega digital" não se aplica |

---

### 13. Cupom — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim (validação + aplicação) |
| Quem atualiza? | Validação no agendamento ou geração pós-pagamento |
| Quem consome? | Cliente |
| Quem persiste? | Cupons no banco |
| Existe tela? | Sim |
| Existe feedback? | Sim |
| Pode quebrar UX? | Sim — regras de plano/reembolso/100% confusas |

---

### 14. Reembolso — 🟡

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim, após cancelamento admin |
| Quem atualiza? | Escolha do cliente (dinheiro ou cupom) |
| Quem consome? | Cliente em Minha Conta |
| Quem persiste? | Status de reembolso |
| Existe tela? | Sim |
| Existe feedback? | Sim (mensagens de sucesso/erro) |
| Pode quebrar UX? | Sim — fluxo reativo, não proativo |

---

### 15. Logout — 🟢

| Pergunta | Resposta |
|----------|----------|
| Existe? | Sim |
| Funciona? | Sim |
| Quem atualiza? | Servidor encerra sessão |
| Quem consome? | Menu do usuário |
| Quem persiste? | Remove sessão |
| Existe tela? | Não dedicada |
| Existe feedback? | Sim (volta à home deslogado) |
| Pode quebrar UX? | Não |

---

## Veredito comportamental

| | |
|---|---|
| **Jornada** | Parcialmente funcional |
| **Cliente consegue comprar serviço?** | Sim, se infra Asaas OK |
| **Cliente consegue sem suporte?** | **~52%** (core) / **~38%** (completa) |
| **Maior gap de UX** | Pagamento sem reflexo em Minha Conta |
| **Segundo gap** | Navegação pós-registro (/conta vs /minha-conta) |

---

## Diagrama da jornada (perspectiva do cliente)

```
🟢 Home → 🟢 Registro → 🟢 Auto-login → 🟡 Conta/Minha Conta
    → 🟢 Serviço → 🟢 Data → 🟢 Carrinho → 🟡 Checkout → Asaas
    → 🟡 (invisível webhook) → 🟡 Minha Conta
    → 🟡 Espera admin → 🟡 Estúdio → 🟡 Cupom/Reembolso (se aplicável) → 🟢 Logout
```

Nenhum código foi alterado. Relatório encerrado.
