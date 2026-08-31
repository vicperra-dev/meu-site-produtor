# Code Health — THouse

**Gerado em:** 2026-07-05T22:12:48.869Z
**Code Health Score:** 34/100 · **Grade E** · Tendência: **estável**

---

## Resumo Executivo

O THouse tem Code Health Score 34/100 (grade E). Dívida técnica crítico (100/100). 210 arquivos, 46.308 linhas, 101 APIs. Módulos mais saudáveis: Webhook, Guardian. Módulos críticos: Financeiro, Appointment. Tendência geral: estável. Guardian: HEALTHY. Congelar Financeiro/Webhook até estabilização; Guardian e Infraestrutura podem evoluir.

| Métrica | Valor |
|---------|-------|
| Code Health Score | 34/100 (E) |
| Dívida técnica | 100/100 (Crítico) |
| Arquivos | 210 |
| Linhas | 46.308 |
| APIs | 101 |
| Entidades | 7 |
| Tendência | estável |

---

## Notas por Dimensão (0–100)

| Dimensão | Nota | Barra |
|----------|------|-------|
| Arquitetura | 100 | ██████████ |
| Qualidade | 8 | █░░░░░░░░░ |
| Organização | 30 | ███░░░░░░░ |
| Modularização | 0 | ░░░░░░░░░░ |
| Acoplamento | 96 | ██████████ |
| Legibilidade | 0 | ░░░░░░░░░░ |
| Escalabilidade | 98 | ██████████ |
| Manutenibilidade | 0 | ░░░░░░░░░░ |

---

## Heatmap por Módulo

| Módulo | Health | Grade | Arquivos | Linhas | Dívida | Dup. | Recomendação |
|--------|--------|-------|----------|--------|--------|------|--------------|
| Financeiro | 5 █░░░░░░░░░ | E | 43 | 4.182 | 100 | 17 | congelar |
| Appointment | 5 █░░░░░░░░░ | E | 25 | 6.524 | 100 | 16 | congelar |
| Coupon | 62 ██████░░░░ | D | 12 | 515 | 34 | 1 | monitorar |
| Minha Conta | 30 ███░░░░░░░ | E | 6 | 3.962 | 61 | 2 | refatorar |
| Webhook | 97 ██████████ | A+ | 3 | 1.307 | 1 | 5 | monitorar |
| Admin | 22 ██░░░░░░░░ | E | 19 | 8.068 | 81 | 1 | refatorar |
| Guardian | 95 ██████████ | A+ | 0 | 0 | 0 | 0 | evoluir |
| Scripts | 36 ████░░░░░░ | E | 15 | 1.131 | 52 | 6 | refatorar |
| Infraestrutura | 5 █░░░░░░░░░ | E | 30 | 9.817 | 100 | 25 | refatorar |

---

## Ranking — Top Módulos Saudáveis

1. **Webhook** — 97/100 (A+)
2. **Guardian** — 95/100 (A+)
3. **Coupon** — 62/100 (D)
4. **Scripts** — 36/100 (E)
5. **Minha Conta** — 30/100 (E)
6. **Admin** — 22/100 (E)
7. **Financeiro** — 5/100 (E)
8. **Appointment** — 5/100 (E)
9. **Infraestrutura** — 5/100 (E)

## Ranking — Top Módulos Críticos

1. **Financeiro** — 5/100 (E) — Domínio crítico — congelar até Sprint 1 de estabilização concluir
2. **Appointment** — 5/100 (E) — Domínio crítico — congelar até Sprint 1 de estabilização concluir
3. **Infraestrutura** — 5/100 (E) — Health score baixo e dívida técnica elevada
4. **Admin** — 22/100 (E) — Health score baixo e dívida técnica elevada
5. **Minha Conta** — 30/100 (E) — Health score baixo e dívida técnica elevada
6. **Scripts** — 36/100 (E) — Health score baixo e dívida técnica elevada
7. **Coupon** — 62/100 (D) — Estável — evoluir com cautela e Guardian
8. **Guardian** — 95/100 (A+) — Saúde adequada para novas funcionalidades de baixo risco
9. **Webhook** — 97/100 (A+) — Estável — evoluir com cautela e Guardian

---

## Diagnóstico Estratégico

- **Mais evoluído:** — — Sem histórico anterior
- **Mais crítico:** Financeiro — Domínio crítico — congelar até Sprint 1 de estabilização concluir
- **Merece refatoração:** Minha Conta, Admin, Scripts, Infraestrutura
- **Merece congelamento:** Financeiro, Appointment
- **Pode receber features:** Guardian

---

## Roadmap

### Curto prazo
- [ ] Baseline code-health registrado
- [ ] Quick wins do refactor-report (imports mortos, legacy documentado)
- [ ] Monitorar módulos Financeiro e Appointment sem alterar regras

### Médio prazo
- [ ] Dividir agendamento/page.tsx e minha-conta/page.tsx
- [ ] Centralizar queries Prisma duplicadas
- [ ] Extrair hooks useUnread* compartilhados

### Longo prazo
- [ ] Repository layer para Payment e Appointment
- [ ] Reduzir dívida técnica abaixo de 60/100
- [ ] Alcançar Code Health Score B (80+) pós-deploy produção

---

## Timeline

| Data | Score | Grade | Dívida |
|------|-------|-------|--------|
| 2026-07-05 | 34 | E | 100 |

Guardian (4 runs): **estável**

---

## Recomendações

- Executar code-health-agent.ts após cada sprint para medir evolução
- Manter Guardian HEALTHY antes de refatorar domínios Financeiro/Webhook
- Priorizar divisão de arquivos monolíticos (21 arquivos > 500 linhas)
- Coupon e Minha Conta têm health intermediário — refatorar após estabilização
- Guardian e Infraestrutura são candidatos seguros para novos agentes e tooling
- Decision BLOCKED — não misturar refatoração com deploy pendente

---

## Limitações V1

- Depende de refactor-report.json — executar refactor-agent.ts antes
- Tendências por módulo requerem execuções anteriores de code-health-agent.ts
- memory.json usado apenas para tendência Guardian, não métricas de código
- Health score é heurístico — não mede bugs ou cobertura de testes
- Módulos podem sobrepor arquivos (ex.: Webhook ⊂ Financeiro)
- Primeira execução registra baseline; comparativos a partir da segunda

---
_Code Health Agent — somente análise. Nenhum código foi alterado._