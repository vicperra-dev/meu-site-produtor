import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/app/lib/sendEmail";

const esqueciSenhaSchema = z.object({
  email: z.string().email("Email inválido"),
});

const GENERIC_OK_MESSAGE =
  "Se existir uma conta vinculada a este endereço, enviaremos as instruções.";

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function allowPasswordResetDebug(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_PASSWORD_RESET_DEBUG === "true"
  );
}

function genericOkResponse(extra?: Record<string, unknown>) {
  return NextResponse.json({
    message: GENERIC_OK_MESSAGE,
    ...(extra || {}),
  });
}

/**
 * GO-04A.3 RC-06: respostas semanticamente equivalentes — não revelar se o e-mail existe.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = esqueciSenhaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.info("[esqueci-senha] Solicitação para e-mail sem cadastro (detalhe interno)");
      return genericOkResponse(
        allowPasswordResetDebug()
          ? { debug: { emailEnviado: false, reason: "no_account" } }
          : undefined
      );
    }

    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetCode.updateMany({
      where: {
        email,
        used: false,
      },
      data: {
        used: true,
      },
    });

    await prisma.passwordResetCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    let emailEnviado = false;
    let emailErrorMessage: string | null = null;

    try {
      await sendPasswordResetEmail(email, code);
      emailEnviado = true;
    } catch (emailError: unknown) {
      emailErrorMessage =
        emailError instanceof Error ? emailError.message : "Falha no envio";
      console.error("[esqueci-senha] Falha ao enviar email de recuperação");
    }

    if (!emailEnviado) {
      // Não revelar existência da conta: mensagem genérica de processamento
      console.error("[esqueci-senha] Envio falhou; resposta genérica ao cliente", {
        hasError: Boolean(emailErrorMessage),
      });
      return NextResponse.json(
        {
          error: "Não foi possível processar a solicitação. Tente novamente em instantes.",
          ...(allowPasswordResetDebug()
            ? { debug: { emailEnviado: false, erro: { message: emailErrorMessage } } }
            : {}),
        },
        { status: 503 }
      );
    }

    return genericOkResponse(
      allowPasswordResetDebug()
        ? { debug: { emailEnviado: true, timestamp: new Date().toISOString() } }
        : undefined
    );
  } catch (err) {
    console.error("Erro ao processar recuperação de senha:", err);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
