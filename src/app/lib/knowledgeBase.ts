/**
 * Base de conhecimento (RAG/Chat) — GO-H10D2.
 * Preços e planos derivados de CHECKOUT_CATALOG e PLAN_DEFINITIONS (fonte única).
 */
import { CHECKOUT_CATALOG, type CanonicalServiceId } from "@/app/lib/service-catalog";
import {
  PLAN_DEFINITIONS,
  type PlanTierId,
} from "@/app/lib/plan-definitions";

export interface KnowledgeItem {
  id: string;
  category: string;
  content: string;
  metadata?: Record<string, unknown>;
}

const SERVICE_IDS: CanonicalServiceId[] = [
  "sessao",
  "captacao",
  "sonoplastia",
  "mix",
  "master",
  "mix_master",
];

const BEAT_IDS: CanonicalServiceId[] = [
  "beat1",
  "beat2",
  "beat3",
  "beat4",
  "beat_mix_master",
  "producao_completa",
];

const PLAN_TIERS: PlanTierId[] = ["bronze", "prata", "ouro"];

const HORARIOS_PADRAO = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildKnowledgeBase(): KnowledgeItem[] {
  const items: KnowledgeItem[] = [];

  items.push({
    id: "info-geral-1",
    category: "sobre",
    content: `THouse Rec é um estúdio musical profissional que oferece serviços de gravação, produção, mixagem, masterização e criação de beats. O estúdio trabalha com planos de assinatura e serviços avulsos. Pagamentos são processados pelo Asaas.`,
  });

  items.push({
    id: "info-geral-2",
    category: "sobre",
    content: `O estúdio oferece agendamento online através do site, onde os clientes podem selecionar serviços, escolher data e horário disponíveis. Os horários disponíveis são: ${HORARIOS_PADRAO.join(", ")}.`,
  });

  items.push({
    id: "sobre-1",
    category: "sobre",
    content: `THouse Rec é o estúdio independente criado por Victor Pereira Ramos (Tremv), produtor musical, artista e engenheiro de áudio nascido em Botafogo, no Rio de Janeiro. A trajetória começou nas batalhas de rima, rodas de freestyle e na cena independente.`,
  });

  items.push({
    id: "sobre-2",
    category: "sobre",
    content: `Victor (Tremv) está cursando Produção Fonográfica (bacharelado) na Estácio, atualmente no 6º período, com previsão de formatura para dezembro de 2026. Essa formação acadêmica se soma à experiência de estúdio.`,
  });

  items.push({
    id: "sobre-3",
    category: "sobre",
    content: `A THouse Rec reúne produções lançadas no YouTube, Spotify e SoundCloud, direção de shows, trabalhos como mestre de cerimônia e consultorias musicais. O estúdio nasceu para ser um espaço criativo, acessível e profissional, onde cada artista é tratado com atenção e cuidado.`,
  });

  for (const id of SERVICE_IDS) {
    const s = CHECKOUT_CATALOG[id];
    items.push({
      id: `servico-${s.id}`,
      category: "servicos-estudio",
      content: `Serviço: ${s.nome}. Preço: ${formatBRL(s.preco)}.`,
      metadata: { tipo: "estudio", nome: s.nome, preco: s.preco },
    });
  }

  for (const id of BEAT_IDS) {
    const b = CHECKOUT_CATALOG[id];
    items.push({
      id: `beat-${b.id}`,
      category: "beats-pacotes",
      content: `Pacote: ${b.nome}. Preço: ${formatBRL(b.preco)}.`,
      metadata: { tipo: "beat", nome: b.nome, preco: b.preco },
    });
  }

  for (const tier of PLAN_TIERS) {
    const plano = PLAN_DEFINITIONS[tier];
    const beneficios = plano.marketingBenefits
      .filter((b) => b.included)
      .map((b) => b.label);
    const naoInclui = plano.marketingBenefits
      .filter((b) => !b.included)
      .map((b) => b.label);
    items.push({
      id: `plano-${plano.id}`,
      category: "planos",
      content: `${plano.nome}: ${plano.descricao} Preço mensal: ${formatBRL(plano.mensal)}. Preço anual: ${formatBRL(plano.anual)}. Benefícios incluídos: ${beneficios.join(", ")}.${naoInclui.length ? ` Não inclui: ${naoInclui.join(", ")}.` : ""}`,
      metadata: {
        id: plano.id,
        nome: plano.nome,
        mensal: plano.mensal,
        anual: plano.anual,
        descricao: plano.descricao,
      },
    });
  }

  items.push({
    id: "agendamento-1",
    category: "agendamento",
    content: `Para agendar, é necessário selecionar pelo menos um serviço ou pacote, escolher uma data disponível no calendário e selecionar um horário. É possível combinar múltiplos serviços em um único agendamento.`,
  });

  items.push({
    id: "agendamento-2",
    category: "agendamento",
    content: `Os agendamentos são confirmados após o pagamento via Asaas. Formas disponíveis conforme o checkout: cartão de crédito, débito, Pix e boleto.`,
  });

  items.push({
    id: "agendamento-3",
    category: "agendamento",
    content: `Em cancelamento ou recusa de agendamento pago, o cliente pode escolher na Minha Conta: reembolso financeiro via Asaas ou cupom de remarcação. Sobras de cupom de remarcação não acumulam.`,
  });

  items.push({
    id: "planos-1",
    category: "planos",
    content: `Existem três planos: Bronze (${formatBRL(PLAN_DEFINITIONS.bronze.mensal)}/mês ou ${formatBRL(PLAN_DEFINITIONS.bronze.anual)}/ano), Prata (${formatBRL(PLAN_DEFINITIONS.prata.mensal)}/mês ou ${formatBRL(PLAN_DEFINITIONS.prata.anual)}/ano) e Ouro (${formatBRL(PLAN_DEFINITIONS.ouro.mensal)}/mês ou ${formatBRL(PLAN_DEFINITIONS.ouro.anual)}/ano). Os benefícios são liberados em ciclos mensais.`,
  });

  items.push({
    id: "planos-2",
    category: "planos",
    content: `Os planos podem ser assinados de forma mensal ou anual. O plano anual concede 12 ciclos mensais de benefícios consecutivos. Benefícios não utilizados no mês expiram e não acumulam; novos cupons são gerados no início de cada ciclo enquanto a assinatura estiver ativa.`,
  });

  items.push({
    id: "planos-3",
    category: "planos",
    content: `Renovação mensal dos benefícios: cupons do plano são disponibilizados mensalmente. Cupons não usados ao fim do ciclo expiram ou são substituídos (permanecem no histórico). Planos Prata e Ouro incluem acesso às promoções exclusivas do Shopping; Bronze não. O catálogo de compra do Shopping pode estar em preparação.`,
  });

  items.push({
    id: "planos-4",
    category: "planos",
    content: `Cancelamento de plano é imediato na plataforma: cessam novas cobranças e novos ciclos. Reembolso elegível = valor pago menos a soma dos valores internos dos benefícios efetivamente utilizados (cupons usados). O estorno é via Asaas. Em falha de cobrança, a assinatura pode ficar inadimplente, suspensa e depois cancelada.`,
  });

  items.push({
    id: "pagamento-1",
    category: "pagamento",
    content: `O processador de pagamento oficial da THouse Rec é o Asaas. A plataforma não utiliza Mercado Pago nem InfinityPay no fluxo comercial atual.`,
  });

  items.push({
    id: "contato-1",
    category: "contato",
    content: `Informações de contato da THouse Rec: E-mail: thouse.rec.tremv@gmail.com. WhatsApp: +55 (21) 99129-2544. Localização: Rio de Janeiro (RJ) — Botafogo.`,
  });

  items.push({
    id: "contato-2",
    category: "contato",
    content: `Para assuntos de privacidade e proteção de dados (LGPD), o contato é: thouse.rec.tremv@gmail.com — Rio de Janeiro – RJ.`,
  });

  items.push({
    id: "termos-1",
    category: "termos",
    content: `A THouse Rec possui a página /termos-contratos com Termos de Uso, Política de Privacidade (LGPD), Contrato de Serviços, Contrato de Planos/Assinaturas, Política de Cancelamento/Remarcação/Reembolso e demais documentos.`,
  });

  items.push({
    id: "termos-2",
    category: "termos",
    content: `Todos os usuários devem aceitar os Termos de Contrato ao fazer agendamentos ou assinar planos. Os termos estão em /termos-contratos.`,
  });

  items.push({
    id: "termos-3",
    category: "termos",
    content: `A política de privacidade (LGPD) explica como a THouse Rec coleta, usa, armazena e protege dados pessoais. Contato: thouse.rec.tremv@gmail.com.`,
  });

  items.push({
    id: "termos-4",
    category: "termos",
    content: `A política de cancelamento define: agendamentos — reembolso financeiro ou cupom de remarcação na Minha Conta; planos — cancelamento imediato e reembolso por benefícios utilizados (valores internos) via Asaas.`,
  });

  return items;
}

export function getKnowledgeByCategory(category: string): KnowledgeItem[] {
  return buildKnowledgeBase().filter((item) => item.category === category);
}

export function searchKnowledge(term: string): KnowledgeItem[] {
  const termLower = term.toLowerCase();
  return buildKnowledgeBase().filter((item) =>
    item.content.toLowerCase().includes(termLower)
  );
}
