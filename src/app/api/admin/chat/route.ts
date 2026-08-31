import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { sendChatResponseEmail, sendChatAcceptedEmail } from "@/app/lib/sendEmail";
import { z } from "zod";

const messageSchema = z.object({
  chatSessionId: z.string(),
  content: z.string().min(1),
});

const acceptSchema = z.object({
  chatSessionId: z.string(),
});

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    // Se sessionId fornecido, retornar apenas essa sessão
    if (sessionId) {
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            select: {
              nomeArtistico: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!session) {
        return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
      }

      return NextResponse.json({ session });
    }

    // Retornar todas as sessões
    const sessions = await prisma.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            nomeArtistico: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar sessões" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "accept") {
      const body = await req.json();
      const validation = acceptSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
      }

      // Buscar sessão antes de atualizar para verificar se já estava aceita
      const sessionBefore = await prisma.chatSession.findUnique({
        where: { id: validation.data.chatSessionId },
        include: {
          user: {
            select: {
              nomeArtistico: true,
              nomeCompleto: true,
              email: true,
            },
          },
        },
      });

      if (!sessionBefore) {
        return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
      }

      const session = await prisma.chatSession.update({
        where: { id: validation.data.chatSessionId },
        data: {
          adminAccepted: true,
          adminId: admin.id,
          status: "open",
        },
        include: {
          user: {
            select: {
              nomeArtistico: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Enviar email apenas se o chat não estava aceito antes
      if (!sessionBefore.adminAccepted && sessionBefore.user?.email) {
        try {
          const userName = sessionBefore.user.nomeArtistico || sessionBefore.user.nomeCompleto || "Usuário";
          await sendChatAcceptedEmail(
            sessionBefore.user.email,
            userName,
            validation.data.chatSessionId
          );
          console.log(`[Admin Chat] Email de chat aceito enviado para ${sessionBefore.user.email}`);
        } catch (emailError: any) {
          console.error("[Admin Chat] Erro ao enviar email de chat aceito (não crítico):", emailError);
          // Não falhar a aceitação por erro de email
        }
      }

      return NextResponse.json({ session });
    }

    if (action === "reject") {
      const body = await req.json();
      const validation = acceptSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
      }

      const session = await prisma.chatSession.update({
        where: { id: validation.data.chatSessionId },
        data: {
          status: "rejected",
          adminAccepted: false,
        },
        include: {
          user: {
            select: {
              nomeArtistico: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return NextResponse.json({ session });
    }

    if (action === "end") {
      const body = await req.json();
      const validation = acceptSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
      }

      // Terminar atendimento humano - voltar IA para funcionar
      const session = await prisma.chatSession.update({
        where: { id: validation.data.chatSessionId },
        data: {
          adminAccepted: false,
          humanRequested: false,
          status: "open",
          adminId: null,
        },
        include: {
          user: {
            select: {
              nomeArtistico: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const action = searchParams.get("action");

    if (action === "delete" && sessionId) {
      // Deletar chat (mensagens serão deletadas em cascade)
      await prisma.chatSession.delete({
        where: { id: sessionId },
      });

      return NextResponse.json({ success: true, message: "Chat excluído com sucesso" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao excluir chat" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const validation = messageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Buscar sessão com informações do usuário antes de criar a mensagem
    const session = await prisma.chatSession.findUnique({
      where: { id: validation.data.chatSessionId },
      include: {
        user: {
          select: {
            email: true,
            nomeArtistico: true,
            nomeCompleto: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        chatSessionId: validation.data.chatSessionId,
        senderType: "admin",
        content: validation.data.content,
      },
    });

    // Atualizar sessão
    await prisma.chatSession.update({
      where: { id: validation.data.chatSessionId },
      data: { updatedAt: new Date() },
    });

    // Enviar email para o usuário notificando sobre a resposta
    if (session.user?.email) {
      try {
        const userName = session.user.nomeArtistico || session.user.nomeCompleto || "Usuário";
        await sendChatResponseEmail(
          session.user.email,
          userName,
          validation.data.content,
          validation.data.chatSessionId
        );
        console.log(`[Admin Chat] Email de notificação enviado para ${session.user.email}`);
      } catch (emailError: any) {
        console.error("[Admin Chat] Erro ao enviar email de notificação (não crítico):", emailError);
        // Não falhar o envio da mensagem por erro de email
      }
    }

    return NextResponse.json({ message });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
  }
}
