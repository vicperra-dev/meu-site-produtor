import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const associarSchema = z.object({
  questionId: z.string(),
  userEmail: z.string().email(),
});

/**
 * Endpoint para associar uma pergunta a um usuário pelo email
 * Busca o usuário automaticamente pelo email e associa a pergunta
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = associarSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { questionId, userEmail } = validation.data;

    // Buscar pergunta
    const pergunta = await prisma.userQuestion.findUnique({
      where: { id: questionId },
    });

    if (!pergunta) {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }

    // Buscar usuário por email (normalizar para garantir correspondência)
    const userEmailNormalizado = userEmail.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: userEmailNormalizado },
      select: { id: true, email: true, nomeArtistico: true },
    });

    if (!user) {
      // Tentar buscar sem normalização também (caso o email no banco não esteja normalizado)
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { email: userEmailNormalizado },
          ],
        },
        select: { id: true, email: true, nomeArtistico: true },
      });
      
      if (!user) {
        return NextResponse.json({ error: `Usuário não encontrado com este email: ${userEmail}` }, { status: 404 });
      }
    }

    // Verificar estado ANTES da atualização
    console.log(`[Admin FAQ] ANTES da associação - Pergunta ${questionId}:`, {
      userId: pergunta.userId,
      userEmail: pergunta.userEmail,
      status: pergunta.status,
    });

    // Atualizar pergunta com userId e userEmail
    // IMPORTANTE: Normalizar email para lowercase para garantir correspondência
    const userEmailParaSalvar = user.email.toLowerCase().trim();
    const perguntaAtualizada = await prisma.userQuestion.update({
      where: { id: questionId },
      data: {
        userId: user.id,
        userEmail: userEmailParaSalvar, // Garantir que o email está normalizado
      },
    });

    // Verificar estado DEPOIS da atualização
    console.log(`[Admin FAQ] DEPOIS da associação - Pergunta ${questionId}:`, {
      userId: perguntaAtualizada.userId,
      userEmail: perguntaAtualizada.userEmail,
      status: perguntaAtualizada.status,
    });

    // Verificar se a busca funcionaria agora
    const verificacaoBusca = await prisma.userQuestion.findMany({
      where: {
        AND: [
          { id: questionId }, // Buscar especificamente esta pergunta
          {
            OR: [
              { userId: user.id },
              { userEmail: user.email },
              { userEmail: userEmailParaSalvar }, // Verificar também com email normalizado
            ],
          },
        ],
      },
    });

    console.log(`[Admin FAQ] Verificação de busca: encontrou ${verificacaoBusca.length} pergunta(s) com userId=${user.id} ou userEmail=${user.email} ou ${userEmailParaSalvar}`);

    return NextResponse.json({
      success: true,
      message: `Pergunta associada ao usuário ${user.email}`,
      pergunta: perguntaAtualizada,
      verificacao: {
        encontradaNaBusca: verificacaoBusca.length > 0,
        userId: perguntaAtualizada.userId,
        userEmail: perguntaAtualizada.userEmail,
      },
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin FAQ Associar] Erro:", err);
    return NextResponse.json({ error: "Erro ao associar pergunta" }, { status: 500 });
  }
}
