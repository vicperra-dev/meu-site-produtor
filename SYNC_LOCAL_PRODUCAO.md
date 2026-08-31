# Sincronização: local vs produção (Vercel)

## Como garantir que o código local está igual ao da produção

1. **Verificar status**
   ```bash
   git status
   git fetch origin
   git log -1 --oneline HEAD
   git log -1 --oneline origin/main
   ```
   - Se `Your branch is up to date with 'origin/main'` e **não** houver "Changes not staged" ou "Untracked" relevantes, o local está **igual** ao que a Vercel deploya (cada push em `main` vira deploy).

2. **O que a Vercel usa**
   - A Vercel faz deploy do branch **main** do repositório remoto (`origin`). Ou seja: produção = `origin/main`.

3. **Situação atual (quando este doc foi criado)**
   - **Commitado e em produção:** Tudo que já foi dado `git push origin main` (incluindo webhook, migration_lock, checkout agendamento, selects em Appointment, etc.).
   - **Só no seu PC (ainda não na produção):**
     - `src/app/lib/payment-providers.ts` — mensagem de erro 401 mais clara (onde configurar ASAAS_API_KEY em produção vs local).
     - `RELATORIO_E_ROADMAP_BETA.md` — relatório e roadmap (não afeta o site).
   - Ou seja: o **comportamento** do site em produção está igual ao do código já pushed. A única diferença é um texto de erro mais explicativo no checkout, se você ainda não tiver feito push dessas alterações.

4. **Deixar local = produção (recomendado antes de começar discografia)**
   - Opção A — Enviar as alterações para ficar tudo alinhado:
     ```bash
     git add src/app/lib/payment-providers.ts RELATORIO_E_ROADMAP_BETA.md
     git commit -m "docs: relatório/roadmap beta; mensagem erro Asaas mais clara"
     git push origin main
     ```
   - Opção B — Descartar a mudança no `payment-providers.ts` e manter só o relatório local:
     ```bash
     git restore src/app/lib/payment-providers.ts
     ```
   - Depois, sempre que for trabalhar em uma feature (ex.: discografia), use um branch ou trabalhe em main e dê push só quando testar localmente e quiser subir para produção.

5. **Resumo**
   - **Sim:** O que está na Vercel hoje é o último `push` de `main`. Se você não tem alterações locais não commitadas (ou só arquivos de doc/relatório), o código em produção está **atualizado** em relação a esse último push.
   - **Pequena diferença atual:** Só a mensagem de erro do Asaas e o arquivo de relatório; nada que mude fluxo de pagamento ou lógica. Fazer o passo 4 (Opção A) deixa local e produção 100% alinhados.
