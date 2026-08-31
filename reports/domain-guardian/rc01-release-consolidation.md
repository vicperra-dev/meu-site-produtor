# RC-01 — Consolidação da Release Candidate

**Modo:** EXECUÇÃO CONTROLADA · **Branch:** `pr03-clean` @ `106ac39` · **Data:** 2026-07-10

---

## Veredito

# Release Candidate — PRONTA

**Pode iniciar PV-01.**

---

## Launch Confidence Score

| | % |
|---|---|
| Antes (pós EX-02) | 86% |
| Depois (RC consolidada) | **88%** |

---

## 1. Alterações no working tree (homologação)?

**Sim** — antes da RC:

- `src/app/api/webhooks/asaas/route.ts` — fix EX-02 (não commitado)
- Scripts `ex01-*` / `ex02-*` — untracked
- Reports EX/ENV — untracked

---

## 2. Código corrigido não commitado?

**Sim** — o fix do webhook estava apenas no working tree. **Agora commitado.**

---

## 3. Commits criados (somente homologação)

| SHA | Mensagem | Origem |
|-----|----------|--------|
| `db4e91a` | `fix(webhook): prioritize carrinho handler before agendamento description match` | EX-02 |
| `ddda5a8` | `chore(homologation): add EX-01 and EX-02 sandbox validation scripts` | Operacional |
| `106ac39` | `docs(homologation): add EX-00 through EX-02 sandbox execution reports` | Evidências |

---

## Excluído da RC (intencional)

| Arquivo | Motivo |
|---------|--------|
| `src/app/carrinho/page.tsx` | GL-01 B2 planos — fora escopo homologação MVP |
| `src/app/pagamentos/page.tsx` | GL-01 B2 query string — fora escopo |

**Não inclui PR-04+.** Mantidos unstaged.

---

## Build

```
npx prisma generate  → OK
npm run build        → OK (exit 0, ~95s compile)
TypeScript           → pass
```

> Nota: primeiro `prisma generate` falhou com EPERM (dev server bloqueando DLL); resolvido parando processos `node`.

---

## Validações

| Check | Status |
|-------|--------|
| Build verde | Sim |
| Sem conflitos | Sim |
| Arquivos obrigatórios RC pendentes | Não |

---

## Base homologada

- EX-00 APROVADO · EX-01 APROVADO · EX-02 APROVADO · ENV-01 APROVADO

---

## Próximo passo

**PV-01** — deploy Preview Vercel + homologação F2 (sandbox + HTTPS + webhook público).
