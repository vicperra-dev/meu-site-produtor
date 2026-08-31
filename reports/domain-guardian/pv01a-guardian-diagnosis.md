# PV-01a — Diagnóstico do Domain Guardian

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `bfc5c38` · **Data:** 2026-07-11

**Nenhuma alteração de código, commits ou workflows.**

---

## Resumo executivo

O workflow **Governança de domínio** falhou com **exit code 9** por **incompatibilidade de runtime**: o CI usa **Node 20**, mas todos os scripts são invocados com `--experimental-strip-types`, flag **inexistente no Node 20**. O Node aborta com código **9 (Invalid Argument)** antes de executar o script.

O **Preview Deployment da Vercel** é um pipeline **independente** e **não foi afetado**.

---

## 1. Qual comando retornou exit 9?

| Campo | Valor |
|-------|--------|
| **Step** | `4. Domain Decision Engine (gate)` |
| **Comando** | `node --experimental-strip-types scripts/domain-decision-engine.ts` |
| **Arquivo** | `.github/workflows/domain-guardian.yml` (linha ~52) |

É o **primeiro passo** que roda `node --experimental-strip-types` **sem** `|| true`. Os passos 1–3 usam `|| true` e mascaram o mesmo erro; `npm ci` e `prisma generate` não usam essa flag.

---

## 2. Exit 9 significa erro real ou gate proposital?

**Erro real de infraestrutura** — **não** é o gate de domínio.

| Código | Origem | Significado |
|--------|--------|-------------|
| **9** | Runtime **Node.js** | **Invalid Argument** — opção CLI desconhecida (`--experimental-strip-types` no Node 20) |
| **1** | `domain-decision-engine.ts` | **BLOCKED** — gate intencional (documentado no script) |
| **0** | `domain-decision-engine.ts` | **APPROVED** ou **REVIEW_REQUIRED** |

O Decision Engine **nunca** emite exit 9. O gate proposital usa **exit 1**.

---

## 3. O deploy da aplicação foi afetado?

**NÃO**

- Vercel: build/deploy próprio (`prisma generate && next build`)
- GitHub Actions Domain Guardian: auditoria paralela, sem acoplamento ao deploy
- Preview concluído com sucesso confirma que a RC compila e publica normalmente

---

## 4. Esse erro bloqueia Produção ou apenas Governança?

**Apenas Governança**

- Não impede Preview nem Production Deploy na Vercel por si só
- Só bloqueia merge se **Domain Guardian** estiver configurado como *required check* em branch protection (configuração do repositório, não verificada aqui)
- Não altera runtime da aplicação em produção

---

## 5. Menor correção

**P0 — uma linha no workflow:**

```yaml
# .github/workflows/domain-guardian.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "22"   # era "20"
    cache: npm
```

Node **22.18+** ou **24+** suportam type stripping nativo usado pelos scripts.

**P1 — após corrigir Node**, o passo 5 falhará até existir o script referenciado:

- Workflow chama `scripts/domain-architecture-planner.ts`
- Arquivo **ausente** em `origin/pr03-clean` (nunca commitado)
- Correção: commitar o script **ou** adicionar `|| true` no passo 5 **ou** remover o passo (planner é orientação, não gate)

---

## Mapa do pipeline

```
npm ci / prisma generate          → OK (sem --experimental-strip-types)
Step 1–3 (runner, analyzer, review) → exit 9 mascarado por || true
Step 4 (decision-engine)          → exit 9 → JOB FALHA  ← observado
Step 5 (architecture-planner)     → não alcançado
upload-artifact (if: always)      → pode rodar mesmo com falha
```

---

## Veredito

**DIAGNOSTICADO** — Falha de CI por **Node 20 + flag TypeScript incompatível**, não por regressão de domínio na RC. Preview Vercel válido.

**LCS:** 88 (inalterado — problema isolado ao workflow de governança)
