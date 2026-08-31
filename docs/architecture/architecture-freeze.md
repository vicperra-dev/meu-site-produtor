# Architecture Freeze — GO-01.8

**Declarado em:** 2026-07-18  
**Fase:** Release Readiness / Release Candidate Final  
**Base certificada:** OP-01, OP-02A, OP-02H, OP-02B, GO-00, GO-01

## Declaração

A arquitetura principal da THouse Rec está **oficialmente congelada** para o ciclo de Go Live.

## Proibido após este ponto

- Criar novos módulos ou domínios
- Alterar Appointment, Services, Coupons, Workflow, Payments, State Machine
- Alterar Homologation Engine (exceto adicionar cenário exigido por bugfix / cobertura H1 sem mudar regras de domínio)
- Refactors estruturais, otimizações “por limpeza”, UI estética
- Novas funcionalidades de produto

## Permitido

- Correções de bugs comprovados
- Ajustes de infraestrutura (env, hosting, secrets)
- Migrations Prisma necessárias ao schema já aprovado
- Documentação, checklists, smokes
- GO-02 Financial Smoke e execução de release checklist

## Se alteração estrutural for necessária

1. Interromper imediatamente o Go Live.  
2. Abrir novo ciclo de desenvolvimento.  
3. Reiniciar certificação (domínio + workflow + homologation + GO-00).

## Relação com H1

Cobertura Homologation permanece obrigatória para qualquer mudança futura permitida que toque pagamentos/workflow/agendamento/planos/cupons/reembolso — mas **durante o freeze** essas mudanças de produto não devem ocorrer.
