# GO-01.7 — Documentação operacional (passo a passo)

Índice de runbooks pós Architecture Freeze. Comandos não executam merge/push/deploy sozinhos.

Documentos relacionados:

- [Migrations](../architecture/go01-migrations.md)
- [Release Checklist](./go01-release-checklist.md)
- [Asaas Audit + checklist GO-02](./go01-asaas-release-audit.md)
- [Architecture Freeze](../architecture/architecture-freeze.md)
- [Homologation Engine](../architecture/homologation-engine.md)
- [Operations índice](../Operations.md)

---

## 1. Deploy

1. Confirmar Release Checklist seções A–D (ou equivalente preview).  
2. `git status` limpo; tag/commit RC conhecido.  
3. Build: `npm ci` → `npx prisma generate` → `npm run build`.  
4. Aplicar migrations no banco do ambiente: `npx prisma migrate deploy`.  
5. Publicar artefato (plataforma de hosting do projeto).  
6. Smoke mínimo: login admin, `/admin/homologacao`, uma página de agendamentos.  
7. Registrar URL + commit no checklist.

## 2. Rollback de aplicação

1. Identificar release anterior estável (tag/commit).  
2. Redeploy da versão anterior **sem** aplicar migrations novas se o schema novo já estiver no banco (app antigo deve tolerar colunas extras — `provider*` são nullable).  
3. Se a migration nova for incompatível com o app antigo: restaurar backup de banco **e** app juntos (ver Backup/Restore).  
4. Validar smoke.  
5. Registrar incidente.

## 3. Backup

1. Snapshot gerenciado do Postgres **ou** `pg_dump` com owner/roles necessários.  
2. Guardar artefato fora do servidor de app.  
3. Anotar: data, ambiente, tamanho, hash, retenção.  
4. Não considerar backup válido sem passo 4 (Restore).

## 4. Restore

1. Provisionar instância/cópia vazia (nunca restore cego em produção sem janela).  
2. Restaurar dump/snapshot.  
3. Apontar `DATABASE_URL` temporário da cópia.  
4. `npx prisma migrate status` (deve refletir histórico).  
5. Query smoke: `SELECT count(*) FROM "User";` + 1 Payment recente.  
6. Só então marcar “backup restaurável validado”.

## 5. Smoke (não-financeiro)

1. Admin login.  
2. `npm run homologation:scenarios` (CI/local).  
3. Painel Homologação: cenário `sessao` PASS.  
4. Abrir Minha Conta / Admin agendamentos / Estatísticas (carregam).  
5. Upload entrega admin (arquivo pequeno WAV/MP3) → path `/uploads/deliveries/…`.  

## 6. Migration

Seguir exclusivamente [go01-migrations.md](../architecture/go01-migrations.md).  
Resumo: backup → homolog → preview → produção → `migrate deploy` → validação SQL → audits.

## 7. Troca de gateway de pagamento

1. Novo provider implementa `PaymentProvider` (mesmo contrato que Asaas/Simulation).  
2. Dual-write / identity via `Payment.provider` + `providerPaymentId`.  
3. Lookups só por `paymentByProviderIdWhere`.  
4. Cenário Homologation obrigatório (H1).  
5. Não alterar State Machine / effects de domínio para “se for gateway X”.  
6. GO-02 smoke no novo gateway antes de Go Live.

## 8. Troca de PaymentProvider em runtime

1. Factory/config que escolhe Asaas vs Simulation (já existente no fluxo de homologação).  
2. Produção: Asaas. Homologação admin: Simulation.  
3. Trocar env/flags documentadas; restart app.  
4. Não usar Simulation em produção de clientes reais.

## 9. Troca de storage

1. Implementar backend real em `CloudStorageProvider` (hoje stub).  
2. Set `STORAGE_PROVIDER=cloud` apenas após implementação + smoke.  
3. Default permanece `local` (`LocalStorageProvider` → `public/uploads/deliveries`).  
4. Domínio continua recebendo apenas `deliveryAudioUrl` público; sem `fs` nas rotas.  
5. Migração de arquivos existentes = operação de infra (fora do domínio).

## 10. Troca de domínio (DNS / host)

1. Atualizar DNS + TLS.  
2. Atualizar URL pública / auth callbacks.  
3. Atualizar webhook Asaas para novo host.  
4. Smoke webhook (GO-02).  
5. Atualizar checklist F4.

## 11. Troca de ambiente (preview ↔ prod)

1. Secrets distintos (nunca copiar `ASAAS_API_KEY` prod → preview sem isolamento).  
2. `DATABASE_URL` distinto.  
3. Migrations alinhadas (`migrate deploy` em ambos).  
4. `STORAGE_PROVIDER=local` até cloud.  
5. Homologation runs em filesystem local (`reports/homologation/`) — não assumir compartilhamento entre ambientes.

## 12. Homologation Engine (operador)

1. Admin → `/admin/homologacao`.  
2. Escolher cenário oficial → Rodar.  
3. Checklist + timeline PASS.  
4. Refunds manuais APPROVED/PENDING/FAILED/TIMEOUT se necessário.  
5. Catálogo: `src/app/lib/homologation/scenarios.ts`.
