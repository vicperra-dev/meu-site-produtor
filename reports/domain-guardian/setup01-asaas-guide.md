# SETUP-01 — Guia de Configuração do Sandbox Asaas

**Modo:** READ ONLY · **Branch:** `pr03-clean` @ `3f20ad0` · **Data:** 2026-07-10

---

## Objetivo

Guia operacional passo a passo para configurar o ambiente **Sandbox Asaas** no desenvolvimento local, preparando a retomada do **EX-01**.

**Nenhum código alterado. Nenhum commit criado.**

---

## 1. Criar ou acessar conta Sandbox

1. Abra o navegador (modo anônimo recomendado).
2. Acesse **[sandbox.asaas.com](https://sandbox.asaas.com)** — **não** use `www.asaas.com`.
3. **Já tem conta:** faça login com e-mail/senha de teste.
4. **Não tem conta:** cadastre-se no ambiente sandbox.
5. Confirme que a URL é `sandbox.asaas.com` e que os dados são de teste.

| Validar | Resultado esperado |
|---------|-------------------|
| Login no painel | Dashboard sandbox visível |

**Erro comum:** logar em produção (`www.asaas.com`) e copiar chave errada.

---

## 2. Localizar `ASAAS_API_KEY`

1. Painel **sandbox.asaas.com**
2. Menu → **Integrações** (ou Configurações → Integrações)
3. **API** / **Chave de API**
4. Copie o token de acesso

| Campo | Formato |
|-------|---------|
| Variável | `ASAAS_API_KEY` |
| Sandbox | `$aact_<token_longo>` (**sem** `prod`) |
| Produção (não usar) | `$aact_prod_<token>` |
| API resolvida | `https://sandbox.asaas.com/api/v3` |

Cole em **`.env.local`** (nunca commitar).

---

## 3. Localizar `ASAAS_WEBHOOK_ACCESS_TOKEN`

1. Painel **sandbox.asaas.com** → **Integrações** → **Webhooks**
2. Ao criar/editar webhook, defina o **Token de autenticação**
3. Você escolhe o valor (string secreta longa)
4. Copie o **mesmo valor** para `.env.local`

| Campo | Formato |
|-------|---------|
| Variável | `ASAAS_WEBHOOK_ACCESS_TOKEN` |
| Header HTTP | `asaas-access-token` |
| Regra | Valor **idêntico** no painel e no `.env.local` |

---

## 4. Criar Webhook

1. **Integrações** → **Webhooks** → **Adicionar**
2. **URL:** `{NEXT_PUBLIC_SITE_URL}/api/webhooks/asaas` (ver seção 6)
3. **Token:** mesmo de `ASAAS_WEBHOOK_ACCESS_TOKEN`
4. **Eventos mínimos:**

| Solicitado | Nome no painel Asaas | Uso no código |
|------------|---------------------|---------------|
| RECEIVED | `PAYMENT_RECEIVED` | Processa pagamento (status `RECEIVED`) |
| CONFIRMED | `PAYMENT_CONFIRMED` ou status `CONFIRMED` em `PAYMENT_RECEIVED` | Também processado |
| REFUNDED | `PAYMENT_REFUNDED` | Sincroniza estorno |

> Marque no mínimo **`PAYMENT_RECEIVED`** e **`PAYMENT_REFUNDED`**. Inclua **`PAYMENT_CONFIRMED`** se o painel listar separadamente.

5. Salve e confirme status **Ativo**.

---

## 5. Configurar `.env.local`

Apenas **nomes e formato** — substitua pelos valores reais do painel:

```env
ASAAS_API_KEY=$aact_<sua_chave_sandbox>
ASAAS_WEBHOOK_ACCESS_TOKEN=<token_definido_no_painel_webhook>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/thouse_rec?schema=public
```

Opcional em dev:

```env
ASAAS_SKIP_TLS_VERIFY=true
```

| Variável | Origem |
|----------|--------|
| `ASAAS_API_KEY` | Painel sandbox → Integrações → API |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Painel sandbox → Webhooks |
| `NEXT_PUBLIC_SITE_URL` | Local (ou URL do túnel) |
| `DATABASE_URL` | PostgreSQL local (não vem do Asaas) |

**Antes de salvar:** remova qualquer `ASAAS_API_KEY` com prefixo `$aact_prod_`.

---

## 6. localhost vs túnel

### Usar `localhost` (`http://localhost:3000`)

**Quando:**

- EX-01 smoke até checkout (**antes** do pagamento)
- Desenvolvimento diário (UI, registro, carrinho, initPoint sandbox)

**Limitação:** Asaas **não** alcança `localhost` — webhook automático não funciona. Use replay `curl` (OPS-01) se precisar simular webhook depois.

### Usar túnel (ngrok / localtunnel / cloudflared)

**Quando:**

- Testar webhook automático `PAYMENT_RECEIVED`
- Homologação completa com pagamento sandbox + banco

**Configuração:**

```env
NEXT_PUBLIC_SITE_URL=https://<seu-subdominio-tunel>
```

Webhook no painel:

```
https://<seu-subdominio-tunel>/api/webhooks/asaas
```

**Cuidados:** URL do túnel muda (exceto ngrok pago); atualizar painel e env; manter `npm run dev` rodando.

### Recomendação EX-01

**`localhost`** — túnel só na fase com pagamento real sandbox.

---

## 7. Validar configuração

Após salvar `.env.local`:

1. Parar Next.js se rodando (**Ctrl+C**)
2. Opcional: `npx prisma migrate deploy`

Execute na ordem:

```powershell
cd c:\Users\raulv\Documents\projetos\meu-site-produtor

node scripts/ex01-check-env.js
```

| Esperado |
|----------|
| `DATABASE_URL: OK ... provider=local` |
| `ASAAS_API_KEY: OK ... type=sandbox` |
| `ASAAS_WEBHOOK_ACCESS_TOKEN: OK set len=N` |
| `NEXT_PUBLIC_SITE_URL: OK` |

```powershell
node scripts/ex01-asaas-verify.js
```

| Esperado |
|----------|
| `environment: SANDBOX` |
| `sandboxOk: true` |
| Exit code **0** |

```powershell
node scripts/ex01-db-ping.js
```

| Esperado |
|----------|
| `DATABASE_CONNECT: OK` |

**Comando único (PowerShell):**

```powershell
node scripts/ex01-check-env.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node scripts/ex01-asaas-verify.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node scripts/ex01-db-ping.js
```

Depois: `npm run dev` → abrir `http://localhost:3000`.

---

## 8. Voltar para produção sem misturar chaves

| Regra | Detalhe |
|-------|---------|
| Separar ambientes | Sandbox em `.env.local` local; produção no **Vercel** |
| Identificar pelo prefixo | `$aact_prod_` = produção · `$aact_` sem prod = sandbox |
| Nunca | Manter chave prod ativa em `.env.local` durante testes |
| Vercel Production | `ASAAS_API_KEY` prod + `ASAAS_WEBHOOK_ACCESS_TOKEN` do painel **www.asaas.com** |
| Antes de deploy | Confirmar que preview/prod no Vercel não usa chaves sandbox |
| Se expôs chave | Rotacionar no painel Asaas |

**Checklist ao sair do sandbox:**

1. Parar `npm run dev`
2. Remover/comentar variáveis Asaas sandbox de `.env.local`
3. Confirmar envs de produção no Vercel
4. Não rodar `ex01-asaas-verify.js` esperando sandbox — ambiente mudou

---

## Checklist de Configuração

| □ | Item | Validar | Esperado |
|---|------|---------|----------|
| □ | **Conta Sandbox** | Login sandbox.asaas.com | Conta ativa |
| □ | **API Key** | `ex01-check-env.js` | `type=sandbox` |
| □ | **Webhook** | Painel Asaas | Status Ativo |
| □ | **Token** | `ex01-check-env.js` | WEBHOOK OK |
| □ | **.env.local** | Arquivo salvo | Sem `$aact_prod_` |
| □ | **Restart** | `npm run dev` | Home carrega |
| □ | **Scripts** | 3 scripts ex01-* | Todos exit 0 |
| □ | **Smoke Test** | Browser manual | `initPoint` → `sandbox.asaas.com` |

---

## Próximo passo: EX-01

Após checklist completo, retome o **EX-01** a partir da **etapa 3**:

```powershell
node scripts/ex01-check-env.js
node scripts/ex01-asaas-verify.js
node scripts/ex01-db-ping.js
npm run dev
```

### Se tudo estiver correto

| Etapa | O que acontece |
|-------|----------------|
| 3 | ASAAS Sandbox **PASS** (`sandboxOk: true`) |
| 6 | App sobe em `http://localhost:3000` |
| 7 | Smoke: Registro → Login → Minha Conta → Agendamento → Carrinho → Checkout (**sem pagar**) |
| 7 | `POST /api/asaas/checkout-carrinho` **200** com `initPoint` contendo `sandbox.asaas.com` |
| 8 | Evidências registradas |
| **Veredito** | **EX-01 F1 Sandbox — APROVADA** |

### Se algo falhar

Parar na etapa com erro, registrar causa e correção → veredito **REPROVADA**.

---

**Parado após geração dos relatórios (READ ONLY).**

Artefatos:

- `reports/domain-guardian/setup01-asaas-guide.json`
- `reports/domain-guardian/setup01-asaas-guide.md`
