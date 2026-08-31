import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const verificarCodigoSchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().length(6, "Código deve ter 6 dígitos"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const validation = verificarCodigoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { email, code } = validation.data;

    // Buscar código válido
    const resetCode = await prisma.passwordResetCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: {
          gt: new Date(), // Ainda não expirou
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetCode) {
      return NextResponse.json(
        { error: "Código inválido ou expirado. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Marcar código como usado
    await prisma.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { used: true },
    });

    // Gerar token temporário para troca de senha (válido por 10 minutos)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Salvar token (usando a mesma tabela ou criar uma nova)
    // Por simplicidade, vamos usar um campo adicional no código já usado
    // Na prática, você pode criar uma tabela separada para tokens
    await prisma.passwordResetCode.create({
      data: {
        email,
        code: token, // Reutilizando o campo code para armazenar o token
        used: false,
        expiresAt: tokenExpiresAt,
      },
    });

    return NextResponse.json({
      message: "Código verificado com sucesso!",
      token,
    });
  } catch (err) {
    console.error("Erro ao verificar código:", err);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
