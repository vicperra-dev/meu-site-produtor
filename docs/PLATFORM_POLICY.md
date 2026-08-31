# PLATFORM_POLICY — Documento mestre interno (GO-H10D)

> **Não público.** Fonte oficial das regras de negócio da THouse Rec.  
> Toda documentação pública (Termos, FAQ, Chat, e-mails, UI) deve derivar deste arquivo.  
> **Última atualização:** Julho/2026 (GO-H10D1).

## Como usar

1. Alterar regra comercial → atualizar **primeiro** este arquivo e o código canônico.
2. Depois sincronizar Termos → FAQ/KB/Chat → e-mails → UI.
3. Números de preço e benefícios: editar no **código**; este doc espelha para humanos.

### Ponteiros canônicos (código)

| Tema | Arquivo |
|------|---------|
| Preços de serviços/beats | `src/app/lib/service-catalog.ts` → `CHECKOUT_CATALOG` |
| Planos, ciclos, Shopping, valores internos | `src/app/lib/plan-definitions.ts` → `PLAN_DEFINITIONS` |
| Estados de assinatura | `src/app/lib/subscription-states.ts` |
| Cálculo de reembolso de plano | `src/app/lib/subscription-refund.ts` |
| Renovação de benefícios | `src/app/lib/plan-benefit-renewal.ts` |
| Categorias de cupom | `src/app/lib/domain/coupon-category.ts` |

---

## 1. Pagamentos

- Processador oficial na comunicação e no fluxo principal: **Asaas**.
- Formas: PIX, cartão de crédito, cartão de débito e boleto, conforme oferta disponível no checkout.
- A THouse Rec não armazena dados sensíveis de cartão.
- **Não comunicar** Mercado Pago nem InfinityPay como processador oficial. Rotas HTTP legadas respondem **410 Gone** (GO-H11A); coluna `mercadopagoId` e adapters no código são legado interno apenas.

---

## 2. Preços oficiais (serviços e pacotes)

Espelho de `CHECKOUT_CATALOG` (BRL). Em caso de divergência, o código prevalece.

| ID | Nome | Preço |
|----|------|------:|
| sessao | Sessão | 40 / h |
| captacao | Captação | 55 / h |
| mix | Mixagem | 110 |
| master | Masterização | 80 |
| mix_master | Mix + Master | 170 |
| sonoplastia | Sonoplastia | 350 |
| beat1 | 1 Beat | 150 |
| beat2 | 2 Beats | 250 |
| beat3 | 3 Beats | 350 |
| beat4 | 4 Beats | 400 |
| beat_mix_master | Beat + Mix + Master | 320 |
| producao_completa | Produção Completa (2h Sessão + 2h Captação + Beat + Mix + Master) | 450 |

---

## 3. Planos e benefícios

Espelho de `PLAN_DEFINITIONS` (preços públicos).

| Plano | Mensal | Anual | Shopping (promoções exclusivas) |
|-------|-------:|------:|--------------------------------|
| Bronze | 239,99 | 2.399,90 | Não |
| Prata | 449,99 | 4.499,90 | Sim |
| Ouro | 799,99 | 7.999,90 | Sim |

### Benefícios por ciclo mensal

- **Bronze:** 1 sessão, 2h captação, 1 mix, 10% serviços.
- **Prata:** 1 sessão, 2h captação, 1 mix, 1 master, 1 beat.
- **Ouro:** 2 sessões, 4h captação, 2 mix, 2 master, 2 beats, 10% serviços, 10% beats, acompanhamento artístico.

### Ciclos (H10B)

- Benefícios são **mensais**, inclusive no plano **anual** (direito a 12 ciclos consecutivos).
- Não utilizados até o fim do ciclo **expiram** e **não acumulam**.
- Cupons não usados podem ser marcados como substituídos (`ciclo_mensal_substituido`); usados permanecem no histórico.
- Novos cupons são emitidos no início de cada ciclo **somente** se a assinatura estiver `active`.

### O que NÃO é benefício contratual

- “Prioridade na agenda” **não** é direito garantido nem está em `PLAN_DEFINITIONS`. Não prometer em Termos.

### Shopping

- Prata e Ouro: acesso a **promoções exclusivas** (gate no servidor).
- Catálogo de compra de produtos (merch, packs etc.): **em preparação** — não prometer checkout de produtos até existir.

---

## 4. Assinatura (H10C)

Estados: `pending`, `active`, `delinquent`, `suspended`, `cancelled`, `expired`.

| Estado | Significado operacional |
|--------|-------------------------|
| active | Comercialmente ativa; renova benefícios |
| pending | Aguardando confirmação/ativação |
| delinquent | Falha de cobrança; período de tolerância |
| suspended | Após grace sem regularização |
| cancelled | Cancelada (imediato no sistema) |
| expired | Vigência encerrada |

Parâmetros:

- Grace após falha: **5 dias** (`SUBSCRIPTION_GRACE_DAYS`).
- Máximo de falhas antes de cancelar por inadimplência: **3** (`SUBSCRIPTION_MAX_FAILURES`).
- Indicador comercial de assinatura ativa: entidade **Subscription** (não `Payment`).

Renovação financeira: cobrança recorrente via Asaas quando houver assinatura remota vinculada; benefícios locais seguem o ciclo H10B.

---

## 5. Cancelamento e reembolso de plano

### Cancelamento

- O cliente pode cancelar a qualquer momento pela Minha Conta.
- O cancelamento é **imediato** no sistema (`cancelled`).
- Impede novas cobranças e a emissão de novos ciclos de benefícios.
- Cupons de benefício **não usados** são invalidados/expirados.
- Cupons de remarcação/reembolso **derivados** de um benefício do plano e ainda **não utilizados** também são invalidados (não permanecem créditos órfãos após o cancelamento).
- Se o cupom derivado **já tiver sido utilizado** antes do cancelamento, o benefício conta como usufruído (ver reembolso).
- Cupons já usados permanecem no histórico.
- **Não** há “manutenção de acesso ao plano até o fim do ciclo” após cancelar.

### Reembolso de plano

Fórmula oficial:

```
reembolso = max(0, valorPago − Σ valores_internos dos benefícios efetivamente usufruídos)
```

- “Benefício efetivamente usufruído” **não** é `used=true` bruto.
  - Benefícios **concluídos** ou com uso ainda válido → descontam.
  - Benefícios **cancelados/revertidos** (agendamento cancelado/recusado, com ou sem cupom derivado ainda disponível) → **não** descontam; o valor volta no estorno do plano.
  - Benefícios **nunca utilizados** → não descontam.
  - Se existir cupom derivado **já utilizado** (sem crédito aberto na cadeia) → desconta normalmente.
- Rastreabilidade: cupom do plano → agendamento → cupom derivado via `parentCouponId`.
- Valores internos são **critério comercial** (não são os preços públicos de vitrine).
- Estorno solicitado via **Asaas** (quando elegível e `reembolso > 0`).
- Sem reembolso automático em cupom de “crédito de plano” como substituto padrão do estorno Asaas.
- Implementação canônica: `subscription-refund.ts` + `plan-cancel-coupons.ts`.

### Valores internos (interno — não publicar na FAQ)

**Bronze / Prata:** sessão 30, captação 50, mix 100, master 75, beat1 145, percent_servicos 10.

**Ouro:** sessão 30, captação 40, mix 90, master 60, beat1 120, percent_servicos 10, percent_beats 10.

---

## 6. Agendamentos

- Pagamento antecipado via Asaas; serviço inicia após confirmação.
- Aceite / recusa: operação do estúdio; cliente é notificado.
- Cancelamento ou recusa com pagamento: cliente escolhe na plataforma (**Minha Conta**):
  - **Reembolso financeiro** do valor elegível, ou
  - **Cupom de remarcação** (crédito para reagendar; sobras não acumulam).
- Não usar faixas legadas “≥48h crédito / &lt;48h 50% / &lt;24h zero” como regra oficial (não implementadas assim).
- Atraso do cliente não estende o horário; falta sem aviso pode implicar perda do valor, conforme operação.

---

## 7. Cupons

Categorias: `servico`, `producao`, `plano`, `reembolso`, `desconto`.

- **Plano:** concedem serviço/desconto do ciclo (podem zerar o valor do serviço elegível).
- **Reembolso / remarcação:** crédito após cancel/recusa de agendamento; sobra não usada se perde no uso parcial. Quando originados de benefício de plano, devem registrar `parentCouponId` apontando ao cupom usado no agendamento.
- **Desconto:** percentual/fixo promocional conforme regras do cupom.
- Validade: `expiresAt` do cupom; cupons de ciclo seguem o fim do ciclo mensal.
- Cupons de plano cancelado/inativo não são utilizáveis no checkout comum.
- Ao cancelar o plano: derivados ainda disponíveis são invalidados; derivados já usados permanecem e contam no reembolso.

---

## 8. Entregas e arquivos

- Entrega padrão: WAV + MP3; beats podem incluir stems conforme oferta.
- Backup interno do estúdio: até **~90 dias**; depois pode haver exclusão.
- Cliente deve baixar e guardar os arquivos ao receber.
- Links de download na conta: disponibilidade enquanto o arquivo e o registro existirem; sem garantia de URL eterna.

---

## 9. Comunicação

Textos de Chat, FAQ, e-mails e UI **devem** dizer:

- Pagamento: Asaas.
- Preços: iguais a `CHECKOUT_CATALOG` / `PLAN_DEFINITIONS`.
- Planos: ciclos mensais, sem acúmulo, reembolso pela fórmula acima.
- Shopping: promoções exclusivas Prata/Ouro; loja em preparação.

Não dizer: Mercado Pago, InfinityPay, preços antigos, “acesso até o fim do ciclo após cancelar”, “prioridade na agenda” como direito.

---

## 10. Checklist de sincronização

Ao mudar regra:

- [ ] Código canônico
- [ ] Este `PLATFORM_POLICY.md`
- [ ] Termos (`/termos-contratos`)
- [ ] FAQ (seed + registros no banco)
- [ ] `knowledgeBase.ts` / `quickAnswers.ts`
- [ ] E-mails (`sendEmail.ts`)
- [ ] UI (Home, Planos, Shopping, Minha Conta, Checkout)
