/**
 * Respostas rápidas do Chat — GO-H10D2.
 * Preços e planos derivados das fontes canônicas.
 */
import { CHECKOUT_CATALOG } from "@/app/lib/service-catalog";
import { PLAN_DEFINITIONS, formatPlanPriceBRL } from "@/app/lib/plan-definitions";

export interface QuickAnswer {
  keywords: string[];
  resposta: string;
}

function brl(n: number): string {
  return formatPlanPriceBRL(n);
}

const c = CHECKOUT_CATALOG;
const bronze = PLAN_DEFINITIONS.bronze;
const prata = PLAN_DEFINITIONS.prata;
const ouro = PLAN_DEFINITIONS.ouro;

export const QUICK_ANSWERS: QuickAnswer[] = [
  {
    keywords: ["preços", "preço", "quais são os preços", "valor", "valores", "quanto custa"],
    resposta: `Aqui estão os preços dos serviços da THouse Rec:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SERVIÇOS DE ESTÚDIO

• Sessão: ${brl(c.sessao.preco)}/hora
• Captação: ${brl(c.captacao.preco)}/hora
• Mixagem: ${brl(c.mix.preco)}
• Masterização: ${brl(c.master.preco)}
• Mix + Master: ${brl(c.mix_master.preco)}
• Sonoplastia: ${brl(c.sonoplastia.preco)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEATS E PACOTES

• 1 Beat: ${brl(c.beat1.preco)}
• 2 Beats: ${brl(c.beat2.preco)}
• 3 Beats: ${brl(c.beat3.preco)}
• 4 Beats: ${brl(c.beat4.preco)}
• Beat + Mix + Master: ${brl(c.beat_mix_master.preco)}
• Produção Completa (2h Sessão + 2h Captação + Beat + Mix + Master): ${brl(c.producao_completa.preco)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para agendar, acesse a página de Agendamento. Pagamentos via Asaas.`,
  },
  {
    keywords: ["agendamento", "agendar", "como funciona o agendamento", "como agendar"],
    resposta: `Como fazer seu agendamento na THouse Rec:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Acesse a página de Agendamento
2. Selecione os serviços ou pacotes desejados
3. Escolha uma data disponível no calendário
4. Selecione um horário (disponível das 10h às 22h)
5. Revise o resumo e aceite os termos de contrato
6. Confirme o pagamento via Asaas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Formas de pagamento (conforme checkout): Cartão, Débito, Pix ou Boleto.

O agendamento é confirmado após o pagamento. Em caso de cancelamento ou recusa, você pode escolher na Minha Conta: reembolso financeiro ou cupom de remarcação.`,
  },
  {
    keywords: ["planos", "plano", "quais planos", "planos disponíveis", "assinatura"],
    resposta: `Planos de assinatura da THouse Rec:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLANO BRONZE
${brl(bronze.mensal)}/mês ou ${brl(bronze.anual)}/ano

✓ 1 sessão (1h) por mês
✓ 2h de captação por mês
✓ 1 Mix por mês
✓ 10% de desconto em serviços avulsos
✗ Sem promoções exclusivas do Shopping

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLANO PRATA
${brl(prata.mensal)}/mês ou ${brl(prata.anual)}/ano

✓ 1 sessão por mês
✓ 2h de captação por mês
✓ 1 Mix + 1 Master por mês
✓ 1 Beat por mês
✓ Acesso a promoções exclusivas do Shopping

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLANO OURO
${brl(ouro.mensal)}/mês ou ${brl(ouro.anual)}/ano

✓ 2 sessões por mês
✓ 4h de captação por mês
✓ 2 Mix + 2 Master por mês
✓ 2 Beats por mês
✓ 10% em serviços e 10% em beats
✓ Promoções exclusivas do Shopping
✓ Acompanhamento artístico

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Benefícios são mensais (também no plano anual): o que não for usado no ciclo expira e não acumula. Novos cupons saem no início de cada mês de vigência, com assinatura ativa.

Cancelamento é imediato. Reembolso elegível = valor pago − benefícios utilizados (critério interno), via Asaas.

Confira detalhes na página de Planos e em /termos-contratos.`,
  },
  {
    keywords: ["pagamento", "pagar", "asaas", "pix", "cartão", "mercado pago", "mercadopago"],
    resposta: `Pagamentos na THouse Rec são processados pelo Asaas.

Formas disponíveis conforme o checkout: Pix, cartão de crédito, cartão de débito e boleto.

A THouse Rec não utiliza Mercado Pago nem InfinityPay no fluxo comercial atual.`,
  },
  {
    keywords: ["serviços", "quais serviços", "o que vocês fazem", "trabalhos"],
    resposta: `Serviços oferecidos pela THouse Rec:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SERVIÇOS DE ESTÚDIO

• Sessão - Gravação de áudio
• Captação - Captura de áudio profissional
• Mixagem - Ajuste e combinação de faixas
• Masterização - Processo final de polimento
• Mix + Master - Pacote combinado
• Sonoplastia - Produção de áudio para projetos audiovisuais

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEATS E PRODUÇÃO

• Beats personalizados
• Produção completa - 2h Sessão + 2h Captação + Beat + Mix + Master
• Beat + Mix + Master

Para ver preços e agendar, acesse a página de Agendamento.`,
  },
];

export function getQuickAnswer(message: string): string | null {
  const messageLower = message.toLowerCase().trim();

  for (const answer of QUICK_ANSWERS) {
    const match = answer.keywords.some((keyword) =>
      messageLower.includes(keyword.toLowerCase())
    );
    if (match) return answer.resposta;
  }

  return null;
}
