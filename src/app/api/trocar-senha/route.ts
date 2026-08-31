import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";

const trocarSenhaSchema = z.object({
  email: z.string().email("Email inválido"),
  token: z.string().min(1, "Token inválido"),
  novaSenha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const validation = trocarSenhaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { email, token, novaSenha } = validation.data;

    // Verificar se o token é válido
    // O token foi salvo no campo 'code' após a verificação do código de 6 dígitos
    const resetToken = await prisma.passwordResetCode.findFirst({
      where: {
        email,
        code: token, // Token está no campo code
        used: false,
        expiresAt: {
          gt: new Date(), // Ainda não expirou
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Token inválido ou expirado. Solicite uma nova recuperação." },
        { status: 400 }
      );
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    // Hash da nova senha
    const hash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha do usuário
    await prisma.user.update({
      where: { id: user.id },
      data: { senha: hash },
    });

    // Marcar token como usado
    await prisma.passwordResetCode.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Invalidar todas as sessões ativas do usuário (forçar novo login)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      message: "Senha alterada com sucesso!",
    });
  } catch (err) {
    console.error("Erro ao trocar senha:", err);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
