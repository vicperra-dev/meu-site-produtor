// Sistema RAG (Retrieval-Augmented Generation) simplificado
// Busca informações relevantes da base de conhecimento e FAQs para contextualizar a IA

import { buildKnowledgeBase, KnowledgeItem } from "./knowledgeBase";
import { prisma } from "./prisma";

export interface RAGContext {
  knowledgeItems: KnowledgeItem[];
  faqs: Array<{ question: string; answer: string }>;
  summary: string;
}

/**
 * Busca contexto relevante baseado na pergunta do usuário
 */
export async function getRAGContext(userQuestion: string): Promise<RAGContext> {
  const questionLower = userQuestion.toLowerCase();
  
  // Buscar FAQs relevantes do banco de dados
  const relevantFaqs = await getRelevantFAQs(questionLower);
  
  // Buscar itens da base de conhecimento
  const knowledgeItems = getRelevantKnowledge(questionLower);
  
  // Criar um resumo do contexto
  const summary = buildContextSummary(knowledgeItems, relevantFaqs);
  
  return {
    knowledgeItems,
    faqs: relevantFaqs,
    summary,
  };
}

/**
 * Busca FAQs relevantes do banco de dados
 */
async function getRelevantFAQs(query: string): Promise<Array<{ question: string; answer: string }>> {
  try {
    // Extrair palavras-chave da query
    const keywords = extractKeywords(query);
    
    if (keywords.length === 0) {
      // Se não houver palavras-chave, retornar FAQs mais visualizadas
      const faqs = await prisma.fAQ.findMany({
        take: 5,
        orderBy: { views: "desc" },
      });
      return faqs.map((f) => ({ question: f.question, answer: f.answer }));
    }
    
    // Buscar FAQs que contenham as palavras-chave
    const faqs = await prisma.fAQ.findMany({
      where: {
        OR: [
          ...keywords.map((keyword) => ({
            question: { contains: keyword },
          })),
          ...keywords.map((keyword) => ({
            answer: { contains: keyword },
          })),
        ],
      },
      take: 5,
      orderBy: { views: "desc" },
    });
    
    return faqs.map((f) => ({ question: f.question, answer: f.answer }));
  } catch (error) {
    console.error("Erro ao buscar FAQs:", error);
    return [];
  }
}

/**
 * Extrai palavras-chave relevantes da pergunta
 */
function extractKeywords(query: string): string[] {
  // Palavras de stop (remover)
  const stopWords = new Set([
    "como", "qual", "quais", "quando", "onde", "quem", "que", "qual",
    "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
    "a", "o", "as", "os", "e", "ou", "mas", "se", "para", "com", "por",
    "é", "são", "ser", "estar", "ter", "há", "um", "uma", "uns", "umas",
    "me", "te", "se", "nos", "vos", "lhe", "lhes", "você", "vocês",
    "eu", "tu", "ele", "ela", "nós", "vós", "eles", "elas",
  ]);
  
  // Extrair palavras (mínimo 3 caracteres, não stop words)
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
  
  return words;
}

/**
 * Busca itens relevantes da base de conhecimento
 */
function getRelevantKnowledge(query: string): KnowledgeItem[] {
  const allKnowledge = buildKnowledgeBase();
  const keywords = extractKeywords(query);
  
  if (keywords.length === 0) {
    // Retornar itens gerais se não houver palavras-chave
    return allKnowledge.filter(
      (item) => item.category === "sobre" || item.category === "agendamento"
    );
  }
  
  // Buscar itens que contenham as palavras-chave
  const relevantItems: KnowledgeItem[] = [];
  
  for (const item of allKnowledge) {
    const contentLower = item.content.toLowerCase();
    const matches = keywords.filter((keyword) => contentLower.includes(keyword));
    
    if (matches.length > 0) {
      relevantItems.push(item);
    }
  }
  
  // Ordenar por número de matches (mais relevantes primeiro)
  relevantItems.sort((a, b) => {
    const aMatches = keywords.filter((k) => a.content.toLowerCase().includes(k)).length;
    const bMatches = keywords.filter((k) => b.content.toLowerCase().includes(k)).length;
    return bMatches - aMatches;
  });
  
  // Limitar a 10 itens mais relevantes
  return relevantItems.slice(0, 10);
}

/**
 * Constrói um resumo do contexto para a IA
 */
function buildContextSummary(
  knowledgeItems: KnowledgeItem[],
  faqs: Array<{ question: string; answer: string }>
): string {
  const parts: string[] = [];
  
  if (knowledgeItems.length > 0) {
    parts.push("INFORMAÇÕES DO SITE:");
    knowledgeItems.forEach((item, index) => {
      parts.push(`${index + 1}. ${item.content}`);
    });
  }
  
  if (faqs.length > 0) {
    parts.push("\nPERGUNTAS FREQUENTES RELEVANTES:");
    faqs.forEach((faq, index) => {
      parts.push(`${index + 1}. P: ${faq.question}`);
      parts.push(`   R: ${faq.answer}`);
    });
  }
  
  return parts.join("\n");
}

/**
 * Formata o contexto para incluir no prompt do sistema
 */
export function formatContextForPrompt(context: RAGContext): string {
  if (context.knowledgeItems.length === 0 && context.faqs.length === 0) {
    return "";
  }
  
  return `
INFORMAÇÕES RELEVANTES DO SITE THOUSE REC:

${context.summary}

Use essas informações para responder a pergunta do usuário de forma precisa e detalhada. Se a informação não estiver disponível, seja honesto e direcione o usuário para as páginas do site ou sugira falar com um atendente humano.
`.trim();
}
