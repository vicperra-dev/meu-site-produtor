# Relatório de Evolução — O que mudou desde o último deploy?

**Gerado em:** 2026-07-05T20:54:37.971Z
**Projeto:** THouse
**Agente:** Evolution V1.0.0

---

## Resposta direta

> 173 arquivo(s) pendente(s) em 7 área(s) de negócio. 4 funcionalidade(s) nova(s), 4 alterada(s). verificação automática HEALTHY, decisão BLOCKED.

**Deploy recomendado?** Não no momento

Deploy não recomendado: Motor de decisão BLOCKED — revisar alterações pendentes; Grande volume de arquivos pendentes (173) — considerar deploy incremental; Rodar 9 migration(s): npx prisma migrate deploy.

---

## O sistema hoje é melhor porque...

O sistema ganhou proteção financeira, verificação automática antes do deploy, organização administrativa e ferramentas para o proprietário acompanhar a evolução sem ler código.

### Antes
- Pagamentos podiam duplicar em retries do Asaas
- Sem arquivamento admin estruturado
- Deploy sem relatório consolidado de evolução
- Decisão de deploy baseada apenas em intuição

### Depois
- Proteção contra processamento duplicado de pagamentos
- Arquivamento de agendamentos com histórico preservado
- Relatório de evolução automático antes de cada deploy
- Motor de decisão e Guardian como rede de segurança

---

## Linha do tempo

```
Versão Atual
↓
Grandes alterações
↓
Novas funcionalidades
↓
Correções
↓
Mudanças arquiteturais
↓
Guardian
↓
Deploy Readiness
```

### Versão Atual
Branch main, commit fd9ff6d, 173 arquivo(s) pendentes.
- fd9ff6d hardening completo sistema: cupons, confirmação automática do Asaas, idempotencia, sync e validações finais
- 60fb2fa feat(admin): boxes de agendamento por status com links e filtros na lista
- 69ce69f Contato: subtitulo em duas linhas centralizado sem scroll; hero: texto vermelho centralizado no PC

### Grandes alterações
Mudanças de maior impacto no negócio.
- Serviços internos (APIs) alterados
- Interface do sistema atualizada
- Arquivamento administrativo de agendamentos
- Fortalecimento de pagamentos e cupons
- Adicionar arquivamento administrativo de pagamentos

### Novas funcionalidades
Recursos adicionados ou planejados.
- Interface do sistema atualizada
- Arquivamento administrativo de agendamentos
- Pipeline de agentes de planejamento e relatórios
- Adicionar arquivamento administrativo de pagamentos
- Adicionar arquivamento administrativo de pagamentos (planejado)

### Correções
Estabilização e hardening.
- Fortalecimento de pagamentos e cupons

### Mudanças arquiteturais
Agentes, documentação e estrutura.
- Alterações no banco de dados
- Pipeline de agentes de planejamento e relatórios

### Guardian
Verificação automática: HEALTHY.
- domain-guardian-runner.ts
- domain-decision-engine.ts
- memory.json

### Deploy Readiness
Não recomendado — pendências e riscos abertos.
- Resolver BLOCKED
- Dividir alterações
- Testes em staging

---

## Resumo numérico

| Indicador | Valor |
|-----------|-------|
| Funcionalidades adicionadas | 4 |
| Funcionalidades alteradas | 4 |
| Funcionalidades removidas | 0 |
| Arquivos pendentes | 173 |
| Migrations pendentes | 9 |
| Arquivos críticos | 7 |
| Guardian | HEALTHY |
| Decisão deploy | BLOCKED |

---

## Mudanças detalhadas

### Alterações no banco de dados
**Status:** pendente · **Tipo:** Deploy, Arquitetura

**Problema anterior:** Estrutura do banco sem os novos campos ou tabelas previstos.
**Como funcionava antes:** Schema anterior em produção.
**O que mudou:** 9 migration(s) e 1 alteração(ões) de schema pendentes.
**Como funciona agora:** Após deploy, o banco terá a estrutura atualizada. Migrations devem rodar antes ou durante o deploy.
**Benefício:** Suporte a novos recursos que dependem de colunas ou índices adicionais.

**Usuário:** Indireto — habilita funcionalidades novas após migration.
**Administrador:** Novos campos disponíveis para operações administrativas.
**Financeiro:** Médio se migrations tocam Payment ou Appointment.
**Risco:** Migration em produção exige backup e janela controlada.

**Arquivos:** prisma/schema.prisma, prisma/migrations/20260504200000_add_foto_position/, prisma/migrations/20260504213000_account_deletion_log/, prisma/migrations/20260511231500_user_plan_admin_inactive/, prisma/migrations/20260511234500_coupon_refund_tracking/ …

**Testes recomendados:**
- [ ] npx prisma migrate deploy em staging
- [ ] npx prisma generate após migration
- [ ] Smoke test pós-migration

### Serviços internos (APIs) alterados
**Status:** pendente · **Tipo:** Financeiro, Admin, Segurança, Infraestrutura

**Problema anterior:** Contratos e regras anteriores em produção.
**Como funcionava antes:** Endpoints respondiam conforme versão deployada.
**O que mudou:** 53 rota(s) de API com alterações pendentes de deploy.
**Como funciona agora:** Após deploy, novas regras e respostas entram em vigor.
**Benefício:** Regras de negócio e integrações atualizadas.

**Usuário:** Pode afetar checkout, Minha Conta e cancelamentos.
**Administrador:** Painel admin usa estas APIs — validar ações administrativas.
**Financeiro:** Alto — rotas financeiras no escopo.
**Risco:** Regressão em fluxo de pagamento ou reembolso.

**Arquivos:** src/app/api/admin/agendamentos/cancelar/route.ts, src/app/api/admin/agendamentos/reverter-cancelamento/route.ts, src/app/api/admin/agendamentos/route.ts, src/app/api/admin/cupons/liberar/route.ts, src/app/api/admin/cupons/route.ts …

**Testes recomendados:**
- [ ] Testar checkout sandbox
- [ ] Testar confirmação automática do Asaas PAYMENT_RECEIVED
- [ ] Testar endpoints admin afetados

### Interface do sistema atualizada
**Status:** pendente · **Tipo:** Admin, Nova funcionalidade

**Problema anterior:** Telas anteriores sem novos botões ou filtros.
**Como funcionava antes:** UI conforme versão em produção.
**O que mudou:** 21 página(s) ou componente(s) de interface alterados.
**Como funciona agora:** Novas ações visíveis no admin ou área do cliente após deploy.
**Benefício:** Melhor experiência e novas operações administrativas.

**Usuário:** Mudanças em Minha Conta ou fluxos visíveis ao cliente.
**Administrador:** Novos botões, filtros ou telas no painel admin.
**Financeiro:** Baixo — salvo telas de pagamento.
**Risco:** Validação manual de UI obrigatória.

**Arquivos:** src/app/admin/agendamentos/page.tsx, src/app/admin/estatisticas/page.tsx, src/app/admin/layout.tsx, src/app/admin/pagamentos/page.tsx, src/app/admin/page.tsx …

**Testes recomendados:**
- [ ] Navegar telas admin alteradas
- [ ] Verificar Minha Conta do cliente teste

### Arquivamento administrativo de agendamentos
**Status:** pendente · **Tipo:** Nova funcionalidade, Admin

**Problema anterior:** Agendamentos encerrados poluíam a operação diária.
**Como funcionava antes:** Sem arquivamento com justificativa — opções limitadas.
**O que mudou:** Admin pode arquivar e restaurar agendamentos sem apagar histórico.
**Como funciona agora:** Arquivados saem de checkout, disponibilidade e stats operacionais.
**Benefício:** Painel organizado com histórico preservado.

**Usuário:** Cliente não vê agendamentos arquivados pelo admin.
**Administrador:** Botões Arquivar/Restaurar e filtro de arquivados.
**Financeiro:** Não altera pagamentos — apenas visão operacional.
**Risco:** Arquivar por engano — mitigado por restauração.

**Arquivos:** src/app/admin/agendamentos/page.tsx, src/app/agendamento/page.tsx, src/app/api/admin/agendamentos/cancelar/route.ts, src/app/api/admin/agendamentos/reverter-cancelamento/route.ts, src/app/api/admin/agendamentos/route.ts …

**Testes recomendados:**
- [ ] Arquivar agendamento teste no admin
- [ ] Confirmar ausência em checkout
- [ ] Restaurar agendamento

### Pipeline de agentes de planejamento e relatórios
**Status:** concluído · **Tipo:** Arquitetura, Guardian, Infraestrutura

**Problema anterior:** Evolução do projeto difícil de acompanhar antes do deploy.
**Como funcionava antes:** Relatórios técnicos dispersos, sem visão consolidada.
**O que mudou:** Novos agentes: arquitetura, design, implementação, relatório humano e evolução.
**Como funciona agora:** Scripts geram planos e relatórios automaticamente antes de cada deploy.
**Benefício:** Proprietário e equipe enxergam evolução e riscos com clareza.

**Usuário:** Nenhum — ferramentas internas.
**Administrador:** Nenhum direto.
**Financeiro:** Indireto — reduz risco de deploy com bugs financeiros.
**Risco:** Agentes auxiliam — não substituem testes manuais.

**Arquivos:** scripts/architecture-agent.ts, scripts/design-planner-agent.ts, scripts/evolution-agent.ts, scripts/human-report-agent.ts, scripts/implementation-planner-agent.ts

**Testes recomendados:**
- [ ] Executar evolution-agent antes de cada deploy

### Fortalecimento de pagamentos e cupons
**Status:** pendente · **Tipo:** Correção, Financeiro, Segurança

**Problema anterior:** Risco de cobrança duplicada ou agendamento não criado após pagamento.
**Como funcionava antes:** Confirmações do Asaas podiam processar mais de uma vez.
**O que mudou:** Proteção contra duplicidade, sincronização pagamento-agendamento-cupom.
**Como funciona agora:** Cada pagamento confirmado processa uma vez; efeitos colaterais consistentes.
**Benefício:** Integridade financeira e operacional.

**Usuário:** Checkout e confirmação mais confiáveis.
**Administrador:** Dados consistentes no painel.
**Financeiro:** Alto — protege receita diretamente.
**Risco:** Área crítica — testes obrigatórios em sandbox.

**Arquivos:** src/app/api/webhooks/asaas/route.ts, src/app/lib/process-payment-webhook.ts, src/app/lib/asaas-agendamento-payment-effects.ts, src/app/lib/asaas-plano-payment-effects.ts

**Testes recomendados:**
- [ ] Checkout sandbox → confirmação Asaas
- [ ] Reenviar mesma notificação (proteção contra duplicidade)
- [ ] Verificar agendamento e cupom pós-pagamento

### Adicionar arquivamento administrativo de pagamentos
**Status:** planejado · **Tipo:** Nova funcionalidade, Financeiro, Admin

**Problema anterior:** Recurso ainda não disponível em produção.
**Como funcionava antes:** Operação sem este recurso.
**O que mudou:** Implementar soft-delete admin em Payment com adminArchivedAt e adminArchivedReason.
**Como funciona agora:** Será implementado conforme design-plan e implementation-plan.
**Benefício:** Organização administrativa sem perder histórico.

**Usuário:** Planejado sem impacto em Minha Conta do cliente.
**Administrador:** Novas ações no painel após implementação.
**Financeiro:** Preserva histórico financeiro.
**Risco:** Crítico

**Arquivos:** src/app/lib/process-payment-webhook.ts, src/app/api/webhooks/asaas/route.ts, src/app/lib/asaas-agendamento-payment-effects.ts, src/app/lib/asaas-plano-payment-effects.ts, src/app/lib/asaas-agendamento-reconcile.ts …

**Testes recomendados:**
- [ ] Seguir implementation-plan após codificar
- [ ] Executar verificação automática antes do deploy

---

## Deploy — estamos prontos?

**Resposta:** Não

### O que falta?
- Motor de decisão BLOCKED — revisar alterações pendentes
- Grande volume de arquivos pendentes (173) — considerar deploy incremental
- Rodar 9 migration(s): npx prisma migrate deploy

### Riscos que permanecem
- Alterações extensas em áreas críticas (pagamentos, agendamentos, cupons)
- **Alto:** Motor de decisão bloqueou deploy — alterações pendentes extensas.
- **Médio:** Check **S4** (Resíduo legado TESTE_AGEND_/TESTE_PAY_): finding em 3/4 execuções (75%)
- **Médio:** Entidade **Coupon**: 3 menção(ões) em decisões/checks
- **Médio:** motor de decisão de deploy **BLOCKED** em 1/1 snapshot(s)
- **Médio:** Arquivo sensível: prisma/schema.prisma (1 citação(ões), risco CRITICAL)

### Migrations
- `prisma/migrations/20260504200000_add_foto_position/`
- `prisma/migrations/20260504213000_account_deletion_log/`
- `prisma/migrations/20260511231500_user_plan_admin_inactive/`
- `prisma/migrations/20260511234500_coupon_refund_tracking/`
- `prisma/migrations/20260512030000_appointment_refund_confirmation/`
- `prisma/migrations/20260512040000_user_plan_refund_tracking/`
- `prisma/migrations/20260604210000_user_plan_user_hidden/`
- `prisma/migrations/20260605120000_appointment_user_hidden/`
- `prisma/migrations/20260617120000_appointment_admin_archive/`

### Testes obrigatórios
- [ ] node --experimental-strip-types scripts/domain-guardian-runner.ts
- [ ] npm run build
- [ ] Login admin e cliente teste
- [ ] Checkout sandbox (se área financeira no deploy)
- [ ] Smoke test pós-migration
- [ ] Fazer login e acessar Minha Conta
- [ ] Verificar listagem de agendamentos, cupons e planos
- [ ] Acessar painel admin e verificar agendamentos, pagamentos e cupons
- [ ] Testar filtros e ações de arquivar/restaurar (se disponíveis)
- [ ] Conferir se pagamentos aprovados têm agendamento ou plano correspondente
- [ ] Verificar ausência de cobrança duplicada

---

## Melhorias

### Concluídas
- Proprietário e equipe enxergam evolução e riscos com clareza.

### Planejadas
- Adicionar arquivamento administrativo de pagamentos
- Finalizar migração de simulação (S4): vincular ou eliminar cupons legados TESTE_AGEND_/TESTE_PAY_ antes de remover helpers @legacy.
- Alta frequência de BLOCKED: adotar PRs menores (split-to-prs) e rodar change-analyzer antes de abrir PR.
- Divergência banco saudável vs diff CRITICAL: separar gate de dados (verificação automática) do gate de merge (motor de decisão de deploy).

---

## Para o proprietário

Fortalecimento do sistema de pagamentos e cupons; Arquivamento administrativo de agendamentos; Melhorias no fluxo de reembolso e cupons; Melhorias na área do cliente e segurança de acesso

---

## Limitações V1

- 'Último deploy' inferido pelo working tree Git — não há marcador de deploy em produção.
- Alterações já commitadas mas não deployadas aparecem como pendentes se o working tree estiver sujo.
- project-report.json buscado em reports/human/ e reports/domain-guardian/.
- Classificação de mudanças por heurística de caminhos e palavras-chave.
- Não substitui change-analyzer nem decision-engine para gate de merge.
- Timeline ordenada por tema, não por timestamp exato de cada alteração.

---
_Evolution Agent — somente leitura. Execute antes de cada deploy._