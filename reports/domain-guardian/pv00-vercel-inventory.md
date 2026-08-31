# PV-00 — Inventário do Projeto Vercel

**Modo:** READ ONLY · **Branch RC:** `pr03-clean` @ `bfc5c38` · **Data:** 2026-07-11

**Nenhum deploy. Nenhuma alteração de env. Nenhum commit.**

---

## Limitação desta execução

Vercel CLI (`vercel`) e GitHub CLI (`gh`) **não estão disponíveis/autenticados** neste ambiente. O inventário combina **git + documentação do projeto**. Campos do painel Vercel estão marcados como **não verificáveis remotamente** — confirmar manualmente em [vercel.com](https://vercel.com).

---

## 1. Projeto Vercel

| Campo | Valor |
|-------|--------|
| **Nome** | `meu-site-produtor` (inferido) |
| **Framework** | **Next.js 16.1.6** |
| **Repositório** | `https://github.com/rvits/meu-site-produtor.git` |

---

## 2. Branch de Produção

**`main`**

Evidência: `origin/HEAD -> origin/main`

| Campo | Valor |
|-------|--------|
| Hash remoto | `fd9ff6d` |
| Data | 2026-05-04 |
| Mensagem | hardening completo sistema: cupons, webhook, idempotência… |

---

## 3. Preview Deployments

**Não verificável remotamente**

Presunção: **SIM** (padrão Vercel+GitHub) — confirmar em Settings → Git.

> `pr03-clean` **não existe em `origin`** ainda — preview exige push da RC.

---

## 4. Último Deploy (inferido)

| Campo | Valor |
|-------|--------|
| Hash | `fd9ff6d` (se auto-deploy de `main`) |
| Data | 2026-05-04 |
| Branch | `main` |
| URL | Não verificável |

---

## 5. Production URL

**Não verificável remotamente**

Candidatos documentados no código:

- `https://thouse-rec.com.br` (comentário legado Mercado Pago)
- `https://{projeto}.vercel.app` (padrão Vercel)

---

## 6. Variáveis por ambiente (somente nomes)

### Development (local)

`DATABASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_ACCESS_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `ASAAS_SKIP_TLS_VERIFY`, `SUPPORT_EMAIL`, `SUPPORT_EMAIL_PASSWORD`, `SUPPORT_DEST_EMAIL`, `MERCADOPAGO_ACCESS_TOKEN`, `MP_INTEGRATOR_ID`

### Preview (esperado PV-01)

`DATABASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_ACCESS_TOKEN`, `NEXT_PUBLIC_SITE_URL`

### Production (esperado)

`DATABASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_ACCESS_TOKEN`, `NEXT_PUBLIC_SITE_URL`

---

## 7. DATABASE_URL

| Ambiente | Classificação |
|----------|---------------|
| Local (atual) | **LOCAL** |
| Vercel Preview | Não verificável — esperado **Staging** |
| Vercel Production | Não verificável — esperado **Produção** |

---

## 8. ASAAS_API_KEY

| Ambiente | Classificação |
|----------|---------------|
| Development (local) | **SANDBOX** |
| Preview (Vercel) | Não verificável — esperado **Sandbox** |
| Production (Vercel) | Não verificável — esperado **Produção** |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` local | **Ausente** |

---

## 9. RC vs branch publicada

| | RC (`pr03-clean`) | Publicada (`origin/main`) |
|---|-------------------|---------------------------|
| **Hash** | `bfc5c38` | `fd9ff6d` |
| **No remote** | Não (só local) | Sim |
| **Commits à frente** | **~29** | — |

Inclui: pipeline PR-01/02/03, fix webhook carrinho (`db4e91a`), homologação EX, GL-01 auto-login.

---

## 10. Melhor estratégia

# A) Deploy Preview da Release Candidate

**Justificativa:**

1. HL-01 exige **Fase F2 (Preview)** antes de produção
2. **29 commits** de divergência — merge direto em `main` é alto risco
3. RC **não está no GitHub** — preview começa com push controlado
4. F2 valida **HTTPS + webhook público** Asaas sandbox sem tocar produção
5. EX-01/EX-02 foram só em **localhost** — Preview é o próximo gate
6. Fix webhook crítico (`db4e91a`) **ausente** em `fd9ff6d`

**Não recomendado:** **B) Merge direto em produção** — pula homologação F2.

---

## Próximo passo (PV-01)

1. `git push -u origin pr03-clean`
2. Configurar envs **Preview** no Vercel
3. Webhook Asaas sandbox → `https://{preview}.vercel.app/api/webhooks/asaas`
4. Homologação F2

---

**Parado após geração dos relatórios.**

Artefatos: `pv00-vercel-inventory.json`, `pv00-vercel-inventory.md`
