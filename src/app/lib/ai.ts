import OpenAI from "openai";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AIContext {
  context?: string; // Contexto adicional do RAG
}

export async function askAI(messages: ChatMessage[], options?: AIContext) {
  // 🔒 Segurança total: não quebra se a key não existir
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[AI] OPENAI_API_KEY não configurada");
    return null;
  }

  console.log("[AI] Iniciando chamada OpenAI...");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Construir o prompt do sistema com contexto adicional
  let systemPrompt = `
Você é o suporte oficial da THouse Rec, um estúdio musical profissional.

REGRAS FUNDAMENTAIS:
1. Você DEVE responder APENAS perguntas relacionadas ao site THouse Rec, seus serviços, planos, agendamentos, preços, contato, termos de uso ou qualquer assunto relacionado ao estúdio.

2. Para perguntas FORA DO CONTEXTO (não relacionadas ao site):
   - Responda de forma educada e respeitosa
   - Informe que você só pode responder perguntas sobre o site THouse Rec
   - Direcione o usuário a fazer perguntas relacionadas aos serviços, planos, agendamentos ou funcionamento do estúdio
   - Mantenha sempre o respeito e profissionalismo

3. Para perguntas ABUSIVAS, INAPROPRIADAS ou que violem os termos de uso:
   - Responda com respeito, mas de forma firme
   - Informe que o chat deve ser usado com responsabilidade
   - Lembre que a THouse Rec tem o direito de bloquear contas que usem o site indevidamente
   - Direcione o usuário a fazer perguntas apropriadas sobre o site

4. Quando responder perguntas VÁLIDAS sobre o site:
   - Use APENAS as informações fornecidas abaixo para responder
   - Seja DIRETO e OBJETIVO - responda exatamente o que foi perguntado
   - Não repita informações desnecessárias
   - Use formatação clara: quebras de linha, tópicos quando apropriado
   - Nunca invente preços, serviços ou informações que não estejam no contexto
   - Quando mencionar preços, serviços ou planos, use os valores exatos fornecidos
   - Se a informação não estiver disponível, seja honesto e sugira falar com um atendente humano
   - Direcione o usuário para páginas específicas do site quando apropriado
   - Responda de forma natural e conversacional, mas sempre baseado nos fatos
   - Mantenha respostas concisas e focadas na pergunta feita

5. Sempre mantenha respeito, educação e profissionalismo, independentemente do tipo de pergunta.

EXEMPLOS DE RESPOSTAS:
- Para perguntas fora do contexto: "Olá! Obrigado pela sua pergunta. Eu sou o suporte da THouse Rec e posso ajudar apenas com questões relacionadas ao nosso estúdio musical, como serviços, planos, agendamentos, preços e funcionamento do site. Como posso ajudar você com algo relacionado à THouse Rec?"

- Para perguntas abusivas: "Obrigado pelo contato. Gostaria de lembrar que este chat deve ser usado com responsabilidade e respeito. Nossa equipe tem o direito de bloquear contas que usem o site indevidamente. Posso ajudá-lo com questões relacionadas aos nossos serviços, planos ou agendamentos?"
`;

  // Adicionar contexto do RAG se disponível
  if (options?.context) {
    systemPrompt += `\n\n${options.context}`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt.trim(),
        },
        ...messages,
      ],
      temperature: 0.7, // Um pouco de criatividade, mas ainda focado
      max_tokens: 500, // Respostas concisas
    });

    const reply = response.choices[0]?.message?.content ?? null;
    if (reply) {
      console.log("[AI] Resposta recebida:", reply.substring(0, 100));
    } else {
      console.warn("[AI] Resposta vazia da OpenAI");
    }
    return reply;
  } catch (error: any) {
    console.error("[AI] Erro ao chamar OpenAI:");
    console.error("[AI] - Tipo:", error.constructor.name);
    console.error("[AI] - Mensagem:", error.message);
    console.error("[AI] - Status:", error.status);
    console.error("[AI] - Code:", error.code);
    if (error.response) {
      console.error("[AI] - Response:", JSON.stringify(error.response, null, 2));
    }
    return null;
  }
}
