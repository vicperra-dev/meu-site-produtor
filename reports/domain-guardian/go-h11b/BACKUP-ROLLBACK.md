# GO-H11B — Backup & Rollback Runbook

## Release candidata

| Campo | Valor |
|-------|-------|
| Versão | `v1.0.0-beta.1` |
| Branch | `main` |
| Commit (preencher pós-commit) | ver `RELEASE.md` |
| Schema alvo | Prisma migrations até `20260727020000_go_h10c_subscription_lifecycle` |

## Backup do banco (Neon)

### Opção A — Point-in-Time Recovery (recomendado)

1. Neon Console → projeto produção → **Branches / PITR**
2. Anotar timestamp **antes** de qualquer migration adicional: `BACKUP_PITR_AT`
3. Em rollback: criar branch a partir do timestamp e apontar `DATABASE_URL` temporariamente, ou restaurar conforme procedimento Neon.

### Opção B — `pg_dump` lógico

```bash
# Usar a DATABASE_URL de produção (.env.local / Vercel)
pg_dump "$DATABASE_URL" --format=custom --file="backups/neon-pre-beta-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Armazenar o dump fora do repositório (`backups/` está fora do git se criado localmente).

### Registro obrigatório pré-deploy

- [ ] Timestamp PITR / caminho do dump
- [ ] Versão schema (`prisma migrate status`)
- [ ] Hash do commit da release
- [ ] Responsável

## Rollback da aplicação (Vercel)

1. Vercel Dashboard → Project → Deployments
2. Localizar deployment **anterior** estável
3. **Promote to Production** / Instant Rollback
4. Alternativa CLI: `npx vercel rollback` (quando disponível na conta) ou redeploy do commit anterior:

```bash
git checkout <COMMIT_ANTERIOR_ESTAVEL>
npx vercel --prod --force
git checkout main
```

## Rollback do banco

1. **Se migrations H10B/C já estavam aplicadas e estáveis:** preferir só rollback de app.
2. **Se migration nova corromper dados:** restaurar via PITR Neon para `BACKUP_PITR_AT` **antes** de reapontar a app.
3. **Não** rodar `migrate reset` em produção.

## Comunicação de indisponibilidade

Se rollback exigir janela:

> Estamos realizando uma manutenção emergencial na plataforma. Pagamentos e agendamentos podem ficar temporariamente indisponíveis. Voltamos em breve.

Canais: banner `/manutencao` (`SiteSettings.maintenanceMode` ou `GO_LIVE_MAINTENANCE_MODE=1`) + aviso WhatsApp/Instagram se necessário.

## Teste controlado do rollback

Antes da abertura definitiva do Beta:

1. Em Preview Vercel, promover commit anterior e confirmar site sobe.
2. Confirmar que PITR/console Neon está acessível (não precisa restaurar prod se o botão/fluxo estiver validado).
