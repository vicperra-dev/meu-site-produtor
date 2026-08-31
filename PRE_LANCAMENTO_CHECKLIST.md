# Checklist Pré-Lançamento – Ações Manuais

As alterações de segurança foram implementadas. Para concluir o lançamento, você precisa configurar o seguinte:

## 1. Variáveis de ambiente (Vercel / produção)

Configure no painel da Vercel (ou outro host) **antes** do deploy:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `CRON_SECRET` | ✅ Produção | Chave para proteger os cron jobs. Gere um valor aleatório longo (ex: `openssl rand -hex 32`). Use no header: `Authorization: Bearer SEU_CRON_SECRET` |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | ✅ Produção | Token configurado no Asaas (Integrações > Webhooks). O mesmo valor configurado no painel do Asaas deve ser colocado aqui. |
| `PAYMENT_PROCESS_SECRET` | Opcional | Se usar processar-direto via script/automation, defina uma chave e envie no body como `secretKey`. |

## 2. Configurar webhook no Asaas

1. Acesse **Asaas** → **Integrações** → **Webhooks**
2. Adicione a URL do seu site: `https://seu-dominio.com/api/webhooks/asaas`
3. **Importante:** Defina um **Token de autenticação** no painel
4. Copie esse token e configure em `ASAAS_WEBHOOK_ACCESS_TOKEN` nas variáveis de ambiente da Vercel

## 3. Cron jobs (Vercel Cron ou externo)

Se usar Vercel Cron ou outro serviço para chamar:

- `GET /api/cron/limpar-chats-antigos`
- `GET /api/cron/renovar-planos`

Configure o header: `Authorization: Bearer SEU_CRON_SECRET`

## 4. Página de teste de email

A rota `/api/test-email` e a página **Testar Email** agora exigem **login como admin**. Para testar o envio de emails, faça login com uma conta de administrador antes de usar o botão.

## 5. Rotas de debug

Todas as rotas em `/api/debug/*` e `processar-direto` exigem **login como admin**. Use-as normalmente após fazer login com conta de administrador.
