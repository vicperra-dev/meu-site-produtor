# GO-04 — Release Readiness

**Preview RC:** `pr03-clean` @ `f882047`  
**URL homologação:** https://meu-site-produtor-13-558l8y1zx-rauls-projects-6bf8a8b0.vercel.app

---

## Redeploy no `main` — correto?

**Não** para homologar a RC. O deploy `main` (`fd9ff6d`) é código antigo.

O deploy **`pr03-clean`** em `558l8y1zx` é o que importa.

---

## Status das pendências

| # | Item | Status |
|---|------|--------|
| 1 | Deployment Protection | ✅ RESOLVIDO |
| 2 | DATABASE_URL + migrations | ✅ RESOLVIDO |
| 3 | NEXT_PUBLIC_SITE_URL | ✅ RESOLVIDO |
| 4 | ASAAS_API_KEY sandbox | ✅ RESOLVIDO |
| 5 | ASAAS_WEBHOOK_ACCESS_TOKEN | ✅ RESOLVIDO |
| 6 | Webhook Asaas sandbox | 🟡 PARCIAL (auth OK; pagamento real pendente) |
| 7 | Smoke Test Preview | 🟡 PARCIAL (EX-01 10/10 PASS) |

---

## EX-01 no Preview RC — **PASS**

| Etapa | Resultado |
|-------|-----------|
| Home → Registro → Auto-login | ✅ |
| Minha Conta | ✅ |
| Carrinho → Checkout | ✅ |
| initPoint sandbox | ✅ `pay_ttwehvyfdf92wqu2` |

---

## Webhook

- Token configurado e **aceito** no deploy `558l8y1zx`
- URL no Asaas deve ser: `https://meu-site-produtor-13-558l8y1zx-rauls-projects-6bf8a8b0.vercel.app/api/webhooks/asaas`
- Confirme no painel Asaas que a URL aponta para **`558l8y1zx`** (não `f4zevxgo3`)

---

## Próximo passo opcional (antes do merge)

1. Abrir o `initPoint` sandbox e pagar com cartão de teste
2. Verificar no Asaas → Webhooks → **HTTP 200**
3. Verificar agendamento em Minha Conta

---

## Segurança

O token do webhook foi exposto no chat — **rotacione** no Asaas + Vercel após homologação.

---

**Release Candidate pronta para merge em main.**
