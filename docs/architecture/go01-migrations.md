# GO-01.1 — Migrations de produção (provider / providerPaymentId / Coupon.serviceId)

**Status:** Migration criada — **não aplicada** automaticamente nesta sprint.  
**Comando permitido em produção:** `npx prisma migrate deploy`  
**Proibido em produção / preview / homologação:** `prisma db push`

## Diff coberto

Migration: `prisma/migrations/20260718120000_go01_payment_provider_coupon_service`

| Coluna / índice | Modelo | Motivo |
|-----------------|--------|--------|
| `Payment.provider` | Payment | Identidade canônica do gateway (F9) |
| `Payment.providerPaymentId` (+ unique + indexes) | Payment | ID canônico; Simulation não usa `asaasId` |
| `Coupon.serviceId` (+ FK + index) | Coupon | Vínculo OP-02A no resgate |

Schema Prisma já declara esses campos; esta migration alinha bancos que ainda não os têm.

---

## Ordem correta (ambientes)

1. **Backup** do banco alvo (snapshot / dump restaurável).  
2. **Validar restore** em cópia (não só o dump).  
3. Aplicar em **homologação** (ou DB de staging equivalente):
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
4. Validação pós-migration (homologação) — ver secção abaixo.  
5. Aplicar em **preview** (mesmo comando).  
6. Validação pós-migration (preview).  
7. Aplicar em **produção** (mesmo comando; janela curta; rollback pronto).  
8. Validação pós-migration (produção).  
9. Smoke GO-02 (financeiro) somente após produção migrada.

Nunca inverter: produção antes de homologação/preview.

---

## Rollback

### Preferência

Restaurar o **backup pré-migration** (mais seguro que SQL reverso com dados novos).

### SQL reverso (somente se a migration acabou de aplicar e não há dados críticos em `providerPaymentId` / `Coupon.serviceId`)

```sql
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_serviceId_fkey";
DROP INDEX IF EXISTS "Coupon_serviceId_idx";
ALTER TABLE "Coupon" DROP COLUMN IF EXISTS "serviceId";

DROP INDEX IF EXISTS "Payment_providerPaymentId_idx";
DROP INDEX IF EXISTS "Payment_provider_idx";
DROP INDEX IF EXISTS "Payment_providerPaymentId_key";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "providerPaymentId";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "provider";
```

Depois: marcar migration como revertida no histórico Prisma **apenas** se o time seguir o processo oficial de `_prisma_migrations` (preferir restore).

**Atenção:** se já existirem pagamentos Simulation com apenas `providerPaymentId`, dropar a coluna quebra Homologation / lookups `paymentByProviderIdWhere`.

---

## Validação pós-migration

```sql
-- Colunas existem
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Payment' AND column_name IN ('provider', 'providerPaymentId');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'Coupon' AND column_name = 'serviceId';

-- Índices
SELECT indexname FROM pg_indexes
WHERE tablename = 'Payment' AND indexname LIKE '%provider%';
```

App:

```bash
npm run homologation:scenarios
npm run domain:audit
npm run regression:audit
```

Painel: `/admin/homologacao` → cenário `sessao` + `beat` PASS.

---

## Ambientes — checklist de sincronismo

| Ambiente | migrate deploy | generate | validação SQL | Homologation smoke |
|----------|----------------|----------|---------------|--------------------|
| Homologação | ☐ | ☐ | ☐ | ☐ |
| Preview | ☐ | ☐ | ☐ | ☐ |
| Produção | ☐ | ☐ | ☐ | ☐ |

---

## Notas

- Dual-write Asaas: `asaasId` + `providerPaymentId` até unificação v1.1.  
- Simulation grava só `provider=SIMULATION` + `providerPaymentId`.  
- Esta documentação é o runbook oficial GO-01.1; execução real fica para o operador no deploy (GO-03 / checklist de release).
