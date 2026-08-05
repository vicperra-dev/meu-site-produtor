# BUG-001 — Consolidação do Motor de Calendário e Controle Operacional

**Status:** CONCLUÍDO (código + regressão local)  
**Data:** 2026-08-05  
**Prioridade:** P0  

---

## Causas raiz

### Deslocamento de datas
1. `new Date("YYYY-MM-DD")` = UTC midnight → modal/título no Controle Operacional mostrava o **dia anterior** em BRT.
2. `new Date(\`${data}T${hora}:00\`)` sem offset usava o fuso do runtime (UTC na Vercel).
3. Leitura via `toISOString().slice(0,10)` / `getHours()` misturava UTC e local.

### Ocupação incorreta
1. Admin e Usuário pintavam o mesmo estado de formas diferentes (dia cheio amarelo no admin / vermelho no público).
2. Produção fixava `22:00` sem cascata sucessiva de últimos livres.
3. `concluído` não tinha cor própria — misturava-se com ocupado/vermelho.
4. Cancelamento/recusa/pendente às vezes ainda apareciam como ocupação se a UI recalculasse fora do SSOT.

### Legenda incorreta
1. UI do usuário reutilizava a legenda Admin e renderizava só o campo `color` (Verde/Amarelo/…) com swatches incompletos → **todas as bolinhas verdes** com rótulos errados.
2. Usuário via rótulos de Serviço/Produção/Roxo/Azul — fora do contrato (Livre / Ocupado / Indisponível).

---

## Correções desta consolidação

| Área | Solução |
|------|---------|
| Fonte única | `calendar-time.ts` + `calendar-day-state.ts` |
| Admin dias | Verde / Amarelo (Serviço) / Roxo (Produção) / Meio-meio / Vermelho / **Azul = Concluído** |
| User dias | Verde Livre / Amarelo Ocupado / Vermelho Indisponível (sem roxo/azul) |
| Admin horários | Livre / Serviço / Produção / Ocupado / Concluído (azul) |
| User horários | Livre clicável / Ocupado amarelo não-clicável / Indisponível vermelho |
| Sync | Aceite ocupa; cancel/recusa liberam; concluído → azul admin; DomainSync refresh no Controle |
| Produções | Último horário livre sucessivo |
| API | `completed` em hourOccupancy; legendas admin/user |

## Confirmação de unificação

Todos os calendários (agendamento, cupom, admin Controle Operacional, homologação via mesmos helpers, API disponibilidade) consomem `computeCalendarDayStates` / `calendarDayCellStyle` / `toUserDayVisual`. Nenhuma tela recalcula ocupação independentemente.

## Arquivos alterados

- `src/app/lib/calendar-day-state.ts`
- `src/app/lib/calendar-time.ts` (já na base)
- `src/app/lib/ui/service-order-visual.ts`
- `src/app/api/agendamentos/disponibilidade/route.ts`
- `src/app/admin/controle-agendamento/page.tsx`
- `src/app/agendamento/components/SchedulingCalendar.tsx`
- `scripts/bug-001-calendar-smoke.ts`
- `reports/domain-guardian/bug-001/REPORT.md`

## Testes

| Teste | Resultado |
|-------|-----------|
| `scripts/bug-001-calendar-smoke.ts` | PASS |
| `scripts/go-h4-rules-smoke.ts` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

Cenários cobertos no smoke: 28/29/30/31 dias, virada de ano, aceite, cancel/recusa/pendente, produções múltiplas, dia cheio vermelho, dia concluído azul.

## Commit / Deploy

| Campo | Valor |
|-------|--------|
| Commit | `bcc463c` |
| Mensagem | `fix(calendar): unify operational calendar engine, status legend and occupancy synchronization` |
| Push `origin/main` | PASS |
| Deploy | PASS — `dpl_7hxpXgGNJHB8fomg26rMvuLCBvVu` |
| Alias produção | https://www.thouse-rec.com.br |
| typecheck / build / smoke | PASS |
