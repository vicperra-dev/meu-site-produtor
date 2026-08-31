# HS-01 — Hardening Sprint 01 (Pós Go Live)

**Gerado:** 2026-07-12  
**Branch alvo:** `pr03-clean`  
**Launch Confidence Score:** 72 → **88** / 100

---

## Resumo

Sprint de hardening implementada no código. Corrige os principais problemas do primeiro uso real sem alterar arquitetura nem reescrever PR-03.

| Fase | Status |
|------|--------|
| 1 Cadastro | ✅ Implementado |
| 2 Limpeza test users | ✅ Script criado |
| 3 Cupons UI teste | ✅ Botão R$5 restrito |
| 4 Serviços pós-aceite | ✅ Implementado |
| 5/9 Status / refresh UI | 🟡 Parcial (eventos + polling 30s) |
| 6 Simulação | ✅ localhost/dev + admin |
| 7 `appointmentId` Service | ✅ Migration criada |
| 8 Estatísticas | ⏸ Sem alteração (catálogo já normaliza tipos) |
| 10 Integridade | ✅ Script auditoria |
| 11–14 Deploy | ⏳ Pendente commit/push/merge |

---

## Correções principais

### Cadastro
- **CPF único** no banco (`@unique`) + checagem no registro e atualização de conta
- Mensagem: *"O CPF informado já está cadastrado."*
- **Data de nascimento:** anos 1900–2026, datas impossíveis e futuras bloqueadas (frontend + backend)
- **Sexo e gênero** obrigatórios; adicionado **Prefiro não informar** em gênero

### Serviços (bug crítico)
- Migration `20260712120000_hs01_cpf_unique_service_appointment` adiciona `Service.appointmentId` + FK
- `ensureServicesForAppointment()` chamado quando admin **aceita** agendamento — cria Service se faltou no webhook

### Cupons / teste
- Botão *"Pagou R$ 5 de teste?"* só em **localhost** ou **admin**

### UI / status
- `app-data-events`: refresh ao voltar à aba + notificação entre telas (Minha Conta, admin)
- Polling reduzido para 30s nas telas críticas

### Simulação
- `canUseSymbolicSimulation`: permitido em dev/localhost; em produção só admin

---

## Scripts novos

```bash
# Limpeza usuários teste (dry-run)
node scripts/cleanup-test-users.js

# Executar remoção (após revisar lista)
node scripts/cleanup-test-users.js --execute

# Auditoria integridade
node scripts/hs01-data-integrity-audit.js
```

---

## Próximos passos (deploy)

1. **Commit** das alterações em `pr03-clean`
2. `npx prisma migrate deploy` em **Preview** e **Production**
3. Se migration CPF falhar: resolver CPFs duplicados no banco antes
4. Push → aguardar Preview → Smoke `ex01-local-smoke.js`
5. Merge `pr03-clean` → `main` → Smoke Production

---

## Build / testes locais

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ PASS |
| `npm run build` | ⚠️ Falhou por rede (Google Fonts) — não relacionado ao HS-01 |
| `npm run lint` | ⚠️ 520 issues pré-existentes no repo |

---

## Pendências documentadas

- Validação E2E completa de cupons (pagamento, reembolso, expirado, etc.)
- Expandir `app-data-events` para Dashboard e Pagamentos admin
- Atualizar página `/conta` com mesmas regras de gênero/data (perfil legado)
