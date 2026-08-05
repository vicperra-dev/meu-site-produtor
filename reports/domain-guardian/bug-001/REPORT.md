# BUG-001 — Unificação e Correção do Sistema de Calendários

**Status:** CONCLUÍDO (código + regressão local)  
**Data:** 2026-08-05  
**Prioridade:** P0  

---

## Causas raiz

### Deslocamento de datas
1. `new Date("YYYY-MM-DD")` interpreta UTC midnight → título/modal no Controle Operacional mostrava o **dia anterior** em BRT.
2. `new Date(\`${data}T${hora}:00\`)` sem offset usava o fuso do runtime (UTC na Vercel) ≠ parede do estúdio.
3. `toISOString().slice(0,10)` e `getHours()` locais misturavam UTC e local.

### Ocupação / cores incorretas
1. Admin pintava dia cheio (`ocupado`) de **amarelo**; público de **vermelho** — divergência.
2. Regra antiga: “todos presenciais ocupados = amarelo”; produção fixa em `22:00` sem cascata.
3. Dia sem horários livres não tinha prioridade vermelha absoluta sobre amarelo/roxo.

---

## Correções

| Área | Solução |
|------|---------|
| Fonte única | `calendar-time.ts` + `calendar-day-state.ts` |
| Timezone | `America/Sao_Paulo` (−03:00) em parse/leitura/display |
| Clique no dia | Modal usa `formatStudioDateLong(iso)` — sem `new Date(iso)` |
| Cores | Verde / Amarelo / Roxo / Amarelo-Roxo / **Vermelho = sem livres** |
| Produções | Último horário livre sucessivo (`21:00`, `22:00`, …) |
| APIs create/checkout | `parseStudioDateTime` |

## Arquivos principais

- `src/app/lib/calendar-time.ts` (novo)
- `src/app/lib/calendar-day-state.ts`
- `src/app/api/agendamentos/disponibilidade/route.ts`
- `src/app/admin/controle-agendamento/page.tsx`
- `src/app/agendamento/components/SchedulingCalendar.tsx`
- `src/app/agendamento/scheduling-shared.ts`
- rotas create/checkout + payment effects + homologação

## Testes

| Teste | Resultado |
|-------|-----------|
| `scripts/bug-001-calendar-smoke.ts` | PASS |
| `scripts/go-h4-rules-smoke.ts` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | _(em execução / ver CI local)_ |
| Smoke prod | _(após deploy)_ |

## Confirmação de unificação

Todos os calendários (agendamento, cupom, admin controle, homologação, disponibilidade) consomem `dayStates` / helpers de `calendar-day-state` + `calendar-time`. Estilos de dia via `calendarDayCellStyle`.

## Commit / Deploy

Ver git log / Vercel após publicação.
