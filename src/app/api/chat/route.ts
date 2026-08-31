import { NextResponse } from "next/server";
import { sendHumanSupportEmail } from "@/app/lib/sendEmail";
import { askAI } from "@/app/lib/ai";
import { requireAuth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { chatSchema } from "@/app/lib/validations";
import { getRAGContext, formatContextForPrompt } from "@/app/lib/rag";
import { getQuickAnswer } from "@/app/lib/quickAnswers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 🔒 Verificar autenticação
    const user = await requireAuth();

    const body = await req.json();
    
    // ✅ Validar entrada
    const validation = chatSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { message, sessionId, messages: bodyMessages } = validation.data;
    const messages = (bodyMessages || body.messages || []).filter(
      (m: any) => m && m.content && typeof m.content === "string"
    );

    // ===============================
    // ÚLTIMA MENSAGEM
    // ===============================
    const ultimaMensagem =
      messages[messages.length - 1]?.content?.toLowerCase() || message?.toLowerCase() || "";

    // Buscar ou criar sessão de chat
    let chatSession;
    try {
      if (sessionId) {
        chatSession = await prisma.chatSession.findUnique({
          where: { id: sessionId },
        });
        
        // Verificar se a sessão pertence ao usuário
        if (chatSession && chatSession.userId !== user.id) {
          return NextResponse.json(
            { error: "Acesso negado a esta sessão" },
            { status: 403 }
          );
        }
      }
      
      if (!chatSession) {
        // Criar nova sessão
        chatSession = await prisma.chatSession.create({
          data: {
            userId: user.id,
            status: "open",
          },
        });
        console.log(`[Chat] ✅ Nova sessão criada: ${chatSession.id} para usuário ${user.id}`);
      }

      // Salvar mensagem do usuário
      const userMessageContent = message || messages[messages.length - 1]?.content || "";
      if (userMessageContent && userMessageContent.trim()) {
        await prisma.chatMessage.create({
          data: {
            chatSessionId: chatSession.id,
            senderType: "user",
            content: userMessageContent,
          },
        });
        console.log(`[Chat] ✅ Mensagem do usuário salva na sessão ${chatSession.id}`);
        
        // Atualizar updatedAt da sessão após salvar mensagem
        await prisma.chatSession.update({
          where: { id: chatSession.id },
          data: { updatedAt: new Date() },
        });
      }
    } catch (e: any) {
      console.error("❌ [Chat] Erro ao criar/atualizar sessão de chat:", e);
      console.error("❌ [Chat] Stack:", e.stack);
      return NextResponse.json(
        { error: "Erro ao processar sessão de chat", details: e.message },
        { status: 500 }
      );
    }

    // Garantir que temos uma sessão válida
    if (!chatSession) {
      console.error("❌ [Chat] Sessão não foi criada/encontrada!");
      return NextResponse.json(
        { error: "Erro ao criar sessão de chat" },
        { status: 500 }
      );
    }

    // ===============================
    // VERIFICAR SE CHAT FOI ACEITO PELO ADMIN
    // Se sim, a IA não deve interferir
    // ===============================
    if (chatSession && chatSession.adminAccepted) {
      console.log("[Chat] Chat aceito pelo admin - IA não será acionada");
      
      // Retornar mensagem informando que o atendimento está sendo feito por humano
      return NextResponse.json({
        reply: "Sua mensagem foi enviada. Nossa equipe de atendimento humano está cuidando do seu caso e responderá em breve.",
        sessionId: chatSession.id,
        adminAccepted: true,
      });
    }

    // ===============================
    // ESCALADA PARA HUMANO
    // ===============================
    if (
      ultimaMensagem.includes("humano") ||
      ultimaMensagem.includes("atendente")
    ) {
      // Atualizar sessão para solicitar humano
      try {
        if (chatSession) {
          await prisma.chatSession.update({
            where: { id: chatSession.id },
            data: {
              humanRequested: true,
              status: "pending_human",
            },
          });
        }
      } catch (e) {}

      // ⚠️ Email só envia se credenciais existirem
      if (
        process.env.SUPPORT_EMAIL &&
        process.env.SUPPORT_EMAIL_PASSWORD &&
        chatSession
      ) {
        try {
          console.log("[Chat] Tentando enviar email de atendimento humano...");
          await sendHumanSupportEmail(
            messages[messages.length - 1]?.content || message || "",
            user.id,
            user.nomeArtistico || user.nomeCompleto || "Usuário",
            user.email,
            chatSession.id
          );
          console.log("[Chat] ✅ Email de atendimento humano enviado com sucesso!");
        } catch (emailError: any) {
          console.error("❌ [Chat] ========================================");
          console.error("❌ [Chat] ERRO ao enviar email de atendimento humano (não crítico):");
          console.error("❌ [Chat] Tipo:", emailError?.constructor?.name || "Desconhecido");
          console.error("❌ [Chat] Mensagem:", emailError?.message || "Sem mensagem");
          console.error("❌ [Chat] Code:", emailError?.code || "Sem código");
          console.error("❌ [Chat] Response:", emailError?.response || "Sem resposta");
          if (emailError?.stack) {
            console.error("❌ [Chat] Stack:", emailError.stack);
          }
          console.error("❌ [Chat] ========================================");
          // Não falhar o chat por erro de email
        }
      } else {
        console.warn("[Chat] ⚠️ Email de atendimento humano NÃO será enviado:");
        console.warn("[Chat] SUPPORT_EMAIL:", process.env.SUPPORT_EMAIL ? "✅" : "❌");
        console.warn("[Chat] SUPPORT_EMAIL_PASSWORD:", process.env.SUPPORT_EMAIL_PASSWORD ? "✅" : "❌");
        console.warn("[Chat] chatSession:", chatSession ? "✅" : "❌");
      }

      const reply = "Vou chamar um atendente humano para te ajudar melhor com isso.";

      // Salvar resposta da AI
      try {
        if (chatSession) {
          await prisma.chatMessage.create({
            data: {
              chatSessionId: chatSession.id,
              senderType: "ai",
              content: reply,
            },
          });
        }
      } catch (e) {}

      // Garantir que temos uma sessão válida
      if (!chatSession) {
        console.error("❌ [Chat] Sessão não existe ao retornar resposta de escalada!");
        return NextResponse.json(
          { error: "Erro: sessão de chat não encontrada" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        reply,
        sessionId: chatSession.id,
      });
    }

    // ===============================
    // RESPOSTAS PRÉ-DEFINIDAS (PERGUNTAS CLÁSSICAS)
    // ===============================
    const quickAnswer = getQuickAnswer(ultimaMensagem);
    if (quickAnswer) {
      // Garantir que temos uma sessão válida
      if (!chatSession) {
        console.error("❌ [Chat] Sessão não existe ao retornar quickAnswer!");
        return NextResponse.json(
          { error: "Erro: sessão de chat não encontrada" },
          { status: 500 }
        );
      }

      // Salvar resposta da AI
      try {
        await prisma.chatMessage.create({
          data: {
            chatSessionId: chatSession.id,
            senderType: "ai",
            content: quickAnswer,
          },
        });
        console.log(`[Chat] ✅ QuickAnswer salva na sessão ${chatSession.id}`);
      } catch (e: any) {
        console.error("❌ [Chat] Erro ao salvar quickAnswer:", e);
      }

      return NextResponse.json({
        reply: quickAnswer,
        sessionId: chatSession.id,
      });
    }

    // ===============================
    // SISTEMA RAG - BUSCAR CONTEXTO RELEVANTE
    // ===============================
    let ragContext;
    let contextPrompt = "";
    try {
      ragContext = await getRAGContext(ultimaMensagem);
      contextPrompt = formatContextForPrompt(ragContext);
      console.log("[Chat] Contexto RAG obtido:", contextPrompt.substring(0, 200));
    } catch (e) {
      console.error("Erro ao obter contexto RAG:", e);
    }

    // ===============================
    // IA INTELIGENTE COM CONTEXTO DO SITE
    // ===============================
    console.log("[Chat] Chamando IA...");
    const aiReply = await askAI(
      messages
        .filter((m: any) => m && m.content && typeof m.content === "string")
        .map((m: any) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content || "",
        })),
      { context: contextPrompt }
    );
    console.log("[Chat] Resposta da IA:", aiReply ? aiReply.substring(0, 100) : "null");

    const finalReply = aiReply ||
      "Não consegui entender completamente. Posso chamar um atendente humano para te ajudar melhor?";

    // Garantir que temos uma sessão válida
    if (!chatSession) {
      console.error("❌ [Chat] Sessão não existe ao tentar salvar resposta da IA!");
      return NextResponse.json(
        { error: "Erro: sessão de chat não encontrada" },
        { status: 500 }
      );
    }

    // Salvar resposta da AI
    try {
      await prisma.chatMessage.create({
        data: {
          chatSessionId: chatSession.id,
          senderType: "ai",
          content: finalReply,
        },
      });
      console.log(`[Chat] ✅ Resposta da IA salva na sessão ${chatSession.id}`);
    } catch (e: any) {
      console.error("❌ [Chat] Erro ao salvar resposta da IA:", e);
    }

    return NextResponse.json({
      reply: finalReply,
      sessionId: chatSession.id, // Sempre retornar o ID da sessão
    });
  } catch (err: any) {
    console.error("Erro no chat:", err);
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao processar mensagem" },
      { status: 500 }
    );
  }
}
