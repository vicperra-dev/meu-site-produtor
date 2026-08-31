# Como rodar as migrations no banco Neon

As migrations **não** rodam na tela "Connect Project". Elas rodam no seu computador, no terminal.

## No PowerShell (pasta do projeto)

1. Abra o PowerShell e vá até a pasta do projeto:
   ```powershell
   cd C:\Users\raulv\Documents\projetos\meu-site-produtor
   ```

2. Defina a URL do Neon (copie do painel Neon ou da variável no Vercel):
   ```powershell
   $env:DATABASE_URL="sua_url_neon_aqui"
   ```

3. Rode as migrations:
   ```powershell
   npx prisma migrate deploy
   ```

4. Se aparecer "No pending migrations" ou "X migration(s) applied", está certo.

**Se os cupons sumiram no admin ou der erro "Coupon.paymentId does not exist":**  
A migration `20260314000000_add_coupon_payment_and_assigned_user` adiciona as colunas `paymentId` e `assignedUserId` na tabela de cupons. Rode `npx prisma migrate deploy` com a `DATABASE_URL` do banco de **produção** (Neon) para aplicar.

**Importante:** Não commite essa URL no código. Use só no terminal e apague o histórico se precisar.
